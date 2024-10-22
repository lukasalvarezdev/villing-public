import { parse } from '@conform-to/zod';
import { type ActionFunctionArgs, json } from '@remix-run/node';
import * as z from 'zod';
import { addCustomErrorToSubmission } from '~/components/form-utils';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { toNumber } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const formData = await request.formData();
	const submission = parse(formData, { schema: addPaymentFormSchema });

	if (!submission.value || submission.intent !== 'submit') {
		return json(submission, 400);
	}

	const { moduleType, id: invoiceId, ...payment } = submission.value;
	const { db, orgId } = await getOrgDbClient(request);

	try {
		switch (moduleType) {
			case 'invoice':
				await legalInvoiceFlow();
				break;
			case 'remision':
				await remisionFlow();
				break;
			case 'purchase-remision':
				await purchaseRemisionFlow();
				break;
			case 'purchase-invoice':
				await purchaseInvoiceFlow();
				break;
			default:
				break;
		}

		return json({ success: true });
	} catch (error) {
		if (typeof error === 'string') {
			return addCustomErrorToSubmission(error, submission);
		}

		await logError({ error, request });
		return addCustomErrorToSubmission(
			'Hubo un error al crear el pago, por favor intenta de nuevo',
			submission,
		);
	}

	async function legalInvoiceFlow() {
		await db.$transaction(async tx => {
			const invoice = await tx.legalInvoice.update({
				where: { id: invoiceId, organizationId: orgId },
				select: { pending: true },
				data: { pending: { decrement: payment.amount } },
			});

			const paidMoreThanPending = invoice.pending < 0;

			if (paidMoreThanPending) {
				throw 'La factura ya está pagada o el pago es mayor al total';
			}
			await tx.legalInvoicePayment.create({
				data: {
					amount: payment.amount,
					paymentMethod: payment.method,
					legalInvoiceId: invoiceId,
				},
				select: { id: true },
			});
		});
	}

	async function remisionFlow() {
		await db.$transaction(async tx => {
			const remision = await tx.legalInvoiceRemision.update({
				where: { id: invoiceId, organizationId: orgId },
				select: { pending: true },
				data: { pending: { decrement: payment.amount } },
			});

			const paidMoreThanPending = remision.pending < 0;

			if (paidMoreThanPending) {
				throw 'La remisión ya está pagada o el pago es mayor al total';
			}

			await tx.invoiceRemisionPayment.create({
				data: {
					amount: payment.amount,
					paymentMethod: payment.method,
					invoiceRemisionId: invoiceId,
				},
				select: { id: true },
			});
		});
	}

	async function purchaseRemisionFlow() {
		await db.$transaction(async tx => {
			const remision = await tx.purchaseRemision.update({
				where: { id: invoiceId, organizationId: orgId },
				select: { pending: true },
				data: { pending: { decrement: payment.amount } },
			});
			const paidMoreThanPending = remision.pending < 0;

			await tx.purchaseRemisionPayment.create({
				data: {
					amount: payment.amount,
					paymentMethod: payment.method,
					remisionId: invoiceId,
				},
				select: { id: true },
			});

			if (paidMoreThanPending) {
				throw 'La factura ya está pagada o el pago es mayor al total';
			}
		});
	}

	async function purchaseInvoiceFlow() {
		await db.$transaction(async tx => {
			const invoice = await tx.purchaseInvoice.update({
				where: { id: invoiceId, organizationId: orgId },
				select: { pending: true },
				data: { pending: { decrement: payment.amount } },
			});

			const paidMoreThanPending = invoice.pending < 0;

			if (paidMoreThanPending) {
				throw 'La factura ya está pagada o el pago es mayor al total';
			}

			await tx.purchasePayment.create({
				data: {
					amount: payment.amount,
					paymentMethod: payment.method,
					purchaseInvoiceId: invoiceId,
				},
				select: { id: true },
			});
		});
	}
}

export const addPaymentFormSchema = z.object({
	id: z.number(),
	amount: z.string().transform((value, ctx) => {
		const number = toNumber(value);

		if (number <= 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'El monto debe ser mayor a cero',
			});
		}

		return number;
	}),
	method: z.enum(['cash', 'credit_card', 'transfer']),
	moduleType: z.enum([
		'invoice',
		'remision',
		'purchase-invoice',
		'purchase-remision',
	]),
});
