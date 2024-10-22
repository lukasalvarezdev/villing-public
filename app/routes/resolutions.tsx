import {
	json,
	type DataFunctionArgs,
	type MetaFunction,
} from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';

import { ClientOnly } from '~/components/client-only';
import { RouteErrorBoundary } from '~/components/error-boundary';
import { LinkButton } from '~/components/form-utils';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
	PageWrapper,
} from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import { formatDate } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [{ title: `Resoluciones - Villing` }];

export async function loader({ request }: DataFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const resolutions = await db.resolution.findMany({
		where: { organizationId: orgId, deletedAt: null },
		orderBy: { createdAt: 'desc' },
	});

	return json({ resolutions });
}

export default function Component() {
	const { resolutions } = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<Outlet />

			<div className="flex gap-4 justify-between items-end mb-4">
				<div className="flex-1">
					<h2 className="mb-1">Resoluciones</h2>
					<p className="text-gray-500 text-sm leading-none">
						Resoluciones de transacción POS y facturación electrónica
					</p>
				</div>
				<LinkButton to="new" className="flex">
					<i className="ri-add-line"></i>
					Crear resolución
				</LinkButton>
			</div>

			<div className="rounded border border-gray-200 shadow-sm mb-4">
				<Table>
					<TableHead>
						<TableHeadCell>Prefijo</TableHeadCell>
						<TableHeadCell>Resolución</TableHeadCell>
						<TableHeadCell>Numeración</TableHeadCell>
						<TableHeadCell className="whitespace-nowrap">
							Fecha expedición
						</TableHeadCell>
						<TableHeadCell className="whitespace-nowrap">
							Fecha vencimiento
						</TableHeadCell>
						<TableHeadCell>Estado</TableHeadCell>
						<TableHeadCell></TableHeadCell>
					</TableHead>
					<TableBody>
						{resolutions.map(resolution => (
							<TableRow key={resolution.id}>
								<TableCell className="whitespace-nowrap text-sm">
									<Link to={`${resolution.id}`}>
										{resolution.name} - {resolution.prefix}
									</Link>
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									<Link to={`${resolution.id}`}>
										{resolution.resolutionNumber}
									</Link>
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									<Link to={`${resolution.id}`}>
										Desde {resolution.from || 0} hasta {resolution.to || 0}
									</Link>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<Link to={`${resolution.id}`}>
										<ClientOnly>
											{() => formatDate(resolution.fromDate || new Date())}
										</ClientOnly>
									</Link>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<Link to={`${resolution.id}`}>
										<ClientOnly>
											{() => formatDate(resolution.toDate || new Date())}
										</ClientOnly>
									</Link>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									{resolution.status === 'pending' ? (
										<span className="flex gap-2 text-gray-500">
											<i className="ri-error-warning-line text-warning-600"></i>
											En solicitud
										</span>
									) : resolution.toDate &&
									  resolution.toDate > new Date().toISOString() ? (
										<span className="flex gap-2 text-gray-500">
											<i className="ri-check-line text-success-600"></i>
											Activa
										</span>
									) : (
										<span className="flex gap-2 text-gray-500">
											<i className="ri-error-warning-line text-error-600"></i>
											Vencida
										</span>
									)}
								</TableCell>
								<td>
									<Link
										to={`${resolution.id}`}
										className="p-2 flex gap-2 text-sm hover:text-primary-700 group whitespace-nowrap"
									>
										<span className="group-hover:underline">
											Ver resolución
										</span>
										<i className="ri-arrow-right-line"></i>
									</Link>
								</td>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</PageWrapper>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con las resoluciones. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}
