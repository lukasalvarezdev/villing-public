import {
	json,
	type DataFunctionArgs,
	type MetaFunction,
} from '@remix-run/node';
import { useLoaderData, useSearchParams } from '@remix-run/react';
import * as React from 'react';
import { FiltersProvider, SearchInput } from '~/components/filters';
import { LinkButton, Toast } from '~/components/form-utils';
import { MultiSelect } from '~/components/multi-select';
import {
	Pagination,
	getLastPage,
	getQueryPositionData,
} from '~/components/pagination';
import {
	LinkWithCurrentSearch,
	PageWrapper,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeadCell,
	TableRow,
} from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import { addTax, formatCurrency, getRequestSearchParams } from '~/utils/misc';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';
import { getProductsByStock } from './api.server';

export const meta: MetaFunction = () => [{ title: `Productos - Villing` }];

export async function loader({ request }: DataFunctionArgs) {
	await protectRoute(request);

	const searchParams = getRequestSearchParams(request);
	const expiry = searchParams.get('expiry');

	const todayPlus90 = new Date(new Date().setDate(new Date().getDate() + 90));
	const todayPlus180 = new Date(new Date().setDate(new Date().getDate() + 180));

	switch (expiry) {
		case 'expiring':
			searchParams.set('start', todayPlus90.toISOString());
			searchParams.set('end', todayPlus180.toISOString());
			break;
		case 'expired':
			searchParams.set('end', todayPlus180.toISOString());
			break;
		default:
			break;
	}

	const search = searchParams.get('search');
	const isBarCodeSearch =
		search && search.length > 8 && !isNaN(parseInt(search));

	if (isBarCodeSearch) {
		searchParams.set('barCode', search);
		searchParams.delete('search');
	}

	const barCode = searchParams.get('barCode');

	// TODO: support OR with `expirationDate`
	const query = queryBuilder(searchParams, [
		'name',
		'reference',
		'brandId',
		'categoryId',
		'internalId',
		'expirationDate',
	]);
	const { db, orgId } = await getOrgDbClient(request);

	const queryPositionData = getQueryPositionData(request);
	const productsIds = await getProductsByStock(db, searchParams);
	const productFilters = { ...query, id: { in: productsIds } };
	const {
		Product: products,
		Category: categories,
		Brand: brands,
		_count: { Product: count },
	} = await db.organization.findUniqueOrThrow({
		where: { id: orgId },
		select: {
			Product: {
				where: {
					...productFilters,
					barCodes: barCode ? { has: barCode } : undefined,
				},
				orderBy: { internalId: 'desc' },
				select: {
					id: true,
					internalId: true,
					name: true,
					reference: true,
					price: true,
					prices: {
						where: { priceList: { deletedAt: null } },
						include: { priceList: true },
						orderBy: { priceList: { name: 'asc' } },
					},
					tax: true,
					stocks: {
						include: { subOrg: true },
						where: { subOrg: { deletedAt: null } },
						orderBy: { subOrg: { name: 'asc' } },
					},
				},
				...queryPositionData,
			},
			Category: { orderBy: { name: 'asc' }, select: { id: true, name: true } },
			Brand: { orderBy: { name: 'asc' }, select: { id: true, name: true } },
			// The count without the pagination filters
			_count: { select: { Product: { where: productFilters } } },
		},
	});

	return json({
		products,
		categories,
		brands,
		lastPage: getLastPage(queryPositionData, count),
	});
}

