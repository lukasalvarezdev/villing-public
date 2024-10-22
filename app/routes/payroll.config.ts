import { type ActionFunctionArgs, json } from '@remix-run/node';
import { z } from 'zod';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { parseFormData } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);
	const formData = await parseFormData(request);

	try {
		const frequency = frequencySchema.parse(formData.get('frequency'));

		await db.organization.update({
			where: { id: orgId },
			data: { payrollFrequency: frequency },
		});

		return json({ success: true });
	} catch (error) {
		if (typeof error === 'string') return json({ error }, 400);
		await logError({ error, request });
		return json(
			{ error: 'No pudimos actualizar los ajustes de la nómina' },
			500,
		);
	}
}

const frequencySchema = z.enum(['Semanal', 'Decadal', 'Quincenal', 'Mensual']);
