import { json, type DataFunctionArgs } from '@remix-run/node';
import { getOrgDbClient } from '~/utils/db.server';
import { getRequestSearchParams, parseFormData , invariant } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export async function action({ request }: DataFunctionArgs) {
	await protectRoute(request);

	const { db, userId } = await getOrgDbClient(request);
	try {
		const form = await parseFormData(request);
		const searchParams = getRequestSearchParams(request);
		const source = searchParams.get('source');

		invariant(source, 'No source found');

		const state = JSON.parse(form.get('state') || '{}');

		const data = { [source]: state };

		await db.$transaction(async tx => {
			const invoiceSelection = await tx.invoiceSelection.findFirst({
				where: { userId },
			});

			await tx.invoiceSelection.upsert({
				create: { data: '{}', userId, ...data },
				where: { id: invoiceSelection?.id || 0 },
				update: { ...data },
			});
		});
		return json({ success: true });
	} catch (error) {
		return json({ error }, 500);
	}
}
