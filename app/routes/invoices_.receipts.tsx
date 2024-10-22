import {
	type MetaFunction,
	json,
	type DataFunctionArgs,
} from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import clsx from 'clsx';
import { DateString } from '~/components/client-only';
import { DateRangeFilter, SearchInput } from '~/components/filters';
import { getQueryPositionData } from '~/components/pagination';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	LinkTableCell,
	StatusBadge,
	PageWrapper,
} from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import {
	getSearchParamsWithDefaultDateRange,
	formatDate,
	formatHours,
} from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{
		title: 'Recepciones de facturas | Villing',
		description: 'Recepciones de facturas',
	},
];

export async function loader({ request }: DataFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const paginationData = getQueryPositionData(request);
	const searchParams = getSearchParamsWithDefaultDateRange(request);

	const receipts = await db.invoiceReceipt.findMany({
		where: { organizationId: orgId },
		orderBy: { createdAt: 'desc' },
		include: { provider: true, personWhoReceived: true },
		...paginationData,
	});

	return json({
		receipts: receipts.map(receipt => ({
			...receipt,
			state: receipt.personWhoReceivedTheMerchandiseId
				? 'received'
				: ('pending-merchandise' as ReceiptState),
		})),
		end: searchParams.get('end'),
		start: searchParams.get('start'),
	});
}

type ReceiptState = 'received' | 'pending-merchandise';
export default function Component() {
	const { receipts } = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<Outlet />

			<div className="flex gap-4 justify-between md:items-end mb-4 flex-col md:flex-row">
				<div className="flex-1">
					<h2 className="mb-1">Recepciones de factura</h2>
					<p className="text-gray-500 text-sm leading-none">
						Recepciones de factura este mes
					</p>
				</div>
				<Link
					className={clsx(
						'gap-2 items-center text-sm font-medium flex max-w-max',
						'bg-gray-900 text-white rounded px-3 h-9 hover:bg-gray-800',
					)}
					to="new"
					prefetch="intent"
				>
					<i className="ri-folder-received-line"></i>
					Recibir factura
				</Link>
			</div>

			<div className="flex gap-4 flex-col md:flex-row mb-4">
				<SearchInput placeholder="Busca por cliente o sucursal" />

				<div className="shrink-0">
					<DateRangeFilter />
				</div>
			</div>

			<div className="rounded border border-gray-200 shadow-sm mb-4">
				<Table>
					<TableHead>
						<TableHeadCell className="pl-4">No.</TableHeadCell>
						<TableHeadCell>Proveedor</TableHeadCell>
						<TableHeadCell>Receptor</TableHeadCell>
						<TableHeadCell>Fecha</TableHeadCell>
						<TableHeadCell>Estado</TableHeadCell>
					</TableHead>
					<TableBody>
						{receipts.map(receipt => (
							<TableRow key={receipt.id} className="hover:bg-gray-50 group">
								<LinkTableCell to={`${receipt.id}`} className="text-sm pl-4">
									{receipt.internalId}
								</LinkTableCell>
								<LinkTableCell
									to={`${receipt.id}`}
									className="whitespace-nowrap"
								>
									<div>
										<p>{receipt.provider?.name || 'Sin proveedor'}</p>
										{receipt.provider ? (
											<p className="text-gray-600 text-sm">
												{receipt.provider.idNumber}
											</p>
										) : null}
									</div>
								</LinkTableCell>
								<LinkTableCell
									to={`${receipt.id}`}
									className="whitespace-nowrap text-sm"
								>
									<p>{receipt.personWhoReceived.name}</p>
								</LinkTableCell>
								<LinkTableCell
									to={`${receipt.id}`}
									className="text-sm whitespace-nowrap"
								>
									<DateString>
										{formatDate(receipt.createdAt)}{' '}
										{formatHours(receipt.createdAt)}
									</DateString>
								</LinkTableCell>
								<LinkTableCell
									to={`${receipt.id}`}
									className="whitespace-nowrap"
								>
									<StatusBadge
										variant={
											receipt.state === 'pending-merchandise'
												? 'warning'
												: 'success'
										}
									>
										{receipt.state === 'pending-merchandise' ? (
											<p className="relative">
												<span className="group-hover:opacity-0">
													Pendiente de mercancía
												</span>
												<span className="group-hover:block hidden absolute top-0">
													Presiona para recibir
												</span>
											</p>
										) : (
											'Recibida'
										)}
									</StatusBadge>
								</LinkTableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</PageWrapper>
	);
}

export function ErrorBoundary({ error }: { error: Error }) {
	console.error(error);

	return (
		<PageWrapper>
			<div className="bg-error-50 border border-error-200 text-error-600 p-4 rounded-sm">
				Lo sentimos, ha ocurrido un error obteniendo las cotizaciones. Por
				favor, intenta de nuevo más tarde.
			</div>
		</PageWrapper>
	);
}
