import { useForm } from '@conform-to/react';
import { parse } from '@conform-to/zod';
import {
	type MetaFunction,
	json,
	redirect,
	type ActionFunctionArgs,
} from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import { z } from 'zod';

import {
	IntentButton,
	Toast,
	addCustomErrorToSubmission,
} from '~/components/form-utils';
import { Switch } from '~/components/switch';
import { useOrganization } from '~/root';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { cn } from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: 'Actualiza las preferencias de la empresa | Villing' },
];

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const formData = await request.formData();

	const submission = parse(formData, { schema });
	if (submission.intent !== 'submit' || !submission.value) {
		return json({ submission, error: null }, 400);
	}

	const organization = submission.value;

	const { db, orgId, userId } = await getOrgDbClient(request);

	const { error } = await legalActions.validate(
		db,
		userId,
		'update_organization',
	);

	if (error) {
		return json(
			{ submission: addCustomErrorToSubmission(error, submission) },
			403,
		);
	}

	try {
		await db.organization.update({
			where: { id: orgId },
			data: organization,
			select: { id: true },
		});

		return redirect('/home?saved=true');
	} catch (error) {
		await logError({ request, error });

		return json(
			{ submission, error: 'Hubo un error al actualizar la empresa' },
			500,
		);
	}
}

export default function Component() {
	const organization = useOrganization();
	const actionData = useActionData<typeof action>();
	const [form, fields] = useForm({
		onValidate: ({ formData }) => parse(formData, { schema }),
		lastSubmission: actionData?.submission,
		defaultValue: {
			showCompanyInfoInRemision: organization.showCompanyInfoInRemision,
		},
	});

	return (
		<Form method="POST" {...form.props} className="max-w-3xl">
			<div className="pb-4 border-b border-gray-200 mb-4">
				<h3>Preferencias de empresa</h3>
				<p className="text-gray-500 text-sm">
					Modifica las preferencias de la empresa.
				</p>
			</div>

			<div
				className={cn(
					'flex justify-between gap-4 border-b border-gray-100',
					'last-of-type:border-none items-center mb-4',
				)}
			>
				<div>
					<label className="font-medium">
						Mostar información de la empresa en remisiones
					</label>
					<p className="text-sm text-gray-700">
						Activa esta opción para mostrar la información de la empresa en las
						remisiones.
					</p>
				</div>

				<Switch
					name={fields.showCompanyInfoInRemision.name}
					defaultChecked={organization.showCompanyInfoInRemision}
				/>
			</div>

			<Toast variant="error" className="mb-4">
				{form.error}
			</Toast>

			<IntentButton intent="update">Actualizar empresa</IntentButton>
		</Form>
	);
}

const schema = z.object({
	showCompanyInfoInRemision: z.boolean().default(false),
});
