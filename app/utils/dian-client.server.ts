import {
	type typeDocumentIdentification,
	type creditNoteCorrectionsType,
	type debitNoteCorrectionsType,
	type typeLiability,
	type typeOrganization,
} from '@prisma/client';

import * as z from 'zod';
import { calculateProductTotal } from '~/modules/invoice/invoice-math';
import { logDianError } from './db.server';
import {
	soenacCreditNoteCorrectionResponsesMapper,
	soenacDebitNoteCorrectionResponsesMapper,
	soenacIdentificationsMapper,
	soenacTaxDetailsMapper,
	soenacTypeLiabilitiesMapper,
	soenacTypeOrganizationsMapper,
	soenacTypeRegimesMapper,
} from './legal-values';
import { errorLogger } from './logger';
import { getTaxValueFromPriceWithTax, parseDateToYYYYMMDD } from './misc';
import { type CompanyType } from './schemas';

// TODO: add error logs, add error log class

export const soenacApiUrl =
	'https://icag.apifacturacionelectronica.com/api/ubl2.1';

type DianClientProps<A extends ActionKey> = Parameters<
	(typeof actions)[A]
>[1] extends string
	? { action: A; accessToken: string; body: Parameters<(typeof actions)[A]>[0] }
	: { action: A; body: Parameters<(typeof actions)[A]>[0] };

export async function dianClient<A extends ActionKey>(
	args: DianClientProps<A>,
): Promise<ReturnType<(typeof actions)[A]>> {
	// @ts-ignore the type is checked in the function definition
	return await actions[args.action](
		// @ts-ignore the type is checked in the function definition
		args.body,
		// @ts-ignore the type is checked in the function definition
		'accessToken' in args ? args.accessToken : undefined,
	);
}

export function getHeaders(accessToken?: string) {
	const headers = {
		'Content-Type': 'application/json',
		Accept: 'application/json',
	} as Record<string, string>;

	if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

	return headers;
}

type ActionWithAccessToken = (body: any, accessToken: string) => Promise<any>;
type ActionWithoutAccessToken = (body: any) => Promise<any>;
type Action = ActionWithoutAccessToken | ActionWithAccessToken;

const actions = {
	createCompany,
	updateCompany,
	getResolutionsByOrganization,
	createResolution,
	deleteResolution,
	createInvoice,
	sendInvoiceEmail,
	getInvoiceStatusByZipKey,
	createCreditNote,
	createDebitNote,
	updateEnvironment,

	createInvoiceReceipt,
	createInvoiceMerchantReceipt,

	createInvoiceExample,
	updateEnvironmentToProd,
} satisfies Record<string, Action>;
type ActionKey = keyof typeof actions;

async function createCompany({ nit, ciius, ...company }: Company) {
	try {
		const responseSchema = z.object({ token: z.string() });

		const response = await fetch(`${soenacApiUrl}/config/${nit}`, {
			method: 'POST',
			body: JSON.stringify({ ...company, type_currency_id: 35 }),
			headers: getHeaders(process.env.SOENAC_TOKEN),
		});

		if (response.status !== 200) {
			console.error(response, await response.text());
			await logDianError(response, company, 'createCompany');
			throw new Error('Hubo un error al crear la empresa');
		}

		const data = await response.json();
		const result = responseSchema.safeParse(data);

		if (!result.success) {
			await logDianError(data, company, 'createCompany');
			return null;
		}

		return result.data.token;
	} catch (error) {
		await logDianError(error, company, 'createCompany');
		return null;
	}
}

type Company = {
	type_document_identification_id: number;
	type_organization_id: number;
	type_regime_id: number;
	tax_detail_id: number;
	type_liability_id: number;
	business_name: string;
	trade_name: string;
	merchant_registration: string;
	municipality_id: number;
	address: string;
	phone: string;
	email: string;
	ciius: Array<string>;
	nit: string;
};

