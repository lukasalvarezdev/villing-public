import {
	type LoaderFunctionArgs,
	type MetaFunction,
	json,
} from '@remix-run/node';
import { Link, useLoaderData, useLocation } from '@remix-run/react';
import { Button } from '~/components/form-utils';
import { Modal } from '~/components/modal';
import { PrintableContent } from '~/components/printable-content';
import { getInvoiceFilters } from '~/modules/invoice/filters.server';
import { useOrganization } from '~/root';
import { getOrgDbClient } from '~/utils/db.server';
import {
	getSearchParamsWithDefaultDateRange,
	cn,
	formatDate,
	formatHours,
	formatCurrency,
} from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';
import { getTypeFilter } from './invoices';

export const meta: MetaFunction = () => [
	{
		title: 'Reporte de facturas - Villing',
		description: 'Reporte de facturas',
	},
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const searchParams = getSearchParamsWithDefaultDateRange(request);
	const where = getInvoiceFilters(request);

	const posWhere = {
		organizationId: orgId,
		...where,
		...getTypeFilter(searchParams, 'pos'),
	};
	const legalInvoicesWhere = {
		organizationId: orgId,
		...where,
		...getTypeFilter(searchParams, 'electronic'),
	};

	const [invoices, sales] = await db.$transaction([
		db.legalInvoice.findMany({
			where: legalInvoicesWhere,
			select: {
				client: { select: { name: true, idNumber: true } },
				id: true,
				internalId: true,
				createdAt: true,
				subtotal: true,
				totalTax: true,
				cufe: true,
				expiresAt: true,
				subOrganization: { select: { name: true } },
				dianId: true,
			},
			orderBy: { createdAt: 'desc' },
		}),
		db.legalPosInvoice.findMany({
			where: posWhere,
			select: {
				client: { select: { name: true, idNumber: true } },
				id: true,
				internalId: true,
				createdAt: true,
				total: true,
				totalTax: true,
				canceledAt: true,
				subtotal: true,
				subOrganization: { select: { name: true } },
			},
			orderBy: { createdAt: 'desc' },
		}),
		db.legalInvoice.count({ where: legalInvoicesWhere }),
		db.legalPosInvoice.count({ where: posWhere }),
	]);

	const allInvoices = [...invoices, ...sales].sort((a, b) => {
		if (a.createdAt > b.createdAt) return -1;
		if (a.createdAt < b.createdAt) return 1;
		return 0;
	});

	const invoicesToPrint = allInvoices.map(invoice => {
		if ('dianId' in invoice) {
			return {
				internalId: invoice.internalId,
				clientIdNumber: invoice.client.idNumber,
				clientName: invoice.client.name,
				subOrganizationName: invoice.subOrganization.name,
				createdAt: invoice.createdAt,
				subtotal: invoice.subtotal,
				totalTax: invoice.totalTax,
				dianId: invoice.dianId,
			};
		}

		return {
			internalId: invoice.internalId,
			clientIdNumber: invoice.client.idNumber,
			clientName: invoice.client.name,
			subOrganizationName: invoice.subOrganization.name,
			createdAt: invoice.createdAt,
			subtotal: invoice.subtotal,
			totalTax: invoice.totalTax,
			dianId: null,
		};
	}) satisfies Array<InvoiceToPrint>;
	const toPrintTotals = invoicesToPrint.reduce(
		(acc, invoice) => {
			if (invoice.totalTax > 0) {
				acc.salesWithTax += invoice.subtotal + invoice.totalTax;
			} else {
				acc.salesWithoutTax += invoice.subtotal + invoice.totalTax;
			}

			return {
				...acc,
				subtotal: acc.subtotal + invoice.subtotal,
				totalTax: acc.totalTax + invoice.totalTax,
			};
		},
		{ subtotal: 0, totalTax: 0, salesWithTax: 0, salesWithoutTax: 0 },
	);

	return json({ invoicesToPrint, toPrintTotals });
}

export default function Component() {
	const { invoicesToPrint } = useLoaderData<typeof loader>();
	const { search } = useLocation();

	return (
		<div>
			<ReportPdf />
			<Modal className="max-w-lg print:hidden">
				<h3 className="font-medium mb-1">Exportar reporte de ventas a pdf</h3>

				<p className="mb-4 text-gray-500 text-sm">
					Estás a punto de generar un reporte de ventas con un total de{' '}
					<strong>{invoicesToPrint.length}</strong> facturas. ¿Deseas continuar?
				</p>

				<div>
					<Button
						className={cn('w-full mb-2')}
						variant="black"
						onClick={() => window.print()}
					>
						<i className="ri-file-upload-line"></i>
						Exportar reporte de ventas
					</Button>
					<Link
						className={cn(
							'w-full bg-white border border-gray-100 shadow-sm h-9 text-sm rounded-md',
							'flex items-center justify-center hover:bg-gray-50',
						)}
						to={`/invoices${search}`}
					>
						Cancelar
					</Link>
				</div>
			</Modal>
		</div>
	);
}

