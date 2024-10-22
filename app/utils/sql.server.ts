import { Prisma, type PrismaClient } from '@prisma/client';
import * as z from 'zod';
import { getIncludedPercentageValue } from './math';
import { isDate, toNumber } from './misc';

type Product = { id: number; quantity: number } & Record<string, any>;

/**
 * Generates a SQL query to update the stock of a list of products. By default, it adds the quantity to the current stock value.
 */
export function generateUpdateProductsStockSql(
	products: Array<Product>,
	subId: number,
	operation: 'add' | 'subtract' = 'add',
) {
	const productUpdates = products
		.map(product => `(${product.id}, ${product.quantity})`)
		.join(', ');
	const operationSign = operation === 'add' ? '+' : '-';

	return `
			WITH upsert AS (
				UPDATE "StockValue" AS s
				SET "value" = s."value" ${operationSign} v."quantity"
				FROM (VALUES ${productUpdates}) AS v("productId", "quantity")
				WHERE s."productId" = v."productId" AND s."subOrgId" = ${subId}
				RETURNING s."productId"
		)
		INSERT INTO "StockValue" ("productId", "subOrgId", "value", "updatedAt")
		SELECT v."productId", ${subId}, v."quantity", NOW()
		FROM (VALUES ${productUpdates}) AS v("productId", "quantity")
		LEFT JOIN upsert ON v."productId" = upsert."productId"
		WHERE upsert."productId" IS NULL;
	`;
}

export function generateCheckNegativeStockSql(
	products: Array<Product>,
	subId: number,
) {
	const productIds = products.map(product => product.id).join(', ');

	return `
		SELECT "productId"
		FROM "StockValue"
		WHERE "productId" IN (${productIds}) AND "subOrgId" = ${subId} AND "value" < 0;
	`;
}

export function generateUpdateProductsStockSqlsForTotalSetting(
	products: Array<Product>,
	subId: number,
) {
	const selectedProductIds = products.map(product => product.id);
	const productUpdates = products
		.map(product => `(${product.id}, ${product.quantity})`)
		.join(', ');
	const selectedQuery = `
		WITH upsert AS (
				UPDATE "StockValue" AS s
				SET "value" = v."quantity"
				FROM (VALUES ${productUpdates}) AS v("productId", "quantity")
				WHERE s."productId" = v."productId" AND s."subOrgId" = ${subId}
				RETURNING s."productId"
		)
		INSERT INTO "StockValue" ("productId", "subOrgId", "value", "updatedAt")
		SELECT v."productId", ${subId}, v."quantity", NOW()
		FROM (VALUES ${productUpdates}) AS v("productId", "quantity")
		LEFT JOIN upsert ON v."productId" = upsert."productId"
		WHERE upsert."productId" IS NULL;
	`;

	const restQuery = `UPDATE "StockValue" AS s
		SET "value" = 0
		WHERE s."subOrgId" = ${subId} AND s."productId" NOT IN (${selectedProductIds.join(
			',',
		)})`;

	return [selectedQuery, restQuery];
}

type PharmaProductType = {
	batch?: string;
	expirationDate?: string;
	invimaRegistry?: string;
} & Product;
export function generateUpdateProductsPharmaFieldsSql(
	products: Array<PharmaProductType>,
	orgId: number,
) {
	const productUpdates = products
		.map(product => {
			const { id, batch, expirationDate, invimaRegistry: invimaCode } = product;
			const batchValue = batch ? `'${batch}'` : 'NULL'; // If batch is defined, use its value; otherwise, use NULL
			const expirationValue = isDate(expirationDate)
				? `'${expirationDate.toISOString()}'`
				: typeof expirationDate === 'string'
					? `'${new Date(expirationDate).toISOString()}'`
					: 'NULL'; // If expirationDate is defined, pass the date as string otherwise, use NULL

			const invimaRegistry = invimaCode ? `'${invimaCode}'` : 'NULL';

			return `(${id}, ${batchValue}, ${expirationValue}, ${invimaRegistry})`;
		})
		.join(', ');

	return `
    UPDATE "Product" AS p
    SET 
      "batch" = v."batch",
      "expirationDate" = v."expirationDate"::timestamp,
			"invimaRegistry" = v."invimaRegistry"
    FROM (VALUES ${productUpdates}) AS v("productId", "batch", "expirationDate", "invimaRegistry")
    WHERE p."id" = v."productId" AND p."organizationId" = ${orgId}
  `;
}

