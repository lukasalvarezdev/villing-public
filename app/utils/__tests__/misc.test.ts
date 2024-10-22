import { describe, test, expect, it, vi, beforeEach } from 'vitest';
import { getMidnightExpirySeconds, getTo } from '../misc';

describe('getTo function', () => {
	test('should correctly handle a pathname and search parameters', () => {
		const result = getTo({ pathname: '/test', search: 'key=value' });
		expect(result).toBe('/test?key=value');
	});

	test('should not add a leading slash if missing in pathname', () => {
		const result = getTo({ pathname: 'test', search: 'key=value' });
		expect(result).toBe('test?key=value');
	});

	test('should correctly overwrite existing query parameters', () => {
		const result = getTo({
			pathname: '/test?existing=old',
			search: 'existing=new',
		});
		expect(result).toBe('/test?existing=new');
	});

	test('should handle empty search string', () => {
		const result = getTo({ pathname: '/test', search: '' });
		expect(result).toBe('/test?');
	});
});

describe('getMidnightExpirySeconds', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	it('should handle edge cases around midnight correctly', () => {
		const mockNow = new Date('2024-05-19T23:59:59Z');
		vi.setSystemTime(mockNow);

		const result = getMidnightExpirySeconds();

		expect(result).toBe(onePlus10Hours);
	});
});

const onePlus10Hours = 36001;
