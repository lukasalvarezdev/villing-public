import {
	SignUpCommand,
	AdminConfirmSignUpCommand,
	AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { conform, useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
	redirect,
} from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react';
import { z } from 'zod';
import {
	Input,
	IntentButton,
	Label,
	LinkButton,
	Toast,
} from '~/components/form-utils';
import { Container } from '~/components/ui-library';
import { catchCognitoError } from '~/utils/auth.server';
import { awsPool, cognitoClient } from '~/utils/aws-pool.server';
import { __prisma, logError } from '~/utils/db.server';
import { errorLogger, logInfo } from '~/utils/logger';
import { invariant } from '~/utils/misc';

export async function loader({ params }: LoaderFunctionArgs) {
	const token = params.token;
	invariant(token, 'Token is required');

	const invitation = await __prisma.invitation.findFirst({
		where: { token, expiresAt: { gt: new Date() } },
		select: { organization: { select: { name: true } }, email: true },
	});

	if (!invitation) {
		throw redirect('/login?msg=invitation_expired');
	}

	const user = await __prisma.user.findUnique({
		where: { email: invitation.email },
		select: { id: true },
	});

	return json({ name: invitation.organization.name, userExists: !!user });
}

export async function action({ params, request }: ActionFunctionArgs) {
	const token = params.token;
	invariant(token, 'Token is required');

	const invitation = await __prisma.invitation.findFirst({
		where: { token, expiresAt: { gt: new Date() } },
		select: { organization: { select: { name: true } }, email: true },
	});

	if (!invitation) {
		throw redirect('/login?msg=invitation_expired');
	}
	const user = await __prisma.user.findUnique({
		where: { email: invitation.email },
		select: { id: true },
	});

	const baseSchema = user
		? optionalSchema
		: schema.refine(data => data.password === data.confirm, {
				message: 'Las contraseñas no coinciden',
				path: ['confirm'],
			});

	const formData = await request.formData();
	const submission = parse(formData, { schema: baseSchema });
	if (submission.intent !== 'submit' || !submission.value) {
		return json({ submission, actionError: null }, 400);
	}

	try {
		const { password } = submission.value;

		await __prisma.$transaction(async tx => {
			const { expiresAt } = await tx.invitation.findFirstOrThrow({
				where: { token, acceptedAt: null },
				select: { expiresAt: true },
			});

			if (expiresAt < new Date()) {
				throw 'La invitación ha expirado. Por favor dile a tu administrador que solicite una nueva invitación.';
			}

			const { organizationId, ...invitation } = await tx.invitation.update({
				where: { token, acceptedAt: null },
				data: { expiresAt: new Date(), acceptedAt: new Date(), token: null },
				select: {
					email: true,
					name: true,
					organizationId: true,
					roleId: true,
					type: true,
				},
			});

			const { email, name } = invitation;

			const user = await tx.user.findUnique({
				where: { email },
				select: { id: true },
			});

			if (user) {
				await Promise.all([
					tx.userOrganization.create({
						data: { userId: user.id, organizationId },
					}),
					tx.user.update({
						where: { id: user.id },
						data: {
							name,
							type: invitation.type,
							confirmedAt: new Date(),
							roleId: invitation.roleId,
						},
					}),
				]);

				return;
			}

			const { id: userId } = await tx.user.create({
				data: { ...invitation, confirmedAt: new Date() },
			});

			await tx.userOrganization.create({ data: { userId, organizationId } });

			await createCognitoUser();
			await confirmCognitoUser();
			await verifyEmailInCognito();

			async function createCognitoUser() {
				logInfo({
					message: `Creating user in cognito with email ${email}`,
					path: 'createCognitoUser',
				});

				const command = new SignUpCommand({
					ClientId: awsPool.clientId,
					Password: password,
					Username: email,
					UserAttributes: [
						{ Name: 'name', Value: name },
						{ Name: 'email', Value: email },
					],
				});

				await cognitoClient.send(command).catch(catchCognitoError);
			}

			async function confirmCognitoUser() {
				logInfo({
					message: `Confirming user in cognito with email ${email}`,
					path: 'confirmCognitoUser',
				});

				const command = new AdminConfirmSignUpCommand({
					UserPoolId: awsPool.userPoolId,
					Username: email,
				});

				await cognitoClient.send(command).catch(catchCognitoError);
			}

			async function verifyEmailInCognito() {
				logInfo({
					message: `Verifying user email with email ${email}`,
					path: 'updateUser',
				});

				const command = new AdminUpdateUserAttributesCommand({
					UserPoolId: awsPool.userPoolId,
					Username: email,
					UserAttributes: [{ Name: 'email_verified', Value: 'true' }],
				});

				await cognitoClient.send(command).catch(catchCognitoError);
			}
		});

		return redirect('/login?msg=invitation_accepted');
	} catch (error) {
		if (typeof error !== 'string') await logError({ error, request });

		const referenceId = errorLogger({
			error,
			path: '/invitations.$token',
			body: Object.fromEntries(formData),
		});

		return json(
			{
				error: `Hubo un error al crear la cuenta, por envía esta referencia: ${referenceId} al soporte técnico.`,
			},
			500,
		);
	}
}

export default function Component() {
	const { name, userExists } = useLoaderData<typeof loader>();
	const error = useActionData<any>()?.error;

	const baseSchema = userExists
		? optionalSchema
		: schema.refine(data => data.password === data.confirm, {
				message: 'Las contraseñas no coinciden',
				path: ['confirm'],
			});

	const [form, fields] = useForm({
		id: 'create-password',
		constraint: getFieldsetConstraint(baseSchema),
		shouldValidate: 'onBlur',
		onValidate: ({ formData }) => parse(formData, { schema: baseSchema }),
	});

	return (
		<div className="h-screen flex justify-center">
			<Container className="mt-20 max-w-sm mx-auto">
				<Link
					to="/"
					className="flex justify-center items-center text-xl font-bold gap-2 mb-6"
				>
					<div className="w-7 h-7">
						<img
							src="/img/villing-logo.svg"
							alt="Villing"
							className="h-full w-full"
						/>
					</div>
					Villing
				</Link>

				<div className="flex flex-col space-y-2 text-center">
					<h1 className="text-2xl">Acepta la invitación a unirte</h1>
					<p className="text-sm text-gray-500">
						Crea una contraseña para tu cuenta y empieza a usar Villing haciendo
						parte de la empresa <strong>{name}</strong>.
					</p>
				</div>

				<Form method="POST" {...form.props}>
					{userExists ? null : (
						<div>
							<div className="mb-2">
								<Label htmlFor={fields.password.id}>Contraseña</Label>
								<Input
									placeholder="********"
									{...conform.input(fields.password, { type: 'password' })}
								/>
							</div>

							<div>
								<Label htmlFor={fields.confirm.id}>Confirmar contraseña</Label>
								<Input
									placeholder="********"
									{...conform.input(fields.confirm, { type: 'password' })}
								/>
							</div>
						</div>
					)}

					{error ? (
						<Toast variant="error" className="mt-4">
							{error}
						</Toast>
					) : null}

					<IntentButton intent="confirm" className="w-full mt-4 mb-2">
						Aceptar invitación
					</IntentButton>
					<LinkButton to="/" className="w-full" variant="secondary">
						Cancelar
					</LinkButton>
				</Form>
			</Container>
		</div>
	);
}

const schema = z.object({
	password: z
		.string({ required_error: 'La contraseña es obligatoria' })
		.min(8, { message: 'Por favor ingresa una contraseña válida' })
		.regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/, {
			message:
				'La contraseña debe tener al menos una mayúscula, una minúscula, un número y un caracter especial',
		}),
	confirm: z.string({
		required_error: 'Debes confirmar tu contraseña',
	}),
});

const optionalSchema = schema.partial();
