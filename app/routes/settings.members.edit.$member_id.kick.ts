import {
	json,
	type ActionFunctionArgs,
	redirect,
	type MetaFunction,
} from '@remix-run/node';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [{ title: `Editar miembro - Villing` }];

export async function action({ request, params }: ActionFunctionArgs) {
	await protectRoute(request);

	const memberId = Number(params.member_id);

	const { db, orgId, userId } = await getOrgDbClient(request);

	const { error } = await legalActions.validate(db, userId, 'update_members');
	if (error) return json({ error });

	const organization = await db.organization.findUnique({
		where: { id: orgId },
		select: { ownerId: true },
	});

	if (organization?.ownerId === memberId) {
		return json({ error: 'No puedes editar al dueño de la empresa' }, 400);
	}

	try {
		await db.userOrganization.delete({
			where: {
				userId_organizationId: {
					organizationId: orgId,
					userId: memberId,
				},
			},
		});

		return redirect(`/settings/members?success=${memberId}`);
	} catch (error) {
		await logError({ request, error });
		return json({ error: 'Hubo un error al actualizar el usuario' }, 500);
	}
}
