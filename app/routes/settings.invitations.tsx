import { conform, useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	json,
	type SerializeFrom,
	type MetaFunction,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/node';
import {
	Form,
	useActionData,
	useFetcher,
	useLoaderData,
} from '@remix-run/react';
import * as React from 'react';
import { v4 as uuid } from 'uuid';
import * as z from 'zod';
import { Checkbox, CheckboxField } from '~/components/checkbox';
import { RouteErrorBoundary } from '~/components/error-boundary';
import {
	Button,
	ErrorText,
	Input,
	IntentButton,
	Label,
	Select,
	Toast,
} from '~/components/form-utils';
import { Box, TwoColumnsDiv } from '~/components/ui-library';
import { sendInvitationEmail } from '~/modules/emails/invitation-email.server';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { errorLogger } from '~/utils/logger';
import { cn, useActionSuccess, useIsSubmitting } from '~/utils/misc';
import { getCurrentDomain } from '~/utils/misc.server';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [{ title: 'Invitaciones - Villing' }];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const organization = await db.organization.findUniqueOrThrow({
		where: { id: orgId },
		select: {
			Invitation: {
				where: { acceptedAt: null },
				include: { user: true },
			},
			Roles: { select: { name: true, id: true }, orderBy: { name: 'asc' } },
		},
	});

	return json({
		invitations: organization.Invitation.map(inv => ({
			id: inv.id,
			name: inv.user?.name || inv.name || 'Sin nombre',
			email: inv.email,
			isExpired: inv.expiresAt < new Date(),
			type: inv.type,
		})),
		roles: organization.Roles.map(role => ({
			label: role.name,
			value: role.id,
		})),
	});
}

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const formData = await request.formData();
	const intent = formData.get('intent')?.toString();
	const { db, orgId, userId } = await getOrgDbClient(request);

	const { error } = await legalActions.validate(db, userId, 'update_members');
	if (error) return json({ error, submission: null, success: false }, 403);

	try {
		switch (intent) {
			case 'invite': {
				const submission = parse(formData, { schema });
				if (submission.intent !== 'submit' || !submission.value) {
					return json({ submission, error: null, success: false }, 400);
				}

				const { isAccountant, ...invitation } = submission.value;

				await db.$transaction(async tx => {
					const invitations = await tx.invitation.findMany({
						where: { email: invitation.email, acceptedAt: null },
						include: { user: true },
					});

					if (invitations.length) {
						throw 'El usuario ya tiene una invitación pendiente';
					}

					const token = uuid();

					const {
						organization: { name: company },
					} = await tx.invitation.create({
						data: {
							...invitation,
							organizationId: orgId,
							token,
							expiresAt: new Date(new Date().getTime() + 24 * 60 * 60 * 1000), // 24 hours
							type: isAccountant ? 'accountant' : 'user',
						},
						select: { id: true, organization: { select: { name: true } } },
					});

					await sendInvitationEmail({
						company,
						to: invitation.email,
						name: invitation.name,
						link: `${getCurrentDomain()}/invitations/${token}`,
					});
				});
				break;
			}
			case 'resend': {
				const id = formData.get('id')?.toString();
				const invitation = await db.invitation.findUnique({
					where: { id: Number(id), organizationId: orgId },
					select: {
						email: true,
						name: true,
						organization: { select: { name: true } },
					},
				});

				if (!invitation) throw 'La invitación no existe';

				const token = uuid();

				await db.invitation.update({
					where: { id: Number(id) },
					data: {
						token,
						expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
					},
				});

				await sendInvitationEmail({
					company: invitation.organization.name,
					to: invitation.email,
					name: invitation.name,
					link: `${getCurrentDomain()}/invitations/${token}`,
				});
				break;
			}
			case 'delete': {
				const id = formData.get('id')?.toString();
				await db.invitation.deleteMany({
					where: { id: Number(id), organizationId: orgId },
				});
				break;
			}
			default:
				break;
		}

		return json({ submission: null, error: null, success: true });
	} catch (error) {
		if (typeof error === 'string') {
			return json({ submission: null, error, success: false }, 400);
		}

		await logError({ request, error });
		const referenceId = errorLogger({
			error,
			customMessage: 'Error al invitar usuario',
			body: Object.fromEntries(formData),
			path: `Invitations with intent: ${intent}`,
		});

		return json(
			{
				submission: null,
				error: `Hubo un error al invitar el usuario. Por favor, intenta de nuevo o contacta con soporte. Referencia: ${referenceId}`,
				success: false,
			},
			500,
		);
	}
}

export default function Component() {
	const { invitations } = useLoaderData<typeof loader>();

	return (
		<div className="max-w-3xl">
			<div className="pb-4 border-b border-gray-200 mb-6">
				<h3>Invitaciones</h3>
				<p className="text-gray-500 text-sm">
					Invita a usuarios a unirse a tu organización.
				</p>
			</div>

			<div>
				<Box className="mb-4">
					<h5 className="mb-4">Invitaciones pendientes</h5>

					<ul className="flex flex-col gap-4">
						{invitations.length ? (
							invitations.map(inv => (
								<InvitationItem key={inv.id} invitation={inv} />
							))
						) : (
							<p>No hay invitaciones pendientes.</p>
						)}
					</ul>
				</Box>

				<AddInvitationForm />
			</div>
		</div>
	);
}

