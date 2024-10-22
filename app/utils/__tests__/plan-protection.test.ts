import { describe, it, expect } from 'vitest';
import { getIsInvalidPath } from '../plan-protection';

describe('getIsInvalidPath', () => {
	it('should return false for a valid path that is allowed', () => {
		expect(getIsInvalidPath('/home')).toBeFalsy();
	});

	it('should return true for a path that does not start with "/"', () => {
		expect(getIsInvalidPath('home')).toBeTruthy();
	});

	it('should return true for a path that is not allowed', () => {
		expect(getIsInvalidPath('/unauthorized')).toBeTruthy();
	});

	it('should return false for a path that starts with an allowed path but has additional segments', () => {
		expect(getIsInvalidPath('/products/123')).toBeFalsy();
		expect(getIsInvalidPath('/api/invoices/pos/new')).toBeFalsy();
	});

	it('should return false for "/builder/pos/new/12" as it starts with an allowed path', () => {
		expect(getIsInvalidPath('/builder/pos/new/12')).toBeFalsy();
	});

	it('should return false for "/builder/pos/" as it exactly matches an allowed path', () => {
		expect(getIsInvalidPath('/builder/pos/')).toBeFalsy();
	});

	it('should return true for a path that closely resembles an allowed path but is not a match', () => {
		expect(getIsInvalidPath('/builder/post/new/12')).toBeTruthy();
	});

	it('should return true for "/builder" as it is not in the list of allowed paths', () => {
		expect(getIsInvalidPath('/builder')).toBeTruthy();
	});

	it('should return false for a longer path that starts with "/builder/pos/" and has additional segments', () => {
		expect(getIsInvalidPath('/builder/pos/new/12/details')).toBeFalsy();
	});
});
