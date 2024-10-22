import { json, type ActionFunctionArgs } from '@remix-run/node';
import { getUser } from '~/utils/auth.server';
import { getSession, villingSession } from '~/utils/session.server';

export async function loader({ request }: ActionFunctionArgs) {
	if (process.env.NODE_ENV !== 'development') {
		throw new Error('Cannot access this route in production.');
	}

	const [, session] = await Promise.all([
		getUser(request),
		getSession(request),
	]);

	return json(
		{},
		{ headers: { 'Set-Cookie': await villingSession.destroySession(session) } },
	);
}
