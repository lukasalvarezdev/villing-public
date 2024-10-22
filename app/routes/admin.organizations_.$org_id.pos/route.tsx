import { json, type ActionFunctionArgs } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { z } from 'zod';
import { Input, IntentButton, Label } from '~/components/form-utils';
import { Box } from '~/components/ui-library';
import { invoiceDianClient } from '~/modules/invoice/invoice-dian-client.server';
import { getOrgDbClient } from '~/utils/db.server';
import { logInfo } from '~/utils/logger';
import { invariant, toNumber } from '~/utils/misc';
import { protectAdminRoute } from '~/utils/plan-protection.server';
import { protectRoute } from '~/utils/session.server';
import { pos_example } from './pos-example';

export async function loader({ request, params }: ActionFunctionArgs) {
	invariant(params.org_id, 'Missing org_id param');
	const orgId = toNumber(params.org_id);

	await Promise.all([protectRoute(request), protectAdminRoute(request)]);

	const { db } = await getOrgDbClient(request);

	const organization = await db.organization.findFirstOrThrow({
		where: { id: orgId },
	});

	return {
		posSoftwareId: organization.posSoftwareId,
		posTestSetId: organization.posTestSetId,
	};
}

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.org_id, 'Missing org_id param');
	const orgId = toNumber(params.org_id);

	await Promise.all([protectRoute(request), protectAdminRoute(request)]);

	const { db } = await getOrgDbClient(request);
	const formData = await request.formData();
	const { posSoftwareId, posTestSetId, number } = schema.parse(
		Object.fromEntries(formData.entries()),
	);

	try {
		await updateSoftwareInfo();
		await createInSoenac();
		await createInvoices();

		return {};
	} catch (error) {
		console.error(error);
		return json({ error });
	}

	async function updateSoftwareInfo() {
		logInfo({
			message: 'Updating software info',
			data: { posSoftwareId, posTestSetId },
			path: 'updateSoftwareInfo',
		});
		await db.organization.update({
			where: { id: orgId },
			data: { posSoftwareId, posTestSetId },
		});
	}

	async function createInSoenac() {
		logInfo({
			message: 'Creating company in Soenac',
			path: 'createInSoenac',
		});
		await invoiceDianClient.createCompany(orgId);
	}

	async function createInvoices() {
		try {
			logInfo({
				message: 'Creating invoices',
				path: 'createInvoices',
			});
			const { posSoftwareId, posTestSetId } =
				await db.organization.findFirstOrThrow({
					where: { id: orgId },
				});

			const response = await invoiceDianClient.createPosInvoice(
				{ orgId, testSetId: posTestSetId } as any,
				{
					...pos_example,
					number,
					sync: false,
					environment: {
						type_environment_id: 2,
						id: posSoftwareId,
						pin: '12345',
					},
				},
			);
			// eslint-disable-next-line no-console
			console.log(response);
		} catch (error) {}
	}
}

export default function Component() {
	const { posSoftwareId, posTestSetId } = useLoaderData<typeof loader>();

	return (
		<Box className="max-w-xl">
			<h4 className="mb-4">Comienza el registro</h4>

			<Form method="post">
				<Label>Test Set Id</Label>
				<Input
					name="posTestSetId"
					placeholder="Ingrese el Test Set Id"
					className="mb-2"
					defaultValue={posTestSetId || ''}
				/>

				<Label>Software Id</Label>
				<Input
					name="posSoftwareId"
					placeholder="Ingrese el Software Id"
					className="mb-4"
					defaultValue={posSoftwareId || ''}
				/>

				<Label>No. de primera factura</Label>
				<Input
					name="number"
					placeholder="Ingrese el número de la primera factura"
					className="mb-4"
					defaultValue={1}
				/>

				<IntentButton type="submit" intent="primary">
					Empezar sincronización (antes del paso a producción)
				</IntentButton>
			</Form>
		</Box>
	);
}

const schema = z.object({
	posSoftwareId: z.string(),
	posTestSetId: z.string(),
	number: z.coerce.number(),
});
