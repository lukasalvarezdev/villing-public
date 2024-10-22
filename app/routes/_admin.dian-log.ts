import { type DataFunctionArgs, json } from '@remix-run/node';
import { getOrgDbClient } from '~/utils/db.server';

export async function loader({ request }: DataFunctionArgs) {
	const { db, userId } = await getOrgDbClient(request);

	const user = await db.user.findUnique({ where: { id: userId } });

	if (user?.email !== process.env.ADMIN_EMAIL) {
		throw new Error("You don't have access to this resource");
	}

	const log = await db.dianErrorLog.findMany({
		orderBy: { createdAt: 'desc' },
	});

	return json(log);
}
