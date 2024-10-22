import {
	type LoaderFunctionArgs,
	type MetaFunction,
	json,
} from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { ClientOnly } from '~/components/client-only';
import { RouteErrorBoundary } from '~/components/error-boundary';
import {
	SearchInput,
	FiltersProvider,
	DateRangeFilter,
} from '~/components/filters';
import { InvoiceButtonActions } from '~/components/invoice-button-actions';
import { MultiSelect } from '~/components/multi-select';
import { getLastPage, getQueryPositionData } from '~/components/pagination';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
	PageWrapper,
	LinkWithCurrentSearch,
} from '~/components/ui-library';
import { getInvoiceFilters } from '~/modules/invoice/filters.server';
import { getOrgDbClient } from '~/utils/db.server';
import { cn, formatCurrency, formatDate, formatHours } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{
		title: 'Notas débito de venta - Villing',
		description: 'Notas débito de venta',
	},
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);
	const queryPositionData = getQueryPositionData(request);
	const { createdAt, ...where } = getInvoiceFilters(request);

	const [debitNotes, { debitNotesCount: count }, subOrganizations] =
		await db.$transaction([
			db.debitNote.findMany({
				where: {
					invoice: { organizationId: orgId, ...where },
					createdAt,
				},
				orderBy: { createdAt: 'desc' },
				select: {
					products: true,
					id: true,
					internalId: true,
					invoice: { select: { client: true, internalId: true } },
					subtotal: true,
					totalDiscount: true,
					totalTax: true,
					createdAt: true,
					cude: true,
				},
				...queryPositionData,
			}),
			db.counts.findFirstOrThrow({
				where: { id: orgId },
				select: { debitNotesCount: true },
			}),
			db.subOrganization.findMany({
				where: { organizationId: orgId, deletedAt: null },
				select: { id: true, name: true },
			}),
		]);

	return json({
		debitNotes,
		lastPage: getLastPage(queryPositionData, count),
		subOrganizations,
	});
}

export default function Component() {
	const { debitNotes, subOrganizations } = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<div className="flex gap-4 justify-between items-end mb-4">
				<div className="flex-1">
					<h2 className="mb-1">Notas débito</h2>
					<p className="text-gray-500 text-sm leading-none">
						Notas débito este mes
					</p>
				</div>
				<Link
					className={cn(
						'gap-2 items-center text-sm font-medium flex',
						'bg-gray-900 text-white rounded px-3 h-9 hover:bg-gray-800',
					)}
					to="new"
				>
					<i className="ri-add-line"></i>
					Crear nota débito
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
					<MultiSelect
						label="Sucursal"
						name="subOrganizationId"
						items={subOrganizations}
					/>
				</FiltersProvider>
			</div>

			<div className="rounded border border-gray-200 shadow-sm mb-4">
				<Table>
					<TableHead>
						<TableHeadCell>No.</TableHeadCell>
						<TableHeadCell>Cliente</TableHeadCell>
						<TableHeadCell>Fecha</TableHeadCell>
						<TableHeadCell>Total</TableHeadCell>
						<TableHeadCell>Estado</TableHeadCell>
						<TableHeadCell></TableHeadCell>
					</TableHead>
					<TableBody>
						{debitNotes.map(creditNote => (
							<TableRow key={creditNote.id}>
								<TableCell className="text-sm">
									<LinkWithCurrentSearch
										to={`${creditNote.id}`}
										className="whitespace-nowrap"
									>
										<p>{creditNote.internalId}</p>
										<p className="text-xs">
											Factura No. {creditNote.invoice.internalId}
										</p>
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="whitespace-nowrap">
									<LinkWithCurrentSearch to={`${creditNote.id}`}>
										{creditNote.invoice.client.name}
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${creditNote.id}`}>
										<ClientOnly>
											{() => (
												<div>
													{formatDate(creditNote.createdAt)}{' '}
													{formatHours(creditNote.createdAt)}
												</div>
											)}
										</ClientOnly>
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${creditNote.id}`}>
										<span className="block font-medium">
											$
											{formatCurrency(
												creditNote.subtotal + creditNote.totalTax,
											)}
										</span>
										<span className="text-sm">
											Impuestos: ${formatCurrency(creditNote.totalTax)}
										</span>
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${creditNote.id}`}>
										{creditNote.cude ? (
											<div className="text-sm gap-2 flex text-gray-600">
												<i className="ri-check-line text-success-600"></i>
												<p>Enviada a la DIAN</p>
											</div>
										) : (
											<div className="text-sm gap-2 flex text-gray-600">
												<i className="ri-information-line text-error-600"></i>
												<p>Nota débito inválida</p>
											</div>
										)}
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell>
									<InvoiceButtonActions
										no={String(creditNote.internalId)}
										options={[
											{
												name: 'Ver nota débito',
												icon: 'ri-arrow-right-line',
												to: `/credit-notes/${creditNote.id}`,
											},
											{
												name: 'Imprimir',
												icon: 'ri-printer-line',
												to: `/credit-notes/${creditNote.id}?print=true`,
											},
										]}
										sourceId={creditNote.id}
										origin="legalPosInvoice"
										destination="legalPosInvoice"
									/>
								</TableCell>
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
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con las notas débito. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}
