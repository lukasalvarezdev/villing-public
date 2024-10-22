import {
	type LoaderFunctionArgs,
	type MetaFunction,
	json,
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
		title: 'Remisiones de compra - Villing',
		description: 'Remisiones de compra',
	},
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const paginationData = getQueryPositionData(request);
	const { db, orgId, userId } = await getOrgDbClient(request);

	await legalActions.validateAndThrow(db, userId, 'see_purchases');

	const where = getPurchasesWhere(request);

	const [remisions, suborganizations] = await db.$transaction([
		db.purchaseRemision.findMany({
			where: { organizationId: orgId, ...where },
			orderBy: { createdAt: 'desc' },
			include: {
				supplier: { include: { address: true } },
				products: true,
				subOrganization: true,
				user: true,
				purchaseInvoice: true,
			},
			skip: paginationData.skip,
			take: paginationData.take,
		}),
		db.subOrganization.findMany({
			where: { organizationId: orgId, deletedAt: null },
			select: { id: true, name: true },
		}),
	]);

	return json({ remisions, suborganizations });
}

export default function Component() {
	const { remisions, suborganizations } = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<div className="flex gap-4 justify-between items-end mb-4">
				<div className="flex-1">
					<h2 className="mb-1">Remisiones de compra</h2>
					<p className="text-gray-500 text-sm leading-none">
						Remisiones de compra este mes
					</p>
				</div>
				<Link
					className={clsx(
						'gap-2 items-center text-sm font-medium flex',
						'bg-gray-900 text-white rounded px-3 h-9 hover:bg-gray-800',
					)}
					to="/builder/purchaseRemision/new"
					prefetch="intent"
				>
					<i className="ri-add-line"></i>
					Crear remisión de compra
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

			<div className="rounded border border-gray-200 shadow-sm mb-4 text-sm">
				<Table>
					<TableHead>
						<TableHeadCell>No.</TableHeadCell>
						<TableHeadCell className="whitespace-nowrap">
							Proveedor - Sucursal
						</TableHeadCell>
						<TableHeadCell>Fecha</TableHeadCell>
						<TableHeadCell>Estado</TableHeadCell>
						<TableHeadCell>Total</TableHeadCell>
						<TableHeadCell></TableHeadCell>
					</TableHead>

					<TableBody>
						{remisions.map(remision => (
							<TableRow key={remision.id}>
								<TableCell>
									<LinkWithCurrentSearch to={`${remision.id}`}>
										<p>{remision.internalId}</p>
										<p className="text-sm whitespace-nowrap">
											<strong className="font-medium">Ext.</strong>{' '}
											{remision.externalInvoiceId}
										</p>
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									<LinkWithCurrentSearch to={`${remision.id}`}>
										<p>{remision.supplier.name}</p>
										<p>
											<strong className="text-gray-600 text-xs font-medium">
												Sucursal:
											</strong>{' '}
											{remision.subOrganization.name}
										</p>
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${remision.id}`}>
										<ClientOnly>
											{() => (
												<div>
													<p>
														<strong className="font-medium">Creación:</strong>{' '}
														{formatDate(remision.createdAt)}{' '}
														{formatHours(remision.createdAt)}
													</p>
													{remision.receivedAt ? (
														<p>
															<strong className="font-medium">
																Recepción:
															</strong>{' '}
															{formatDate(remision.receivedAt)}
														</p>
													) : null}
												</div>
											)}
										</ClientOnly>
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${remision.id}`}>
										{remision.canceledAt ? (
											<IsCancelledToast canceledAt={remision.canceledAt} />
										) : (
											<StatusBadge
												status={remision.pending > 0 ? 'pending' : 'paid'}
												expiresAt={remision.expiresAt}
											/>
										)}
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${remision.id}`}>
										<span className="block font-medium">
											${formatCurrency(remision.total)}
										</span>
										<span className="text-sm">
											Impuestos: ${formatCurrency(remision.totalTax)}
										</span>
									</LinkWithCurrentSearch>
								</TableCell>
								<td>
									<InvoiceButtonActions
										no={String(remision.internalId)}
										options={[
											{
												name: 'Ver remisión',
												icon: 'ri-arrow-right-line',
												to: `/remisions/${remision.id}`,
											},
											{
												name: 'Imprimir',
												icon: 'ri-printer-line',
												to: `/remisions/${remision.id}?print=true`,
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
												to: `/remisions/${remision.id}/cancel`,
												condition: !remision.canceledAt,
											},
											{
												name: 'Pasar a factura',
												icon: 'ri-file-text-line',
												to: '/invoices/duplicate',
												action: 'duplicate',
												destination: 'purchaseInvoice',
												condition: !remision.purchaseInvoice,
											},
										]}
										sourceId={remision.id}
										origin="purchaseRemision"
										destination="purchaseRemision"
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
