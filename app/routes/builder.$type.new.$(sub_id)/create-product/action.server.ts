import { parse } from '@conform-to/zod';
import { type ActionFunctionArgs, json } from '@remix-run/node';
import { removePercentage } from '~/modules/invoice/invoice-math';
import { getOrgDbClient } from '~/utils/db.server';
import { errorLogger } from '~/utils/logger';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';
import { params } from '../products-search/loader.server';
import { schema } from './form';

export async function productAction({ request }: ActionFunctionArgs) {
	await protectRoute(request);
	const formData = await request.formData();

	const submission = parse(formData, { schema });
	if (submission.intent !== 'submit' || !submission.value) {
		return json({ error: 'Intent not supported' }, 400);
	}

	const value = submission.value;

	const { db, orgId, userId } = await getOrgDbClient(request);

	const { error } = await legalActions.validate(db, userId, 'update_products');
	if (error) {
		return json({ error: 'No tienes permisos para crear productos' }, 403);
	}

	try {
		const product = await db.$transaction(async tx => {
			const [internalId, organization] = await Promise.all([
				getInternalId(),
				getOrgInfo(),
			]);
			const { stocksQuery, pricesQuery, tax, prices, stocks } = organization;

			const product = await tx.product.create({
				data: {
					internalId,
					organizationId: orgId,

					tax,
					name: value.name,
					price: removePercentage(value.cost, tax),
					barCodes: value.barCode ? [value.barCode] : undefined,
					reference: value.reference,

					prices: { create: pricesQuery },
					stocks: { create: stocksQuery },
				},
			});

			return {
				...product,

				cost: value.cost,
				price: value.price,

				quantity: 1,
				discount: 0,
				stock: 0,

				ref: product.reference ?? undefined,
				batch: product.batch ?? undefined,
				expirationDate: product.expirationDate?.toString() ?? undefined,
				invimaRegistry: product.invimaRegistry ?? undefined,
				barCodes: product.barCodes ?? [],

				stocks: stocks.map(s => ({ branchId: s.id, quantity: 0 })),
				prices: prices.map(p => ({ ...p, price: value.price })),
			};

			async function getInternalId() {
				const { productsCount: internalId } = await tx.counts.update({
					where: { id: orgId },
					data: { productsCount: { increment: 1 } },
					select: { productsCount: true },
				});
				return internalId;
			}

			async function getOrgInfo() {
				const response = await tx.organization.findFirstOrThrow({
					where: { id: orgId },
					select: {
						typeRegime: true,
						SubOrganization: params.branch,
						PriceList: params.priceList,
					},
				});
				const tax = response.typeRegime === 'iva' ? 19 : 0;

				return {
					prices: response.PriceList,
					pricesQuery: response.PriceList.map(p => ({
						organizationId: orgId,
						priceListId: p.id,
						value: removePercentage(value.price, tax),
					})),
					stocks: response.SubOrganization,
					stocksQuery: response.SubOrganization.map(s => ({
						organizationId: orgId,
						subOrgId: s.id,
						value: 0,
					})),
					tax,
				};
			}
		});

		return { product };
	} catch (error) {
		const body = Object.fromEntries(formData);
		const referenceId = errorLogger({ error, path: request.url, body });
		const message = 'Hubo un error creando el producto';

		return json({ error: message, referenceId }, 500);
	}
}
