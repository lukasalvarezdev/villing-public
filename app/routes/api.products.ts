import {
	json,
	type DataFunctionArgs,
	type SerializeFrom,
} from '@remix-run/node';
import { getOrgDbClient } from '~/utils/db.server';
import {
	addTax,
	getRequestSearchParams,
	stringToTsVector,
	toNumber,
} from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request }: DataFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const searchParams = getRequestSearchParams(request);
	const search = searchParams.get('search');
	const priceListId = toNumber(searchParams.get('priceListId'));
	const numberSearch = toNumber(search);
	const isBarCode = `${numberSearch}`.length > 6;

	const products = await db.product.findMany({
		where: {
			organizationId: orgId,
			...(search
				? {
						OR: [
							{ name: { search: stringToTsVector(search) } },
							{ reference: { search: stringToTsVector(search) } },
							{ barCodes: { has: search } },
							{
								internalId: isBarCode
									? undefined
									: { equals: toNumber(search) },
							},
						],
				  }
				: {}),
		},
		include: {
			prices: { include: { priceList: true } },
			stocks: { include: { subOrg: true } },
		},
		take: 50,
	});

	return json(
		products.map(product => {
			const priceListPrice = product.prices.find(
				p => p.priceListId === priceListId,
			)?.value;
			const price = priceListPrice ?? product.price;
			const priceWithTax = toNumber(addTax(price, product.tax).toFixed(2));
			const prices = product.prices.map(p => ({
				id: p.priceListId,
				name: p.priceList.name,
				value: toNumber(addTax(p.value, product.tax).toFixed(2)),
			}));
			const stocks = product.stocks.map(s => ({
				id: s.subOrgId,
				name: s.subOrg.name,
				value: s.value,
			}));
			const cost = product.price;

			return { ...product, price: priceWithTax, cost, prices, stocks };
		}) satisfies Array<ProductListType>,
	);

	type ListType = Array<{ id: number; name: string; value: number }>;
	type LoaderProductType = (typeof products)[0];
	type ProductListType = Omit<LoaderProductType, 'prices' | 'stocks'> & {
		cost: number;
		prices: ListType;
		stocks: ListType;
	};
}
export type ApiProductType = SerializeFrom<typeof loader>[0];
