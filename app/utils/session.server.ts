import { RevokeTokenCommand } from '@aws-sdk/client-cognito-identity-provider';
import { createCookieSessionStorage, redirect } from '@remix-run/node';
import { invariant } from '~/utils/misc';
import { awsPool, cognitoClient } from './aws-pool.server';

export const villingSession = createCookieSessionStorage({
	cookie: {
		name: '__session',
		httpOnly: true,
		path: '/',
		sameSite: 'lax',
		secrets: [process.env.SESSION_SECRET],
		secure: process.env.NODE_ENV === 'production',
	},
});

export async function getSession(request: Request) {
	const cookie = request.headers.get('Cookie');
	return villingSession.getSession(cookie);
}

async function getAccessToken(request: Request): Promise<string | undefined> {
	const session = await getSession(request);
	return session.get('accessToken');
}

export async function requireAccessToken(request: Request) {
	const token = await getAccessToken(request);
	invariant(token, 'No access token found');
	return token;
}

export async function isTokenExpired(request: Request) {
	const token = await getAccessToken(request);
	if (!token) return true;

	try {
		const decoded = decodeJWT(token);
		const exp =
			typeof decoded.payload.exp === 'number' ? decoded.payload.exp : 0;

		return Date.now() >= exp * 1000;
	} catch (error) {}
	return true;
}

function decodeJWT(token: string) {
	const parts = token.split('.');
	if (parts.length !== 3) {
		throw new Error('Invalid JWT format');
	}

	try {
		const decodedHeader = JSON.parse(atob(parts[0]!));
		const decodedPayload = JSON.parse(atob(parts[1]!));

		return {
			header: decodedHeader,
			payload: decodedPayload,
			signature: parts[2], // The signature part as-is
		};
	} catch (error) {
		return { header: {}, payload: {}, signature: '' };
	}
}

export async function logout(request: Request, redirectTo = '/home') {
	const session = await getSession(request);

	try {
		const command = new RevokeTokenCommand({
			ClientId: awsPool.clientId,
			Token: session.get('accessToken'),
		});
		await cognitoClient.send(command);
	} catch (error) {
	} finally {
		return redirect(`/login?redirectTo=${redirectTo}`, {
			headers: { 'Set-Cookie': await villingSession.destroySession(session) },
		});
	}
}

export async function protectRoute(
	request: Request,
	defaultRedirectTo?: string,
) {
	const isExpired = await isTokenExpired(request);

	if (isExpired) {
		const redirectTo = defaultRedirectTo ?? new URL(request.url).pathname;
		const session = await getSession(request);
		throw redirect(`/login?redirectTo=${redirectTo}`, {
			headers: { 'Set-Cookie': await villingSession.destroySession(session) },
		});
	}
}
