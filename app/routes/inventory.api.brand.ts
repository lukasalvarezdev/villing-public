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

				await db.brand.create({
					data: { name, organizationId: orgId },
					select: { id: true },
				});

				return json({ success: true });
			}
			case 'PUT': {
				const { id, name } = upsertAttributeSchema.parse({
					id: form.get('id'),
					name: form.get('name'),
				});
				await db.brand.update({
					where: { id, organizationId: orgId },
					data: { name },
				});
				return json({ success: true });
			}
			case 'DELETE': {
				const { id } = deleteAttributeSchema.parse({ id: form.get('id') });
				await db.brand.delete({ where: { id, organizationId: orgId } });
				return json({ success: true });
			}
			default:
				throw new Response('Method not allowed', { status: 405 });
		}
	} catch (error) {
		await logError({ error, request });

		return json({ error: 'Error al crear la categoría' }, 500);
	}
}