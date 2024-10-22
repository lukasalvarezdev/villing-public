import { getOrgDbClient } from '~/utils/db.server';
import { addTaxToPrice } from '~/utils/misc';

export async function productsLoader(request: Request) {
	const { db, orgId } = await getOrgDbClient(request);

	const response = await db.$transaction([
		db.product.findMany({
			...params.products,
			where: { organizationId: orgId },
		}),
		db.priceValue.findMany({
			...params.prices,
			where: { organizationId: orgId, ...params.prices.where },
		}),
		db.stockValue.findMany({
			...params.stocks,
			where: { organizationId: orgId, ...params.stocks.where },
		}),
		db.priceList.findMany({
			...params.priceList,
			where: { organizationId: orgId, ...params.priceList.where },
		}),
	]);
	const [products, priceValues, stockValues, priceLists] = response;

	const pricesMap = getPricesMap();
	const stocksMap = getStocksMap();

	return products.map(product => {
		const prices = pricesMap[product.id] || [];
		const stocks = stocksMap[product.id] || [];

		return {
			...product,

			quantity: 1,
			discount: 0,
			stock: 0,
			price: 0,
			cost: addTaxToPrice(product.price, product.tax),

			ref: product.reference ?? undefined,
			batch: product.batch ?? undefined,
			expirationDate: product.expirationDate?.toString() ?? undefined,
			invimaRegistry: product.invimaRegistry ?? undefined,

			prices: pricesMapper(),
			stocks: stocksMapper(),
		};

		function pricesMapper() {
			return prices.map(price => ({
				id: price.priceListId,
				name: findPriceListName(price.priceListId),
				price: addTaxToPrice(price.value, product.tax),
			}));
		}

		function stocksMapper() {
			return stocks.map(stock => ({
				branchId: stock.subOrgId,
				quantity: stock.value,
			}));
		}
	});

	function findPriceListName(id: number) {
		return priceLists.find(pl => pl.id === id)?.name ?? '';
	}

	function getPricesMap() {
		return priceValues.reduce(
			(acc, p) => {
				if (!acc[p.productId]) acc[p.productId] = [];
				acc[p.productId]?.push(p);
				return acc;
			},
			{} as Record<number, typeof priceValues>,
		);
	}

	function getStocksMap() {
		return stockValues.reduce(
			(acc, p) => {
				if (!acc[p.productId]) acc[p.productId] = [];
				acc[p.productId]?.push(p);
				return acc;
			},
			{} as Record<number, typeof stockValues>,
		);
	}
}

export const params = {
	products: {
		select: {
			id: true,
			internalId: true,
			name: true,
			price: true,
			reference: true,
			tax: true,
			barCodes: true,
			batch: true,
			expirationDate: true,
			invimaRegistry: true,
		},
		orderBy: { name: 'asc' },
		take: 10_000,
	},
	prices: {
		where: { priceList: { deletedAt: null } },
		select: { id: true, priceListId: true, value: true, productId: true },
	},
	stocks: {
		where: { subOrg: { deletedAt: null } },
		select: { id: true, subOrgId: true, value: true, productId: true },
	},
	priceList: {
		where: { deletedAt: null },
		select: { id: true, name: true },
		orderBy: { id: 'asc' },
	},
	branch: {
		where: { deletedAt: null },
		select: { id: true },
		orderBy: { id: 'asc' },
	},
} as const;
