import {
	json,
	type MetaFunction,
	type LoaderFunctionArgs,
} from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { RouteErrorBoundary } from '~/components/error-boundary';
import { SearchInput } from '~/components/filters';
import { LinkButton } from '~/components/form-utils';
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
	PageWrapper,
	DateWithTime,
	StatusBadge,
	LinkWithCurrentSearch,
} from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import { getRequestSearchParams } from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: 'Ajustes de inventario - Villing' },
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId, userId } = await getOrgDbClient(request);

	await legalActions.validateAndThrow(db, userId, 'see_stock_settings');

	const queryPositionData = getQueryPositionData(request);
	const searchParams = getRequestSearchParams(request);

	const search = searchParams.get('search');

	if (search && !isNaN(parseInt(search))) {
		searchParams.set('internalId', search);
		searchParams.delete('search');
	}

	const { OR, internalId } = queryBuilder(searchParams, ['name', 'internalId']);

	const [settings, count, branches] = await db.$transaction([
		db.inventorySetting.findMany({
			where: {
				organizationId: orgId,
				...(internalId ? { count: internalId } : {}),
				products: { some: { OR } },
			},
			include: { products: true },
			orderBy: { createdAt: 'desc' },
			...queryPositionData,
		}),
		db.inventorySetting.count({ where: { organizationId: orgId } }),
		db.subOrganization.findMany({
			where: { organizationId: orgId, deletedAt: null },
			select: { id: true, name: true },
		}),
	]);

	const lastPage = getLastPage(queryPositionData, count);

	return json({ settings, lastPage, branches });
}

export default function Component() {
	const loaderData = useLoaderData<typeof loader>();
	const { settings, lastPage, branches } = loaderData;

	function findBranchName(id: number) {
		const branch = branches.find(branch => branch.id === id);
		return branch?.name || 'Sucursal eliminada';
	}

	return (
		<PageWrapper>
			<Outlet />

			<div className="flex gap-4 justify-between md:items-end mb-4 flex-col md:flex-row">
				<div className="flex-1">
					<h2 className="mb-1">Ajustes de inventario</h2>
					<p className="text-gray-500 leading-none">
						Administra los ingresos y salidas de inventario
					</p>
				</div>

				<div className="flex gap-4 md:flex-row-reverse">
					<LinkButton to="/builder/stockSetting/new">
						<i className="ri-add-line"></i>Crear ajuste de inventario
					</LinkButton>
				</div>
			</div>

			<SearchInput
				className="mb-4"
				placeholder="Busca por producto o número de ajuste"
			/>

			<div className="rounded border border-gray-200 shadow-sm mb-4 text-sm">
				<Table>
					<TableHead>
						<TableHeadCell className="pl-4">No.</TableHeadCell>
						<TableHeadCell>Sucursal</TableHeadCell>
						<TableHeadCell>Fecha</TableHeadCell>
						<TableHeadCell>Cantidad</TableHeadCell>
						<TableHeadCell>Tipo</TableHeadCell>
						<TableHeadCell></TableHeadCell>
					</TableHead>
					<TableBody>
						{settings.length ? (
							settings.map(setting => (
								<TableRow key={setting.id}>
									<TableCell className="text-sm pl-4">
										<LinkWithCurrentSearch to={`${setting.id}`}>
											{setting.count}
										</LinkWithCurrentSearch>
									</TableCell>
									<TableCell className="whitespace-nowrap">
										<LinkWithCurrentSearch to={`${setting.id}`}>
											{findBranchName(setting.subOrganizationId)}
										</LinkWithCurrentSearch>
									</TableCell>
									<TableCell>
										<LinkWithCurrentSearch
											to={`${setting.id}`}
											className="whitespace-nowrap text-sm"
										>
											<DateWithTime date={setting.createdAt} />
										</LinkWithCurrentSearch>
									</TableCell>
									<TableCell>
										<LinkWithCurrentSearch
											to={`${setting.id}`}
											className="whitespace-nowrap text-sm"
										>
											<ProductsQuantity products={setting.products} />
										</LinkWithCurrentSearch>
									</TableCell>
									<TableCell>
										<LinkWithCurrentSearch
											to={`${setting.id}`}
											className="whitespace-nowrap text-sm"
										>
											<StatusBadge variant="info" className="max-w-max">
												{setting.transferToId
													? 'Transferencia'
													: setting.settingType === 'partial'
														? 'Parcial'
														: 'Total'}
											</StatusBadge>
											<StatusBadge
												variant={
													setting.incomeOrExit === 'exit' ? 'warning' : 'info'
												}
												className="max-w-max"
											>
												{setting.incomeOrExit === 'exit' ? 'Egreso' : 'Ingreso'}
											</StatusBadge>
										</LinkWithCurrentSearch>
									</TableCell>
									<TableCell>
										<div className="flex gap-2">
											<Link
												to={`/invoices/duplicate?id=${setting.id}&origin=stockSetting&destination=stockSetting`}
												className="p-2 flex gap-2 text-sm hover:text-primary-700 group whitespace-nowrap"
												prefetch="intent"
											>
												<span className="group-hover:underline">Duplicar</span>
												<i className="ri-file-copy-line"></i>
											</Link>

											<LinkWithCurrentSearch
												to={`${setting.id}`}
												className="p-2 flex gap-2 text-sm hover:text-primary-700 group whitespace-nowrap"
											>
												<span className="group-hover:underline">
													Ver ajuste
												</span>
												<i className="ri-arrow-right-line"></i>
											</LinkWithCurrentSearch>
										</div>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell className="text-sm">
									No hay ajustes de inventario
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<Pagination lastPage={lastPage} />
		</PageWrapper>
	);
}

type ProductsQuantityProps = {
	products: Array<{ quantity: number }>;
};
function ProductsQuantity({ products }: ProductsQuantityProps) {
	const total = products.reduce((acc, product) => acc + product.quantity, 0);

	return (
		<p>
			{products.length}{' '}
			<span className="text-sm text-gray-500">
				({total} unidad{total > 1 ? 'es' : null})
			</span>
		</p>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con el ajuste de inventario. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}
