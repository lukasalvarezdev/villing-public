import { InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { parse } from '@conform-to/zod';
import {
	json,
	type MetaFunction,
	redirect,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/node';
import { Form, useActionData, useSearchParams } from '@remix-run/react';
import * as React from 'react';
import * as z from 'zod';
import { AuthLayout } from '~/components/auth-layout';
import {
	ErrorText,
	Input,
	IntentButton,
	Label,
	LinkButton,
	Toast,
} from '~/components/form-utils';
import { catchCognitoError, getUser, mapAuthError } from '~/utils/auth.server';
import { awsPool, cognitoClient } from '~/utils/aws-pool.server';
import { errorLogger } from '~/utils/logger';
import {
	getMidnightExpirySeconds,
	getRequestSearchParams,
	safeRedirect,
} from '~/utils/misc';
import {
	getSession,
	isTokenExpired,
	villingSession,
} from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: 'Inicia sesión en Villing' },
	{
		description:
			'Entra a tu cuenta y comienza a facturar con el software contable hecho por comerciantes para comerciantes',
	},
];

export async function loader({ request }: LoaderFunctionArgs) {
	const isExpired = await isTokenExpired(request);
	const searchParams = getRequestSearchParams(request);
	const redirectTo = searchParams.get('redirectTo') || '/home';
	if (!isExpired) throw redirect(safeRedirect(redirectTo));

	return json({});
}

export async function action({ request }: ActionFunctionArgs) {
	const formData = await request.formData();
	const submission = parse(formData, { schema });
	if (submission.intent !== 'submit' || !submission.value) {
		return json({ submission, actionError: null }, 400);
	}

	try {
		const { email, password } = submission.value;
		const command = new InitiateAuthCommand({
			AuthFlow: 'USER_PASSWORD_AUTH',
			ClientId: awsPool.clientId,
			AuthParameters: { USERNAME: email, PASSWORD: password },
		});

		const response = await cognitoClient.send(command).catch(catchCognitoError);

		const token = response?.AuthenticationResult?.AccessToken;

		const [user, session] = await Promise.all([
			getUser(request, token),
			getSession(request),
		]);

		if (!user) throw 'user_not_found';

		await validateUserConfirmation(user);

		session.set('accessToken', token);
		session.set('organizationId', user.organizations[0]?.organizationId);

		const searchParams = getRequestSearchParams(request);
		const redirectTo = searchParams.get('redirectTo') || '/home';

		return redirect(safeRedirect(redirectTo), {
			headers: {
				'Set-Cookie': await villingSession.commitSession(session, {
					maxAge: getMidnightExpirySeconds(),
				}),
			},
		});

		async function validateUserConfirmation(
			user: Awaited<ReturnType<typeof getUser>>,
		) {
			if (user?.tokenExpiresAt && new Date() > user.tokenExpiresAt) {
				throw 'token_expired';
			}

			if (!user?.confirmedAt) throw 'account_not_confirmed';
		}
	} catch (error) {
		const referenceId = errorLogger({
			error,
			path: 'login',
			body: { email: submission.value.email },
		});

		return json(
			{
				submission,
				actionError: mapAuthError(
					error,
					`Hubo un error al inciar sesión. Envia esta referencia: ${referenceId} a soporte para ayudarte`,
				),
			},
			400,
		);
	}
}

const schema = z.object({
	email: z
		.string({ required_error: 'El correo es obligatorio' })
		.email({ message: 'Por favor ingresa un correo válido' }),
	password: z
		.string({ required_error: 'La contraseña es obligatoria' })
		.min(8, { message: 'Por favor ingresa una contraseña válida' }),
});

export default function Component() {
	const [error, setError] = React.useState<string | null>(null);
	const [showPassword, setShowPassword] = React.useState(false);
	const actionData = useActionData<typeof action>();
	const [searchParams] = useSearchParams();
	const fromSignUp = searchParams.get('signedUp') === 'true';
	const actionError = actionData?.actionError;

	return (
		<AuthLayout showForgotPassword>
			<div className="flex flex-col space-y-2 text-center">
				<h1 className="text-2xl md:text-3xl tracking-tight">
					Entra a tu cuenta
				</h1>
				<p className="text-sm text-gray-500">
					Ingresa tu correo y contraseña para continuar.
				</p>
			</div>

			{fromSignUp ? (
				<Toast variant="success">
					Tu cuenta ha sido creada con éxito. Te hemos enviado un correo de
					confirmación a tu bandeja de entrada para que puedas empezar a usar
					Villing.
				</Toast>
			) : null}

			<Message />

			<Form
				method="POST"
				onSubmit={e => {
					const formData = new FormData(e.currentTarget);
					const submission = parse(formData, { schema });
					if (!submission.value) {
						e.preventDefault();
						setError('Por favor ingresa tu correo y contraseña');
						return;
					}
				}}
				onChange={() => setError(null)}
			>
				<div className="mb-2">
					<Label htmlFor="email">Correo electrónico</Label>
					<Input
						placeholder="hola@villing.io"
						name="email"
						id="email"
						defaultValue={searchParams.get('email') || ''}
					/>
				</div>

				<div className="mb-2">
					<Label htmlFor="password">Contraseña</Label>
					<Input
						placeholder="********"
						name="password"
						id="password"
						type={showPassword ? 'text' : 'password'}
					/>
				</div>

				<button
					type="button"
					className="mb-2 flex items-center gap-2 text-sm"
					onClick={() => setShowPassword(!showPassword)}
				>
					{showPassword ? (
						<div>
							<i className="ri-eye-off-line"></i>
							<span>Ocultar contraseña</span>
						</div>
					) : (
						<div>
							<i className="ri-eye-line"></i>
							<span>Mostrar contraseña</span>
						</div>
					)}
				</button>

				<ErrorText className="mb-2">{error || actionError}</ErrorText>

				<IntentButton intent="login" className="w-full">
					Entrar a mi cuenta
				</IntentButton>

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
					to="/join"
					prefetch="intent"
					variant="secondary"
					className="w-full"
				>
					Crear una cuenta
				</LinkButton>
			</Form>
		</AuthLayout>
	);
}

function Message() {
	const [searchParams] = useSearchParams();
	const msg = searchParams.get('msg');
	const ref = searchParams.get('ref');

	if (!msg) return null;

	const toastInfo = messages[msg];

	if (!toastInfo) return null;

	return (
		<Toast variant={toastInfo.type === 'error' ? 'error' : 'success'}>
			{toastInfo.message}
			{ref ? ` (${ref})` : ''}
		</Toast>
	);
}

const messages = {
	invitation_expired: {
		type: 'error',
		message: 'La invitación ha expirado. Por favor solicita una nueva',
	},
	invitation_accepted: {
		type: 'success',
		message: 'Tu cuenta ha sido creada con éxito. Inicia sesión para continuar',
	},
	account_not_confirmed: {
		type: 'error',
		message:
			'Tu cuenta no ha sido confirmada. Envía esta referencia a soporte para ayudarte',
	},
	account_confirmed: {
		type: 'success',
		message:
			'Tu cuenta ha sido confirmada con éxito. Inicia sesión para continuar',
	},
} as Record<string, { type: 'error' | 'success'; message: string }>;
