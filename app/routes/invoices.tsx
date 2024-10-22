import {
	type MetaFunction,
	type SerializeFrom,
	type LoaderFunctionArgs,
} from '@remix-run/node';
import { Link, Outlet, useLoaderData, useSearchParams } from '@remix-run/react';

import * as React from 'react';
import { RouteErrorBoundary } from '~/components/error-boundary';
import {
	SearchInput,
	DateRangeFilter,
	InvoiceFilters,
} from '~/components/filters';
import { LinkButton } from '~/components/form-utils';
import { InvoiceButtonActions } from '~/components/invoice-button-actions';
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
	DateWithTime,
	LinkWithCurrentSearch,
} from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import {
	cn,
	formatCurrency,
	getSearchParamsWithDefaultDateRange,
} from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';
import { getWhere } from '~/utils/where-builder';

export const meta: MetaFunction = () => [
	{ title: 'Facturas de venta - Villing', description: 'Facturas de venta' },
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId, userId } = await getOrgDbClient(request);

	await legalActions.validateAndThrow(db, userId, 'see_invoices');

	const { skip, take } = getQueryPositionData(request);
	const queryPositionData = { skip: skip / 2, take: take / 2 };

	const searchParams = getSearchParamsWithDefaultDateRange(request);
	const { createdAt } = queryBuilder(searchParams, ['createdAt']);
	const where = getWhere({ request, params: ['invoice'] });

	const posWhere = {
		...where,
		...getTypeFilter(searchParams, 'pos'),
		organizationId: orgId,
		createdAt,
	};
	const legalInvoicesWhere = {
		...where,
		...getTypeFilter(searchParams, 'electronic'),
		organizationId: orgId,
		createdAt,
	};

	const [sales, count, legalInvoices, legalInvoicesCount, branches] =
		await db.$transaction([
			db.legalPosInvoice.findMany({
				where: { ...posWhere },
				select: {
					id: true,
					clientId: true,
					internalId: true,
					createdAt: true,
					total: true,
					totalTax: true,
					dianId: true,
					cude: true,
					legalJson: true,
					canceledAt: true,
					subOrganizationId: true,
					applyDiscountToTotal: true,
				},
				orderBy: { createdAt: 'desc' },
				...queryPositionData,
			}),
			db.legalPosInvoice.count({ where: posWhere }),
			db.legalInvoice.findMany({
				where: { ...legalInvoicesWhere },
				select: {
					id: true,
					clientId: true,
					internalId: true,
					createdAt: true,
					totalTax: true,
					total: true,
					cufe: true,
					subOrganizationId: true,
					dianId: true,
				},
				orderBy: { createdAt: 'desc' },
				...queryPositionData,
			}),
			db.legalInvoice.count({ where: legalInvoicesWhere }),
			db.subOrganization.findMany({
				where: { organizationId: orgId, deletedAt: null },
				select: { id: true, name: true },
			}),
		]);

	const clients = await db.client.findMany({
		where: {
			organizationId: orgId,
			id: { in: [...sales, ...legalInvoices].map(x => x.clientId) },
		},
		select: { id: true, name: true },
	});

	const pos = sales.map(i => ({ ...i, type: 'pos' as const }));
	const legal = legalInvoices.map(i => ({ ...i, type: 'electronic' as const }));
	const invoices = [...pos, ...legal]
		.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
		.map(invoice => {
			const subOrganization = findSubOrganization(invoice.subOrganizationId);
			const client = clients.find(x => x.id === invoice.clientId);

			if (!client) {
				throw new Response(
					`Client not found for invoice ${invoice.id} with client id ${invoice.clientId}`,
					{ statusText: 'No se encontró el cliente' },
				);
			}

			if (invoice.type === 'pos') {
				return {
					id: invoice.id,
					to: `/invoices/pos/${invoice.id}`,
					no: `POS-${invoice.internalId}`,
					numeration: invoice.dianId,
					client: client.name,
					subOrganization: subOrganization?.name,
					subId: subOrganization?.id,
					createdAt: invoice.createdAt,
					total: invoice.total,
					tax: invoice.totalTax,
					type: 'pos',
					canceledAt: invoice.canceledAt,
					applyDiscountToTotal: invoice.applyDiscountToTotal,
					wasSentToDian: Boolean(invoice.legalJson),
					cude: invoice.cude,
				} as const;
			}

			return {
				id: invoice.id,
				to: `/invoices/${invoice.id}`,
				no: `FE-${invoice.internalId}`,
				client: client.name,
				subOrganization: subOrganization?.name,
				subId: subOrganization?.id,
				createdAt: invoice.createdAt,
				total: invoice.total,
				tax: invoice.totalTax,
				type: 'electronic',
				cufe: invoice.cufe,
				numeration: invoice.dianId.split('-')[1] || 'Sin numeración',
				applyDiscountToTotal: false,
			} as const;
		});

	return {
		invoices,
		branches,
		lastPage: getLastPage(queryPositionData, count + legalInvoicesCount),
	};

	function findSubOrganization(id: number) {
		return branches.find(x => x.id === id);
	}
}

