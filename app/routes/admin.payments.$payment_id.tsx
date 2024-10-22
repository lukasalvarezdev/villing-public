import { type DataFunctionArgs, json } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import clsx from 'clsx';
import { ClientOnly } from '~/components/client-only';
import { Modal } from '~/components/modal';
import { getOrgDbClient } from '~/utils/db.server';
import { formatCurrency, formatDate } from '~/utils/misc';
import { planTranslator } from '~/utils/plan-protection';
import { protectAdminRoute } from '~/utils/plan-protection.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request, params }: DataFunctionArgs) {
	await Promise.all([protectRoute(request), protectAdminRoute(request)]);
	const { db } = await getOrgDbClient(request);

	const payment = await db.paymentPlan.findFirstOrThrow({
		where: { id: Number(params.payment_id) },
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

	return json({ payment });
}

export default function Component() {
	const { payment } = useLoaderData<typeof loader>();

	return (
		<Modal className="max-w-md">
			<div className="flex justify-between items-start gap-4">
				<h3 className="font-medium">Detalles del pago</h3>

				<Link
					className={clsx(
						'border border-transparent hover:border-gray-200',
						'flex items-center justify-center',
						'shrink-0 rounded w-8 h-8 text-xl',
					)}
					to="/admin/payments"
				>
					<i className="ri-close-line text-gray-400"></i>
				</Link>
			</div>

			<p>
				<strong className="font-medium">Empresa:</strong>{' '}
				{payment.organization.name}
			</p>
			<p>
				<strong className="font-medium">Correo:</strong>{' '}
				{payment.organization.email}
			</p>
			<ClientOnly>
				{() => (
					<div>
						<p>
							<strong className="font-medium">Fecha de pago:</strong>{' '}
							{formatDate(payment.createdAt)}
						</p>

						<p>
							<strong className="font-medium">Próximo pago:</strong>{' '}
							{formatDate(payment.nextPayment)}
						</p>
					</div>
				)}
			</ClientOnly>
			<p>
				<strong className="font-medium">Monto:</strong> $
				{formatCurrency(payment.amount)}
			</p>
			<p>
				<strong className="font-medium">Plan:</strong>{' '}
				{planTranslator(payment.type)}
			</p>
		</Modal>
	);
}
