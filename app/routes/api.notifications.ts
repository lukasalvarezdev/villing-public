import { type LoaderFunctionArgs } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import * as React from 'react';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request, '/home');

	return { notifications: [] };
}

export function useNotifications() {
	const fetcher = useFetcher<typeof loader>();
	const load = fetcher.load;

	React.useEffect(() => {
		// load('/api/notifications');
	}, [load]);

	return fetcher.data?.notifications || [];
}
