import { type LoaderFunctionArgs } from '@remix-run/node';
import { protectAdminRoute } from '~/utils/plan-protection.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectAdminRoute(request);

	return {};
}