export default function Component() {
	const { categories, brands, products, lastPage } =
		useLoaderData<typeof loader>();
	const [searchParams, setSearchParams] = useSearchParams();
	const updated = searchParams.get('updated');

	React.useEffect(() => {
		if (!updated) return;

		const timeout = setTimeout(() => {
			setSearchParams(search => {
				const newParams = new URLSearchParams(search);
				newParams.delete('updated');
				return newParams;
			});
		}, 5000);

		return () => clearTimeout(timeout);
	}, [updated, setSearchParams]);

	return (
		<PageWrapper className="flex flex-col gap-2">
			<div className="flex gap-4 justify-between md:items-end mb-4 flex-col md:flex-row">
				<div className="flex-1">
					<h2 className="mb-1">Productos</h2>
					<p className="text-gray-500 leading-none">
						Administra los productos de tu inventario
					</p>
				</div>

				<div className="flex gap-4 flex-wrap">
					<LinkButton to="new">
						<i className="ri-add-line"></i>
						Crear producto
					</LinkButton>
					<LinkButton
						to="/products/import"
						variant="secondary"
						prefetch="render"
					>
						<i className="ri-file-upload-line"></i>
						Importar
					</LinkButton>
					<LinkButton
						to="/inventory/export"
						variant="secondary"
						target="_blank"
					>
						<i className="ri-file-download-line"></i>
						Exportar
					</LinkButton>
				</div>
			</div>

			{updated ? (
				<Toast className="mb-4" variant="success">
					El producto fue actualizado correctamente
				</Toast>
			) : null}

			<div className="mb-4">
				<SearchInput
					className="mb-4"
					placeholder="Busca por nombre, referencia o código interno"
				/>
				<FiltersProvider>
					<div className="flex gap-4 flex-wrap">
						<MultiSelect
							label="Categoría"
							name="categoryId"
							items={categories}
						/>
						<MultiSelect label="Marca" name="brandId" items={brands} />
						<MultiSelect
							label="Estado: stock"
							name="stock"
							items={stockStates}
						/>
						<MultiSelect
							label="Estado: vencimiento"
							name="expiry"
							items={expiryStates}
						/>
					</div>
				</FiltersProvider>
			</div>

			{products.length >= 50 ? <Pagination lastPage={lastPage} /> : null}

			<div className="rounded border border-gray-200 shadow-sm mb-4 bg-white">
				<Table>
					<TableHead>
						<TableHeadCell>No.</TableHeadCell>
						<TableHeadCell>Nombre</TableHeadCell>
						<TableHeadCell>Precios</TableHeadCell>
						<TableHeadCell>Impuesto</TableHeadCell>
						<TableHeadCell>Stock</TableHeadCell>
						<TableHeadCell></TableHeadCell>
					</TableHead>
					<TableBody>
						{products.map((product, index) => (
							<TableRow key={index}>
								<TableCell className="text-sm">
									<LinkWithCurrentSearch to={String(product.id)}>
										{product.internalId}
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm">
									<LinkWithCurrentSearch to={String(product.id)}>
										<p>{product.name}</p>
										<p className="text-xs text-gray-600">{product.reference}</p>
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm">
									<LinkWithCurrentSearch to={String(product.id)}>
										<p
											className="whitespace-nowrap leading-5"
											aria-label={`Costo: $${formatCurrency(product.price)}`}
										>
											<span>Costo:</span>{' '}
											<span className="font-medium">
												${formatCurrency(product.price)}
											</span>{' '}
											<span></span>
										</p>
										{product.prices.map((p, i) => (
											<p
												key={i}
												className="whitespace-nowrap leading-5"
												aria-label={`${p.priceList.name}: $${formatCurrency(p.value)} ($${formatCurrency(addTax(p.value, product.tax))})`}
											>
												<span>{p.priceList.name}:</span>{' '}
												<span className="font-medium">
													${formatCurrency(p.value)}
												</span>{' '}
												<span>
													(${formatCurrency(addTax(p.value, product.tax))})
												</span>
											</p>
										))}
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm">
									<LinkWithCurrentSearch to={String(product.id)}>
										{product.tax}%
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm">
									<LinkWithCurrentSearch to={String(product.id)}>
										{product.stocks.map((stock, i) => (
											<p key={i} className="whitespace-nowrap leading-5">
												<span>{stock.subOrg.name}:</span>{' '}
												<span className="font-medium">{stock.value}</span>{' '}
											</p>
										))}
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm">
									<LinkWithCurrentSearch
										to={String(product.id)}
										className="flex gap-2 hover:text-primary-700 group whitespace-nowrap"
									>
										<span className="group-hover:underline">Ver producto</span>
										<i className="ri-arrow-right-line"></i>
									</LinkWithCurrentSearch>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<Pagination lastPage={lastPage} />
		</PageWrapper>
	);
}

const stockStates = [
	{ id: 'out_of_stock', name: 'En cero o negativo' },
	{ id: 'min_stock', name: 'Debajo del mínimo' },
	{ id: 'normal_stock', name: 'Normal' },
	{ id: 'max_stock', name: 'Arriba del máximo' },
];

const expiryStates = [
	{ id: 'expired', name: 'Vencidos' },
	{ id: 'expiring', name: 'Por vencer' },
	{ id: 'not_expiring', name: 'No vencidos' },
];
