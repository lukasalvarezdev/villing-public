import { type DataFunctionArgs, json } from '@remix-run/node';
import { Form, useLoaderData, useNavigation } from '@remix-run/react';
import clsx from 'clsx';
import { DateString } from '~/components/client-only';
import { Button } from '~/components/form-utils';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
} from '~/components/ui-library';
import { syncResolutions } from '~/utils/admin.server';
import { getOrgDbClient } from '~/utils/db.server';
import { formatDate, invariant } from '~/utils/misc';
import { protectSuperAdminRoute } from '~/utils/plan-protection.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request, params }: DataFunctionArgs) {
	invariant(params.org_id, 'Missing org_id param');

	await Promise.all([protectRoute(request), protectSuperAdminRoute(request)]);
	const { db } = await getOrgDbClient(request);

	const resolutions = await db.resolution.findMany({
		where: {
			organizationId: parseInt(params.org_id),
			deletedAt: null,
			type: 'legalInvoice',
		},
		orderBy: { createdAt: 'desc' },
	});

	return json({ resolutions });
}

export async function action({ request, params }: DataFunctionArgs) {
	invariant(params.org_id, 'Missing org_id param');

	await Promise.all([protectRoute(request), protectSuperAdminRoute(request)]);
	const { db } = await getOrgDbClient(request);

	try {
		await syncResolutions(db, parseInt(params.org_id));
		return json({ success: true });
	} catch (error) {
		console.error(error);
		return json({ error });
	}
}

export default function Component() {
	const { resolutions } = useLoaderData<typeof loader>();
	const navigation = useNavigation();
	const isSyncing = navigation.formMethod === 'post';

	return (
		<div className="flex-1">
			<div className="pb-4 border-b border-gray-200 mb-4 flex justify-between items-end">
				<div>
					<h3 className="font-medium">Resoluciones</h3>
					<p className="text-gray-500 text-sm">
						Consulta las resoluciones de facturación electrónica del cliente.
					</p>
				</div>
				<Form method="POST">
					<Button
						variant="black"
						disabled={isSyncing}
						className="flex gap-2 items-center"
					>
						<i
							className={clsx(
								'ri-refresh-line block',
								isSyncing && 'animate-spin',
							)}
						></i>
						Sincronizar resoluciones
					</Button>
				</Form>
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
									{resolution.name} - {resolution.prefix}
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									{resolution.resolutionNumber}
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									Desde {resolution.from || 0} hasta {resolution.to || 0}
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<DateString>
										{formatDate(resolution.fromDate || new Date())}
									</DateString>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<DateString>
										{formatDate(resolution.toDate || new Date())}
									</DateString>
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
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
