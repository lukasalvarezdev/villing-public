import { z } from 'zod';
import { fetchApi } from './fetch-api.server';
import { getCurrentDomain } from './misc.server';

const baseWompiUrl =
	process.env.VILLING_ENV === 'production'
		? 'https://production.wompi.co'
		: 'https://sandbox.wompi.co';

type PaymentLinkArgs = {
	companyName: string;
	amount: number;
};

async function createPaymentLink(
	token: string,
	{ companyName, amount }: PaymentLinkArgs,
) {
	const response = await fetchApi(`${baseWompiUrl}/v1/payment_links`, {
		token,
		method: 'POST',
		body: {
			name: `Pago suscripción Villing - ${companyName}`,
			description: 'VILLING',
			single_use: true,
			collect_shipping: false,
			currency: 'COP',
			amount_in_cents: amount,
			redirect_url: `${getCurrentDomain()}/settings/payments`,
		},
		schema: z.object({ data: z.object({ id: z.string() }) }),
	});
	if (!response.success) {
		throw new Error('No se pudo actualizar el ambiente con la DIAN');
	}

	return `https://checkout.wompi.co/l/${response.data.data.id}`;
}

async function getTransactionStatus(token: string, id: string) {
	const response = await fetchApi(`${baseWompiUrl}/v1/transactions/${id}`, {
		token,
		method: 'GET',
		schema: transactionSchema,
	});

	if (!response.success) {
		throw new Error('No se pudo obtener el estado de la transacción');
	}

	return response.data.data;
}

const transactionSchema = z.object({
	data: z.object({
		id: z.string(),
		status: z.string(),
		payment_link_id: z.string(),
	}),
});

async function getLinkStatus(token: string, id: string) {
	const response = await fetchApi(`${baseWompiUrl}/v1/payment_links/${id}`, {
		token,
		method: 'GET',
	});
	if (!response.success) {
		throw new Error('No se pudo actualizar el ambiente con la DIAN');
	}

	return response.data;
}

export function getCopInCents(amount: number) {
	return amount * 100;
}

export function getCentsInCop(amount: number) {
	return amount / 100;
}

export const paymentGatewayClient = {
	createPaymentLink,
	getTransactionStatus,
	getLinkStatus,
};
