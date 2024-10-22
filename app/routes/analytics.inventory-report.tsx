import { type LoaderFunctionArgs } from '@remix-run/node';
import {
	Outlet,
	useLoaderData,
	useNavigate,
	useParams,
} from '@remix-run/react';
import { Label, LinkButton, Select } from '~/components/form-utils';
import {
	WithSidebarUIContainer,
	SidebarContainer,
} from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import {
	cn,
	getSearchParamsWithDefaultDateRange,
	toNumber,
} from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, userId } = await getOrgDbClient(request);
	const searchParams = getSearchParamsWithDefaultDateRange(request);

	const user = await db.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			allowedSubOrgs: {
				where: { deletedAt: null },
				select: { id: true, name: true },
			},
		},
	});

	return {
		branches: user.allowedSubOrgs.map(branch => ({
			id: branch.id,
			name: branch.name,
		})),
		startDate: searchParams.get('start'),
		endDate: searchParams.get('end'),
	};
}

export default function Component() {
	return (
		<WithSidebarUIContainer className="flex flex-col lg:flex-row">
			<Sidebar />

			<div className="flex-1">
				<Outlet />
			</div>
		</WithSidebarUIContainer>
	);
}

function Sidebar() {
	const { branches } = useLoaderData<typeof loader>();
	const { branch_id } = useParams();
	const navigate = useNavigate();

	return (
		<SidebarContainer className="shrink-0">
			<div className="hidden lg:block">
				<LinkButton
					to="/analytics/inventory-report"
					className={cn(
						'justify-start font-medium',
						!branch_id && 'bg-gray-100',
					)}
					variant="ghost"
					prefetch="intent"
				>
					Reporte general
				</LinkButton>
				{branches.map(branch => (
					<LinkButton
						to={`/analytics/inventory-report/${branch.id}`}
						className={cn(
							'justify-start font-medium',
							toNumber(branch_id) === branch.id && 'bg-gray-100',
						)}
						variant="ghost"
						prefetch="intent"
						key={branch.id}
					>
						Reporte de {branch.name}
					</LinkButton>
				))}
			</div>
			<div className="lg:hidden w-full flex-1">
				<Label htmlFor="branch_id">Sucursal</Label>
				<Select
					id="branch_id"
					className="w-1/2"
					value={branch_id}
					onChange={e => {
						navigate(`/analytics/inventory-report/${e.target.value}`);
					}}
					options={[
						{ label: 'Reporte general', value: '' },
						...branches.map(branch => ({
							label: `Reporte de ${branch.name}`,
							value: branch.id,
						})),
					]}
				/>
			</div>
		</SidebarContainer>
	);
}
