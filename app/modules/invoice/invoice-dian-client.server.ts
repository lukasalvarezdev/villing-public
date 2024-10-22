import {
	type Resolution,
	type Client,
	type typeDocumentIdentification,
	type typeLiability,
	type typeOrganization,
} from '@prisma/client';
import { z } from 'zod';
import { type Builder } from '~/routes/builder.$type.new.$(sub_id)/builder/schemas';
import { __prisma } from '~/utils/db.server';
import { type PosCreditNoteCorrectionType } from '~/utils/enums';
import { type ApiResponse, fetchApi } from '~/utils/fetch-api.server';
import {
	getPosCreditNoteCorrectionSoenacId,
	soenacIdentificationsMapper,
	soenacTaxDetailsMapper,
	soenacTypeLiabilitiesMapper,
	soenacTypeOrganizationsMapper,
	soenacTypeRegimesMapper,
} from '~/utils/legal-values';
import { errorLogger } from '~/utils/logger';
import { getTaxValueFromPriceWithTax, parseDateToYYYYMMDD } from '~/utils/misc';
import {
	type MathTotalsType,
	calculateProductTotal,
	parseNumber,
} from './invoice-math';

async function createInvoice(token: string, invoice: Invoice) {
	if (!invoice.resolutionId) {
		throw new Error('Resolution id is required');
	}

	const body = {
		number: invoice.id,
		sync: true,
		type_document_id: 1,
		resolution_id: invoice.resolutionId,
		customer: mapCustomer(invoice.client),
		legal_monetary_totals: {
			line_extension_amount: invoice.subtotal,
			tax_exclusive_amount: invoice.subtotal,
			tax_inclusive_amount: invoice.subtotal + invoice.totalTax,
			payable_amount: invoice.subtotal + invoice.totalTax,
		},
		invoice_lines: getInvoiceLines(invoice.products),
		environment: { type_environment_id: 1 },
	};

	if (process.env.VILLING_ENV !== 'production') {
		body.environment.type_environment_id = 2;
	}

	const response = await fetchApi('/invoice', { method: 'POST', body, token });

	return parseInvoiceResponse(response, 'createInvoice');
}

type PosInvoice = {
	orgId: number;
	subId: number;
	clientId: number;
	numeration: number;
	resolutionId: number;
	products: Builder['products'];
	totals: MathTotalsType;
	testSetId?: string;
};
async function createPosInvoice(invoice: PosInvoice, defaultBody?: any) {
	const [org, client, resolution, branch] = await getInvoiceData();
	const { token, environment } = getOrgData(org);

	const body = defaultBody || {
		number: invoice.numeration,
		type_document_id: 14,
		sync: true,
		environment,
		point_sale: { cashier: branch.name },
		customer: getCustomer(client),
		resolution: getResolution(resolution),
		invoice_lines: getInvoiceLines(invoice.products),
		legal_monetary_totals: getLegalMonetaryTotals(invoice.totals),
	};

	if (process.env.VILLING_ENV !== 'production') {
		body.environment.type_environment_id = 2;
	}

	const response = await fetchApi(`/pos/${invoice.testSetId || ''}`, {
		method: 'POST',
		body: body,
		token,
	});

	return parseInvoiceResponse(response, 'createPosInvoice');

	function getInvoiceData() {
		return __prisma.$transaction([
			__prisma.organization.findFirstOrThrow({
				where: { id: invoice.orgId },
				select: { soenacToken: true, posSoftwareId: true },
			}),
			__prisma.client.findFirstOrThrow({
				where: { id: invoice.clientId },
			}),
			__prisma.resolution.findFirstOrThrow({
				where: { id: invoice.resolutionId },
			}),
			__prisma.subOrganization.findFirstOrThrow({
				where: { id: invoice.subId },
			}),
		]);
	}

	function getOrgData({ posSoftwareId, soenacToken }: typeof org) {
		if (!posSoftwareId || !soenacToken) {
			throw new Error('Organization is not configured for POS');
		}

		return {
			token: soenacToken,
			environment: { type_environment_id: 1, id: posSoftwareId, pin: '12345' },
		};
	}
}

