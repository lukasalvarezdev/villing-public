import { type LoaderFunctionArgs } from '@remix-run/node';
import { utils, write } from 'xlsx';
import { getOrgDbClient } from '~/utils/db.server';
import { formatDate, getDaysLeft, getRequestSearchParams } from '~/utils/misc';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const searchParams = getRequestSearchParams(request);
	const filters = queryBuilder(searchParams, ['name']);
	const { db, orgId } = await getOrgDbClient(request);

	const baseWhere = {
		organizationId: orgId,
		type: 'loan',
		pending: { gt: 1 },
		client: filters,
		expiresAt: { not: null },
	} as const;
	const select = {
		id: true,
		internalId: true,
		clientId: true,
		pending: true,
		subtotal: true,
		totalTax: true,
		totalDiscount: true,
		expiresAt: true,
	} as const;

	const [allInvoices, allRemisions] = await db.$transaction([
		db.legalInvoice.findMany({
			where: { ...baseWhere, cufe: { not: null } },
			select: select,
			orderBy: { createdAt: 'desc' },
		}),
		db.legalInvoiceRemision.findMany({
			where: { ...baseWhere, canceledAt: null },
			select: select,
			orderBy: { createdAt: 'desc' },
		}),
	]);

	const clientsIds = [
		...new Set([
			...allInvoices.map(i => i.clientId),
			...allRemisions.map(i => i.clientId),
		]),
	];

	const clients = await db.client.findMany({
		where: { id: { in: clientsIds } },
		select: { id: true, name: true, tel: true, idNumber: true },
	});

	const remisions = allRemisions.map(r => ({ ...r, type: 'remision' }));
	const invoices = allInvoices.map(i => ({ ...i, type: 'invoice' }));

	const sales = remisions.concat(invoices).map(sale => {
		const client = clients.find(c => c.id === sale.clientId) || defaultClient;
		const total = sale.subtotal + sale.totalTax - sale.totalDiscount;
		const daysLeft = getDaysLeft(sale.expiresAt || new Date());

		return {
			Nombre: client.name,
			Cedula: client.idNumber,
			Telefono: client.tel,
			Total: total,
			'Fecha de vencimiento': formatDate(sale.expiresAt || new Date()),
			'Dias restantes': daysLeft,
			Pendiente: sale.pending,
		};
	});

	const ws = utils.json_to_sheet(sales);
	const wb = utils.book_new();
	utils.book_append_sheet(wb, ws, 'Sheet1');

	// * export SheetJS workbook object to XLSX file bytes */
	const data = write(wb, { bookType: 'xlsx', type: 'array' });

	/* build FormData with the generated file */
	const fdata = new FormData();
	fdata.append('file', new File([data], 'sheetjs.xlsx'));

	return new Response(fdata.get('file'), {
		headers: {
			'Content-Type':
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': 'attachment; filename="cartera-clientes.xlsx"',
		},
	});
}

const defaultClient = {
	id: '',
	name: 'Cliente no encontrado',
	tel: 'No disponible',
	idNumber: 'No disponible',
};
