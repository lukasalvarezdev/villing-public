import {
	type LoaderFunctionArgs,
	type MetaFunction,
	json,
} from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import clsx from 'clsx';
import { ClientOnly } from '~/components/client-only';
import { RouteErrorBoundary } from '~/components/error-boundary';
import {
	SearchInput,
	FiltersProvider,
	DateRangeFilter,
} from '~/components/filters';
import { InvoiceButtonActions } from '~/components/invoice-button-actions';
import { MultiSelect } from '~/components/multi-select';
import { getQueryPositionData } from '~/components/pagination';
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
		title: 'Órdenes de compra | Villing',
		description: 'Órdenes de compra',
	},
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const paginationData = getQueryPositionData(request);
	const { db, orgId, userId } = await getOrgDbClient(request);

	await legalActions.validateAndThrow(db, userId, 'see_purchases');

	const where = getPurchasesWhere(request);

	const [purchases, suborganizations] = await db.$transaction([
		db.purchase.findMany({
			where: { organizationId: orgId, ...where },
			orderBy: { createdAt: 'desc' },
			include: {
				supplier: { include: { address: true } },
				products: true,
				subOrganization: true,
				user: true,
				purchaseInvoice: true,
				purchaseRemision: true,
			},
			skip: paginationData.skip,
			take: paginationData.take,
		}),
		db.subOrganization.findMany({
			where: { organizationId: orgId, deletedAt: null },
			select: { id: true, name: true },
		}),
	]);

	return json({ purchases, suborganizations });
}

export default function Component() {
	const { purchases, suborganizations } = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<div className="flex gap-4 justify-between md:items-end mb-4 flex-col md:flex-row">
				<div className="flex-1">
					<h2 className="mb-1">Órdenes de compra</h2>
					<p className="text-gray-500 text-sm leading-none">
						Órdenes de compra este mes
					</p>
				</div>

				<div className="flex gap-4">
					<Link
						className={clsx(
							'gap-2 items-center text-sm font-medium flex',
							'bg-gray-900 text-white rounded px-3 h-9 hover:bg-gray-800',
						)}
						to="/builder/purchase/new"
						prefetch="intent"
					>
						<i className="ri-add-line"></i>
						Crear órden de compra
					</Link>
				</div>
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
						<TableHeadCell className="whitespace-nowrap">
							Proveedor - Sucursal
						</TableHeadCell>
						<TableHeadCell>Fecha</TableHeadCell>
						<TableHeadCell>Estado</TableHeadCell>
						<TableHeadCell>Total</TableHeadCell>
						<TableHeadCell></TableHeadCell>
					</TableHead>
					<TableBody>
						{purchases.map(purchase => (
							<TableRow key={purchase.id}>
								<TableCell>
									<LinkWithCurrentSearch to={`${purchase.id}`}>
										{purchase.internalId}
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									<LinkWithCurrentSearch to={`${purchase.id}`}>
										<p>{purchase.supplier.name}</p>
										<p>
											<strong className="text-gray-600 text-xs">
												Sucursal:
											</strong>{' '}
											{purchase.subOrganization.name}
										</p>
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${purchase.id}`}>
										<ClientOnly>
											{() => (
												<div>
													{formatDate(purchase.createdAt)}{' '}
													{formatHours(purchase.createdAt)}
												</div>
											)}
										</ClientOnly>
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${purchase.id}`}>
										{purchase.canceledAt ? (
											<IsCancelledToast canceledAt={purchase.canceledAt} />
										) : (
											<p className="text-gray-600 text-sm">
												<i className="ri-check-line mr-2"></i>Vigente
											</p>
										)}
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${purchase.id}`}>
										<span className="block font-medium">
											${formatCurrency(purchase.total)}
										</span>
										<span className="text-sm">
											Impuestos: ${formatCurrency(purchase.totalTax)}
										</span>
									</LinkWithCurrentSearch>
								</TableCell>
								<td>
									<InvoiceButtonActions
										no={String(purchase.internalId)}
										options={[
											{
												name: 'Ver compra',
												icon: 'ri-arrow-right-line',
												to: `/purchases/${purchase.id}`,
											},
											{
												name: 'Imprimir',
												icon: 'ri-printer-line',
												to: `/purchases/${purchase.id}?print=true`,
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
												to: `/purchases/${purchase.id}/cancel`,
												condition: !purchase.canceledAt,
											},
											{
												name: 'Pasar a remisión',
												icon: 'ri-file-text-line',
												to: '/invoices/duplicate',
												action: 'duplicate',
												destination: 'purchaseRemision',
												condition:
													!purchase.purchaseRemision &&
													!purchase.purchaseInvoice,
											},
											{
												name: 'Pasar a factura',
												icon: 'ri-file-text-line',
												to: '/invoices/duplicate',
												action: 'duplicate',
												destination: 'purchaseInvoice',
												condition: Boolean(
													purchase.purchaseRemision &&
														!purchase.purchaseInvoice,
												),
											},
										]}
										sourceId={purchase.id}
										origin="purchase"
										destination="purchase"
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

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con las compras. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}