type CreditNotePos = Omit<PosInvoice, 'resolutionId'> & {
	relatedInvoice: OriginInvoiceType;
	reason: PosCreditNoteCorrectionType;
};
async function createPosCreditNote({
	relatedInvoice,
	...invoice
}: CreditNotePos) {
	const [org, client] = await getInvoiceData();
	const { token, environment } = getOrgData(org);

	const body = {
		billing_reference: relatedInvoice,
		resolution: { prefix: 'NTCP', from: 1, to: 1000 },
		sync: true,
		number: invoice.numeration,
		type_document_id: 15,
		type_currency_id: 35,
		environment,
		customer: getCustomer(client),
		credit_note_lines: getInvoiceLines(invoice.products),
		legal_monetary_totals: getLegalMonetaryTotals(invoice.totals),
		discrepancy_response: {
			correction_concept_id: getPosCreditNoteCorrectionSoenacId(invoice.reason),
		},
	};

	if (process.env.VILLING_ENV !== 'production') {
		body.environment.type_environment_id = 2;
	}

	const response = await fetchApi('/pos/credit-note', {
		method: 'POST',
		body: body,
		token,
	});

	return parseInvoiceResponse(response, 'createPosCreditNote');

	function getInvoiceData() {
		return __prisma.$transaction([
			__prisma.organization.findFirstOrThrow({
				where: { id: invoice.orgId },
				select: { soenacToken: true, posSoftwareId: true },
			}),
			__prisma.client.findFirstOrThrow({
				where: { id: invoice.clientId },
			}),
		]);
	}

	function getOrgData({ posSoftwareId, soenacToken }: typeof org) {
		if (!posSoftwareId || !soenacToken) {
			throw new Error('Organization is not configured for POS');
		}

		return {
			token: soenacToken,
			environment: { type_environment_id: 1, id: posSoftwareId, pin: '12345' },
		};
	}
}

async function createCompany(orgId: number) {
	await __prisma.$transaction(async tx => {
		const organization = await tx.organization.update({
			where: { id: orgId },
			// try to update before the transaction
			data: { updatedAt: new Date() },
		});
		const { idNumber, soenacToken } = organization;

		if (soenacToken) return;

		const response = await fetchApi(`/config/${idNumber}`, {
			token: process.env.SOENAC_TOKEN,
			method: 'POST',
			body: {
				phone: organization.tel,
				email: organization.email,
				nit: organization.idNumber,
				address: organization.address,
				business_name: organization.name,
				trade_name: organization.tradeName,
				municipality_id: organization.municipalityId,

				type_document_identification_id:
					soenacIdentificationsMapper[organization.typeDocumentIdentification],
				type_liability_id:
					soenacTypeLiabilitiesMapper[organization.typeLiability],
				type_organization_id:
					soenacTypeOrganizationsMapper[organization.typeOrganization],
				type_regime_id: soenacTypeRegimesMapper[organization.typeRegime],
				tax_detail_id: soenacTaxDetailsMapper[organization.taxDetail],

				ciius: [],
				type_currency_id: 35,
				merchant_registration: '1',
			},
			schema: z.object({ token: z.string() }),
		});

		if (!response.success) {
			throw new Error('No se pudo sincronizar con la DIAN');
		}

		await tx.organization.update({
			where: { id: orgId },
			data: { soenacToken: response.data.token },
		});
	});
}

async function updateCertificate(orgId: number) {
	await __prisma.$transaction(async tx => {
		const organization = await tx.organization.findFirstOrThrow({
			where: { id: orgId },
		});
		const {
			soenacToken,
			posSoftwareId: id,
			certificatePassword: password,
			certificateInBase64: certificate,
		} = organization;

		if (!soenacToken) return;

		const response = await fetchApi('/config/environment', {
			token: soenacToken,
			method: 'PUT',
			body: {
				id,
				password,
				certificate,
				pin: '12345',
				type_environment_id: 2,
			},
		});

		if (!response.success) {
			throw new Error('No se pudo actualizar el ambiente con la DIAN');
		}
	});
}

