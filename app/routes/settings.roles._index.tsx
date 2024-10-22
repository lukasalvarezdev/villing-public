import { type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { LinkButton } from '~/components/form-utils';
import { Box } from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import { cn } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const roles = await db.roles.findMany({
		where: { organizationId: orgId },
		orderBy: { name: 'asc' },
		select: { name: true, id: true, allowedActions: true },
	});

	return { roles };
}

export default function Component() {
	const { roles } = useLoaderData<typeof loader>();

	return (
		<div>
			<Box className="rounded-lg shadow mb-6">
				<div className="flex md:items-center justify-between flex-col gap-4 md:flex-row mb-4">
					<h4 className="font-medium">Configuración de roles</h4>
				</div>

				<ul className="flex flex-col gap-4 text-sm">
					{roles.map(role => (
						<li key={role.id}>
							<div className={cn('flex items-center justify-between')}>
								<div className="flex items-center gap-4">
									<div className="w-9 h-9 flex shrink-0 items-center justify-center bg-gray-200 rounded-full">
										<i className="ri-check-double-line"></i>
									</div>
									<div>
										<p className="font-medium">{role.name}</p>
										<p className="text-gray-500">
											{role.allowedActions.length} permisos
										</p>
									</div>
								</div>
								<LinkButton
									className="w-9 h-9"
									variant="secondary"
									to={`${role.id}`}
								>
									<i className="ri-edit-box-line"></i>
								</LinkButton>
							</div>
						</li>
					))}
				</ul>
			</Box>

			<LinkButton
				prefetch="intent"
				variant="black"
				to="new"
				className="max-w-max"
			>
				<i className="ri-user-add-line mr-2"></i>
				Crear rol
			</LinkButton>
		</div>
	);
}
