import * as z from 'zod';

export const invoiceSessionSchemas = z.enum([
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
export type InvoiceSessionSchema = z.infer<typeof invoiceSessionSchemas>;

export const invoiceSessionKeys: Record<InvoiceSessionSchema, string> = {
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

export const modulesSchema = z.enum([
	'pos',
	'electronic',
	'remision',
	'purchase',
	'purchaseRemision',
	'purchaseInvoice',
	'creditNote',
	'debitNote',
	'stockSetting',
]);
export type ModulesSchema = z.infer<typeof modulesSchema>;

export const invoiceActionSchema = z.enum([
	'posInvoice',
	'legalInvoice',
	'remision',
	'quote',
	'purchase',
	'purchaseRemision',
	'purchaseInvoice',
	'creditNote',
	'debitNote',
	'stockSetting',
]);
export type InvoiceActionType = z.infer<typeof invoiceActionSchema> | undefined;

export const formActionByAction: Record<
	NonNullable<InvoiceActionType>,
	string
> = {
	posInvoice: '/api/invoices/pos/new',
	quote: '/api/invoices/quote/new',
	remision: '/api/invoices/remision/new',
	legalInvoice: '/api/invoices/electronic/new',
	purchase: '/api/invoices/purchase/new',
	purchaseRemision: '/api/invoices/purchase-remision/new',
	purchaseInvoice: '/api/invoices/purchase-invoice/new',
	creditNote: '/api/invoices/credit-note/new',
	debitNote: '/api/invoices/debit-note/new',
	stockSetting: '/api/invoices/stock-setting/new',
};
