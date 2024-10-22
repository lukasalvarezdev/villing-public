import { z } from 'zod';
import { getPurchaseFilters } from '~/modules/invoice/filters.server';
import { stringToTsVector } from './misc';

type Params = 'invoice';

type WhereArgs = {
	request: Request;
	params: Array<Params>;
};
export function getWhere({ params, request }: WhereArgs) {
	const searchParams = new URL(request.url).searchParams;
	const result = schema.safeParse(Object.fromEntries(searchParams.entries()));
	if (!result.success) return {};

	const data = result.data;
	let where: InvoiceWhere = {};

	if (params.includes('invoice')) {
		if (data.invoice_type) {
			where = { ...where, type: data.invoice_type };
		}

		if (data.search) {
			where = {
				...where,
				OR: [
					{ client: getPersonSearch(data.search) },
					{ products: getProductSearch(data.search) },
				],
			};
		}

		if (data.branchId) {
			where = { ...where, subOrganizationId: data.branchId };
		}

		if (data.payment_method) {
			where = {
				...where,
				paymentForms: { some: { type: data.payment_method } },
			};
		}
	}

	return where;
}

export function getProductsWhere(request: Request) {
	const searchParams = new URL(request.url).searchParams;
	const search = searchParams.get('search') || '';

	if (!search) return {};

	return {
		OR: [{ products: getProductSearch(search) }],
	};
}

function getPersonSearch(search: string) {
	return {
		OR: [
			{ name: { search: stringToTsVector(search) } },
			{ email: { search: stringToTsVector(search) } },
			{ idNumber: { equals: search } },
		],
	};
}

function getProductSearch(search: string) {
	return {
		some: {
			product: {
				OR: [
					{ name: { search: stringToTsVector(search) } },
					{ reference: { search: stringToTsVector(search) } },
					{ barCodes: { has: search } },
					{ batch: { search: stringToTsVector(search) } },
					{ invimaRegistry: { search: stringToTsVector(search) } },
				],
			},
		},
	};
}

export function getPurchasesWhere(request: Request) {
	const where = getPurchaseFilters(request);
	const productsWhere = getProductsWhere(request);

	if (!where.OR || !productsWhere.OR) return undefined;
	return { ...where, OR: [...where.OR, ...productsWhere.OR] };
}

const schema = z
	.object({
		search: z.coerce.string(),
		type: z.enum(['pos', 'electronic']),
		branchId: z.coerce.number(),
		brandId: z.coerce.number(),
		categoryId: z.coerce.number(),
		expiry: z.enum(['expired', 'expiring', 'not_expiring']),
		payment_method: z.enum(['cash', 'card', 'transfer', 'loan']),
		invoice_type: z.enum(['cash', 'loan']),
	})
	.partial();
type Schema = z.infer<typeof schema>;

type InvoiceWhere = {
	type?: Schema['invoice_type'];
	subOrganizationId?: number;
	paymentForms?: { some: { type: 'cash' | 'card' | 'transfer' | 'loan' } };
	OR?: Array<
		| { client: ReturnType<typeof getPersonSearch> }
		| { products: ReturnType<typeof getProductSearch> }
	>;
};
