import { describe, it, expect } from 'vitest';
import { stringToTsVector } from '../misc';
import { getWhere } from '../where-builder';

describe('getWhere', () => {
	const mockRequest = (url: string): Request => new Request(url);

	it('should return empty object if parsing fails', () => {
		const request = mockRequest('https://example.com?invalidParam=value');
		const result = getWhere({ params: ['invoice'], request });
		expect(result).toEqual({});
	});

	it('should return where clause for invoice_type', () => {
		const request = mockRequest('https://example.com?invoice_type=cash');
		const result = getWhere({ params: ['invoice'], request });
		expect(result).toEqual({ type: 'cash' });
	});

	it('should return where clause for search', () => {
		const request = mockRequest('https://example.com?search=test');
		const result = getWhere({ params: ['invoice'], request });
		expect(result).toEqual({
			client: {
				OR: [
					{ name: { search: stringToTsVector('test') } },
					{ email: { search: stringToTsVector('test') } },
					{ idNumber: { equals: 'test' } },
				],
			},
		});
	});

	it('should return where clause for branchId', () => {
		const request = mockRequest('https://example.com?branchId=1');
		const result = getWhere({ params: ['invoice'], request });
		expect(result).toEqual({ subOrganizationId: 1 });
	});

	it('should return where clause for payment_method', () => {
		const request = mockRequest('https://example.com?payment_method=cash');
		const result = getWhere({ params: ['invoice'], request });
		expect(result).toEqual({
			paymentForms: { some: { type: 'cash' } },
		});
	});

	it('should return combined where clause', () => {
		const request = mockRequest(
			'https://example.com?invoice_type=loan&branchId=2&payment_method=card',
		);
		const result = getWhere({ params: ['invoice'], request });
		expect(result).toEqual({
			type: 'loan',
			subOrganizationId: 2,
			paymentForms: { some: { type: 'card' } },
		});
	});
});