async function updateEnvToProd(token: string) {
	const response = await fetchApi('/config/environment', {
		token,
		method: 'PUT',
		body: { type_environment_id: 1 },
	});

	if (!response.success) {
		throw new Error('No se pudo actualizar el ambiente con la DIAN');
	}
}

export const invoiceDianClient = {
	createInvoice,

	createPosInvoice,
	createPosCreditNote,

	createCompany,
	updateCertificate,
	updateEnvToProd,
};

function getInvoiceLines(products: Invoice['products']) {
	return products.map(product => {
		const { subtotal, totalTax, totalDiscount } = calculateProductTotal(
			{ ...product },
			{ taxIncluded: true, retention: 0 },
		);
		const priceWithoutTax = parseNumber(
			product.price -
				getTaxValueFromPriceWithTax({
					tax: product.tax,
					price: product.price,
				}),
		);

		return {
			invoiced_quantity: product.quantity,
			reference_price_id: product.price === 0 ? 1 : undefined,
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
			code: `${product.ref || product.id}`,
			type_item_identification_id: 4,
			price_amount: priceWithoutTax,
			base_quantity: 1,
			allowance_charges:
				totalDiscount > 0
					? [
							{
								charge_indicator: false,
								allowance_charge_reason: 'Discount',
								amount: totalDiscount,
								base_amount: subtotal,
							},
						]
					: [],
		};
	});
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
		discount: number;
		ref?: string;
	}>;
	taxIncluded: boolean;
};

type InvoiceResponse =
	| { success: false; referenceId: string }
	| { success: true; data: Record<string, any> };
function parseInvoiceResponse(
	response: ApiResponse<undefined>,
	path: string,
): InvoiceResponse {
	if (!response.success) {
		return { referenceId: 'error', success: false };
	}

	const data = response.data as Record<string, any>;
	const result = getSchema().safeParse(data);

	if (!result.success) {
		const referenceId = errorLogger({
			path,
			error: data,
			body: result.error.flatten(),
			customMessage: 'Error parsing response from DIAN in createInvoice',
		});
		return { referenceId, success: false };
	}

	return { success: true, data };

	function getSchema() {
		return z.object({ is_valid: z.boolean().nullable() });
	}
}

function getLegalMonetaryTotals(totals: MathTotalsType) {
	const { subtotal, totalTax } = totals;

	return {
		line_extension_amount: subtotal,
		tax_exclusive_amount: subtotal,
		tax_inclusive_amount: subtotal + totalTax,
		payable_amount: subtotal + totalTax,
	};
}

function getCustomer(client: Client) {
	return {
		name: client.name,
		email: client.email,
		identification_number: client.idNumber,
		address: client.simpleAddress || '',
		type_document_identification_id:
			soenacIdentificationsMapper[client.typeDocumentIdentification],
		type_liability_id: soenacTypeLiabilitiesMapper[client.typeLiability],
		type_organization_id:
			soenacTypeOrganizationsMapper[client.typeOrganization],
	};
}

function getResolution(data: Resolution) {
	const resolution = resolutionSchema.parse(data);

	return {
		prefix: resolution.prefix,
		to: resolution.to,
		from: resolution.from,
		resolution: resolution.resolutionNumber,
		date_to: parseDateToYYYYMMDD(resolution.toDate),
		date_from: parseDateToYYYYMMDD(resolution.fromDate),
		resolution_date: parseDateToYYYYMMDD(resolution.resolutionDate),
	};
}

const resolutionSchema = z.object({
	prefix: z.string(),
	resolutionNumber: z.string(),
	fromDate: z.date(),
	toDate: z.date(),
	resolutionDate: z.date(),
	from: z.number(),
	to: z.number(),
});

export const invoiceResponseSchema = z.object({
	is_valid: z.boolean().nullable(),
	zip_key: z.string().nullable(),
	uuid: z.string().nullable(),
	number: z.string().nullable(),
	qr_code: z.string().nullable(),
});

export const originInvoiceSchema = z.object({
	uuid: z.string(),
	issue_date: z.string(),
	number: z.string(),
});
type OriginInvoiceType = z.infer<typeof originInvoiceSchema>;
