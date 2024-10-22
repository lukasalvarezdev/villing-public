import { GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { getPlanStatusByDate, type VillingUserRole } from './admin.server';
import { cognitoClient } from './aws-pool.server';
import { __prisma } from './db.server';
import { requireAccessToken } from './session.server';

export async function getUserEmailByToken(
	request: Request,
	defultToken?: string,
) {
	try {
		let token = defultToken;
		if (!token) token = await requireAccessToken(request);

		const command = new GetUserCommand({ AccessToken: token });
		const response = await cognitoClient.send(command);
		const email = response.UserAttributes?.find(
			attr => attr.Name === 'email',
		)?.Value;

		if (!email) return null;

		return email;
	} catch (error) {
		return null;
	}
}

export async function getUser(request: Request, defultToken?: string) {
	try {
		const email = await getUserEmailByToken(request, defultToken);
		if (!email) return null;

		const user = await __prisma.user.findUniqueOrThrow({
			where: { email },
			include: {
				organizations: { select: { organizationId: true } },
				allowedSubOrgs: { select: { id: true } },
			},
		});

		const role = roles[email] || 'user';

		return { ...user, role };
	} catch (error) {
		console.error(error);
		return null;
	}
}

const adminEmails = process.env.ADMIN_EMAILS?.split(',') ?? [];
export const roles = {
	...adminEmails.reduce(
		(acc, email) => ({ ...acc, [email]: 'admin' }),
		{} as Record<string, VillingUserRole>,
	),
	[process.env.SUPER_ADMIN_EMAIL!]: 'superadmin',
	[process.env.ADMIN_EMAIL!]: 'admin',
} as Record<string, VillingUserRole>;

export async function _getRootOrganization(
	id: number,
	user: NonNullable<Awaited<ReturnType<typeof getUser>>>,
) {
	const allowedBranches = user.allowedSubOrgs.map(x => x.id);
	const response = await __prisma.organization.findUniqueOrThrow({
		where: { id },
		include: {
			SubOrganization: {
				where: {
					id: { in: allowedBranches },
					deletedAt: null,
				},
			},
		},
	});

	const { soenacToken, SubOrganization, ...organization } = response;
	return {
		...organization,
		branches: SubOrganization,
		planStatus: getPlanStatusByDate(organization.planExpiresAt),
	};
}

export function catchCognitoError(error: any) {
	const message = error.message;
	if (typeof message === 'string') {
		throw cognitoErrorsMapper[message] || message;
	}
	return null;
}

export function mapAuthError(error: unknown, defaultError?: string) {
	return typeof error === 'string'
		? authErrorsMap[error] || defaultError
		: defaultError;
}

const authErrorsMap = {
	user_already_exists: 'Este correo electrónico ya está en uso',
	incorrect_credentials: 'El correo o la contraseña son incorrectos',
	user_not_found: 'El usuario no existe',
	user_not_confirmed:
		'Debes confirmar tu correo electrónico, revisa tu bandeja de entrada',
	plan_expired: 'Tu plan ha expirado, contacta a soporte para renovarlo',
	token_expired:
		'Debes confirmar tu cuenta para poder seguir usando Villing. Revisa tu correo para confirmar tu cuenta',
	account_not_confirmed: 'Debes confirmar tu cuenta para poder iniciar sesión',
} as Record<string, string>;

const cognitoErrorsMapper = {
	'Incorrect username or password.': 'incorrect_credentials',
	'User already exists': 'user_already_exists',
	'User is not confirmed.': 'user_not_confirmed',
} as Record<string, string>;