async function updateCompany(organization: CompanyType, accessToken: string) {
	const company = {
		address: organization.address,
		business_name: organization.name,
		ciius: '',
		email: organization.email,
		merchant_registration: '1',
		municipality_id: organization.municipalityId,
		identification_number: organization.idNumber,
		phone: organization.tel,
		trade_name: organization.tradeName,
		type_document_identification_id:
			soenacIdentificationsMapper[organization.typeDocumentIdentification],
		type_liability_id: soenacTypeLiabilitiesMapper[organization.typeLiability],
		type_organization_id:
			soenacTypeOrganizationsMapper[organization.typeOrganization],
		type_regime_id: soenacTypeRegimesMapper[organization.typeRegime],
		tax_detail_id: soenacTaxDetailsMapper[organization.taxDetail],
	};

	const response = await fetch(
		`${soenacApiUrl}/config/${company.identification_number}`,
		{
			method: 'PUT',
			body: JSON.stringify(company),
			headers: getHeaders(accessToken),
		},
	);

	if (response.status !== 200) {
		const data = await response.json();
		await logDianError(data, company, 'updateCompany');
		throw new Error('Hubo un error al actualizar la empresa');
	}

	await response.json();
}

type Resolution = {
	from: number;
	to: number;
	dateFrom: Date;
	dateTo: Date;
	resolutionDate: Date;
	technicalKey: string;
	prefix: string;
	resolutionNumber: string;
};

async function createResolution(resolution: Resolution, accessToken: string) {
	const response = await fetch(`${soenacApiUrl}/config/resolution`, {
		method: 'POST',
		body: JSON.stringify({
			type_document_id: 1,
			from: resolution.from,
			to: resolution.to,
			date_from: parseDateToYYYYMMDD(resolution.dateFrom),
			date_to: parseDateToYYYYMMDD(resolution.dateTo),
			resolution_date: parseDateToYYYYMMDD(resolution.resolutionDate),
			technical_key: resolution.technicalKey,
			prefix: resolution.prefix,
			resolution: resolution.resolutionNumber,
		}),
		headers: getHeaders(accessToken),
	});

	if (response.status !== 200) {
		await logDianError(response, resolution, 'createResolution');
		const data = await response.json();
		await logDianError(data, resolution, 'createResolution');
		throw new Error('Hubo un error al crear la resolución');
	}

	const data = await response.json();
	const resolutionId = data.resolution.id;

	if (typeof resolutionId !== 'number')
		throw new Error('Hubo un error al crear la resolución');
	return resolutionId;
}

async function deleteResolution(id: string, accessToken: string) {
	const response = await fetch(`${soenacApiUrl}/config/resolution`, {
		method: 'DELETE',
		headers: getHeaders(accessToken),
	});

	if (response.status !== 200) {
		await logDianError(response, { resolutionId: id }, 'deleteResolution');
		throw new Error('Hubo un error al crear la resolución');
	}

	await response.json();
}

type ClientType = {
	idNumber: string;
	name: string;
	phone: string;
	municipalityId: number;
	address: string;
	email: string;
	merchantRegistration: string;
	typeDocumentIdentification: typeDocumentIdentification;
	typeLiability: typeLiability;
	typeOrganization: typeOrganization;
};

type Invoice = {
	id: number;
	resolutionId: number;
	client: ClientType;
	subtotal: number;
	totalTax: number;
	products: Array<{
		id: number;
		name: string;
		quantity: number;
		price: number;
		tax: number;
	}>;
	taxIncluded: boolean;
};
async function createInvoice(invoice: Invoice, accessToken: string) {
	const client = invoice.client;

	const invoiceJson = {
		number: invoice.id,
		sync: true,
		type_document_id: 1,
		resolution_id: Number(invoice.resolutionId),
		customer: mapCustomer(client),
		legal_monetary_totals: {
			line_extension_amount: invoice.subtotal,
			tax_exclusive_amount: invoice.subtotal,
			tax_inclusive_amount: invoice.subtotal + invoice.totalTax,
			payable_amount: invoice.subtotal + invoice.totalTax,
		},
		invoice_lines: getInvoiceLines(invoice.products, invoice.taxIncluded),
		environment: { type_environment_id: 1 },
	};

	if (process.env.VILLING_ENV !== 'production') {
		invoiceJson.environment = { type_environment_id: 2 };
	}

	const response = await fetch(`${soenacApiUrl}/invoice`, {
		method: 'POST',
		body: JSON.stringify(invoiceJson),
		headers: getHeaders(accessToken),
	});

	if (response.status !== 200) {
		console.error('RESPONSE', invoice);
		await logDianError(response, invoice, 'createInvoice');
		const data = await response.json();
		await logDianError(data, invoice, 'createInvoice');

		if (data.message === 'Service Unavailable') {
			throw 'El servicio de facturación está temporalmente deshabilitado por mantenimiento de la DIAN, por favor intente más tarde.';
		}

		throw new Error(
			'Hubo un error al crear la factura en soenac, respuesta invalida',
		);
	}

	const data = await response.json();

	const result = invoiceResponseSchema.safeParse(data);

	if (!result.success) {
		await logDianError(data, invoice, 'createInvoice');
		throw new Error('Hubo un error al crear la factura en soenac');
	}

	return data;
}
const invoiceResponseSchema = z.object({ is_valid: z.boolean().nullable() });

