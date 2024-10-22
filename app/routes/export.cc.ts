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

	const where = {
		organizationId: orgId,
		type: 'loan',
		pending: { gt: 1 },
		supplier: filters,
		expiresAt: { not: null },
		canceledAt: null,
	} as const;
	const select = {
		id: true,
		internalId: true,
		supplierId: true,
		pending: true,
		total: true,
		expiresAt: true,
	} as const;
	const orderBy = { createdAt: 'desc' } as const;

	const [allInvoices, allRemisions] = await db.$transaction([
		db.purchaseInvoice.findMany({ where, select: select, orderBy }),
		db.purchaseRemision.findMany({ where, select: select, orderBy }),
	]);

	const supplierIds = [
		...new Set([
			...allInvoices.map(i => i.supplierId),
			...allRemisions.map(i => i.supplierId),
		]),
	];

	const suppliers = await db.supplier.findMany({
		where: { id: { in: supplierIds } },
		select: { id: true, name: true, tel: true, idNumber: true },
	});

	const remisions = allRemisions.map(r => ({ ...r, type: 'remision' }));
	const invoices = allInvoices.map(i => ({ ...i, type: 'invoice' }));

	const sales = remisions.concat(invoices).map(sale => {
		const supplier =
			suppliers.find(c => c.id === sale.supplierId) || defaultSupplier;
		const daysLeft = getDaysLeft(sale.expiresAt || new Date());

		return {
			Nombre: supplier.name,
			Cedula: supplier.idNumber,
			Telefono: supplier.tel,
			Total: sale.total,
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
			'Content-Disposition': 'attachment; filename="cartera-proveedores.xlsx"',
		},
	});
}

const defaultSupplier = {
	id: '',
	name: 'Proveedor no encontrado',
	tel: 'No disponible',
	idNumber: 'No disponible',
};
