import { type LoaderFunctionArgs, json } from '@remix-run/node';

import {
	type MetaFunction,
	Outlet,
	useLoaderData,
	useParams,
	useRouteLoaderData,
} from '@remix-run/react';
import { RouteErrorBoundary } from '~/components/error-boundary';
import { LinkButton } from '~/components/form-utils';
import { Box } from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import { cn } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: `Miembros y roles - Villing` },
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const organization = await db.organization.findUniqueOrThrow({
		where: { id: orgId },
		select: {
			members: {
				select: {
					user: {
						select: {
							name: true,
							id: true,
							email: true,
							role: true,
							allowedSubOrgs: true,
						},
					},
				},
				orderBy: { user: { name: 'asc' } },
			},
			Roles: {
				select: { name: true, id: true, allowedActions: true },
				orderBy: { name: 'asc' },
			},
			SubOrganization: {
				where: { deletedAt: null },
				orderBy: { id: 'asc' },
				select: { id: true, name: true },
			},
		},
	});

	return json({
		roles: organization.Roles,
		users: organization.members.map(x => ({
			id: x.user.id,
			name: x.user.name,
			email: x.user.email,
			role: x.user.role,
			allowedSubOrgs: x.user.allowedSubOrgs,
		})),
		subOrgs: organization.SubOrganization,
	});
}

export default function Component() {
	const { users } = useLoaderData<typeof loader>();
	const { member_id } = useParams();

	function isEditingMember(id: number) {
		return member_id === id.toString();
	}

	return (
		<div className="max-w-3xl">
			<div className="pb-4 border-b border-gray-200 mb-6">
				<h3>Miembros y roles</h3>
				<p className="text-gray-500 text-sm">
					Modifica o elimina los miembros y roles.
				</p>
			</div>

			<div>
				<Box className="rounded-lg shadow mb-4">
					<div className="flex md:items-center justify-between flex-col gap-4 md:flex-row mb-4">
						<h4 className="font-medium">Miembros de la empresa</h4>
					</div>

					<ul className="flex flex-col gap-4">
						{users.map(user => (
							<li key={user.id}>
								<div
									className={cn(
										'text-sm',
										'flex md:items-center gap-4 justify-between flex-col md:flex-row',
										'border-b border-gray-200',
										isEditingMember(user.id)
											? 'border-b border-gray-200 pb-4'
											: 'md:border-none md:pb-0',
									)}
								>
									<div className="flex md:items-center gap-4">
										<div className="w-9 h-9 flex shrink-0 items-center justify-center bg-gray-200 rounded-full">
											<img
												src="/img/notion-avatar.svg"
												alt="Avatar"
												className="max-h-full max-w-full"
											/>
										</div>

										<div>
											<p className="font-medium">{user.name}</p>
											<p className="text-gray-500">{user.email}</p>
										</div>
									</div>

									<LinkButton
										className="shrink-0 w-9 h-9"
										variant="secondary"
										to={
											isEditingMember(user.id)
												? '/settings/members'
												: `/settings/members/edit/${user.id}`
										}
										prefetch="intent"
									>
										<i className="ri-more-2-line"></i>
									</LinkButton>
								</div>

								{isEditingMember(user.id) ? <Outlet /> : null}
							</li>
						))}
					</ul>
				</Box>

				<LinkButton
					prefetch="intent"
					variant="black"
					to="/settings/invitations"
					className="mb-6 max-w-max"
				>
					<i className="ri-user-add-line mr-2"></i>
					Invitar usuario
				</LinkButton>
			</div>
		</div>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con los miembros. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}

export function useMembersLoaderData() {
	return useRouteLoaderData<typeof loader>('routes/settings.members');
}
