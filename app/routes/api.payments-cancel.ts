import { parse } from '@conform-to/zod';
import { type ActionFunctionArgs, json } from '@remix-run/node';
import * as z from 'zod';
import { addCustomErrorToSubmission } from '~/components/form-utils';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { protectRoute } from '~/utils/session.server';

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const formData = await request.formData();
	const submission = parse(formData, { schema: cancelPaymentSchema });

	if (!submission.value || submission.intent !== 'submit') {
		return json(submission, 400);
	}

	const { moduleType, id, invoiceId } = submission.value;
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
			const { amount } = await tx.legalInvoicePayment.delete({
				where: { id },
			});

			await tx.legalInvoice.update({
				where: { id: invoiceId, organizationId: orgId },
				data: { pending: { decrement: amount } },
			});
		});
	}

	async function remisionFlow() {
		await db.$transaction(async tx => {
			const { amount } = await tx.invoiceRemisionPayment.delete({
				where: { id },
			});

			await tx.legalInvoiceRemision.update({
				where: { id: invoiceId, organizationId: orgId },
				data: { pending: { decrement: amount } },
			});
		});
	}

	async function purchaseRemisionFlow() {
		await db.$transaction(async tx => {
			const { amount } = await tx.purchaseRemisionPayment.delete({
				where: { id },
			});

			await tx.purchaseRemision.update({
				where: { id: invoiceId, organizationId: orgId },
				data: { pending: { decrement: amount } },
			});
		});
	}

	async function purchaseInvoiceFlow() {
		await db.$transaction(async tx => {
			const { amount } = await tx.purchasePayment.delete({
				where: { id },
			});

			await tx.purchaseInvoice.update({
				where: { id: invoiceId, organizationId: orgId },
				data: { pending: { decrement: amount } },
			});
		});
	}
}

export const cancelPaymentSchema = z.object({
	id: z.number(),
	invoiceId: z.number(),
	moduleType: z.enum([
		'invoice',
		'remision',
		'purchase-invoice',
		'purchase-remision',
	]),
});