export default function Component() {
	const { invoices, lastPage, branches } = useLoaderData<typeof loader>();
	const [searchParams] = useSearchParams();

	return (
		<div>
			<Outlet />

			<PageWrapper className="print:hidden">
				<div className="flex gap-4 justify-between lg:items-end mb-4 flex-col lg:flex-row">
					<div className="flex-1">
						<h2 className="mb-1">Facturas de venta</h2>
						<p className="text-gray-500 text-sm leading-none">
							Todas las facturas POS y electrónicas
						</p>
					</div>

					<div className="flex gap-4 flex-col md:flex-row-reverse">
						<div className="flex flex-col md:flex-row gap-4">
							<LinkButton
								to="/invoices/pos/new"
								prefetch="intent"
								variant="black"
							>
								<i className="ri-add-line"></i>
								Crear venta POS
							</LinkButton>
							<LinkButton
								to="/builder/electronic/new"
								prefetch="intent"
								variant="black"
							>
								<i className="ri-add-line"></i>
								Crear factura electrónica
							</LinkButton>
						</div>

						<div className="flex gap-4 children:flex-1">
							<Link
								to={`/invoices/report/spreadsheet?${searchParams.toString()}`}
								className={cn(
									'px-3 h-9 items-center gap-2 rounded bg-white shadow-sm',
									'border border-gray-100 text-sm',
									'flex justify-center whitespace-nowrap',
								)}
								prefetch="intent"
							>
								<i className="ri-file-excel-line text-success-700"></i>
								Exportar a Excel
							</Link>
							<Link
								to={`/invoices/report?${searchParams.toString()}`}
								className={cn(
									'px-3 h-9 items-center gap-2 rounded bg-white shadow-sm',
									'border border-gray-100 text-sm',
									'flex justify-center',
								)}
								prefetch="intent"
							>
								<i className="ri-file-upload-line"></i>
								Exportar a PDF
							</Link>
						</div>
					</div>
				</div>

				<div className="mb-4">
					<div className="flex flex-col md:flex-row mb-4 gap-4">
						<div className="flex-1">
							<SearchInput placeholder="Busca por No. cliente o producto" />
						</div>
						<div className="shrink-0">
							<DateRangeFilter />
						</div>
					</div>
					<InvoiceFilters>
						<MultiSelect
							label="Tipo de factura"
							name="type"
							items={[
								{ id: 'pos', name: 'POS' },
								{ id: 'electronic', name: 'Electrónica' },
							]}
							unique
						/>

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
							{invoices.map((invoice, index) => (
								<InvoiceItem key={index} invoice={invoice} />
							))}
						</TableBody>
					</Table>
				</div>

				<Pagination lastPage={lastPage} />
			</PageWrapper>
		</div>
	);
}

type InvoiceType = SerializeFrom<typeof loader>['invoices'][0];

