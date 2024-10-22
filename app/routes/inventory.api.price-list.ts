import { json, type ActionFunctionArgs } from '@remix-run/node';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { parseFormData } from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import {
	deleteAttributeSchema,
	upsertAttributeSchema,
} from './_inventory.products/api.server';

export async function action({ request }: ActionFunctionArgs) {
	const { db, orgId, userId } = await getOrgDbClient(request);

	const { error } = await legalActions.validate(db, userId, 'update_products');
	if (error) return json({ error }, 403);

	try {
		const form = await parseFormData(request);

		switch (request.method) {
			case 'POST': {
				const { name } = upsertAttributeSchema.parse({
					name: form.get('name'),
				});

				await db.$transaction(async tx => {
					const [{ id: priceListId }, products] = await Promise.all([
						tx.priceList.create({
							data: { name, organizationId: orgId },
							select: { id: true },
						}),
						tx.product.findMany({
							where: { organizationId: orgId },
							select: { id: true },
						}),
					]);

					await tx.priceValue.createMany({
						data: products.map(product => ({
							priceListId,
							productId: product.id,
							value: 0,
							organizationId: orgId,
						})),
					});
				});

				return json({ success: true });
			}
			case 'PUT': {
				const { id, name } = upsertAttributeSchema.parse({
					id: form.get('id'),
					name: form.get('name'),
				});
				await db.priceList.update({
					where: { id, organizationId: orgId },
					data: { name },
				});
				return json({ success: true });
			}
			case 'DELETE': {
				const { id } = deleteAttributeSchema.parse({ id: form.get('id') });
				await db.priceList.update({
					where: { id, organizationId: orgId },
					data: { deletedAt: new Date() },
				});
				return json({ success: true });
			}
			default:
				throw new Response('Method not allowed', { status: 405 });
		}
	} catch (error) {
		await logError({ error, request });

		return json({ error: 'Error al crear la lista de precios' }, 500);
	}
}
