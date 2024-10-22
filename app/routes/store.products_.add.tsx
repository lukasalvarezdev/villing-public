import {
	type MetaFunction,
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
	redirect,
} from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import * as React from 'react';
import { SearchInput } from '~/components/filters';
import { Button, IntentButton } from '~/components/form-utils';
import {
	Pagination,
	getLastPage,
	getQueryPositionData,
} from '~/components/pagination';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
	GoBackLinkButton,
} from '~/components/ui-library';
import { getOrgDbClient, logError } from '~/utils/db.server';
import {
	formatCurrency,
	getRequestSearchParams,
	parseFormData,
} from '~/utils/misc';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{
		title: 'Productos de catálogo - Villing',
		description: 'Productos de catálogo',
	},
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const searchParams = getRequestSearchParams(request);
	const queryPositionData = getQueryPositionData(request);
	const query = queryBuilder(searchParams, [
		'name',
		'reference',
		'brandId',
		'categoryId',
		'internalId',
	]);

	const store = await db.store.findFirstOrThrow({
		where: { organizationId: orgId },
		select: { priceListId: true, subOrganizationId: true },
	});

	const [products, count, storeProducts] = await db.$transaction([
		db.product.findMany({
			where: { ...query, organizationId: orgId },
			orderBy: { internalId: 'desc' },
			include: {
				prices: {
					where: { priceListId: store.priceListId || 0 },
					select: { value: true },
				},
				stocks: {
					where: { subOrgId: store.subOrganizationId || 0 },
					select: { value: true },
				},
			},
			...queryPositionData,
		}),
		db.product.count({ where: { organizationId: orgId, ...query } }),
		db.product.findMany({
			where: { Store: { organizationId: orgId } },
			select: { id: true },
		}),
	]);

	return json({
		products: products.map(p => ({
			id: p.id,
			internalId: p.internalId,
			reference: p.reference,
			name: p.name,
			price: `$${formatCurrency(p.prices[0]?.value || 0)}`,
			stock: p.stocks[0]?.value || 0,
		})),
		lastPage: getLastPage(queryPositionData, count),
		selection: storeProducts.map(p => p.id),
	});
}

export async function action({ request }: ActionFunctionArgs) {
	try {
		const form = await parseFormData(request);
		const { db, orgId } = await getOrgDbClient(request);

		const products = form.getAll('ids');

		await db.store.update({
			where: { organizationId: orgId },
			data: {
				products: { set: products.map(id => ({ id: Number(id) })) },
			},
		});

		return redirect('/store/products');
	} catch (error) {
		await logError({ error, request });
		return json({ error: 'Hubo un error' }, 500);
	}
}

export default function Component() {
	const {
		products,
		lastPage,
		selection: defaultSelection,
	} = useLoaderData<typeof loader>();
	const [selection, setSelection] = React.useState(defaultSelection);
	const shouldShowSaveButton = !compareArrays(selection, defaultSelection);

	return (
		<div>
			<GoBackLinkButton className="mb-2 text-sm" to="/store/products">
				Volver
			</GoBackLinkButton>

			<div className="pb-4 border-b border-gray-200 mb-4">
				<h3>Agrega productos</h3>
				<p className="text-gray-500">
					Agrega o modifica los productos que se van a mostrar en tu tienda.
				</p>
			</div>

			<div className="flex gap-4">
				<div className="flex-1">
					<SearchInput
						className="mb-4"
						placeholder="Busca por nombre, referencia o código interno"
					/>
				</div>

				{shouldShowSaveButton ? (
					<Form className="flex justify-end gap-4" method="POST">
						{selection.map(id => (
							<input key={id} type="hidden" name="ids" value={id} />
						))}

						<Button
							variant="secondary"
							onClick={() => setSelection(defaultSelection)}
							type="button"
						>
							Cancelar
						</Button>
						<IntentButton intent="save">Guardar cambios</IntentButton>
					</Form>
				) : null}
			</div>

			{products.length >= 50 ? (
				<div className="mb-4">
					<Pagination lastPage={lastPage} />
				</div>
			) : null}

			<div className="rounded border border-gray-200 shadow-sm mb-4 bg-white">
				<Table>
					<TableHead>
						<TableHeadCell>
							<input
								type="checkbox"
								onChange={e => {
									if (e.target.checked) {
										const ids = products.map(p => p.id);
										const newSelection = [...new Set([...selection, ...ids])];
										setSelection(newSelection);
									} else {
										setSelection(
											selection.filter(id => !products.some(p => p.id === id)),
										);
									}
								}}
							/>
						</TableHeadCell>
						<TableHeadCell>No.</TableHeadCell>
						<TableHeadCell>Nombre</TableHeadCell>
						<TableHeadCell>Precio</TableHeadCell>
						<TableHeadCell>Stock</TableHeadCell>
					</TableHead>
					<TableBody>
						{products.map((product, index) => (
							<TableRow key={index}>
								<TableCell>
									<input
										type="checkbox"
										checked={selection.includes(product.id)}
										onChange={e => {
											if (e.target.checked) {
												setSelection([...selection, product.id]);
											} else {
												setSelection(selection.filter(id => id !== product.id));
											}
										}}
									/>
								</TableCell>
								<TableCell className="text-sm">{product.internalId}</TableCell>
								<TableCell className="text-sm">
									<p>{product.name}</p>
									<p className="text-xs text-gray-600">{product.reference}</p>
								</TableCell>
								<TableCell className="text-sm">{product.price}</TableCell>
								<TableCell className="text-sm">{product.stock}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<Pagination lastPage={lastPage} />
		</div>
	);
}

function compareArrays(a: Array<number>, b: Array<number>) {
	if (a.length !== b.length) return false;

	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false;
	}

	return true;
}
