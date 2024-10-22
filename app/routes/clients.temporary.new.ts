import { json, type ActionFunctionArgs } from '@remix-run/node';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { parseFormData } from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';

export async function action({ request }: ActionFunctionArgs) {
	const { db, orgId, userId } = await getOrgDbClient(request);

	const { error } = await legalActions.validate(db, userId, 'update_clients');
	if (error) return json({ error });

	try {
		const form = await parseFormData(request);
		const name = form.get('name') as string;

		if (!name) return json({ error: 'No se envió el nombre del cliente' }, 402);

		const client = await db.$transaction(async tx => {
			const clientsCount = await tx.client.count({
				where: { organizationId: orgId },
			});

			return await tx.client.create({
				data: {
					organizationId: orgId,
					internalId: clientsCount + 1,
					name,
					simpleAddress: 'Calle 0 # 0 - 0',
					email: 'temporal@cliente.com',
					idNumber: '3123164029',
					tel: '222222222222',
					isTemporary: true,
				},
			});
		});

		return json({ client: { ...client, address: client.simpleAddress } });
	} catch (error) {
		await logError({ error, request });

		return json(
			{
				error:
					'No pudimos crear el cliente, por favor verifica la información e intenta de nuevo.',
			},
			500,
		);
	}
}