type InvoiceEmailData = {
	email: string;
	organizationEmail: string;
	cufe: string;
};
async function sendInvoiceEmail(
	invoiceEmailData: InvoiceEmailData,
	accessToken: string,
) {
	try {
		const { email, organizationEmail, cufe } = invoiceEmailData;
		const response = await fetch(`${soenacApiUrl}/mail/send/${cufe}`, {
			method: 'POST',
			body: JSON.stringify({
				to: [{ email }],
				cc: [{ email }, { email: organizationEmail }],
			}),
			headers: getHeaders(accessToken),
		});

		if (response.status !== 200) {
			await logDianError(response, invoiceEmailData, 'sendInvoiceEmail');
			const data = await response.json();
			await logDianError(data, invoiceEmailData, 'sendInvoiceEmail');
			throw new Error('Hubo un error al enviar el correo');
		}
		const data = await response.json();

		if (data.mail_sending_message === null) return true;

		await logDianError(data, invoiceEmailData, 'sendInvoiceEmail');
		return false;
	} catch (error) {
		return false;
	}
}

async function getInvoiceStatusByZipKey(zipKey: string, accessToken: string) {
	try {
		const response = await fetch(`${soenacApiUrl}/status/zip/${zipKey}`, {
			method: 'POST',
			body: JSON.stringify({ environment: { type_environment_id: 2 } }),
			headers: getHeaders(accessToken),
		});

		if (response.status !== 200) {
			await Promise.all([
				logDianError(response, zipKey, 'getInvoiceStatusByZipKey'),
				logDianError(await response.json(), zipKey, 'getInvoiceStatusByZipKey'),
			]);

			return null;
		}

		const data = await response.json();

		const result = invoiceZipResponseSchema.safeParse(data);

		if (!result.success) {
			await logDianError(data, zipKey, 'getInvoiceStatusByZipKey');
			return null;
		}

		return data;
	} catch (error) {
		return null;
	}
}
const invoiceZipResponseSchema = z.object({ is_valid: z.boolean() });

type CreditNote = {
	id: number;
	resolutionId: number;
	client: ClientType;
	reason: creditNoteCorrectionsType;
	subtotal: number;
	totalTax: number;
	products: Array<{
		id: number;
		name: string;
		quantity: number;
		price: number;
		tax: number;
	}>;
	relatedInvoice: {
		numeration: string;
		cufe: string;
		createdAt: string;
	};
	taxIncluded: boolean;
};
async function createCreditNote(creditNote: CreditNote, accessToken: string) {
	const client = creditNote.client;

	const creditNoteJson = {
		billing_reference: {
			number: creditNote.relatedInvoice.numeration,
			uuid: creditNote.relatedInvoice.cufe,
			issue_date: creditNote.relatedInvoice.createdAt,
		},
		number: creditNote.id,
		sync: true,
		type_document_id: 5,
		customer: mapCustomer(client),
		discrepancy_response: {
			correction_concept_id:
				soenacCreditNoteCorrectionResponsesMapper[creditNote.reason],
		},
		legal_monetary_totals: {
			line_extension_amount: creditNote.subtotal,
			tax_exclusive_amount: creditNote.subtotal,
			tax_inclusive_amount: creditNote.subtotal + creditNote.totalTax,
			payable_amount: creditNote.subtotal + creditNote.totalTax,
		},
		credit_note_lines: getInvoiceLines(
			creditNote.products,
			creditNote.taxIncluded,
		),
		environment: { type_environment_id: 1 },
		type_currency_id: 35,
	};

	if (process.env.VILLING_ENV !== 'production') {
		creditNoteJson.environment = { type_environment_id: 2 };
	}

	const response = await fetch(`${soenacApiUrl}/credit-note`, {
		method: 'POST',
		body: JSON.stringify(creditNoteJson),
		headers: getHeaders(accessToken),
	});

	if (response.status !== 200) {
		errorLogger({
			error: await response.text(),
			path: 'createCreditNote-response-error',
			body: creditNote,
		});

		await logDianError(response, creditNote, 'createCreditNote');

		const data = await response.json();
		const referenceId = errorLogger({
			error: data,
			path: 'createCreditNote-response-json-error',
			body: creditNote,
		});

		await logDianError(data, creditNote, 'createCreditNote');
		throw `Hubo un error al crear la nota crédito con referencia ${referenceId}`;
	}

	return await response.json();
}

