import {
	type MetaFunction,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import clsx from 'clsx';
import { ClientOnly } from '~/components/client-only';
import {
	SearchInput,
	FiltersProvider,
	DateRangeFilter,
} from '~/components/filters';
import { InvoiceButtonActions } from '~/components/invoice-button-actions';
import { MultiSelect } from '~/components/multi-select';
import { getQueryPositionData } from '~/components/pagination';
import { StatusBadge } from '~/components/status-badge';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
	PageWrapper,
	IsCancelledToast,
	LinkWithCurrentSearch,
} from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import { formatDate, formatHours, formatCurrency } from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';
import { getPurchasesWhere } from '~/utils/where-builder';

export const meta: MetaFunction = () => [
	{
		title: 'Facturas de compra | Villing',
		description: 'Facturas de compra',
	},
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const paginationData = getQueryPositionData(request);

	const { db, orgId, userId } = await getOrgDbClient(request);

	await legalActions.validateAndThrow(db, userId, 'see_purchases');
	const where = getPurchasesWhere(request);

	const [purchaseInvoices, suborganizations] = await db.$transaction([
		db.purchaseInvoice.findMany({
			where: { organizationId: orgId, ...where },
			orderBy: { createdAt: 'desc' },
			include: {
				supplier: { include: { address: true } },
				payments: true,
				products: true,
				subOrganization: true,
				user: true,
			},
			skip: paginationData.skip,
			take: paginationData.take,
		}),
		db.subOrganization.findMany({
			where: { organizationId: orgId, deletedAt: null },
			select: { id: true, name: true },
		}),
	]);

	return json({ purchaseInvoices, suborganizations });
}

export default function Component() {
	const { purchaseInvoices, suborganizations } = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<div className="flex gap-4 justify-between items-end mb-4">
				<div className="flex-1">
					<h2 className="mb-1">Facturas de compra</h2>
					<p className="text-gray-500 text-sm leading-none">
						Facturas de compra este mes
					</p>
				</div>
				<Link
					className={clsx(
						'gap-2 items-center text-sm font-medium hidden md:flex',
						'bg-gray-900 text-white rounded px-3 h-9 hover:bg-gray-800',
					)}
					to="/builder/purchaseInvoice/new"
					prefetch="intent"
				>
					<i className="ri-add-line"></i>
					Crear factura de compra
				</Link>
				<Link
					className={clsx(
						'flex gap-2 items-center text-sm font-medium md:hidden',
						'bg-gray-900 text-white rounded px-3 h-9 hover:bg-gray-800',
					)}
					to="/builder/purchaseInvoice/new"
				>
					<i className="ri-add-line"></i>
					Crear
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
				<FiltersProvider>
					<div className="flex gap-4 flex-wrap">
						<MultiSelect
							label="Sucursal"
							name="subOrganizationId"
							items={suborganizations}
						/>
					</div>
				</FiltersProvider>
			</div>

			<div className="rounded border border-gray-200 shadow-sm mb-4">
				<Table>
					<TableHead>
						<TableHeadCell>No.</TableHeadCell>
						<TableHeadCell>Proveedor - Sucursal</TableHeadCell>
						<TableHeadCell>Fecha</TableHeadCell>
						<TableHeadCell>Total</TableHeadCell>
						<TableHeadCell>Estado</TableHeadCell>
						<TableHeadCell></TableHeadCell>
					</TableHead>
					<TableBody>
						{purchaseInvoices.map(invoice => (
							<TableRow key={invoice.id}>
								<TableCell>
									<LinkWithCurrentSearch
										to={`${invoice.id}`}
										className="text-sm"
									>
										<p>{invoice.internalId}</p>
										<p className="text-sm whitespace-nowrap">
											<strong className="font-medium">Ext.</strong>{' '}
											{invoice.externalInvoiceId}
										</p>
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									<LinkWithCurrentSearch to={`${invoice.id}`}>
										<p>{invoice.supplier.name}</p>
										<p>
											<strong className="text-gray-600 text-xs font-medium">
												Sucursal:
											</strong>{' '}
											{invoice.subOrganization.name}
										</p>
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${invoice.id}`}>
										<ClientOnly>
											{() => (
												<div>
													<p>
														<strong className="font-medium">Creación:</strong>{' '}
														{formatDate(invoice.createdAt)}{' '}
														{formatHours(invoice.createdAt)}
													</p>
													{invoice.receivedAt ? (
														<p>
															<strong className="font-medium">
																Recepción:
															</strong>{' '}
															{formatDate(invoice.receivedAt)}
														</p>
													) : null}
												</div>
											)}
										</ClientOnly>
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${invoice.id}`}>
										<span className="block font-medium">
											${formatCurrency(invoice.total)}
										</span>
										<span className="text-sm">
											Impuestos: ${formatCurrency(invoice.totalTax)}
										</span>
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${invoice.id}`}>
										<IsCancelledToast canceledAt={invoice.canceledAt} />
										{invoice.canceledAt ? (
											<IsCancelledToast canceledAt={invoice.canceledAt} />
										) : (
											<StatusBadge
												status={invoice.pending > 0 ? 'pending' : 'paid'}
												expiresAt={invoice.expiresAt}
											/>
										)}
									</LinkWithCurrentSearch>
								</TableCell>
								<td>
									<InvoiceButtonActions
										no={String(invoice.internalId)}
										options={[
											{
												name: 'Ver factura',
												icon: 'ri-arrow-right-line',
												to: `/purchase-invoices/${invoice.id}`,
											},
											{
												name: 'Imprimir',
												icon: 'ri-printer-line',
												to: `/purchase-invoices/${invoice.id}?print=true`,
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
												to: `/purchase-invoices/${invoice.id}/cancel`,
												condition: !invoice.canceledAt,
											},
										]}
										sourceId={invoice.id}
										origin="purchaseInvoice"
										destination="purchaseInvoice"
									/>
								</td>
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
				Lo sentimos, ha ocurrido un error obteniendo las facturas. Por favor,
				intenta de nuevo más tarde.
			</div>
		</PageWrapper>
	);
}