type PriceProductType = {
	prices: Array<{ price: number; id: number }>;
	tax: number;
} & Product;
export function generateUpdateProductsPricesSql(
	products: Array<PriceProductType>,
) {
	const productUpdates = products
		.flatMap(product => {
			return product.prices.map(price => {
				const tax = toNumber(
					getIncludedPercentageValue(price.price, product.tax),
				);
				const value = price.price - tax;
				return `(${product.id}, ${value}, ${price.id})`;
			});
		})
		.join(', ');

	return `
		UPDATE "PriceValue" AS pv
			SET "value" = v."value"
			FROM (VALUES ${productUpdates}) AS v("productId", "value", "priceListId")
			WHERE pv."productId" = v."productId" AND pv."priceListId" = v."priceListId"
			RETURNING pv."productId";
	`;
}

type CostProductType = {
	price: number;
	tax: number;
} & Product;
export function generateUpdateProductsCostSql(
	products: Array<CostProductType>,
) {
	return `
		UPDATE "Product"
		SET "price" = CASE "id"
			${products
				.map(product => {
					const tax = toNumber(
						getIncludedPercentageValue(product.price, product.tax),
					);
					const value = product.price - tax;
					return `WHEN ${product.id} THEN ${value}`;
				})
				.join(' ')}
			ELSE "price"
		END
		WHERE "id" IN (${products.map(({ id }) => id).join(',')});
	`;
}

const DebtSchema = z.object({ total: z.number(), amount: z.number() });

export function parseDebt(debts: any): number {
	try {
		const parsedDebts = z.array(DebtSchema).parse(debts);
		return parsedDebts.reduce((acc, curr) => acc + curr.total - curr.amount, 0);
	} catch (error) {
		return 0;
	}
}

export function getSumByRange(
	db: PrismaClient,
	orgId: number,
	date: Date,
	end: Date,
	branches: Array<number>,
) {
	return db.$queryRaw`
		SELECT
			CAST(SUM(total) AS int) as total,
			CAST(SUM(subtotal) AS int) as subtotal,
			CAST(SUM("totalTax") AS int) as tax
		FROM (
				SELECT total, null as subtotal, null as "totalTax", id
				FROM public."LegalPosInvoice"
				WHERE "organizationId" = ${orgId}
						AND "createdAt" >= ${date}
						AND "createdAt" <= ${end}
						AND "canceledAt" IS NULL
						AND "subOrganizationId" IN (${Prisma.join(branches)})
				UNION ALL
				SELECT null as total, subtotal, "totalTax", id
				FROM public."LegalInvoice"
				WHERE "organizationId" = ${orgId}
						AND "createdAt" >= ${date}
						AND "createdAt" <= ${end}
						AND cufe IS NOT NULL
						AND "subOrganizationId" IN (${Prisma.join(branches)})
				UNION ALL
				SELECT null as total, subtotal, "totalTax", id
				FROM public."LegalInvoiceRemision"
				WHERE "organizationId" = ${orgId}
						AND "createdAt" >= ${date}
						AND "createdAt" <= ${end}
						AND "canceledAt" IS NULL
						AND "subOrganizationId" IN (${Prisma.join(branches)})
		) as combined_data;
	`;
}

