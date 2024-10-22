import { json, type ActionFunctionArgs } from '@remix-run/node';
import { Form, Link, useActionData } from '@remix-run/react';
import { v4 as uuid } from 'uuid';
import {
	Input,
	IntentButton,
	Label,
	LinkButton,
	Toast,
} from '~/components/form-utils';
import { Container } from '~/components/ui-library';
import { sendConfirmationEmail } from '~/modules/emails/signup-email.server';
import { __prisma } from '~/utils/db.server';
import { errorLogger } from '~/utils/logger';
import { parseFormData, useActionError } from '~/utils/misc';
import { getCurrentDomain } from '~/utils/misc.server';

export async function action({ request }: ActionFunctionArgs) {
	const formData = await parseFormData(request);
	const email = formData.get('email');
	if (!email) {
		return json({ error: 'Correo electrónico es requerido' }, { status: 400 });
	}

	try {
		await __prisma.$transaction(async tx => {
			const user = await tx.user.findUnique({
				where: { email },
				select: {
					id: true,
					email: true,
					tokenExpiresAt: true,
					confirmedAt: true,
				},
			});

			if (!user) throw `No se encontró el usuario con el correo ${email}`;
			if (user.confirmedAt) throw 'El correo ya ha sido confirmado';
			if (user.tokenExpiresAt && new Date() <= user.tokenExpiresAt) {
				throw 'El correo de confirmación ya ha sido enviado recientemente. Por favor revisa tu bandeja de entrada o spam.';
			}

			const token = uuid();

			await tx.user.update({
				where: { id: user.id },
				data: {
					confirmationToken: token,
					tokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
				},
			});

			const searchParams = new URLSearchParams({ token, email });
			await sendConfirmationEmail({
				to: email,
				link: `${getCurrentDomain()}/confirm-email?${searchParams.toString()}`,
			});
		});

		return json({ success: true });
	} catch (error) {
		if (typeof error === 'string') {
			return json({ error }, 400);
		}

		const referenceId = errorLogger({ error, path: 'resendConfirmation' });

		return json(
			{
				error: `Ocurrió un error inesperado. Por favor intenta de nuevo. Si el problema persiste, contacta a soporte con el código ${referenceId}`,
			},
			500,
		);
	}
}

export default function Component() {
	const error = useActionError();
	const success = useActionData<any>()?.success;

	return (
		<Container className="max-w-sm h-screen flex items-center -mt-20">
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

				<h1 className="text-xl md:text-3xl mb-2 text-center">
					Confirma tu cuenta
				</h1>
				<p className="text-gray-600 mb-4 text-center">
					Si el correo de confirmación no llegó o ha expirado, puedes solicitar
					que te enviemos otro.
				</p>

				{success ? (
					<Toast variant="success">
						Se ha enviado un correo de confirmación a tu dirección de correo
						electrónico.
					</Toast>
				) : (
					<Form method="POST">
						<Label htmlFor="email">Correo electrónico</Label>
						<Input
							type="email"
							id="email"
							name="email"
							placeholder="Correo electrónico"
							required
							autoFocus
							className="mb-4"
						/>

						{error ? (
							<Toast variant="error" className="mb-4">
								{error}
							</Toast>
						) : null}

						<IntentButton className="font-medium w-full mb-2" intent="submit">
							Reenviar correo
						</IntentButton>
						<LinkButton to="/login" className="font-medium" variant="secondary">
							Cancelar
						</LinkButton>
					</Form>
				)}
			</div>
		</Container>
	);
}