function InvoiceItem({ invoice }: { invoice: InvoiceType }) {
	const options = getInvoiceOptions(invoice);
	const to = invoice.to;

	return (
		<TableRow>
			<TableCell className="text-sm">
				<LinkWithCurrentSearch to={to} className="whitespace-nowrap">
					{invoice.no}
					<p className="text-xs text-gray-500">{invoice.numeration}</p>
				</LinkWithCurrentSearch>
			</TableCell>
			<TableCell className="whitespace-nowrap text-sm">
				<LinkWithCurrentSearch to={to}>
					<p>{invoice.client}</p>
					<p>
						<strong className="text-gray-600 text-xs">Sucursal:</strong>{' '}
						{invoice.subOrganization}
					</p>
				</LinkWithCurrentSearch>
			</TableCell>

			<TableCell>
				<LinkWithCurrentSearch to={to} className="whitespace-nowrap text-sm">
					<DateWithTime date={invoice.createdAt} />
				</LinkWithCurrentSearch>
			</TableCell>

			<TableCell className="text-sm whitespace-nowrap">
				<p className="whitespace-nowrap">
					<span className="block font-medium">
						${formatCurrency(invoice.total)}
					</span>
					<span className="text-sm">
						Impuestos: ${formatCurrency(invoice.tax)}
					</span>
				</p>
			</TableCell>
			<TableCell>
				<LinkWithCurrentSearch to={to} className="whitespace-nowrap">
					<InvoiceStateBadge invoice={invoice} />
				</LinkWithCurrentSearch>
			</TableCell>
			<TableCell>
				<InvoiceButtonActions
					options={options}
					origin={invoice.type === 'pos' ? 'legalPosInvoice' : 'legalInvoice'}
					destination={
						invoice.type === 'pos' ? 'legalPosInvoice' : 'legalInvoice'
					}
					sourceId={invoice.id}
					no={invoice.no}
				/>
			</TableCell>
		</TableRow>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con las facturas. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}

function InvoiceStateBadge({ invoice }: { invoice: InvoiceType }) {
	switch (invoice.type) {
		case 'pos': {
			if (invoice.canceledAt) {
				return <Badge variant="error" text="Anulada" />;
			}

			if (!invoice.wasSentToDian) {
				return <Badge variant="info" text="Sin POS electrónico" />;
			}

			if (invoice.cude) {
				return <Badge variant="success" text="POS válida en DIAN" />;
			}

			return <Badge variant="error" text="POS inválida" />;
		}
		case 'electronic': {
			if (invoice.cufe) {
				return <Badge variant="success" text="Válida en DIAN" />;
			}

			return <Badge variant="error" text="Factura inválida" />;
		}
		default:
			return null;
	}
}

function Badge({
	text,
	variant,
}: {
	text: string;
	variant: 'success' | 'error' | 'info';
}) {
	if (variant === 'error') {
		return (
			<div className="whitespace-nowrap text-gray-600 text-sm items-center gap-2 flex">
				<i className="ri-information-line text-error-600"></i>
				<p>{text}</p>
			</div>
		);
	}

	if (variant === 'info') {
		return (
			<div className="whitespace-nowrap text-gray-600 text-sm items-center gap-2 flex">
				<i className="ri-information-line"></i>
				<p>{text}</p>
			</div>
		);
	}

	return (
		<div className="whitespace-nowrap text-gray-600 text-sm items-center gap-2 flex">
			<i className="ri-check-line text-success-600"></i>
			<p>{text}</p>
		</div>
	);
}

type OptionsType = React.ComponentProps<typeof InvoiceButtonActions>['options'];
function getInvoiceOptions(invoice: InvoiceType): OptionsType {
	let base: OptionsType = [];

	if (invoice.type === 'pos') {
		base = [
			{ name: 'Ver venta', icon: 'ri-arrow-right-line', to: invoice.to },
			{
				name: 'Imprimir',
				icon: 'ri-printer-line',
				to: `/invoices/pos/${invoice.id}?print=true`,
			},
			{
				name: 'Duplicar',
				icon: 'ri-file-copy-line',
				to: '/invoices/duplicate',
				action: 'duplicate',
			},
			{
				name: 'Anular',
				icon: 'ri-close-circle-line',
				to: `/invoices/pos/${invoice.id}/cancel`,
				condition: !invoice.canceledAt,
			},
		];

		if (!invoice.applyDiscountToTotal) {
			base.push({
				name: 'Pasar a factura electrónica',
				icon: 'ri-file-text-line',
				to: '/invoices/duplicate',
				action: 'duplicate',
				destination: 'legalInvoice',
			});
		}
	} else {
		base = [
			{
				name: 'Ver factura',
				icon: 'ri-arrow-right-line',
				to: `/invoices/${invoice.id}`,
			},
			{
				name: 'Imprimir',
				icon: 'ri-printer-line',
				to: `/invoices/${invoice.id}?print=true`,
			},
			{
				name: 'Duplicar',
				icon: 'ri-file-copy-line',
				to: '/invoices/duplicate',
				action: 'duplicate',
			},
		];
	}

	return base;
}

export function getTypeFilter(
	searchParams: URLSearchParams,
	type: 'pos' | 'electronic',
) {
	const searchParamsType = searchParams.get('type');
	if (searchParamsType && searchParamsType !== type) {
		return { id: 0 };
	}
}