export function getNoTaxSumByRange(
	db: PrismaClient,
	orgId: number,
	date: Date,
	end: Date,
	branches: Array<number>,
) {
	return db.$queryRaw`
		SELECT
			CAST(SUM(total) AS int) as total,
			CAST(SUM(subtotal) AS int) as subtotal,
			CAST(SUM("totalTax") AS int) as tax
		FROM (
				SELECT total, null as subtotal, null as "totalTax", id
				FROM public."LegalPosInvoice"
				WHERE "organizationId" = ${orgId}
						AND "createdAt" >= ${date}
						AND "createdAt" <= ${end}
						AND "canceledAt" IS NULL
						AND "totalTax" = 0
						AND "subOrganizationId" IN (${Prisma.join(branches)})
				UNION ALL
				SELECT null as total, subtotal, "totalTax", id
				FROM public."LegalInvoice"
				WHERE "organizationId" = ${orgId}
						AND "createdAt" >= ${date}
						AND "createdAt" <= ${end}
						AND cufe IS NOT NULL
						AND "totalTax" = 0
						AND "subOrganizationId" IN (${Prisma.join(branches)})
				UNION ALL
				SELECT null as total, subtotal, "totalTax", id
				FROM public."LegalInvoiceRemision"
				WHERE "organizationId" = ${orgId}
						AND "createdAt" >= ${date}
						AND "createdAt" <= ${end}
						AND "totalTax" = 0
						AND "canceledAt" IS NULL
						AND "subOrganizationId" IN (${Prisma.join(branches)})
		) as combined_data;
	`;
}

export function getWithTaxSumByRange(
	db: PrismaClient,
	orgId: number,
	date: Date,
	end: Date,
	branches: Array<number>,
) {
	return db.$queryRaw`
		SELECT
			CAST(SUM(total) AS int) as total,
			CAST(SUM(subtotal) AS int) as subtotal,
			CAST(SUM("totalTax") AS int) as tax
		FROM (
				SELECT total, null as subtotal, null as "totalTax", id
				FROM public."LegalPosInvoice"
				WHERE "organizationId" = ${orgId}
						AND "createdAt" >= ${date}
						AND "createdAt" <= ${end}
						AND "canceledAt" IS NULL
						AND "totalTax" > 0
						AND "subOrganizationId" IN (${Prisma.join(branches)})
				UNION ALL
				SELECT null as total, subtotal, "totalTax", id
				FROM public."LegalInvoice"
				WHERE "organizationId" = ${orgId}
						AND "createdAt" >= ${date}
						AND "createdAt" <= ${end}
						AND cufe IS NOT NULL
						AND "totalTax" > 0
						AND "subOrganizationId" IN (${Prisma.join(branches)})
				UNION ALL
				SELECT null as total, subtotal, "totalTax", id
				FROM public."LegalInvoiceRemision"
				WHERE "organizationId" = ${orgId}
						AND "createdAt" >= ${date}
						AND "createdAt" <= ${end}
						AND "totalTax" > 0
						AND "canceledAt" IS NULL
						AND "subOrganizationId" IN (${Prisma.join(branches)})
		) as combined_data;
	`;
}

export function getGroupedSumByRange(
	db: PrismaClient,
	orgId: number,
	date: Date,
	end: Date,
	branches: Array<number>,
) {
	return db.$queryRaw`
		SELECT
				COALESCE(SUM(total), 0) as total,
				COALESCE(SUM(subtotal), 0) as subtotal,
				COALESCE(SUM("totalTax"), 0) as tax,
				table_name
			FROM (
				SELECT 
					id,
					total,
					null as subtotal,
					"totalTax",
					'LegalPosInvoice' as table_name
				FROM public."LegalPosInvoice"
				WHERE "organizationId" = ${orgId}
					AND "createdAt" >= ${date}
					AND "createdAt" <= ${end}
					AND "canceledAt" IS NULL
					AND "subOrganizationId" IN (${Prisma.join(branches)})
				UNION ALL
				SELECT 
					id,
					null as total,
					subtotal,
					"totalTax",
					'LegalInvoice' as table_name
				FROM public."LegalInvoice"
				WHERE "organizationId" = ${orgId}
					AND "createdAt" >= ${date}
					AND "createdAt" <= ${end}
					AND cufe IS NOT NULL
					AND "subOrganizationId" IN (${Prisma.join(branches)})
				UNION ALL
				SELECT 
					id,
					null as total,
					subtotal,
					"totalTax",
					'LegalInvoiceRemision' as table_name
				FROM public."LegalInvoiceRemision"
				WHERE "organizationId" = ${orgId}
					AND "createdAt" >= ${date}
					AND "createdAt" <= ${end}
					AND "canceledAt" IS NULL
					AND "subOrganizationId" IN (${Prisma.join(branches)})
			) as combined_data
			GROUP BY table_name;
	`;
}

