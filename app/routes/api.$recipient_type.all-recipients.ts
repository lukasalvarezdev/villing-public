import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import * as React from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { getRequestSearchParams } from '~/utils/misc';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
	await protectRoute(request);

	const searchParams = getRequestSearchParams(request);
	const query = queryBuilder(searchParams, ['name', 'email', 'idNumber']);

	const { db, orgId } = await getOrgDbClient(request);
	let recipients = [] as Array<{ id: number; name: string }>;

	try {
		if (params.recipient_type === 'clients') {
			recipients = await db.client.findMany({
				where: {
					organizationId: orgId,
					isTemporary: false,
					deletedAt: null,
					...query,
				},
				orderBy: { name: 'asc' },
				select: { id: true, name: true },
			});
		} else {
			recipients = await db.supplier.findMany({
				where: { organizationId: orgId, deletedAt: null, ...query },
				orderBy: { name: 'asc' },
				select: { id: true, name: true },
			});
		}
	} catch (error) {
		logError({ error, request });
	}

	return json({ recipients });
}

export function useRecipientsLoader(type: 'clients' | 'suppliers') {
	const { load, data, state } = useFetcher<typeof loader>();
	const isLoading = state != 'idle';

	const debouncedLoadProducts = useDebouncedCallback(load, 500);

	React.useEffect(() => {
		debouncedLoadProducts(`/api/${type}/all-recipients`);
	}, [debouncedLoadProducts, type]);

	return { recipients: data?.recipients || [], isLoading };
}
