import * as z from 'zod';
import { safeNewDate } from '~/utils/misc';

export const builderTypeSchema = z.enum([
	'pos',
	'quote',
	'electronic',
	'remision',
	'purchase',
	'purchaseRemision',
	'purchaseInvoice',
	'creditNote',
	'debitNote',
	'stockSetting',
]);
export type BuilderType = z.infer<typeof builderTypeSchema>;

export const builderSessionSchema = z.enum([
	'legalPosInvoice',
	'legalInvoice',
	'legalInvoiceRemision',
	'quote',
	'purchase',
	'purchaseRemision',
	'purchaseInvoice',
	'creditNote',
	'debitNote',
	'stockSetting',
	'order',
]);
export type BuilderSession = z.infer<typeof builderSessionSchema>;

export const builderSessions: Record<BuilderSession, string> = {
	legalPosInvoice: 'pos-invoice',
	legalInvoice: 'electronic-invoice',
	legalInvoiceRemision: 'remision',
	quote: 'quote',
	purchase: 'purchase',
	purchaseRemision: 'purchase-remision',
	purchaseInvoice: 'purchase-invoice',
	creditNote: 'credit-note',
	debitNote: 'debit-note',
	stockSetting: 'stock-setting',
	order: 'order',
};

const productSchema = z.object({
	id: z.number(),
	internalId: z.number(),
	name: z.string(),
	quantity: z.number(),
	price: z.number(),
	cost: z.number(),
	stock: z.number(),
	stocks: z
		.array(z.object({ quantity: z.number(), branchId: z.number() }))
		.optional(),
	prices: z.array(
		z.object({ id: z.number(), name: z.string(), price: z.number() }),
	),
	tax: z.number(),
	discount: z.number(),
	notes: z.string().optional(),
	ref: z.string().optional(),
	barCodes: z.array(z.string()),

	batch: z.string().optional(),
	expirationDate: z
		.string()
		.optional()
		.transform(date => safeNewDate(date)?.toUTCString()),
	invimaRegistry: z.string().optional(),
	markedForRefund: z.boolean().optional(),
});
export type ProductType = z.infer<typeof productSchema>;

const paymentFormTypeSchema = z.enum(['cash', 'card', 'transfer', 'loan']);
const paymentFormSchema = z.object({
	id: z.number(),
	type: paymentFormTypeSchema,
	amount: z.number(),
});
export type PaymentFormType = z.infer<typeof paymentFormSchema>;

export const builderSchema = z.object({
	subId: z.number().optional(),
	transferToBranchId: z.number().nullable().optional(),
	client: z.object({ id: z.number(), name: z.string() }).optional(),
	supplier: z.object({ id: z.number(), name: z.string() }).optional(),
	resolutionId: z.number().optional(),
	priceListId: z.number().optional(),
	products: z.array(productSchema),
	paymentForms: z.array(paymentFormSchema),
	totalCollected: z.number(),
	notes: z.string().optional(),
	shouldPrint: z.boolean().optional(),
	paysInDays: z.number().optional(),
	externalInvoiceId: z.string().optional(),
	receivedAt: z.string().optional(),
	creditNoteReason: z
		.enum(['return', 'cancel', 'discount', 'priceAdjustment', 'other'])
		.optional(),
	debitNoteReason: z
		.enum(['interest', 'expenses', 'valueChange', 'other'])
		.optional(),
	stockType: z.enum(['partial', 'total']).optional(),
	stockIncomeOrExit: z.enum(['income', 'exit']).optional(),
	updatePrices: z.boolean().optional(),
	target: builderTypeSchema.optional(),

	config: z.object({ taxIncluded: z.boolean(), retention: z.number() }),

	preferences: z
		.object({
			client: z.object({ id: z.number(), name: z.string() }).optional(),
			resolutionId: z.number().optional(),
			priceListId: z.number().optional(),
		})
		.optional(),
});

export type Builder = z.infer<typeof builderSchema>;
export type BuilderClient = Builder['client'];
export type BuilderSupplier = Builder['supplier'];