export function parseSumByRange(sum: any): number {
	try {
		const { total, subtotal, tax } = z
			.object({
				total: z.number().nullable(),
				subtotal: z.number().nullable(),
				tax: z.number().nullable(),
			})
			.parse(sum[0]);

		return (total ?? 0) + (subtotal ?? 0) + (tax ?? 0);
	} catch (error) {
		return 0;
	}
}

export function parseGroupedSumByRange(data: any) {
	const returnData = {
		LegalPosInvoice: { total: 0, tax: 0 },
		LegalInvoice: { total: 0, tax: 0 },
		LegalInvoiceRemision: { total: 0, tax: 0 },
	};

	try {
		const sums = groupedSumByRangeSchema.parse(data);

		sums.forEach(sum => {
			if (sum.table_name === 'LegalPosInvoice') {
				returnData[sum.table_name].total += sum.total;
				returnData[sum.table_name].tax += sum.tax;
			} else {
				returnData[sum.table_name].total += sum.subtotal + sum.tax;
				returnData[sum.table_name].tax += sum.tax;
			}
		});

		return returnData;
	} catch (error) {
		return returnData;
	}
}

const groupedSumByRangeSchema = z.array(
	z.object({
		total: z.number(),
		subtotal: z.number(),
		tax: z.number(),
		table_name: z.enum([
			'LegalPosInvoice',
			'LegalInvoice',
			'LegalInvoiceRemision',
		]),
	}),
);

export async function getTotalInventoryValue(
	db: PrismaClient,
	orgId: number,
	branches: Array<number>,
) {
	try {
		const productsWithStock = await db.$queryRaw`
			SELECT
				p.price AS price,
				subOrg.id AS subOrgId,
				SUM(sv.value) AS total_stock_value
			FROM
				public."Product" p
			LEFT JOIN
				public."StockValue" sv ON p.id = sv."productId"
				LEFT JOIN
				public."SubOrganization" subOrg ON sv."subOrgId" = subOrg.id
			WHERE
				subOrg."deletedAt" IS NULL
				AND subOrg.id IN (${Prisma.join(branches)})
				AND p."organizationId" = ${orgId}
			GROUP BY
				p.id, p.name, subOrg.id
			HAVING SUM(sv.value) > 0
		`;

		const stocks = TotalInventoryValueSchema.parse(productsWithStock);
		return stocks.reduce(
			(acc, curr) => {
				const value = curr.total_stock_value * curr.price;
				acc.total = acc.total + value;

				const subOrgValue = acc[curr.suborgid];
				if (subOrgValue) {
					acc[curr.suborgid] = subOrgValue + value;
				} else {
					acc[curr.suborgid] = value;
				}

				return acc;
			},
			{ total: 0 } as TotalInventoryValueResult,
		);
	} catch (error) {
		return { total: 0 };
	}
}
type TotalInventoryValueResult = { total: number } & Record<number, number>;

const TotalInventoryValueSchema = z.array(
	z.object({
		total_stock_value: z.coerce.number(),
		price: z.number(),
		suborgid: z.number(),
	}),
);

export function parseCreditsInfo(info: any, remisionInfo?: any) {
	const parsedSum = CreditsInfoSchema.parse(info[0]);
	const parsedRemisionSum = CreditsInfoSchema.parse(
		remisionInfo?.[0] || {
			sold: 0,
			payments: 0,
		},
	);

	return {
		sold: toNumber(parsedSum.sold) + toNumber(parsedRemisionSum.sold),
		payments:
			toNumber(parsedSum.payments) + toNumber(parsedRemisionSum.payments),
	};
}

const CreditsInfoSchema = z.object({
	sold: z.number().nullable(),
	payments: z.number().nullable(),
});
