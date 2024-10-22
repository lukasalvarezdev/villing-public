import { conform, useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	json,
	type ActionFunctionArgs,
	redirect,
	type MetaFunction,
} from '@remix-run/node';
import { Form, useActionData, useFetcher, useParams } from '@remix-run/react';
import * as React from 'react';
import * as z from 'zod';
import {
	Button,
	ErrorText,
	Input,
	IntentButton,
	Label,
	LinkButton,
	Select,
	Toast,
	addCustomErrorToSubmission,
} from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import { TwoColumnsDiv } from '~/components/ui-library';
import { useOrganization } from '~/root';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';
import { useMembersLoaderData } from './settings.members';

export const meta: MetaFunction = () => [{ title: `Editar miembro - Villing` }];

export async function action({ request, params }: ActionFunctionArgs) {
	await protectRoute(request);

	const formData = await request.formData();
	const memberId = Number(params.member_id);

	const submission = parse(formData, { schema });
	if (submission.intent !== 'submit' || !submission.value) {
		return json({ submission, error: null }, 400);
	}

	const { roleId, allowedSubOrgs } = submission.value;
	const { db, orgId, userId } = await getOrgDbClient(request);

	const { error } = await legalActions.validate(db, userId, 'update_members');
	if (error) {
		return json(
			{ submission: addCustomErrorToSubmission(error, submission) },
			403,
		);
	}

	const organization = await db.organization.findUnique({
		where: { id: orgId },
		select: { ownerId: true },
	});

	if (organization?.ownerId === memberId) {
		return json(
			{
				submission: addCustomErrorToSubmission(
					'No puedes editar al dueño de la empresa',
					submission,
				),
			},
			400,
		);
	}

	try {
		await db.user.update({
			where: {
				id: memberId,
				organizations: { some: { organizationId: orgId } },
			},
			data: {
				roleId,
				allowedSubOrgs: { set: allowedSubOrgs.map(x => ({ id: x })) },
			},
			select: { id: true },
		});

		return redirect(`/settings/members?success=${memberId}`);
	} catch (error) {
		await logError({ request, error });

		return json(
			{
				submission: addCustomErrorToSubmission(
					'Hubo un error al actualizar el usuario',
					submission,
				),
			},
			500,
		);
	}
}

export default function Component() {
	const { member_id } = useParams();
	const formId = React.useId();
	const parentData = useMembersLoaderData();
	const organization = useOrganization();
	const member = parentData?.users.find(s => s.id.toString() === member_id);
	const actionData = useActionData<typeof action>();
	const [form, fields] = useForm({
		id: formId,
		constraint: getFieldsetConstraint(schema),
		shouldValidate: 'onBlur',
		onValidate: ({ formData }) => parse(formData, { schema }),
		defaultValue: {
			roleId: member?.role?.id || 0,
			allowedSubOrgs: member?.allowedSubOrgs.map(x => x.id.toString()) || [],
		},
		lastSubmission: actionData?.submission || undefined,
	});
	const isOwner = organization.ownerId === Number(member_id);

	if (!parentData || !member) return null;

	const { subOrgs, roles } = parentData;

	function findSubOrg(id: string) {
		return subOrgs.find(x => x.id.toString() === id)?.name;
	}

	return (
		<Form method="POST" {...form.props} className="flex flex-col gap-4 p-4">
			<TwoColumnsDiv>
				<div className="flex-1">
					<p className="block font-medium text-sm mb-1">Nombre</p>
					<Input disabled defaultValue={member?.name} />
				</div>

				<div className="flex-1">
					<p className="block font-medium text-sm mb-1">Correo electrónico</p>
					<Input disabled defaultValue={member?.email} />
				</div>
			</TwoColumnsDiv>

			<TwoColumnsDiv>
				<div className="flex-1">
					<Label htmlFor={fields.roleId.id}>Rol</Label>
					<Select
						options={roles.map(r => ({ label: r.name, value: r.id }))}
						{...conform.input(fields.roleId)}
					/>
					<ErrorText id={fields.roleId.errorId}>
						{fields.roleId.error}
					</ErrorText>
				</div>

				<div className="flex-1"></div>
			</TwoColumnsDiv>

			<fieldset>
				<legend className="mb-2 font-medium">Sucursales permitidas</legend>

				{conform
					.collection(fields.allowedSubOrgs, {
						type: 'checkbox',
						options: subOrgs.map(x => x.id.toString()),
					})
					.map((props, index) => (
						<div key={index} className="flex gap-2">
							<input {...props} />
							<label>{findSubOrg(props.value)}</label>
						</div>
					))}
			</fieldset>

			<Toast>{form.error}</Toast>

			{!isOwner ? (
				<fieldset className="flex gap-6 md:gap-4 flex-col md:flex-row justify-between text-sm">
					<div className="flex flex-col md:flex-row gap-2 md:gap-4">
						<IntentButton
							intent="update"
							className="whitespace-nowrap"
							variant="black"
						>
							Actualizar usuario
						</IntentButton>
						<LinkButton
							variant="secondary"
							to="/settings/members"
							prefetch="intent"
						>
							Cancelar
						</LinkButton>
					</div>

					<KickMemberButton member={member} />
				</fieldset>
			) : null}
		</Form>
	);
}

function KickMemberButton({
	member,
}: {
	member: { name: string } & Record<string, any>;
}) {
	const fetcher = useFetcher<any>();
	const [isKicking, setIsKicking] = React.useState(false);

	if (isKicking) {
		return (
			<Modal onClose={() => setIsKicking(false)} className="max-w-md">
				<ModalHeader className="mb-4" onClick={() => setIsKicking(false)}>
					<h4>Eliminar {member.name}</h4>
				</ModalHeader>

				<p className="mb-4">
					¿Estás seguro que quieres eliminar a {member.name}? Esta acción no se
					puede deshacer.
				</p>

				<Toast className="mb-4">{fetcher.data?.error}</Toast>

				<fetcher.Form method="POST" action="kick" className="flex gap-4">
					<IntentButton
						variant="destructive"
						state={fetcher.state !== 'idle' ? 'pending' : undefined}
					>
						Eliminar miembro
					</IntentButton>
					<Button
						variant="secondary"
						type="button"
						onClick={() => setIsKicking(false)}
					>
						Cancelar
					</Button>
				</fetcher.Form>
			</Modal>
		);
	}

	return (
		<Button
			variant="destructive"
			type="button"
			onClick={() => setIsKicking(true)}
		>
			Eliminar miembro
		</Button>
	);
}

const schema = z.object({
	roleId: z.number(),
	allowedSubOrgs: z.array(z.number()),
});