type DebitNote = {
	id: number;
	resolutionId: number;
	client: ClientType;
	reason: debitNoteCorrectionsType;
	subtotal: number;
	totalTax: number;
	products: Array<{
		id: number;
		name: string;
		quantity: number;
		price: number;
		tax: number;
	}>;
	relatedInvoice: {
		numeration: string;
		cufe: string;
		createdAt: string;
	};
	taxIncluded: boolean;
};
async function createDebitNote(debitNote: DebitNote, accessToken: string) {
	const client = debitNote.client;

	const debitNoteJson = {
		billing_reference: {
			number: debitNote.relatedInvoice.numeration,
			uuid: debitNote.relatedInvoice.cufe,
			issue_date: debitNote.relatedInvoice.createdAt,
		},
		number: debitNote.id,
		sync: true,
		type_document_id: 6,
		customer: mapCustomer(client),
		discrepancy_response: {
			correction_concept_id:
				soenacDebitNoteCorrectionResponsesMapper[debitNote.reason],
		},
		requested_monetary_totals: {
			line_extension_amount: debitNote.subtotal,
			tax_exclusive_amount: debitNote.subtotal,
			tax_inclusive_amount: debitNote.subtotal + debitNote.totalTax,
			payable_amount: debitNote.subtotal + debitNote.totalTax,
		},
		debit_note_lines: getInvoiceLines(
			debitNote.products,
			debitNote.taxIncluded,
		),
		environment: { type_environment_id: 1 },
		type_currency_id: 35,
	};

	if (process.env.VILLING_ENV !== 'production') {
		debitNoteJson.environment = { type_environment_id: 2 };
	}

	const response = await fetch(`${soenacApiUrl}/debit-note`, {
		method: 'POST',
		body: JSON.stringify(debitNoteJson),
		headers: getHeaders(accessToken),
	});

	if (response.status !== 200) {
		await logDianError(response, debitNote, 'createDebitNote');
		const data = await response.json();
		await logDianError(data, debitNote, 'createDebitNote');
		throw new Error('Hubo un error al crear la nota débito');
	}

	return await response.json();
}

async function getResolutionsByOrganization(_: any, accessToken: string) {
	try {
		const response = await fetch(`${soenacApiUrl}/config/resolutions`, {
			method: 'GET',
			headers: getHeaders(accessToken),
		});

		if (response.status !== 200) {
			await Promise.all([
				logDianError(response, {}, 'getResolutionsByOrganization'),
				logDianError(await response.json(), {}, 'getResolutionsByOrganization'),
			]);

			return [];
		}

		const data = await response.json();

		const result = z.array(resolutionSchema).safeParse(data);

		if (!result.success) {
			await logDianError(data, {}, 'getResolutionsByOrganization');
			return [];
		}

		return result.data.filter(
			r => r.type_document_id === 1 && r.resolution !== '18760000001',
		) as Array<NonNullableResolutionSchema>;
	} catch (error) {
		return [];
	}
}

