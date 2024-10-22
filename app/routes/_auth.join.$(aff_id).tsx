import {
	AdminConfirmSignUpCommand,
	InitiateAuthCommand,
	SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { conform, useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	json,
	type MetaFunction,
	redirect,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import * as React from 'react';
import { v4 as uuid } from 'uuid';
import * as z from 'zod';
import { AuthLayout } from '~/components/auth-layout';
import {
	ErrorText,
	Input,
	IntentButton,
	Label,
	LinkButton,
} from '~/components/form-utils';
import { sendConfirmationEmail } from '~/modules/emails/signup-email.server';
import { catchCognitoError, mapAuthError } from '~/utils/auth.server';
import { awsPool, cognitoClient } from '~/utils/aws-pool.server';
import { __prisma, logError } from '~/utils/db.server';
import * as gtag from '~/utils/gtag.client';
import { errorLogger, logInfo } from '~/utils/logger';
import { getMidnightExpirySeconds } from '~/utils/misc';
import { getCurrentDomain } from '~/utils/misc.server';
import {
	getSession,
	isTokenExpired,
	villingSession,
} from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: 'Únete a Villing' },
	{
		description:
			'Crea tu cuenta en Villing y comienza a facturar con el software contable hecho por comerciantes para comerciantes',
	},
];

export async function loader({ request }: LoaderFunctionArgs) {
	const isExpired = await isTokenExpired(request);
	if (!isExpired) throw redirect('/home');
	return json({ gaTrackingId: process.env.GA_TRACKING_ID });
}

export async function action({ request, params }: ActionFunctionArgs) {
	const formData = await request.formData();
	const submission = parse(formData, { schema });
	if (submission.intent !== 'submit' || !submission.value) {
		return json({ submission, actionError: null }, 400);
	}

	try {
		const { email, password } = submission.value;
		const session = await getSession(request);

		await __prisma.$transaction(async tx => {
			logInfo({
				message: `Creating user with email ${email}`,
				path: 'createAccount',
			});

			const existingUser = await tx.user.findFirst({ where: { email } });
			if (existingUser) throw 'user_already_exists';

			const affiliateId = params.aff_id;
			const token = uuid();

			await tx.user.create({
				data: {
					email,
					name: '',
					affiliateOrganizationId: affiliateId,
					confirmationToken: token,
					tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
				},
				select: { id: true },
			});

			const searchParams = new URLSearchParams({ email, token });

			await sendConfirmationEmail({
				to: email,
				link: `${getCurrentDomain()}/confirm-email?${searchParams.toString()}`,
			});

			await createUserInCognito();
			await confirmCognitoUser();
			const { accessToken } = await loginUser();

			session.set('accessToken', accessToken);

			async function createUserInCognito() {
				const command = new SignUpCommand({
					ClientId: awsPool.clientId,
					Password: password,
					Username: email,
					UserAttributes: [{ Name: 'email', Value: email }],
				});

				await cognitoClient.send(command).catch(catchCognitoError);
			}

			async function confirmCognitoUser() {
				logInfo({
					message: `Confirming user in cognito with email ${email}`,
					path: 'confirmCognitoUser_confirmation',
				});

				const command = new AdminConfirmSignUpCommand({
					UserPoolId: awsPool.userPoolId,
					Username: email,
				});

				await cognitoClient.send(command).catch(catchCognitoError);
			}

			async function loginUser() {
				const command = new InitiateAuthCommand({
					AuthFlow: 'USER_PASSWORD_AUTH',
					ClientId: awsPool.clientId,
					AuthParameters: { USERNAME: email, PASSWORD: password },
				});

				const response = await cognitoClient
					.send(command)
					.catch(catchCognitoError);

				const accessToken = response?.AuthenticationResult?.AccessToken;

				return { accessToken };
			}
		});

		return redirect('/start', {
			headers: {
				'Set-Cookie': await villingSession.commitSession(session, {
					maxAge: getMidnightExpirySeconds(),
				}),
			},
		});
	} catch (error) {
		if (typeof error !== 'string') await logError({ error, request });

		const referenceId = errorLogger({ error, path: 'createAccount' });

		return json(
			{
				submission,
				actionError: mapAuthError(
					error,
					`Hubo un error al crear tu cuenta. Por favor intenta de nuevo. Si el problema persiste, contacta a soporte con el código de referencia ${referenceId}`,
				),
			},
			500,
		);
	}
}

