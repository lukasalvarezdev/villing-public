import { type ActionFunctionArgs } from '@remix-run/node';
import { logout } from '~/utils/session.server';

export function loader({ request }: ActionFunctionArgs) {
	return logout(request);
}