const resolutionSchema = z.object({
	id: z.number(),
	type_document_id: z.number(),
	prefix: z.string(),
	resolution: z.string().nullable(),
	resolution_date: z.string().nullable(),
	technical_key: z.string().nullable(),
	from: z.number(),
	to: z.number(),
	date_from: z.string().nullable(),
	date_to: z.string().nullable(),
	number: z.number().nullable(),
});
type ResolutionSchema = z.infer<typeof resolutionSchema>;

type NonNullableResolutionSchema = {
	[K in keyof ResolutionSchema]: NonNullable<ResolutionSchema[K]>;
};

function getInvoiceLines(products: Invoice['products'], taxIncluded: boolean) {
	return products.map(product => {
		const { subtotal, totalTax } = calculateProductTotal(
			{ ...product, discount: 0 },
			{ taxIncluded, retention: 0 },
		);
		const priceWithoutTax = taxIncluded
			? Math.trunc(
					product.price -
						getTaxValueFromPriceWithTax({
							tax: product.tax,
							price: product.price,
						}),
				)
			: product.price;

		return {
			invoiced_quantity: product.quantity,
			line_extension_amount: subtotal,
			tax_totals: [
				{
					tax_id: 1,
					tax_amount: totalTax,
					taxable_amount: subtotal,
					percent: product.tax,
				},
			],
			description: product.name,
			code: `${product.id}`,
			type_item_identification_id: 4,
			price_amount: priceWithoutTax,
			base_quantity: 1,
		};
	});
}

type UpdateEnvironmentArgs = {
	softwareId: string;
	certificate: string;
	certificatePassword: string;
};
async function updateEnvironment(
	body: UpdateEnvironmentArgs,
	accessToken: string,
) {
	const response = await fetch(`${soenacApiUrl}/config/environment`, {
		method: 'PUT',
		body: JSON.stringify({
			type_environment_id: 2,
			id: body.softwareId,
			certificate: body.certificate,
			password: body.certificatePassword,
			pin: '12345',
		}),
		headers: getHeaders(accessToken),
	});

	if (response.status !== 200) {
		const data = await response.json();
		await logDianError(data, body, 'updateEnvironment');
		throw new Error('Hubo un error al actualizar el ambiente');
	}

	await response.json();
}

async function updateEnvironmentToProd(body: null, accessToken: string) {
	const response = await fetch(`${soenacApiUrl}/config/environment`, {
		method: 'PUT',
		body: JSON.stringify({ type_environment_id: 1 }),
		headers: getHeaders(accessToken),
	});

	if (response.status !== 200) {
		const data = await response.json();
		await logDianError(data, body, 'updateEnvironment');
		throw new Error('Hubo un error al actualizar el ambiente');
	}

	await response.json();
}

type InvoiceReceipt = {
	id: number;
	person: { idNumber: string; name: string; lastName: string };
	cufe: string;
};
async function createInvoiceReceipt(
	receipt: InvoiceReceipt,
	accessToken: string,
) {
	const person = receipt.person;

	const receiptJson = {
		number: receipt.id,
		sync: true,
		uuid: receipt.cufe,
		person: {
			first_name: person.name,
			family_name: person.lastName,
			identification_number: person.idNumber,
		},
		environment: { type_environment_id: 1 },
	};

	if (process.env.VILLING_ENV !== 'production') {
		receiptJson.environment = { type_environment_id: 2 };
	}

	const response = await fetch(`${soenacApiUrl}/event/030`, {
		method: 'POST',
		body: JSON.stringify(receiptJson),
		headers: getHeaders(accessToken),
	});

	if (response.status !== 200) {
		console.error('RESPONSE', receipt);
		await logDianError(response, receipt, 'createInvoiceReceipt');
		const data = await response.json();
		await logDianError(data, receipt, 'createInvoiceReceipt');
		throw new Error('Hubo un error al crear la recepción de factura');
	}

	const data = await response.json();

	const result = invoiceReceiptResponseSchema.safeParse(data);

	if (!result.success || !data.is_valid || !data.number) {
		await logDianError(data, receipt, 'createInvoiceReceipt');
		throw new Error('Hubo un error al crear la recepción de factura');
	}

	return result.data;
}
const invoiceReceiptResponseSchema = z.object({
	is_valid: z.boolean().nullable(),
	number: z.string().nullable(),
	uuid: z.string().nullable(),
});

