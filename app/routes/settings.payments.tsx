import { type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useSearchParams } from '@remix-run/react';
import { DateString } from '~/components/client-only';
import { Toast } from '~/components/form-utils';
import {
	Box,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeadCell,
	TableRow,
	TwoColumnsDiv,
} from '~/components/ui-library';
import { useOrganization } from '~/root';
import { getPlanStatusByDate } from '~/utils/admin.server';
import { getOrgDbClient } from '~/utils/db.server';
import { cn, formatCurrency, formatDate, toNumber } from '~/utils/misc';
import {
	getCopInCents,
	paymentGatewayClient,
} from '~/utils/payment-gateway-client.server';
import { getAmountByPlan } from '~/utils/plan-protection';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);
	const { db, orgId } = await getOrgDbClient(request);

	const { payments, planExpiresAt, currentPaymentLinkUrl } =
		await db.organization.findUniqueOrThrow({
			where: { id: orgId },
			select: {
				planType: true,
				planExpiresAt: true,
				currentPaymentLinkUrl: true,
				payments: {
					select: { id: true, createdAt: true, amount: true },
					orderBy: { createdAt: 'desc' },
				},
			},
		});

	const planStatus = planExpiresAt
		? getPlanStatusByDate(planExpiresAt)
		: 'inactive';
	let paymentUrl = currentPaymentLinkUrl;

	if (
		!currentPaymentLinkUrl &&
		(planStatus === 'expiring' || planStatus === 'expired')
	) {
		paymentUrl = await db.$transaction(async tx => {
			const { planType, customPlanAmount, name } = await tx.organization.update(
				{
					where: { id: orgId },
					data: { updatedAt: new Date() },
				},
			);

			const amount = getCopInCents(
				planType === 'custom'
					? toNumber(customPlanAmount)
					: getAmountByPlan(planType),
			);

			const paymentUrl = await paymentGatewayClient.createPaymentLink(
				process.env.PAYMENT_GATEWAY_TOKEN!,
				{ amount, companyName: name },
			);

			await tx.organization.update({
				where: { id: orgId },
				data: {
					currentPaymentLinkUrl: paymentUrl,
					paymentLinks: {
						create: {
							amount,
							link: paymentUrl,
							linkId: paymentUrl.split('/').pop()!,
						},
					},
				},
			});

			return paymentUrl;
		});
	}

	return { payments, paymentUrl };
}

export default function Component() {
	const { planType, planExpiresAt } = useOrganization();
	const plan = plans[planType];

	if (!plan) return null;

	return (
		<div>
			<div className="pb-4 border-b border-gray-200 mb-4">
				<h3>Plan y facturación</h3>
				<p className="text-gray-500 text-sm">
					Consulta tu plan actual y los pagos realizados.
				</p>
			</div>

			<h4 className="mb-4">Tu plan</h4>
			<div className="max-w-3xl">
				<TwoColumnsDiv className="mb-4 pb-4 border-b border-gray-200">
					<Box>
						<div className="flex justify-between text-sm mb-1">
							<p className="text-gray-400">Plan mensual</p>
						</div>
						<p className="font-bold">${formatCurrency(plan.price)}/mes</p>
					</Box>
					<Box>
						<p className="text-gray-400 text-sm mb-1">Renueva el</p>
						<DateString>
							<p className="font-bold">
								{formatDate(planExpiresAt || new Date())}
							</p>
						</DateString>
					</Box>
				</TwoColumnsDiv>

				<ErrorToast />
			</div>

			<PaymentOptions />
			<PaymentsList />
		</div>
	);
}

function PaymentOptions() {
	const { planType } = useOrganization();
	const plan = plans[planType];
	const { paymentUrl } = useLoaderData<typeof loader>();

	if (!plan) return null;

	return (
		<div>
			<h4 className="mb-4">Formas de pago</h4>

			<div className="flex gap-4">
				{paymentUrl ? (
					<div className="max-w-3xl flex-1">
						<a
							href={paymentUrl}
							target="_blank"
							rel="noopener noreferrer"
							className={cn(
								'p-4 mb-4 rounded-md flex gap-4 items-center justify-between',
								'border border-gray-200 hover:bg-gray-50 w-full',
							)}
						>
							<p className="font-medium">Paga con tarjeta o transferencia</p>
							<p className="text-sm text-gray-500">Presiona para pagar</p>
						</a>
					</div>
				) : null}
			</div>
		</div>
	);
}

function PaymentsList() {
	const { payments } = useLoaderData<typeof loader>();

	return (
		<div className="mt-4 max-w-3xl">
			<h4 className="mb-4">Historial de pagos</h4>

			<div className="rounded border border-gray-200 shadow-sm mb-4">
				<Table>
					<TableHead>
						<TableHeadCell>Fecha</TableHeadCell>
						<TableHeadCell>Monto</TableHeadCell>
					</TableHead>
					<TableBody>
						{payments.map(payment => (
							<TableRow key={payment.id}>
								<TableCell className="whitespace-nowrap text-sm">
									{formatDate(payment.createdAt)}
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									${formatCurrency(payment.amount)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

function ErrorToast() {
	const [searchParams] = useSearchParams();
	const expired_plan = searchParams.get('msg') === 'expired_plan';

	if (!expired_plan) return null;

	return (
		<Toast variant="error" className="mb-4">
			Tu plan ha expirado, por favor sigue las instrucciones abajo para renovar.
		</Toast>
	);
}

const plans = {
	free: { name: 'Gratis', price: 0 },
	entrepreneur: { name: 'Emprendedor', price: 69900 },
	max: { name: 'Pro', price: 129900 },
	custom: { name: 'Personalizado', price: 0 },
} as Record<string, { name: string; price: number }>;
