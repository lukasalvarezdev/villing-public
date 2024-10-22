import { type LoaderFunctionArgs } from '@remix-run/node';
import { utils, write } from 'xlsx';
import { getOrgDbClient } from '~/utils/db.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const { PriceList: priceLists, SubOrganization: branches } =
		await db.organization.findUniqueOrThrow({
			where: { id: orgId },
			select: {
				PriceList: {
					where: { deletedAt: null },
					select: { id: true, name: true },
				},
				SubOrganization: {
					where: { deletedAt: null },
					select: { id: true, name: true },
				},
			},
		});
	const products = await db.product.findMany({
		where: { organizationId: orgId },
		include: {
			brand: true,
			category: true,
			stocks: {
				include: {
					subOrg: { select: { name: true } },
				},
			},
			prices: {
				include: {
					priceList: { select: { name: true } },
				},
			},
		},
	});
	const templateHeaders = await getTemplateHeaders();

	const columns = products.map(p => {
		return {
			Nombre: p.name,
			Descripción: p.description,
			Referencia: p.reference,
			'Costo unitario': p.price,
			Impuesto: p.tax,
			Marca: p.brand?.name,
			Categoría: p.category?.name,
			'Códigos de barra': p.barCodes.join(', '),
			Lote: p.batch,
			'Registro invima': p.invimaRegistry,
			'Fecha de vencimiento': p.expirationDate,
			...priceLists.reduce(
				(acc, priceList) => {
					const priceValue = p.prices.find(p => p.priceListId === priceList.id);

					acc[`Precio:${priceList.name}`] = priceValue?.value ?? 0;
					return acc;
				},
				{} as Record<string, number>,
			),
			...branches.reduce(
				(acc, branch) => {
					const stockValue = p.stocks.find(s => s.subOrgId === branch.id);

					acc[`Stock:${branch.name}`] = stockValue?.value ?? 0;
					return acc;
				},
				{} as Record<string, number>,
			),
		};
	});
	const columnsArrays = columns.map(c => Object.values(c));
	const ws = utils.aoa_to_sheet([templateHeaders, ...columnsArrays]);
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
			'Content-Disposition': 'attachment; filename="sheetjs.xlsx"',
		},
	});

	async function getTemplateHeaders() {
		const priceColumns = priceLists.map(p => `price:${p.name.toLowerCase()}`);
		const stockColumns = branches.map(s => `stock:${s.name.toLowerCase()}`);

		return [...baseHeaders, ...priceColumns, ...stockColumns].map(header => {
			const isPrice = header.startsWith('price:');

			if (isPrice) {
				const priceListName = header.split(':')[1]!;
				return `Precio:${priceListName}`;
			}

			return defaultTranslations[header] || header;
		});
	}
}

export const defaultTranslations = {
	name: 'Nombre',
	description: 'Descripción',
	reference: 'Referencia',
	price: 'Costo unitario',
	tax: 'Impuesto',
	brand: 'Marca',
	category: 'Categoría',
	barCodes: 'Códigos de barra',
	lot: 'Lote',
	invima: 'Registro invima',
	expiryDate: 'Fecha de vencimiento',
} as Record<string, string>;

export const baseHeaders = [
	'name',
	'description',
	'reference',
	'price',
	'tax',
	'brand',
	'category',
	'barCodes',
	'lot',
	'invima',
	'expiryDate',
];
