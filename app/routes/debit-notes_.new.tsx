import {
	type LoaderFunctionArgs,
	type MetaFunction,
	json,
} from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { ClientOnly } from '~/components/client-only';
import { RouteErrorBoundary } from '~/components/error-boundary';
import {
	SearchInput,
	DateRangeFilter,
	FiltersProvider,
} from '~/components/filters';
import { MultiSelect } from '~/components/multi-select';

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
} from '~/components/ui-library';
import { getInvoiceFilters } from '~/modules/invoice/filters.server';
import { getOrgDbClient } from '~/utils/db.server';
import { formatDate, formatHours, formatCurrency } from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{
		title: 'Nueva nota débito de venta | Villing',
		description: 'Nueva nota débito de venta',
	},
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId, userId } = await getOrgDbClient(request);

	await legalActions.validateAndThrow(db, userId, 'see_invoices');

	const queryPositionData = getQueryPositionData(request);

	const where = getInvoiceFilters(request);

	const [invoices, count, subOrganizations] = await db.$transaction([
		db.legalInvoice.findMany({
			where: { ...where, organizationId: orgId, cufe: { not: null } },
			select: {
				client: { select: { name: true } },
				id: true,
				internalId: true,
				createdAt: true,
				subtotal: true,
				totalTax: true,
				cufe: true,
				expiresAt: true,
			},
			orderBy: { createdAt: 'desc' },
			...queryPositionData,
		}),
		db.legalInvoice.count({ where: { organizationId: orgId, ...where } }),
		db.subOrganization.findMany({
			where: { organizationId: orgId, deletedAt: null },
			select: { id: true, name: true },
		}),
	]);

	return json({
		invoices: invoices.map(invoice => ({
			...invoice,
			url: `/invoices/duplicate?origin=legalInvoice&destination=debitNote&id=${invoice.id}`,
			client: invoice.client.name,
		})),
		lastPage: getLastPage(queryPositionData, count),
		subOrganizations,
	});
}

export default function Component() {
	const { invoices, lastPage, subOrganizations } =
		useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<Outlet />

			<div className="flex gap-4 justify-between items-end mb-4">
				<div className="flex-1">
					<h2 className="mb-1">Nueva nota débito</h2>
					<p className="text-gray-500 text-sm leading-none">
						Selecciona una factura para relacionarla a la nueva nota débito.
					</p>
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
							items={subOrganizations}
						/>
					</div>
				</FiltersProvider>
			</div>

			<div className="rounded border border-gray-200 shadow-sm mb-4">
				<Table>
					<TableHead>
						<TableHeadCell>No.</TableHeadCell>
						<TableHeadCell>Cliente</TableHeadCell>
						<TableHeadCell>Fecha</TableHeadCell>
						<TableHeadCell>Total</TableHeadCell>
						<TableHeadCell></TableHeadCell>
					</TableHead>
					<TableBody>
						{invoices.map(invoice => (
							<TableRow key={invoice.id}>
								<TableCell className="text-sm">
									<Link to={invoice.url} className="whitespace-nowrap">
										{invoice.internalId}
									</Link>
								</TableCell>
								<TableCell className="whitespace-nowrap">
									<Link to={invoice.url}>{invoice.client}</Link>
								</TableCell>

								<TableCell>
									<ClientOnly>
										{() => (
											<Link to={invoice.url} className="whitespace-nowrap">
												{formatDate(invoice.createdAt)}{' '}
												<span className="ml-1 text-gray-400">
													({formatHours(invoice.createdAt)})
												</span>
											</Link>
										)}
									</ClientOnly>
								</TableCell>

								<TableCell className="text-sm whitespace-nowrap">
									<p className="whitespace-nowrap">
										<span className="block font-medium">
											${formatCurrency(invoice.subtotal + invoice.totalTax)}
										</span>
										<span className="text-sm">
											Impuestos: ${formatCurrency(invoice.totalTax)}
										</span>
									</p>
								</TableCell>
								<TableCell>
									<Link
										className="flex gap-1 text-sm group items-center whitespace-nowrap"
										to={invoice.url}
										prefetch="intent"
									>
										<span className="group-hover:underline">
											Seleccionar factura
										</span>{' '}
										<i className="ri-arrow-right-line"></i>
									</Link>
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

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con la nota débito. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}
