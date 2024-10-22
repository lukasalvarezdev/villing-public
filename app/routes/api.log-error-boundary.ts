import { type ActionFunctionArgs } from '@remix-run/node';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { parseFormData } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request, '/home');

	try {
		const { db, orgId, userId } = await getOrgDbClient(request);
		const formData = await parseFormData(request);
		const error = formData.get('error');
		const location = formData.get('location');
		const url = formData.get('url');

		await db.errorLog.create({
			data: {
				userId,
				organizationId: orgId,
				error: JSON.stringify({ error, location, url }, null, 2),
				status: 500,
				url: url || request.url,
			},
		});

		return { success: true };
	} catch (error) {
		await logError({ error, request });
		return { notifications: [] };
	}
}
