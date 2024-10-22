import { conform, useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	json,
	redirect,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import * as z from 'zod';
import {
	Button,
	ErrorText,
	Input,
	IntentButton,
	Label,
	Toast,
	addCustomErrorToSubmission,
} from '~/components/form-utils';
import { Switch } from '~/components/switch';
import { Box, GoBackLinkButton } from '~/components/ui-library';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { AllowedAction } from '~/utils/enums';
import { cn, parseFormData, invariant } from '~/utils/misc';
import {
	permissionsSections,
	sectionIcons,
	sectionTranslations,
	translations,
	translationsDescriptions,
} from '~/utils/permision-translations';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
	await protectRoute(request);
	invariant(params.role_id, 'role_id is required');
	const roleId = parseInt(params.role_id);

	const { db, orgId } = await getOrgDbClient(request);

	const role = await db.roles.findFirstOrThrow({
		where: { organizationId: orgId, id: roleId },
		select: { name: true, id: true, allowedActions: true },
	});

	return { role };
}

export async function action({ request, params }: ActionFunctionArgs) {
	await protectRoute(request);

	const roleId = Number(params.role_id);

	const formData = await parseFormData(request);
	const intent = formData.get('intent');
	const submission = parse(formData, { schema: roleSchema });
	if (submission.intent !== 'submit' || !submission.value) {
		return json({ submission, error: null }, 400);
	}

	const role = submission.value;
	const { db, orgId, userId } = await getOrgDbClient(request);

	const { error } = await legalActions.validate(db, userId, 'update_members');
	if (error) {
		return json(
			{ submission: addCustomErrorToSubmission(error, submission) },
			403,
		);
	}

	try {
		switch (intent) {
			case 'update': {
				await db.roles.update({
					where: { id: roleId, organizationId: orgId },
					data: role,
					select: { id: true },
				});
				break;
			}
			case 'delete': {
				await db.$transaction(async tx => {
					await tx.roles.delete({
						where: { id: roleId, organizationId: orgId },
					});

					const roles = await tx.roles.findMany({
						where: { organizationId: orgId },
					});

					if (roles.length <= 0) {
						throw 'No puedes eliminar el último rol de la organización';
					}
				});
				break;
			}
			default:
				break;
		}

		return redirect('/settings/roles');
	} catch (error) {
		if (typeof error === 'string') {
			return json(
				{
					submission: addCustomErrorToSubmission(error, submission),
				},
				400,
			);
		}

		await logError({ request, error });

		return json(
			{
				submission: addCustomErrorToSubmission(
					'Hubo un error al actualizar el rol',
					submission,
				),
			},
			500,
		);
	}
}

export default function Component() {
	const { role } = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const [form, fields] = useForm({
		id: 'role-form',
		constraint: getFieldsetConstraint(roleSchema),
		shouldValidate: 'onBlur',
		onValidate: ({ formData }) => parse(formData, { schema: roleSchema }),
		defaultValue: {
			name: role?.name || '',
			permissions: role?.allowedActions || [],
		},
		lastSubmission: actionData?.submission || undefined,
	});

	return (
		<div>
			<GoBackLinkButton to="/settings/roles" className="text-sm">
				Volver a todos los roles
			</GoBackLinkButton>

			<Box className="rounded-lg shadow mb-4 p-0">
				<div className="p-4">
					<h5>Actualiza el rol: {role.name}</h5>
					<p className="text-sm text-gray-700">
						Agrega o elimina permisos del rol: {role.name}.
					</p>
				</div>

				<Form {...form.props} method="POST">
					<div className="p-4 pt-0">
						<Label htmlFor={fields.name.id}>Nombre del rol</Label>
						<Input {...conform.input(fields.name)} />
						<ErrorText id={fields.name.errorId}>{fields.name.error}</ErrorText>
					</div>

					{Object.entries(permissionsSections).map(([section, permissions]) => (
						<fieldset key={section}>
							<legend
								className={cn(
									'px-4 py-2 font-medium border-y border-gray-200 bg-gray-50',
									'w-full flex gap-4 text-sm items-center',
								)}
							>
								<i
									className={`ri-${sectionIcons[section]} text-base text-primary-600`}
								></i>
								<p>{sectionTranslations[section]}</p>
							</legend>

							{permissions.map(permission => (
								<div
									key={permission}
									className={cn(
										'flex justify-between gap-4 p-4 pl-12 border-b border-gray-100',
										'last-of-type:border-none items-center',
									)}
								>
									<div>
										<label className="font-medium">
											{translations[permission]}
										</label>
										<p className="text-sm text-gray-700">
											{translationsDescriptions[permission]}
										</p>
									</div>

									<Switch
										name={fields.allowedActions.name}
										value={permission}
										defaultChecked={role.allowedActions.includes(permission)}
									/>
								</div>
							))}
						</fieldset>
					))}

					{form.error ? (
						<div className="p-4 pt-0">
							<Toast variant="error">{form.error}</Toast>
						</div>
					) : null}

					<div className="flex justify-between gap-4 p-4 border-t border-gray-200">
						<IntentButton intent="delete" variant="destructive">
							Eliminar rol
						</IntentButton>

						<div className="flex gap-4">
							<Button variant="secondary">Cancelar</Button>
							<IntentButton intent="update">Actualizar rol</IntentButton>
						</div>
					</div>
				</Form>
			</Box>
		</div>
	);
}

export const roleSchema = z.object({
	name: z.string({ required_error: 'El nombre es obligatorio' }),
	allowedActions: z.array(z.nativeEnum(AllowedAction)),
});
