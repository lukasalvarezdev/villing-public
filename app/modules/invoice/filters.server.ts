import { type Resolution } from '@prisma/client';
import { z } from 'zod';
import { formatDate, getSearchParamsWithDefaultDateRange } from '~/utils/misc';
import { queryBuilder } from '~/utils/query-builder.server';

export function getInvoiceFilters(request: Request) {
	const searchParams = getSearchParamsWithDefaultDateRange(request);
	const search = searchParams.get('search');
	const number = parseInt(search || '');

	if (!isNaN(number)) {
		searchParams.delete('search');
		searchParams.set('internalId', `${number}`);
	}

	const { OR: baseOr, ...where } = queryBuilder(searchParams, [
		'createdAt',
		'subOrganizationId',
		'internalId',
		'name',
	]);

	let OR = undefined as
		| Array<{ client?: { name: { search: string } } }>
		| Array<{ products: { some: { name: { search: string } } } }>
		| undefined;

	if (baseOr?.length && baseOr[0]) {
		OR = [];
		OR[0] = { client: baseOr[0] };
		OR[1] = { products: { some: baseOr[0] } };
	}

	return { ...where, OR };
}

export function getPurchaseFilters(request: Request) {
	const { OR: baseOr, ...where } = getInvoiceFilters(request);
	const base = baseOr?.[0];

	let OR = undefined as
		| Array<{ supplier?: { name: { search: string } } }>
		| Array<{ products: { some: { name: { search: string } } } }>
		| undefined;

	if (baseOr?.length && base) {
		OR = [];
		if ('client' in base) OR[0] = { supplier: base.client };
		if ('products' in base) OR[1] = base;
	}

	return { ...where, OR };
}

export function getFindActiveResolutionArgs(
	orgId: number,
	type?: 'posInvoice' | 'legalInvoice',
) {
	return {
		where: {
			organizationId: orgId,
			type,
			deletedAt: null,
			toDate: { gte: new Date() },
		},
	} as const;
}

export function resolutionsMapper(resolutions: Array<Resolution>) {
	return resolutions
		.filter(r => {
			const hasNumerationEnded = r.count >= (r.to ?? 0);
			return !hasNumerationEnded;
		})
		.map(resolution => ({
			value: resolution.id,
			label: `${resolution.prefix} (${formatDate(
				resolution.fromDate!,
			)} - ${formatDate(resolution.toDate!)})`,
			type: resolution.type,
			enabledInDian: resolution.enabledInDian,
		}));
}

export function getStatusFilter(request: Request) {
	const searchParams = new URL(request.url).searchParams;
	const status = searchParams.get('status');
	const schema = z.enum(['paid', 'pending', 'expired']);
	const result = schema.safeParse(status);

	if (!result.success) return undefined;

	const { data } = result;
	switch (data) {
		case 'paid':
			return { type: 'loan', pending: 0 } as const;
		case 'pending':
			return { type: 'loan', pending: { not: 0 } } as const;
		case 'expired':
			return { type: 'loan', expiresAt: { lt: new Date() } } as const;
		default:
			break;
	}
}
