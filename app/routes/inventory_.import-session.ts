import { type DataFunctionArgs, json } from '@remix-run/node';
import { getOrgDbClient } from '~/utils/db.server';
import { parseFormData } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export async function action({ request }: DataFunctionArgs) {
	await protectRoute(request);

	const { db, userId } = await getOrgDbClient(request);
	try {
		const form = await parseFormData(request);
		const state = JSON.parse(form.get('state') || '{}');

		await db.$transaction(async tx => {
			const invoiceSelection = await tx.invoiceSelection.findFirst({
				where: { userId },
			});

			await tx.invoiceSelection.upsert({
				create: { data: '{}', userId, productsImport: state },
				where: { id: invoiceSelection?.id || 0 },
				update: { productsImport: state },
			});
		});
		return json({ success: true });
	} catch (error) {
		return json({ error }, 500);
	}
}
