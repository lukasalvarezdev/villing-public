import {
	type DataFunctionArgs,
	type SerializeFrom,
	json,
} from '@remix-run/node';
import {
	Link,
	type MetaFunction,
	Outlet,
	useLoaderData,
	useLocation,
	useParams,
	useRouteLoaderData,
} from '@remix-run/react';
import { RouteErrorBoundary } from '~/components/error-boundary';

import { LinkButton } from '~/components/form-utils';
import { getOrgDbClient } from '~/utils/db.server';
import { cn, formatDate } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [{ title: `Sucursales - Villing` }];

export async function loader({ request }: DataFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const {
		PriceList: priceLists,
		Resolution: resolutions,
		SubOrganization: subOrganizations,
		Client: clients,
	} = await db.organization.findUniqueOrThrow({
		where: { id: orgId },
		select: {
			Resolution: {
				where: {
					deletedAt: null,
					type: 'posInvoice',
					toDate: { gte: new Date() },
					status: 'active',
				},
			},
			Client: {
				select: { id: true, name: true },
				where: { isTemporary: false, deletedAt: null },
			},
			PriceList: {
				where: { deletedAt: null },
				orderBy: { name: 'asc' },
			},
			SubOrganization: {
				where: { deletedAt: null },
				include: {
					defaultClient: { select: { id: true, name: true } },
					defaultResolution: {
						select: { id: true, name: true, fromDate: true, toDate: true },
					},
					defaultPriceList: { select: { id: true, name: true } },
				},
				orderBy: { createdAt: 'asc' },
			},
		},
	});

	return json({
		clients: [{ label: 'Selecciona un cliente', value: 0 }].concat(
			clients.map(c => ({ label: c.name, value: c.id })),
		),
		priceLists: priceLists.map(p => ({ label: p.name, value: p.id })),
		resolutions: resolutions.map(r => ({
			label: parseResolutionName(r),
			value: r.id,
		})),
		subOrganizations: subOrganizations.map(s => ({
			...s,
			defaultResolution: s.defaultResolution
				? {
						...s.defaultResolution,
						name: parseResolutionName(s.defaultResolution),
					}
				: undefined,
		})),
	});

	function parseResolutionName(resolution: any) {
		return `${resolution.name} (${formatDate(
			resolution.fromDate,
		)} - ${formatDate(resolution.toDate)})`;
	}
}

export default function Component() {
	const { subOrganizations } = useLoaderData<typeof loader>();
	const { sub_id } = useParams();
	const { pathname } = useLocation();
	const isCreate = pathname.endsWith('/new');

	return (
		<div className="max-w-3xl">
			<div className="pb-4 border-b border-gray-200 mb-4">
				<h3>Sucursales</h3>
				<p className="text-gray-500 text-sm">
					Crea, modifica y elimina sucursales.
				</p>
			</div>

			<ul className="mb-6">
				{subOrganizations.map(sub => (
					<SubOrganizationItem key={sub.id} sub={sub}>
						{sub_id === sub.id.toString() ? <Outlet /> : null}
					</SubOrganizationItem>
				))}
			</ul>

			{isCreate ? (
				<Outlet />
			) : (
				<LinkButton to="new" className="max-w-max" variant="black">
					<i className="ri-add-circle-line mr-2"></i>Crear sucursal
				</LinkButton>
			)}
		</div>
	);
}

type SubOrganizationType = SerializeFrom<typeof loader>['subOrganizations'][0];
type SubOrganizationItemProps = {
	sub: SubOrganizationType;
	children?: React.ReactNode;
};

function SubOrganizationItem({ sub, children }: SubOrganizationItemProps) {
	return (
		<li className="mb-4 last:mb-0">
			<div
				className={cn(
					'border border-gray-200 p-4 rounded-md',
					'flex items-center justify-between',
					children && 'rounded-b-none',
				)}
			>
				<div className="flex items-center gap-4">
					<div className="w-9 h-9 flex shrink-0 items-center justify-center bg-gray-200 rounded-full">
						<i className="ri-building-line"></i>
					</div>
					<p className="font-medium">{sub.name}</p>
				</div>
				<Link
					className="hover:scale-110 transition-all"
					to={`/settings/suborganizations${children ? '' : `/${sub.id}`}`}
					prefetch="intent"
				>
					<p className="sr-only">Editar {sub.name}</p>
					{children ? (
						<i className="ri-close-line text-xl"></i>
					) : (
						<i className="ri-edit-box-line"></i>
					)}
				</Link>
			</div>

			{children ? (
				<div className="p-4 border border-gray-200 border-t-0 rounded-b-md">
					{children}
				</div>
			) : null}
		</li>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con las sucursales. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}

export function useSubOrganizationsLoaderData() {
	return useRouteLoaderData<typeof loader>('routes/settings.suborganizations');
}
