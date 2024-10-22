import { ForgotPasswordCommand } from '@aws-sdk/client-cognito-identity-provider';
import { json, redirect, type ActionFunctionArgs } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import * as React from 'react';
import {
	ErrorText,
	Input,
	IntentButton,
	Label,
	LinkButton,
} from '~/components/form-utils';
import { awsPool, cognitoClient } from '~/utils/aws-pool.server';
import { logError } from '~/utils/db.server';
import { parseFormData } from '~/utils/misc';

export async function action({ request }: ActionFunctionArgs) {
	const formData = await parseFormData(request);
	const email = formData.get('email');
	if (!email) {
		return json({ error: 'Email is required' }, 400);
	}
	const command = new ForgotPasswordCommand({
		ClientId: awsPool.clientId,
		Username: email,
	});

	try {
		await cognitoClient.send(command);
		return redirect(`/confirm-password-reset?email=${email}`);
	} catch (error) {
		await logError({ error, request });

		return json({ error: 'Hubo un error al recuperar la contraseña' }, 400);
	}
}

export default function Component() {
	const [error, setError] = React.useState<string | null>(null);
	const actionData = useActionData<typeof action>();
	const actionError = actionData?.error;

	return (
		<div className="h-screen flex items-center justify-center">
			<div className="p-8 md:-m-0">
				<div className="mx-auto flex w-full flex-col justify-center space-y-4 sm:w-[350px]">
					<div className="flex lg:hidden items-center text-xl font-bold gap-2 mx-auto">
						<div className="w-9 h-9">
							<img
								src="/img/villing-logo.svg"
								alt="Villing"
								className="h-9 w-9"
							/>
						</div>
						Villing
					</div>

					<div className="flex flex-col space-y-2 text-center">
						<h1 className="text-2xl md:text-3xl tracking-tight">
							Restablecer contraseña
						</h1>
						<p className="text-sm text-gray-500">
							Ingresa tu correo y te enviaremos un enlace para restablecer tu
							contraseña.
						</p>
					</div>

					<Form
						method="POST"
						onSubmit={e => {
							const formData = new FormData(e.currentTarget);
							const email = formData.get('email');
							if (!email) {
								e.preventDefault();
								setError('Por favor ingresa tu correo y contraseña');
								return;
							}
						}}
						onChange={() => setError(null)}
					>
						<div className="mb-2">
							<Label htmlFor="email">Correo electrónico</Label>
							<Input placeholder="hola@villing.io" name="email" id="email" />
						</div>

						<ErrorText className="mb-2">{error || actionError}</ErrorText>

						<IntentButton intent="login" className="w-full">
							Restablecer contraseña
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
							Volver a iniciar sesión
						</LinkButton>
					</Form>
				</div>
			</div>
		</div>
	);
}