export default function Component() {
	const [showPassword, setShowPassword] = React.useState(false);
	const actionData = useActionData<typeof action>();
	const id = React.useId();
	const [form, fields] = useForm({
		id,
		constraint: getFieldsetConstraint(schema),
		shouldValidate: 'onBlur',
		onValidate: ({ formData }) => parse(formData, { schema }),
		lastSubmission: actionData?.submission || undefined,
		onSubmit: () => {
			gtag.event({ action: 'ads_conversion_Sign_up_1', event_timeout: 2000 });
		},
	});
	const actionError = actionData?.actionError;

	return (
		<AuthLayout>
			<div className="flex flex-col space-y-2 text-center">
				<h1 className="text-2xl md:text-3xl">
					De cero a facturando en 3 minutos
				</h1>
				<p className="text-sm text-gray-500">
					Solo necesitas un correo electrónico y una contraseña
				</p>
			</div>

			<Form
				method="POST"
				id={form.props.id}
				onSubmit={form.props.onSubmit}
				autoComplete="off"
			>
				<div className="mb-2">
					<Label htmlFor={fields.email.id}>Correo electrónico</Label>
					<Input
						placeholder="hola@villing.io"
						{...conform.input(fields.email)}
					/>

					<ErrorText id={fields.email.errorId} className="mt-2">
						{fields.email.error}
					</ErrorText>
				</div>

				<div className="mb-2">
					<Label htmlFor={fields.password.id}>Contraseña</Label>
					<Input
						placeholder="********"
						{...conform.input(fields.password, {
							type: showPassword ? 'text' : 'password',
						})}
					/>

					<ErrorText id={fields.password.errorId}>
						{fields.password.error}
					</ErrorText>
				</div>

				<button
					type="button"
					className="mb-2 flex items-center gap-2 text-sm"
					onClick={() => setShowPassword(!showPassword)}
				>
					{showPassword ? (
						<div className="flex gap-2 items-center">
							<i className="ri-eye-off-line"></i>
							<span>Ocultar contraseña</span>
						</div>
					) : (
						<div className="flex gap-2 items-center">
							<i className="ri-eye-line"></i>
							<span>Mostrar contraseña</span>
						</div>
					)}
				</button>

				<ErrorText id={form.errorId} className="mb-2">
					{actionError || form.error}
				</ErrorText>

				<IntentButton className="w-full">Crear mi cuenta</IntentButton>

				<div className="relative my-4">
					<div className="absolute inset-0 flex items-center">
						<span className="w-full border-t" />
					</div>
					<div className="relative flex justify-center text-xs">
						<span className="bg-white px-2 text-gray-500">
							O TAMBIÉN PUEDES
						</span>
					</div>
				</div>

				<LinkButton
					to="/login"
					prefetch="intent"
					variant="secondary"
					className="w-full"
				>
					Entrar a tu cuenta
				</LinkButton>
			</Form>
		</AuthLayout>
	);
}

const schema = z.object({
	email: z
		.string({ required_error: 'El correo es obligatorio' })
		.email({ message: 'Por favor ingresa un correo válido' }),
	password: z
		.string({ required_error: 'La contraseña es obligatoria' })
		.min(8, { message: 'Por favor ingresa una contraseña válida' })
		.regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/, {
			message:
				'La contraseña debe tener al menos una mayúscula, una minúscula, un número y un caracter especial',
		}),
});
