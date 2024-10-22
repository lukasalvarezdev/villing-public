import { type MetaFunction, json , type LoaderFunctionArgs } from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { RouteErrorBoundary } from '~/components/error-boundary';
import { SearchInput, DateRangeFilter } from '~/components/filters';
import { getQueryPositionData } from '~/components/pagination';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
	DateWithTime,
	Box,
} from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import {
	formatCurrency,
	getSearchParamsWithDefaultDateRange,
} from '~/utils/misc';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{
		title: 'Pedidos de catálogo - Villing',
		description: 'Pedidos de catálogo',
	},
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const queryPositionData = getQueryPositionData(request);
	const searchParams = getSearchParamsWithDefaultDateRange(request);
	const where = queryBuilder(searchParams, ['createdAt']);

	const [orders, { _count, _sum }] = await db.$transaction([
		db.order.findMany({
			where: { store: { organizationId: orgId }, ...where },
			orderBy: { createdAt: 'desc' },
			...queryPositionData,
		}),
		db.order.aggregate({
			where: { store: { organizationId: orgId }, ...where },
			_sum: { totalAmount: true },
			_count: true,
		}),
	]);
	const totalAmount = _sum?.totalAmount || 0;
	const totalOrders = _count || 0;

	return json({ orders, totalAmount, totalOrders });
}

export default function Component() {
	const { orders, totalAmount, totalOrders } = useLoaderData<typeof loader>();

	return (
		<div>
			<Outlet />

			<div className="pb-4 border-b border-gray-200 mb-4">
				<h3>Pedidos</h3>
				<p className="text-gray-500 text-sm">Pedidos de catálogo</p>
			</div>

			<div className="flex mb-4 gap-4 flex-col md:flex-row">
				<Box className="max-h-max flex-1">
					<div className="flex justify-between gap-6">
						<div>
							<span className="text-xs text-gray-500">Total vendido</span>
							<p className="text-lg md:text-xl font-bold">
								${formatCurrency(totalAmount)}
							</p>
						</div>
					</div>
					<div className="flex gap-6 justify-between">
						<span className="text-xs text-gray-500">
							En el periodo seleccionado
						</span>
					</div>
				</Box>

				<Box className="max-h-max flex-1">
					<div className="flex justify-between gap-6">
						<div>
							<span className="text-xs text-gray-500">Pedidos totales</span>
							<p className="text-lg md:text-xl font-bold">{totalOrders}</p>
						</div>
					</div>
					<div className="flex gap-6 justify-between">
						<span className="text-xs text-gray-500">
							En el periodo seleccionado
						</span>
					</div>
				</Box>
			</div>

			<div className="flex mb-4 gap-4 flex-col md:flex-row">
				<div className="flex-1">
					<SearchInput placeholder="Busca por No. o producto" />
				</div>
				<div className="shrink-0">
					<DateRangeFilter />
				</div>
			</div>

			<div className="rounded border border-gray-200 shadow-sm mb-4">
				<Table>
					<TableHead>
						<TableHeadCell>No.</TableHeadCell>
						<TableHeadCell className="whitespace-nowrap">Cliente</TableHeadCell>
						<TableHeadCell>Fecha</TableHeadCell>
						<TableHeadCell>Total</TableHeadCell>
						<TableHeadCell></TableHeadCell>
					</TableHead>
					<TableBody>
						{orders.map(order => (
							<TableRow key={order.id}>
								<TableCell className="text-sm">
									<Link to={`${order.id}`}>{order.internalId}</Link>
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									<Link to={`${order.id}`}>{order.clientName}</Link>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<Link to={`${order.id}`}>
										<DateWithTime date={order.createdAt} />
									</Link>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<Link to={`${order.id}`}>
										<span className="block font-medium">
											${formatCurrency(order.totalAmount)}
										</span>
									</Link>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con los pedidos. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}
