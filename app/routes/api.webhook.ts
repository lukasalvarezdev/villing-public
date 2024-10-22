import { type ActionFunctionArgs } from '@remix-run/node';
import { z } from 'zod';
import { __prisma } from '~/utils/db.server';
import { errorLogger, logInfo } from '~/utils/logger';
import {
	getCentsInCop,
	paymentGatewayClient,
} from '~/utils/payment-gateway-client.server';

export async function action({ request }: ActionFunctionArgs) {
	if (request.method !== 'POST') {
		return new Response('Invalid method', { status: 405 });
	}

	const data = await request.json();

	try {
		const { id } = schema.parse(data).data.transaction;

		const { payment_link_id: linkId, status } =
			await paymentGatewayClient.getTransactionStatus(
				process.env.PAYMENT_GATEWAY_TOKEN!,
				id,
			);

		if (status !== 'APPROVED') {
			throw new Error(
				`Transaction status is not approved: ${status}, id: ${id}`,
			);
		}

		await __prisma.$transaction(async tx => {
			const paymentLink = await tx.paymentLinks.findFirst({
				where: { linkId },
				select: { id: true, amount: true },
			});

			if (!paymentLink) {
				throw new Error('Payment link not found');
			}

			const paymentLinkId = paymentLink.id;

			const { organization } = await tx.paymentLinks.update({
				where: { id: paymentLink.id },
				data: { transactionId: id, paidAt: new Date() },
				select: { organization: { select: { id: true, planType: true } } },
			});

			const nextPayment = new Date();
			nextPayment.setDate(nextPayment.getDate() + 30);

			await Promise.all([
				tx.paymentPlan.create({
					data: {
						paymentLinkId,
						type: organization.planType,
						amount: getCentsInCop(paymentLink.amount),
						nextPayment: nextPayment,
						organizationId: organization.id,
						description: 'Pago con Wompi',
					},
					select: { id: true },
				}),
				tx.organization.update({
					where: { id: organization.id },
					data: {
						currentPaymentLinkUrl: null,
						planExpiresAt: nextPayment,
					},
				}),
			]);
		});

		logInfo({
			message: `Payment approved: ${id}`,
			path: 'app/routes/api.webhook.ts',
		});
	} catch (error) {
		errorLogger({ error, path: 'app/routes/api.webhook.ts' });
	}

	return { data };
}

const schema = z.object({
	data: z.object({
		transaction: z.object({
			id: z.string(),
			payment_link_id: z.string(),
			status: z.literal('APPROVED'),
		}),
	}),
});
