import { type ActionFunctionArgs, json } from '@remix-run/node';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { parseFormData } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);
	const formData = await parseFormData(request);

	try {
		const updatePricesOnPurchases =
			formData.get('updatePricesOnPurchases') === 'on';

		await db.organization.update({
			where: { id: orgId },
			data: { updatePricesOnPurchases },
		});

		return json({ success: true });
	} catch (error) {
		await logError({ error, request });
		return json(
			{ error: 'No pudimos actualizar los ajustes de la venta' },
			500,
		);
	}
}