type InvoiceToPrint = {
	internalId: number;
	createdAt: string | Date;
	clientName: string;
	clientIdNumber: string;
	subOrganizationName: string;
	subtotal: number;
	totalTax: number;
};

export function ReportPdf() {
	const { email, idNumber, name, tel } = useOrganization();
	const { invoicesToPrint, toPrintTotals } = useLoaderData<typeof loader>();
	const { subtotal, totalTax, salesWithTax, salesWithoutTax } = toPrintTotals;

	return (
		<PrintableContent>
			<div className="text-sm">
				<header className="text-center mx-auto mb-4">
					<section className="children:leading-4">
						<p>{name}</p>
						<p>
							Nit. <span className="font-bold">{idNumber}</span>
						</p>
						<p>
							Tel. <span className="font-bold">{tel}</span>
						</p>
						<p>
							Email. <span className="font-bold">{email}</span>
						</p>
					</section>
				</header>

				<div className="mb-4 text-center">
					<h5 className="font-bold text-base">REPORTE DE VENTAS</h5>
					<p>
						<span className="font-bold">Fecha impresión:</span>{' '}
						{formatDate(new Date())} {formatHours(new Date())}
					</p>
				</div>

				<section className="mb-4 text-xs">
					<table className="mx-auto w-full table-auto">
						<thead className="text-left h-8 bg-gray-50 text-gray-800 text-sm border-y border-gray-400">
							<tr className="text-left children:pb-1">
								<th className="pl-2 font-medium">No.</th>
								<th className="pl-2 font-medium">No. DIAN</th>
								<th className="pl-2 font-medium">Fecha - Sucursal</th>
								<th className="pl-2 font-medium">Cliente</th>
								<th className="pl-2 font-medium">Subtotal</th>
								<th className="pl-2 font-medium">Total</th>
							</tr>
						</thead>

						<tbody>
							{invoicesToPrint.map((invoice, index) => (
								<tr className="border-b border-gray-400" key={index}>
									<td className="pl-2" style={{ wordBreak: 'break-word' }}>
										<p className="break-words">{invoice.internalId}</p>
									</td>
									<td className="pl-2" style={{ wordBreak: 'break-word' }}>
										<p className="break-words">
											{invoice.dianId?.split('-')?.[1] || '-'}
										</p>
									</td>
									<td className="pl-2">
										<p className="leading-4 whitespace-nowrap">
											<span className="block">
												{formatDate(invoice.createdAt)}{' '}
												{formatHours(invoice.createdAt)}
											</span>
											<span className="block">
												{invoice.subOrganizationName}
											</span>
										</p>
									</td>
									<td className="pl-2">
										<p className="leading-4 whitespace-nowrap">
											<span className="block">{invoice.clientName}</span>
											<span className="block">
												NIT: {invoice.clientIdNumber}
											</span>
										</p>
									</td>
									<td className="pl-2">
										<p className="leading-4">
											${formatCurrency(invoice.subtotal)}
										</p>
										<p className="leading-4">
											Impuestos: ${formatCurrency(invoice.totalTax)}
										</p>
									</td>
									<td className="pl-2">
										<p className="leading-4">
											${formatCurrency(invoice.subtotal + invoice.totalTax)}
										</p>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>

				<section className="border-b border-black border-dashed pb-1 text-sm children:leading-4 mb-1 text-right">
					<p>
						<span className="font-bold">Subtotal:</span> $
						{formatCurrency(subtotal)}
					</p>
					<p>
						<span className="font-bold">Impuestos:</span> $
						{formatCurrency(totalTax)}
					</p>
					<p>
						<span className="font-bold">Ventas con IVA:</span> $
						{formatCurrency(salesWithTax)}
					</p>
					<p>
						<span className="font-bold">Ventas sin IVA:</span> $
						{formatCurrency(salesWithoutTax)}
					</p>

					<p className="text-base">
						<span className="font-bold">TOTAL:</span> $
						{formatCurrency(subtotal + totalTax)}
					</p>
				</section>

				<p className="text-sm text-center leading-4">
					Reporte generado por Villing con ♥️, visita{' '}
					<span className="underline">villing.io</span>
				</p>
			</div>
		</PrintableContent>
	);
}