type InvitationType = SerializeFrom<typeof loader>['invitations'][number];
function InvitationItem({ invitation }: { invitation: InvitationType }) {
	const fetcher = useFetcher<any>();
	const isPending = fetcher.state !== 'idle';
	const error = fetcher.data?.error;

	if (isPending) return null;

	return (
		<li>
			<div
				className={cn(
					'text-sm',
					'flex md:items-center gap-4 justify-between flex-col md:flex-row',
				)}
			>
				<div className="flex md:items-center gap-4">
					<div className="w-9 h-9 flex shrink-0 items-center justify-center bg-gray-200 rounded-full">
						<img
							src="/img/notion-avatar.svg"
							alt="Avatar"
							className="max-h-full max-w-full"
						/>
					</div>

					<div>
						<div className="flex gap-2 items-center">
							<p className="font-medium">{invitation.name}</p>
							{invitation.type === 'accountant' ? (
								<span className="text-xs bg-white font-medium px-2 border border-gray-200 rounded-full">
									Contador
								</span>
							) : null}
						</div>
						<p className="text-gray-500">{invitation.email}</p>
					</div>
				</div>

				<fetcher.Form method="POST" className="flex gap-4">
					<input type="hidden" name="id" value={invitation.id} />
					{invitation.isExpired ? (
						<IntentButton variant="secondary" size="sm" intent="resend">
							Renviar
						</IntentButton>
					) : null}
					<IntentButton variant="destructive" size="sm" intent="delete">
						Cancelar
					</IntentButton>
				</fetcher.Form>
			</div>

			<Toast variant="error" className="mt-4">
				{error}
			</Toast>
		</li>
	);
}

function AddInvitationForm() {
	const { roles } = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const isPending = useIsSubmitting('invite');
	const [form, fields] = useForm({
		id: 'invitation',
		constraint: getFieldsetConstraint(schema),
		onValidate: ({ formData }) => parse(formData, { schema }),
		lastSubmission: actionData?.submission || undefined,
		shouldValidate: 'onBlur',
	});
	const success = useActionSuccess();
	const error = actionData?.error;

	React.useEffect(() => {
		if (isPending) form.ref.current?.reset();
	}, [form.ref, isPending]);

	return (
		<Box>
			<h5 className="mb-2">Invita un nuevo usuario</h5>

			<Form method="POST" {...form.props}>
				<TwoColumnsDiv className="mb-4">
					<div className="flex-1">
						<Label htmlFor={fields.name.id}>Nombre</Label>
						<Input {...conform.input(fields.name)} placeholder="Juan Pérez" />
						<ErrorText id={fields.name.errorId}>{fields.name.error}</ErrorText>
					</div>

					<div className="flex-1">
						<Label htmlFor={fields.email.id}>Correo electrónico</Label>
						<Input
							{...conform.input(fields.email)}
							placeholder="hola@villingio"
						/>
						<ErrorText id={fields.email.errorId}>
							{fields.email.error}
						</ErrorText>
					</div>
				</TwoColumnsDiv>

				<TwoColumnsDiv className="mb-4">
					<div className="flex-1">
						<Label htmlFor={fields.roleId.id}>Rol</Label>
						<Select options={roles} {...conform.input(fields.roleId)} />
						<ErrorText id={fields.roleId.errorId}>
							{fields.roleId.error}
						</ErrorText>
					</div>
					<div></div>
				</TwoColumnsDiv>

				<CheckboxField label="Este usuario es un contador" className="mb-4">
					<Checkbox
						name={fields.isAccountant.name}
						id={fields.isAccountant.id}
					/>
				</CheckboxField>

				<ErrorText id={form.errorId} className="mb-4">
					{error}
				</ErrorText>

				{success ? (
					<Toast variant="success" className="mb-4">
						Hemos enviado la invitación al usuario. Revisa su correo.
					</Toast>
				) : null}

				<fieldset className="flex gap-6 md:gap-4 flex-col md:flex-row justify-between text-sm">
					<div className="flex flex-col md:flex-row gap-2 md:gap-4">
						<IntentButton
							intent="invite"
							className="whitespace-nowrap"
							variant="black"
						>
							Inivitar usuario
						</IntentButton>
						<Button variant="secondary" type="reset">
							Cancelar
						</Button>
					</div>
				</fieldset>
			</Form>
		</Box>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con las invitaciones. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}

const schema = z.object({
	name: z.string({ required_error: 'Por favor ingresa el nombre del usuario' }),
	email: z
		.string({
			required_error: 'Por favor ingresa el correo electrónico del usuario',
		})
		.email({ message: 'Por favor ingresa un correo válido' }),
	isAccountant: z.boolean().default(false),
	roleId: z.number(),
});
