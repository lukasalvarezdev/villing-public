import { invariant } from '~/utils/misc';
import { getUserEmailByToken, roles } from './auth.server';
import { getOrgDbClient } from './db.server';

export async function protectAdminRoute(request: Request) {
	const email = await getUserEmailByToken(request);

	if (!email) throw new Response('Unauthorized', { status: 401 });

	const role = roles[email];

	if (role !== 'admin' && role !== 'superadmin') {
		throw new Response('Unauthorized', { status: 401 });
	}
}

export async function protectSuperAdminRoute(request: Request) {
	const [{ db }, email] = await Promise.all([
		getOrgDbClient(request),
		getUserEmailByToken(request),
	]);

	invariant(
		email === process.env.ADMIN_EMAIL && db,
	);
}
