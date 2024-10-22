import {
	type DataFunctionArgs,
	type MetaFunction,
	json,
} from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import clsx from 'clsx';
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
	DateWithTime,
	LinkWithCurrentSearch,
} from '~/components/ui-library';
import { getInvoiceFilters } from '~/modules/invoice/filters.server';
import { getOrgDbClient } from '~/utils/db.server';
import { formatCurrency } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{
		title: 'Cotizaciones de venta - Villing',
		description: 'Cotizaciones de venta',
	},
];

export async function loader({ request }: DataFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const where = getInvoiceFilters(request);
	const queryPositionData = getQueryPositionData(request);

	const [quotes, suborganizations] = await Promise.all([
		db.quoteInvoice.findMany({
			where: { organizationId: orgId, ...where },
			orderBy: { createdAt: 'desc' },
			include: {
				client: true,
				products: true,
				subOrganization: true,
				user: true,
			},
			...queryPositionData,
		}),
		db.subOrganization.findMany({
			where: { organizationId: orgId, deletedAt: null },
			select: { id: true, name: true },
		}),
	]);

	return json({ quotes, suborganizations });
}

export default function Component() {
	const { quotes, suborganizations } = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<div className="flex gap-4 justify-between items-end mb-4">
				<div className="flex-1">
					<h2 className="mb-1">Cotizaciones</h2>
					<p className="text-gray-500 text-sm leading-none">
						Cotizaciones de venta este mes
					</p>
				</div>
				<Link
					className={clsx(
						'gap-2 items-center text-sm font-medium hidden md:flex',
						'bg-gray-900 text-white rounded px-3 h-9 hover:bg-gray-800',
					)}
					to="/invoices/pos/new"
				>
					<i className="ri-add-line"></i>
					Crear cotización
				</Link>
				<Link
					className={clsx(
						'flex gap-2 items-center text-sm font-medium md:hidden',
						'bg-gray-900 text-white rounded px-3 h-9 hover:bg-gray-800',
					)}
					to="/invoices/pos/new"
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
							label="Estado"
							name="status"
							items={[
								{ id: 'paid', name: 'Pagada' },
								{ id: 'pending', name: 'Pendiente' },
								{ id: 'expired', name: 'Vencida' },
							]}
						/>
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
							Cliente - Sucursal
						</TableHeadCell>
						<TableHeadCell>Fecha</TableHeadCell>
						<TableHeadCell>Total</TableHeadCell>
						<TableHeadCell></TableHeadCell>
					</TableHead>
					<TableBody>
						{quotes.map(quote => (
							<TableRow key={quote.id}>
								<TableCell className="text-sm">
									<LinkWithCurrentSearch to={`${quote.id}`}>
										{quote.internalId}
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									<LinkWithCurrentSearch to={`${quote.id}`}>
										<p>{quote.client.name}</p>
										<p>
											<strong className="text-gray-600 text-xs">
												Sucursal:
											</strong>{' '}
											{quote.subOrganization.name}
										</p>
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${quote.id}`}>
										<DateWithTime date={quote.createdAt} />
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${quote.id}`}>
										<span className="block font-medium">
											${formatCurrency(quote.total)}
										</span>
										<span className="text-sm">
											Impuestos: ${formatCurrency(quote.totalTax)}
										</span>
									</LinkWithCurrentSearch>
								</TableCell>
								<td>
									<InvoiceButtonActions
										options={[
											{
												name: 'Ver cotización',
												icon: 'ri-arrow-right-line',
												to: `/quotes/${quote.id}`,
											},
											{
												name: 'Imprimir',
												icon: 'ri-printer-line',
												to: `/quotes/${quote.id}?print=true`,
											},
											{
												name: 'Duplicar',
												icon: 'ri-file-copy-line',
												to: '/invoices/duplicate',
												action: 'duplicate',
											},
											{
												name: 'Pasar a factura electrónica',
												icon: 'ri-file-text-line',
												to: '/invoices/duplicate',
												action: 'duplicate',
												destination: 'legalInvoice',
											},
										]}
										origin="quote"
										destination="legalPosInvoice"
										sourceId={quote.id}
										no={String(quote.internalId)}
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
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con las cotizaciones. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}
