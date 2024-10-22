import { type DataFunctionArgs, json } from '@remix-run/node';
import { NavLink, Outlet, useLoaderData } from '@remix-run/react';

import clsx from 'clsx';
import { PageWrapper } from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import { protectAdminRoute } from '~/utils/plan-protection.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request, params }: DataFunctionArgs) {
	await Promise.all([protectRoute(request), protectAdminRoute(request)]);
	const { db } = await getOrgDbClient(request);

	const organization = await db.organization.findFirstOrThrow({
		where: { id: Number(params.org_id) },
	});

	return json({ organization });
}

export default function Component() {
	const { organization } = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<div className="pb-4 border-b border-gray-300 mb-6">
				<h2 className="font-bold">{organization.name}</h2>
				<p className="text-gray-500">
					<strong>NIT: </strong>
					{organization.idNumber}
				</p>
			</div>

			<div className="md:flex gap-6">
				<nav className="w-1/5 -ml-4 hidden md:block">
					<ul className="flex flex-col gap-1">
						<li>
							<NavLink
								to={`/admin/organizations/${organization.id}/company`}
								className={({ isActive }) =>
									clsx(
										'block py-1 px-4 font-medium text-gray-700',
										isActive ? 'bg-gray-100 rounded-sm' : 'hover:underline',
									)
								}
								prefetch="intent"
							>
								Empresa
							</NavLink>
						</li>
						<li>
							<NavLink
								to={`/admin/organizations/${organization.id}/payments`}
								className={({ isActive }) =>
									clsx(
										'block py-1 px-4 font-medium text-gray-700',
										isActive ? 'bg-gray-100 rounded-sm' : 'hover:underline',
									)
								}
								prefetch="intent"
							>
								Pagos
							</NavLink>
						</li>
						<li>
							<NavLink
								to={`/admin/organizations/${organization.id}/dian`}
								className={({ isActive }) =>
									clsx(
										'block py-1 px-4 font-medium text-gray-700',
										isActive ? 'bg-gray-100 rounded-sm' : 'hover:underline',
									)
								}
								prefetch="intent"
							>
								Facturación electrónica
							</NavLink>
						</li>
						<li>
							<NavLink
								to={`/admin/organizations/${organization.id}/payroll`}
								className={({ isActive }) =>
									clsx(
										'block py-1 px-4 font-medium text-gray-700',
										isActive ? 'bg-gray-100 rounded-sm' : 'hover:underline',
									)
								}
								prefetch="intent"
							>
								Nómina electrónica
							</NavLink>
						</li>
						<li>
							<NavLink
								to={`/admin/organizations/${organization.id}/resolutions`}
								className={({ isActive }) =>
									clsx(
										'block py-1 px-4 font-medium text-gray-700',
										isActive ? 'bg-gray-100 rounded-sm' : 'hover:underline',
									)
								}
								prefetch="intent"
							>
								Resoluciones
							</NavLink>
						</li>
					</ul>
				</nav>

				<div className="flex-1">
					<Outlet />
				</div>
			</div>
		</PageWrapper>
	);
}
