import {
	CodeMismatchException,
	ConfirmForgotPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { conform, useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import { json, redirect, type ActionFunctionArgs } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import * as React from 'react';
import * as z from 'zod';
import {
	ErrorText,
	Input,
	IntentButton,
	Label,
	LinkButton,
	Toast,
} from '~/components/form-utils';
import { awsPool, cognitoClient } from '~/utils/aws-pool.server';
import { logError } from '~/utils/db.server';
import { parseFormData } from '~/utils/misc';

export async function action({ request }: ActionFunctionArgs) {
	const searchParams = new URL(request.url).searchParams;
	const formData = await parseFormData(request);
	const email = searchParams.get('email');

	if (!email) return json({ error: 'Email is required' }, 400);

	const submission = parse(formData, { schema });
	if (!submission.value) {
		return json({ submission, error: 'Hubo un error' }, 400);
	}

	const command = new ConfirmForgotPasswordCommand({
		ConfirmationCode: submission.value.securityCode,
		ClientId: awsPool.clientId,
		Password: submission.value.newPassword,
		Username: email,
	});

	try {
		await cognitoClient.send(command);
		return redirect('/login?intent=confirm-password-reset');
	} catch (error) {
		if (error instanceof CodeMismatchException) {
			return json({ error: 'El código de verificación es incorrecto' }, 400);
		}

		await logError({ error, request });

		return json({ error: 'Hubo un error al cambiar la contraseña' }, 400);
	}
}

export default function Component() {
	const [error, setError] = React.useState<string | null>(null);
	const actionData = useActionData<typeof action>();
	const actionError = actionData?.error;
	const [form, fields] = useForm({
		id: 'confirm-password-reset',
		constraint: getFieldsetConstraint(schema),
		onValidate: ({ formData }) => parse(formData, { schema }),
		shouldValidate: 'onBlur',
	});

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

					<Toast variant="success">
						Hemos enviado un código de verificación a tu correo electrónico. Por
						favor revisa tu bandeja de entrada.
					</Toast>

					<Form
						method="POST"
						onChange={() => setError(null)}
						{...form.props}
						autoComplete="submit-password-reset"
					>
						<div className="mb-2">
							<Label htmlFor={fields.securityCode.id}>
								Código de 6 dígitos
							</Label>
							<Input
								placeholder="******"
								{...conform.input(fields.securityCode)}
							/>
							<ErrorText id={fields.securityCode.errorId}>
								{fields.securityCode.error}
							</ErrorText>
						</div>

						<div className="mb-2">
							<Label htmlFor={fields.newPassword.id}>Nueva contraseña</Label>
							<Input
								placeholder="********"
								{...conform.input(fields.newPassword, { type: 'password' })}
							/>
							<ErrorText id={fields.newPassword.errorId}>
								{fields.newPassword.error}
							</ErrorText>
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
							to="/login"
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

const schema = z.object({
	securityCode: z
		.string({ required_error: 'El código de verificación es obligatorio' })
		.length(6, { message: 'Por favor ingresa un código de 6 dígitos' }),
	newPassword: z
		.string({ required_error: 'La contraseña es obligatoria' })
		.min(8, { message: 'Por favor ingresa una contraseña válida' })
		.regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\da-zA-Z]).{8,}$/, {
			message:
				'La contraseña debe tener al menos una mayúscula, una minúscula, un número y un caracter especial',
		}),
});
