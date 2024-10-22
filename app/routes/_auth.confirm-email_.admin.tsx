import { AdminUpdateUserAttributesCommand } from '@aws-sdk/client-cognito-identity-provider';
import { type ActionFunctionArgs, json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { LinkButton } from '~/components/form-utils';
import { Container } from '~/components/ui-library';
import { catchCognitoError } from '~/utils/auth.server';
import { awsPool, cognitoClient } from '~/utils/aws-pool.server';
import { __prisma } from '~/utils/db.server';
import { errorLogger, logInfo } from '~/utils/logger';
import { cn, invariant } from '~/utils/misc';
import { protectAdminRoute } from '~/utils/plan-protection.server';

type LoaderData = {
	error?: string;
	layout: 'success' | 'resend' | 'login' | 'error';
	message:
		| 'user_not_found'
		| 'token_expired'
		| 'email_verified'
		| 'confirmation_success'
		| 'confirmation_error';
};

export async function loader({ request }: ActionFunctionArgs) {
	await protectAdminRoute(request);

	const searchParams = new URL(request.url).searchParams;
	const email = searchParams.get('email') as string;

	invariant(email, 'Token and email are required');

	try {
		const result = await __prisma.$transaction(async tx => {
			const user = await tx.user.findUnique({
				where: { email },
				select: { id: true, confirmedAt: true },
			});

			if (!user) return { layout: 'error', message: 'user_not_found' } as const;
			if (user.confirmedAt) {
				return { layout: 'error', message: 'email_verified' } as const;
			}

			await verifyEmailInCognito();

			await tx.user.update({
				where: { id: user.id },
				data: { confirmedAt: new Date(), confirmationToken: null },
			});

			return { layout: 'success', message: 'confirmation_success' } as const;

			async function verifyEmailInCognito() {
				logInfo({
					message: `Verifying user email with email ${email}`,
					path: 'updateUser_confirmation',
				});

				const command = new AdminUpdateUserAttributesCommand({
					UserPoolId: awsPool.userPoolId,
					Username: email,
					UserAttributes: [{ Name: 'email_verified', Value: 'true' }],
				});

				await cognitoClient.send(command).catch(catchCognitoError);
			}
		});

		await destroyToken();

		return json<LoaderData>(result);
	} catch (error) {
		await destroyToken();

		const referenceId = errorLogger({ error, path: '/confirm-email' });

		return json<LoaderData>(
			{
				error: `No pudimos confirmar tu correo electrónico. Por favor, envía esta referencia a soporte ${referenceId}`,
				layout: 'error',
				message: 'confirmation_error',
			},
			500,
		);
	}

	async function destroyToken() {
		try {
			await __prisma.user.update({
				where: { email },
				data: { confirmationToken: null, tokenExpiresAt: null },
			});
		} catch (error) {
			errorLogger({ error, path: '/confirm-email_destroyToken' });
		}
	}
}

export default function Component() {
	const { layout } = useLoaderData<typeof loader>();

	return (
		<Container className="max-w-md -mt-14 text-center h-screen flex items-center">
			<div>
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
				{layout === 'success' ? <SuccessLayout /> : null}
				{layout === 'resend' ? <ResendLayout /> : null}
				{layout === 'login' ? <LoginLayout /> : null}
				{layout === 'error' ? <ErrorLayout /> : null}
			</div>
		</Container>
	);
}

function SuccessLayout() {
	return (
		<div>
			<div
				className={cn(
					'flex justify-center items-center mx-auto text-xl mb-4',
					'w-12 h-12 bg-primary-600 rounded-full text-white',
				)}
			>
				<i className="ri-mail-check-line"></i>
			</div>

			<h1 className="text-xl md:text-3xl mb-2">Tu cuenta ha sido confirmada</h1>
			<p className="text-gray-600 mb-4">
				Ya puedes comenzar a usar todas las funciones de Villing sin
				restricciones.
			</p>
			<LinkButton to="/login" className="font-medium max-w-xs mx-auto">
				Ir a Villing
			</LinkButton>
		</div>
	);
}

function ResendLayout() {
	return (
		<div>
			<div
				className={cn(
					'flex justify-center items-center mx-auto text-xl mb-4',
					'w-12 h-12 bg-error-600 rounded-full text-white',
				)}
			>
				<i className="ri-mail-close-line"></i>
			</div>

			<h1 className="text-xl md:text-3xl mb-2">El link ha expirado</h1>
			<p className="text-gray-600 mb-4">
				El link de confirmación ha expirado. Por favor, solicita uno nuevo.
			</p>
			<LinkButton
				to="/resend-confirmation-email"
				className="font-medium max-w-xs mx-auto"
			>
				Solicitar nuevo link
			</LinkButton>
			<LinkButton
				to="/login"
				className="font-medium max-w-xs mx-auto"
				variant="secondary"
			>
				Ir a Villing
			</LinkButton>
		</div>
	);
}

function LoginLayout() {
	const { message } = useLoaderData<typeof loader>();
	const errorMessage = messages[message];

	return (
		<div>
			<div
				className={cn(
					'flex justify-center items-center mx-auto text-xl mb-4',
					'w-12 h-12 bg-error-600 rounded-full text-white',
				)}
			>
				<i className="ri-mail-close-line"></i>
			</div>

			<h1 className="text-xl md:text-3xl mb-4">{errorMessage}</h1>
			<LinkButton to="/login" className="font-medium max-w-xs mx-auto">
				Volver a Villing
			</LinkButton>
		</div>
	);
}

function ErrorLayout() {
	const { error, message } = useLoaderData<typeof loader>();
	const errorMessage = messages[message];

	return (
		<div>
			<h1 className="text-xl md:text-3xl mb-4">
				No pudimos confirmar tu cuenta
			</h1>
			<p className="text-gray-600 mb-4">{error || errorMessage}</p>
			<LinkButton to="/login" className="font-medium max-w-xs mx-auto">
				Volver a Villing
			</LinkButton>
		</div>
	);
}

const messages = {
	user_not_found: 'Lo sentimos, no pudimos encontrar tu cuenta',
	token_expired:
		'El link de confirmación ha expirado. Solicita uno nuevo aquí abajo',
	email_verified:
		'Tu correo ya ha sido confirmado, inicia sesión para continuar',
	confirmation_success:
		'Felicidades, tu correo ha sido confirmado. Ya puedes iniciar sesión',
	confirmation_error:
		'No pudimos confirmar tu correo electrónico. Por favor, intenta de nuevo o contacta a soporte',
};
