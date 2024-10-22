import {
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	json,
} from '@remix-run/node';
import { Form, Link, useLoaderData, useParams } from '@remix-run/react';
import { z } from 'zod';
import { Input, IntentButton, Label } from '~/components/form-utils';
import { ButtonIcon } from '~/components/ui-library';
import { payrollDianClient } from '~/modules/payroll/payroll-dian-client';
import { getOrgDbClient } from '~/utils/db.server';
import { parseFormData, invariant } from '~/utils/misc';
import { protectSuperAdminRoute } from '~/utils/plan-protection.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.org_id, 'Missing org_id param');

	await Promise.all([protectRoute(request), protectSuperAdminRoute(request)]);
	const { db } = await getOrgDbClient(request);

	const { payrollSoftwareId, payrollSoftwarePin, payrollTestSetId } =
		await db.organization.findUniqueOrThrow({
			where: { id: parseInt(params.org_id) },
			select: {
				payrollSoftwareId: true,
				payrollSoftwarePin: true,
				payrollTestSetId: true,
			},
		});

	const canCreatePayrolls = Boolean(
		payrollTestSetId && payrollSoftwareId && payrollSoftwarePin,
	);

	return json({ canCreatePayrolls });
}

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.org_id, 'Missing org_id param');
	const orgId = parseInt(params.org_id);

	await Promise.all([protectRoute(request), protectSuperAdminRoute(request)]);
	const { db } = await getOrgDbClient(request);

	const form = await parseFormData(request);
	const action = form.get('intent');

	switch (action) {
		case 'register': {
			const softwareId = form.get('softwareId');
			const pin = form.get('pin');
			const testSetId = form.get('testSetId');

			if (!pin || !softwareId || !testSetId) {
				throw 'Missing testSetId or softwareId';
			}

			await db.organization.update({
				where: { id: orgId },
				data: {
					payrollSoftwareId: softwareId,
					payrollSoftwarePin: pin,
					payrollTestSetId: testSetId,
				},
			});

			return json({ success: true });
		}
		case 'createPayrolls': {
			const organization = await db.organization.update({
				where: { id: orgId },
				select: {
					payrollSoftwareId: true,
					payrollSoftwarePin: true,
					payrollTestSetId: true,
					soenacToken: true,
					idNumber: true,
					Counts: {
						select: {
							payrollEmisionTestCount: true,
						},
					},
				},
				data: {
					Counts: {
						update: {
							where: { id: orgId },
							data: { payrollEmisionTestCount: { increment: 2 } },
						},
					},
				},
			});

			const config = configSchema.parse({
				soenacToken: organization.soenacToken,
				softwareId: organization.payrollSoftwareId,
				pin: organization.payrollSoftwarePin,
				testSetId: organization.payrollTestSetId,
				idNumber: organization.idNumber,
				number: organization.Counts[0]?.payrollEmisionTestCount || 1,
			});

			await payrollDianClient.createTestPayroll(config.soenacToken, config);

			return json({ success: true });
		}
		default:
			throw 'Invalid action';
	}
}

export default function Component() {
	const { org_id } = useParams();
	const { canCreatePayrolls } = useLoaderData<typeof loader>();

	return (
		<div>
			<div className="pb-4 border-b border-gray-200 mb-4 flex gap-4">
				<ButtonIcon className="shrink-0">
					<Link to={`/admin/organizations/${org_id}/dian`} prefetch="intent">
						<i className="ri-arrow-left-line"></i>
					</Link>
				</ButtonIcon>

				<div>
					<h3 className="font-medium">Habilitar la nómina electrónica</h3>
					<p className="text-gray-500 text-sm">
						Completa el proceso de habilitación para emitir nómina electrónica.
					</p>
				</div>
			</div>

			<Form method="POST" className="max-w-md">
				{canCreatePayrolls ? (
					<IntentButton intent="createPayrolls">
						Crear nóminas de prueba
					</IntentButton>
				) : (
					<div>
						<Label htmlFor="testSetId">Test set id</Label>
						<Input
							type="text"
							name="testSetId"
							placeholder="testSetId"
							required
							className="mb-2"
						/>

						<Label htmlFor="softwareId">Sofware id</Label>
						<Input
							type="text"
							name="softwareId"
							placeholder="Software id"
							required
							className="mb-2"
						/>

						<Label htmlFor="pin">Pin</Label>
						<Input
							type="text"
							name="pin"
							placeholder="Pin"
							required
							className="mb-4"
						/>
						<IntentButton intent="register">Actualizar ambiente</IntentButton>
					</div>
				)}
			</Form>
		</div>
	);
}

const configSchema = z.object({
	soenacToken: z.string(),
	softwareId: z.string(),
	pin: z.string(),
	testSetId: z.string(),
	number: z.number(),
	idNumber: z.coerce.number(),
});
