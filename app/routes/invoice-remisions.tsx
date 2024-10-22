import { type MetaFunction, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { RouteErrorBoundary } from '~/components/error-boundary';
import {
	SearchInput,
	DateRangeFilter,
	InvoiceFilters,
} from '~/components/filters';
import { InvoiceButtonActions } from '~/components/invoice-button-actions';
import { MultiSelect } from '~/components/multi-select';
import {
	Pagination,
	getLastPage,
	getQueryPositionData,
} from '~/components/pagination';
import { StatusBadge } from '~/components/status-badge';
import {
	DateWithTime,
	IsCancelledToast,
	LinkWithCurrentSearch,
	PageWrapper,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeadCell,
	TableRow,
} from '~/components/ui-library';
import { getStatusFilter } from '~/modules/invoice/filters.server';
import { getOrgDbClient } from '~/utils/db.server';
import { cn, formatCurrency } from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';
import { getWhere } from '~/utils/where-builder';

export const meta: MetaFunction = () => [
	{
		title: 'Remisiones de venta - Villing',
		description: 'Remisiones de venta',
	},
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId, userId } = await getOrgDbClient(request);

	await legalActions.validateAndThrow(db, userId, 'see_invoices');

	const queryPositionData = getQueryPositionData(request);
	const where = getWhere({ request, params: ['invoice'] });

	const statusFilter = getStatusFilter(request);

	const [
		{
			legalInvoiceRemisions: remisions,
			_count: { legalInvoiceRemisions: remisionsCount },
		},
		suborganizations,
	] = await Promise.all([
		db.organization.findFirstOrThrow({
			where: { id: orgId },
			select: {
				_count: { select: { legalInvoiceRemisions: true } },
				legalInvoiceRemisions: {
					where: {
						organizationId: orgId,
						...where,
						...statusFilter,
					},
					orderBy: { createdAt: 'desc' },
					include: {
						client: true,
						products: true,
						subOrganization: true,
						user: true,
						paymentForms: true,
					},
					...queryPositionData,
				},
			},
		}),
		db.subOrganization.findMany({
			where: { organizationId: orgId, deletedAt: null },
			select: { id: true, name: true },
		}),
	]);

	return {
		remisions,
		lastPage: getLastPage(queryPositionData, remisionsCount),
		branches: suborganizations,
	};
}

export default function Component() {
	const { remisions, lastPage, branches } = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<div className="flex gap-4 justify-between items-end mb-4">
				<div className="flex-1">
					<h2 className="mb-1">Remisiones de venta</h2>
					<p className="text-gray-500 text-sm leading-none">
						Remisiones de venta este mes
					</p>
				</div>
				<Link
					className={cn(
						'gap-2 items-center text-sm font-medium flex',
						'bg-gray-900 text-white rounded px-3 h-9 hover:bg-gray-800',
					)}
					to="/builder/remision/new"
				>
					<i className="ri-add-line"></i>
					Crear remisión
				</Link>
			</div>

			<div className="mb-4">
				<div className="flex mb-4 gap-4">
					<div className="flex-1">
						<SearchInput placeholder="Busca por No. cliente o producto" />
					</div>
					<div className="shrink-0">
						<DateRangeFilter />
					</div>
				</div>

				<InvoiceFilters>
					<MultiSelect
						label="Sucursal"
						name="branchId"
						items={branches}
						unique
					/>
				</InvoiceFilters>
			</div>

			<div className="rounded border border-gray-200 shadow-sm mb-4">
				<Table>
					<TableHead>
						<TableHeadCell>No.</TableHeadCell>
						<TableHeadCell className="whitespace-nowrap">
							Cliente - Sucursal
						</TableHeadCell>
						<TableHeadCell>Fecha</TableHeadCell>
						<TableHeadCell>Total</TableHeadCell>
						<TableHeadCell>Estado</TableHeadCell>
						<TableHeadCell></TableHeadCell>
					</TableHead>
					<TableBody>
						{remisions.map(remision => (
							<TableRow key={remision.id}>
								<TableCell className="text-sm">
									<LinkWithCurrentSearch to={`${remision.id}`}>
										{remision.internalId}
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									<LinkWithCurrentSearch to={`${remision.id}`}>
										<p>{remision.client.name}</p>
										<p>
											<strong className="text-gray-600 text-xs">
												Sucursal:
											</strong>{' '}
											{remision.subOrganization.name}
										</p>
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${remision.id}`}>
										<DateWithTime date={remision.createdAt} />
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${remision.id}`}>
										<span className="block font-medium">
											${formatCurrency(remision.subtotal + remision.totalTax)}
										</span>
										<span className="text-sm">
											Impuestos: ${formatCurrency(remision.totalTax)}
										</span>
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell>
									{remision.canceledAt ? (
										<IsCancelledToast canceledAt={remision.canceledAt} />
									) : (
										<StatusBadge
											status={remision.pending > 0 ? 'pending' : 'paid'}
											expiresAt={remision.expiresAt}
										/>
									)}
								</TableCell>
								<td>
									<InvoiceButtonActions
										no={String(remision.internalId)}
										options={[
											{
												name: 'Ver remisión',
												icon: 'ri-arrow-right-line',
												to: `/invoice-remisions/${remision.id}`,
											},
											{
												name: 'Imprimir',
												icon: 'ri-printer-line',
												to: `/invoice-remisions/${remision.id}?print=true`,
											},
											{
												name: 'Duplicar',
												icon: 'ri-file-copy-line',
												to: '/invoices/duplicate',
												action: 'duplicate',
											},
											{
												name: 'Anular',
												icon: 'ri-file-copy-line',
												to: `/invoice-remisions/${remision.id}/cancel`,
												condition: !remision.canceledAt,
											},
											{
												name: 'Pasar a factura electrónica',
												icon: 'ri-file-text-line',
												to: '/invoices/duplicate',
												action: 'duplicate',
												destination: 'legalInvoice',
											},
										]}
										origin="legalInvoiceRemision"
										destination="legalInvoiceRemision"
										sourceId={remision.id}
									/>
								</td>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<Pagination lastPage={lastPage} />
		</PageWrapper>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con las remisiones. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}
