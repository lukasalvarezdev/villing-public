import { type LoaderFunctionArgs } from '@remix-run/node';
import { Outlet, useRouteLoaderData } from '@remix-run/react';
import { PageWrapper } from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import { invariant } from '~/utils/misc';

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.org_id, 'org_id is required');

	const { db, userId } = await getOrgDbClient(request);

	const company = await db.organization.findFirstOrThrow({
		where: {
			id: Number(params.org_id),
			members: { some: { user: { id: userId, type: 'accountant' } } },
		},
		select: { id: true, name: true },
	});

	return { company };
}

export default function Component() {
	return (
		<PageWrapper>
			<Outlet />
		</PageWrapper>
	);
}

export function useAccountantCompany() {
	const data = useRouteLoaderData<typeof loader>('routes/accountant_.$org_id');
	const company = data?.company || null;
	invariant(company, 'Debes iniciar sesión para entrar aquí');
	return company;
}