type InvoiceMetchantReceipt = {
	id: number;
	person: { idNumber: string; name: string; lastName: string };
	cufe: string;
};
async function createInvoiceMerchantReceipt(
	receipt: InvoiceMetchantReceipt,
	accessToken: string,
) {
	const person = receipt.person;

	const receiptJson = {
		number: receipt.id,
		sync: true,
		uuid: receipt.cufe,
		person: {
			first_name: person.name,
			family_name: person.lastName,
			identification_number: person.idNumber,
		},
		environment: { type_environment_id: 1 },
	};

	if (process.env.VILLING_ENV !== 'production') {
		receiptJson.environment = { type_environment_id: 2 };
	}

	const response = await fetch(`${soenacApiUrl}/event/032`, {
		method: 'POST',
		body: JSON.stringify(receiptJson),
		headers: getHeaders(accessToken),
	});

	if (response.status !== 200) {
		console.error('RESPONSE', receipt);
		await logDianError(response, receipt, 'createInvoiceMerchantReceipt');
		const data = await response.json();
		console.error('DATA', data);
		await logDianError(data, receipt, 'createInvoiceMerchantReceipt');
		throw new Error('Hubo un error al crear la recepción de factura');
	}

	const data = await response.json();

	const result = invoiceMerchantReceiptResponseSchema.safeParse(data);

	if (!result.success || !data.is_valid || !data.number) {
		await logDianError(data, receipt, 'createInvoiceMerchantReceipt');
		throw new Error('Hubo un error al crear la recepción de factura');
	}

	return result.data.uuid as string;
}
const invoiceMerchantReceiptResponseSchema = z.object({
	is_valid: z.boolean().nullable(),
	number: z.string().nullable(),
	uuid: z.string().nullable(),
});

async function createInvoiceExample(testSetId: string, accessToken: string) {
	const response = await fetch(`${soenacApiUrl}/invoice/${testSetId}`, {
		method: 'POST',
		body: JSON.stringify({
			environment: { type_environment_id: 2 },
			number: 990000001,
			sync: false,
			type_operation_id: 9,
			type_document_id: 1,
			customer: {
				identification_number: 123456789,
				name: 'TEST TEST',
				municipality_id: 1006,
				email: 'test@test.com',
			},
			legal_monetary_totals: {
				line_extension_amount: '300000.00',
				tax_exclusive_amount: '300000.00',
				tax_inclusive_amount: '357000.00',
				allowance_total_amount: '0.00',
				charge_total_amount: '0.00',
				payable_amount: '357000.00',
			},
			invoice_lines: [
				{
					unit_measure_id: 642,
					invoiced_quantity: '1.000000',
					line_extension_amount: '300000.00',
					free_of_charge_indicator: false,
					notes: [
						{ text: 'Contrato de servicios AIU por concepto de: blablabla' },
					],
					tax_totals: [
						{
							tax_id: 1,
							tax_amount: '57000.00',
							taxable_amount: '300000.00',
							percent: '19.00',
						},
					],
					description: 'Base para TV',
					code: 'BTV',
					type_item_identification_id: 4,
					price_amount: '300000.00',
					base_quantity: '1.000000',
				},
			],
		}),
		headers: getHeaders(accessToken),
	});

	if (response.status !== 200) {
		throw new Error('Hubo un error al crear la factura');
	}
}

export function getSoenacId(resolution: { soenacId: string | null }) {
	const id = resolution.soenacId?.split('-')[1];
	if (!id) throw 'No se encontró el id de la resolución';
	return parseInt(id);
}

function mapCustomer(client: ClientType) {
	return {
		identification_number: client.idNumber,
		name: client.name,
		municipality_id: client.municipalityId,
		email: client.email,
		merchant_registration: client.merchantRegistration,
		address: client.address,
		type_document_identification_id:
			soenacIdentificationsMapper[client.typeDocumentIdentification],
		type_liability_id: soenacTypeLiabilitiesMapper[client.typeLiability],
		type_organization_id:
			soenacTypeOrganizationsMapper[client.typeOrganization],
	};
}
