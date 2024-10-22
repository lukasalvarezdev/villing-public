import { type ActionFunctionArgs } from '@remix-run/node';
import { Form } from '@remix-run/react';
import { IntentButton } from '~/components/form-utils';
import { Box } from '~/components/ui-library';
import { invoiceDianClient } from '~/modules/invoice/invoice-dian-client.server';
import { getOrgDbClient } from '~/utils/db.server';
import { invariant } from '~/utils/misc';
import { protectAdminRoute } from '~/utils/plan-protection.server';
import { protectRoute } from '~/utils/session.server';

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.org_id, 'Missing org_id param');

	await Promise.all([protectRoute(request), protectAdminRoute(request)]);

	const { db } = await getOrgDbClient(request);

	const { soenacToken } = await db.organization.findFirstOrThrow({
		where: { id: Number(params.org_id) },
	});

	await invoiceDianClient.updateEnvToProd(soenacToken!);

	return {};
}

export default function Component() {
	return (
		<Box className="max-w-xl">
			<h4 className="mb-4">Completa el registro</h4>

			<Form method="post">
				<IntentButton type="submit" intent="primary">
					Empezar sincronización (después del paso a producción)
				</IntentButton>
			</Form>
		</Box>
	);
}
