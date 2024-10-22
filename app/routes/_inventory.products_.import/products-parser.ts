import { z } from 'zod';
import { getIncludedPercentageValue } from '~/utils/math';

export function getProducts(
	xlsx_products: Array<unknown>,
	assigned_columns: Record<string, string>,
) {
	const products = xlsx_products.map((xlsx_product: any) => {
		const product = { prices: [], stocks: [] } as MappedProduct;

		for (const column in xlsx_product) {
			const assigned_column = assigned_columns[column.toLowerCase()];

			const value = xlsx_product[column];

			if (!assigned_column) continue;

			product[assigned_column] = value;
			appendPrice(assigned_column, value);
			appendStock(assigned_column, value);
		}

		return product;

		function appendPrice(key: string, value: unknown) {
			const priceList = key.split('price_list:')?.[1];
			if (!priceList) return undefined;
			product.prices.push({ name: priceList, value });
		}

		function appendStock(key: string, value: unknown) {
			const branch = key.split('branch:')?.[1];
			if (!branch) return undefined;
			product.stocks.push({ name: branch, value });
		}
	});

	const result = z.array(product_schema).safeParse(products);

	if (!result.success) {
		console.error(result.error.errors);
		return [];
	}
	return result.data;
}

type MappedProduct = Record<string, any>;

export const product_schema = z
	.object({
		name: z.coerce.string(),
		description: z.coerce.string().optional(),
		reference: z.coerce.string().optional(),
		price: z.coerce.string().default('1'),
		tax: z.coerce.number().default(0),
		prices: z.array(
			z.object({ name: z.string(), value: z.coerce.string().default('1') }),
		),
		stocks: z.array(
			z.object({ name: z.string(), value: z.coerce.string().default('1') }),
		),
		category: z.string().optional(),
		brand: z.string().optional(),
		barCodes: z
			.union([z.coerce.string(), z.array(z.coerce.string())])
			.optional()
			.transform(value => {
				if (typeof value === 'string') return [value];
				return value;
			}),
		decimalPoint: z.enum(['.', ',']).default('.'),
	})
	.transform((product, ctx) => {
		return {
			...product,
			price: transformPriceValue(product.price),
			prices: product.prices.map(({ value, name }) => {
				return { value: transformPriceValue(value), name };
			}),
		};

		function transformPriceValue(price: unknown): number {
			if (typeof price === 'number') return price;
			if (typeof price !== 'string') return z.NEVER;

			if (!price) return 1;

			const priceNumber = parseFloat(
				formatNumber(price, product.decimalPoint)!,
			);

			if (isNaN(priceNumber)) return 1;

			return priceNumber;
		}
	});

export function formatNumber(val: string, decimalPoint: string) {
	// ignore all decimal numbers
	const number = val.split(decimalPoint)[0];
	const numberWithoutCommas = number?.replace(/,/g, '').replace('$', '');
	return numberWithoutCommas;
}

export type ProductType = z.infer<typeof product_schema>;

export function prepareProductsToImport(
	products: Array<ProductType>,
	config: Config,
): Array<ProductType> {
	return products.map(product => {
		const baseProduct = { ...product, ...config };

		const { valueWithoutTax: price } = getValueWithoutTax(baseProduct);
		const prices = product.prices.map(({ value: price, name }) => {
			const { valueWithoutTax } = getValueWithoutTax({ ...baseProduct, price });
			return { name, value: valueWithoutTax };
		});

		return { ...product, price, prices };
	});
}

function getValueWithoutTax({
	tax,
	price,
	is_tax_included,
}: {
	price: number;
	tax: number;
	is_tax_included: boolean;
}) {
	if (!is_tax_included) return { valueWithoutTax: price };

	const percentageValue = getIncludedPercentageValue(price, tax);
	return { valueWithoutTax: price - percentageValue };
}

export type Config = {
	is_tax_included: boolean;
};
