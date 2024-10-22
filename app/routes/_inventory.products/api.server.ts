import {
	type Product,
	type PrismaClient,
	type PriceValue,
} from '@prisma/client';
import * as z from 'zod';

export async function getProductsByStock(
	db: PrismaClient,
	searchParams: URLSearchParams,
): Promise<Array<number> | undefined> {
	const stock = searchParams.get('stock') === 'out_of_stock';
	const minStock = searchParams.get('stock') === 'min_stock';
	const maxStock = searchParams.get('stock') === 'max_stock';

	if (!stock && !minStock && !maxStock) return undefined;

	const stocks = await Promise.all([
		stock ? getProductsByStockLowerThanZero(db) : ([] as Array<number>),
		minStock ? getProductsByMinStock(db) : ([] as Array<number>),
		maxStock ? getProductsByMaxStock(db) : ([] as Array<number>),
	]);

	return Array.from(new Set(stocks.flat()));
}

export async function getProductsByStockLowerThanZero(db: PrismaClient) {
	try {
		const productsWithStock = await db.$queryRaw`
			SELECT p.id, SUM(sv.value) as stock
			FROM public."Product" p
			LEFT JOIN public."StockValue" sv ON p.id = sv."productId"
			GROUP BY p.id
			HAVING SUM(sv.value) <= 0
		`;

		const stocks = productsStockSchema.parse(productsWithStock);
		return stocks.map(({ id }) => id);
	} catch (error) {
		return [];
	}
}

async function getProductsByMinStock(db: PrismaClient) {
	try {
		const productsWithStock = await db.$queryRaw`
			SELECT p.id, p."minStock", SUM(sv.value) as stock
			FROM public."Product" p
			LEFT JOIN public."StockValue" sv ON p.id = sv."productId"
			WHERE p."minStock" > 0 AND p."minStock" IS NOT NULL
			GROUP BY p.id
			HAVING SUM(sv.value) < p."minStock"
		`;

		const stocks = productsStockSchema.parse(productsWithStock);
		return stocks.map(({ id }) => id);
	} catch (error) {
		return [];
	}
}

async function getProductsByMaxStock(db: PrismaClient) {
	try {
		const productsWithStock = await db.$queryRaw`
			SELECT p.id, p."maxStock", SUM(sv.value) as stock
			FROM public."Product" p
			LEFT JOIN public."StockValue" sv ON p.id = sv."productId"
			WHERE p."maxStock" > 0 AND p."maxStock" IS NOT NULL
			GROUP BY p.id
			HAVING SUM(sv.value) > p."maxStock"
		`;

		const stocks = productsStockSchema.parse(productsWithStock);
		return stocks.map(({ id }) => id);
	} catch (error) {
		return [];
	}
}

const productsStockSchema = z.array(
	z.object({
		id: z.number(),
		stock: z.union([z.number(), z.bigint()]),
	}),
);

export const upsertAttributeSchema = z.object({
	id: z.coerce.number().optional(),
	name: z
		.string({ required_error: 'El nombre es requerido' })
		.min(1, { message: 'El nombre es requerido' }),
});
export const deleteAttributeSchema = z.object({ id: z.coerce.number() });

type IProduct = Pick<Product, 'id' | 'name' | 'price'> & {
	prices: Array<PriceValue>;
} & Record<any, any>;

export function getProductsWithPrice<T extends IProduct>(
	products: Array<T>,
	priceListId: number | null,
) {
	return products.map(product => ({
		...product,
		price: getProductPriceWithTax({
			defaultPrice: product.price,
			priceListId,
			prices: product.prices,
			tax: product.tax,
		}),
	}));
}

type Args = {
	prices: Array<{ priceListId: number; value: number } & Record<string, any>>;
	priceListId: number | null;
	defaultPrice: number;
	tax: number;
};
function getProductPriceWithTax({
	defaultPrice,
	priceListId,
	prices,
	tax,
}: Args) {
	const price =
		prices.find(price => price.priceListId === priceListId)?.value ??
		defaultPrice;
	const taxValue = price * (tax / 100);

	return price + taxValue;
}
