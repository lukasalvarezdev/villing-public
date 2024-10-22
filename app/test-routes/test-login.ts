import {
	AdminCreateUserCommand,
	AdminSetUserPasswordCommand,
	InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { type ActionFunctionArgs, redirect } from '@remix-run/node';
import { getUser } from '~/utils/auth.server';
import { awsPool, cognitoClient } from '~/utils/aws-pool.server';
import { getRequestSearchParams } from '~/utils/misc';
import { getSession, villingSession } from '~/utils/session.server';

export async function loader({ request }: ActionFunctionArgs) {
	if (process.env.NODE_ENV !== 'development') throw redirect('/');

	const searchParams = getRequestSearchParams(request);
	const email = String(searchParams.get('email'));
	const password = String(searchParams.get('password'));
	const temporaryPassword = 'TempPassword123!';

	const createUserCommand = new AdminCreateUserCommand({
		UserPoolId: awsPool.userPoolId,
		Username: email,
		TemporaryPassword: temporaryPassword,
		UserAttributes: [
			{ Name: 'email', Value: email },
			{ Name: 'email_verified', Value: 'True' },
		],
		MessageAction: 'SUPPRESS',
	});
	await cognitoClient.send(createUserCommand);

	const setUserPasswordCommand = new AdminSetUserPasswordCommand({
		UserPoolId: awsPool.userPoolId,
		Username: email,
		Password: password,
		Permanent: true,
	});

	await cognitoClient.send(setUserPasswordCommand);

	const command = new InitiateAuthCommand({
		AuthFlow: 'USER_PASSWORD_AUTH',
		ClientId: awsPool.clientId,
		AuthParameters: {
			USERNAME: email,
			PASSWORD: password,
		},
	});

	const result = await cognitoClient.send(command);
	const token = result?.AuthenticationResult?.AccessToken;

	const [user, session] = await Promise.all([
		getUser(request, token),
		getSession(request),
	]);

	if (!user) throw 'user_not_found';

	session.set('accessToken', token);
	session.set('userId', user.id);
	session.set('userEmail', user.email);
	// session.set('organizationId', user.organizationId);

	return redirect('/home', {
		headers: {
			'Set-Cookie': await villingSession.commitSession(session, {
				maxAge: 60 * 60 * 24, // 1 day
			}),
		},
	});
}
