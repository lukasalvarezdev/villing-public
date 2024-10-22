import { type DataFunctionArgs, json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import clsx from 'clsx';
import { ClientOnly } from '~/components/client-only';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
} from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import { formatCurrency, formatDate, invariant } from '~/utils/misc';
import { planTranslator } from '~/utils/plan-protection';
import { protectAdminRoute } from '~/utils/plan-protection.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request, params }: DataFunctionArgs) {
	invariant(params.org_id, 'Missing org_id param');

	await Promise.all([protectRoute(request), protectAdminRoute(request)]);
	const { db } = await getOrgDbClient(request);
	const payments = await db.paymentPlan.findMany({
		where: { organizationId: parseInt(params.org_id) },
		select: {
			id: true,
			createdAt: true,
			amount: true,
			nextPayment: true,
			description: true,
			organization: { select: { name: true, email: true } },
			type: true,
		},
	});

	return json({ payments });
}

export default function Component() {
	const { payments } = useLoaderData<typeof loader>();

	return (
		<div>
			<div className="flex gap-4 justify-between md:items-end mb-4 flex-col md:flex-row">
				<div className="flex-1">
					<h2 className="mb-1">Pagos</h2>
					<p className="text-gray-500 text-sm leading-none">
						Pagos de suscripción
					</p>
				</div>

				<Link
					className={clsx(
						'gap-2 items-center text-sm font-medium flex',
						'bg-gray-900 text-white rounded px-3 h-9 hover:bg-gray-800',
					)}
					to="/admin/payments/new"
					prefetch="intent"
				>
					<i className="ri-add-line"></i>
					Agregar pago
				</Link>
			</div>

			<div className="rounded border border-gray-200 shadow-sm mb-4">
				<Table>
					<TableHead>
						<TableHeadCell>Empresa</TableHeadCell>
						<TableHeadCell>Descripción</TableHeadCell>
						<TableHeadCell>Monto</TableHeadCell>
						<TableHeadCell>Plan</TableHeadCell>
						<TableHeadCell>Fecha</TableHeadCell>
						<TableHeadCell>Próximo pago</TableHeadCell>
					</TableHead>
					<TableBody>
						{payments.map(payment => (
							<TableRow key={payment.id}>
								<TableCell className="whitespace-nowrap text-sm">
									<Link to={`/admin/payments/${payment.id}`}>
										<p>{payment.organization.name}</p>
										<span>{payment.organization.email}</span>
									</Link>
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									<Link to={`/admin/payments/${payment.id}`}>
										{payment.description}
									</Link>
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									<Link to={`/admin/payments/${payment.id}`}>
										${formatCurrency(payment.amount)}
									</Link>
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									<Link to={`/admin/payments/${payment.id}`}>
										{planTranslator(payment.type)}
									</Link>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<Link to={`/admin/payments/${payment.id}`}>
										<ClientOnly>
											{() => formatDate(payment.createdAt)}
										</ClientOnly>
									</Link>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<Link to={`/admin/payments/${payment.id}`}>
										<ClientOnly>
											{() => formatDate(payment.nextPayment)}
										</ClientOnly>
									</Link>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
