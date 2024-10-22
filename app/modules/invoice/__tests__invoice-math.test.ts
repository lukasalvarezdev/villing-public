import { expect, it, describe } from 'vitest';
import {
	calculateProductTotal,
	calculateProductsTotal,
	parseNumber,
	type MathProductType,
} from './invoice-math';

describe('invoice math', () => {
	describe('calculateProductTotal', () => {
		it('calculates totals for standard values', () => {
			const product: MathProductType = {
				price: 100,
				quantity: 2,
				tax: 19,
				discount: 10,
			};
			expect(
				calculateProductTotal(product, {
					retention: 0,
					taxIncluded: true,
				}),
			).toEqual({
				total: 183.19,
				subtotal: 168.07,
				totalTax: 31.93,
				totalDiscount: 16.81,
				totalRetention: 0,
			});
		});

		it('calculates totals for standard values with tax not included', () => {
			const product: MathProductType = {
				price: 100,
				quantity: 2,
				tax: 10,
				discount: 0,
			};
			expect(
				calculateProductTotal(product, {
					taxIncluded: false,
					retention: 0,
				}),
			).toEqual({
				total: 220,
				subtotal: 200,
				totalTax: 20,
				totalDiscount: 0,
				totalRetention: 0,
			});
		});

		// Zero Quantity
		it('handles zero quantity correctly', () => {
			const product: MathProductType = {
				price: 100,
				quantity: 0,
				tax: 10,
				discount: 0.05,
			};
			expect(
				calculateProductTotal(product, {
					retention: 0,
					taxIncluded: true,
				}),
			).toEqual({
				total: 0,
				subtotal: 0,
				totalTax: 0,
				totalDiscount: 0,
				totalRetention: 0,
			});
		});

		it('calculates correctly with high tax and discount rates', () => {
			const product: MathProductType = {
				price: 100,
				quantity: 1,
				tax: 90,
				discount: 90,
			};
			expect(
				calculateProductTotal(product, {
					retention: 0,
					taxIncluded: true,
				}),
			).toEqual({
				total: 52.63,
				subtotal: 52.63,
				totalTax: 47.37,
				totalDiscount: 47.37,
				totalRetention: 0,
			});
		});

		it('handles negative price or quantity', () => {
			const product: MathProductType = {
				price: -100,
				quantity: 2,
				tax: 19,
				discount: 10,
			};
			expect(
				calculateProductTotal(product, { retention: 0, taxIncluded: true }),
			).toEqual({
				total: -183.19,
				subtotal: -168.07,
				totalTax: -31.93,
				totalDiscount: -16.81,
				totalRetention: 0,
			});
		});

		it('rounds to two decimal places correctly', () => {
			const product: MathProductType = {
				price: 100.333,
				quantity: 3,
				tax: 12.3,
				discount: 5.333,
			};

			expect(
				calculateProductTotal(product, {
					retention: 0,
					taxIncluded: true,
				}),
			).toEqual({
				total: 286.71,
				subtotal: 268.03,
				totalTax: 32.97,
				totalDiscount: 14.29,
				totalRetention: 0,
			});
		});
	});

	describe('calculateProductsTotal', () => {
		it('handles an empty product array correctly', () => {
			expect(
				calculateProductsTotal([], { retention: 0, taxIncluded: true }),
			).toEqual({
				total: 0,
				subtotal: 0,
				totalTax: 0,
				totalDiscount: 0,
				totalRetention: 0,
				totalRefunds: 0,
			});
		});

		it('calculates the sum of multiple products correctly', () => {
			const products: Array<MathProductType> = [
				{ price: 100, quantity: 1, tax: 90, discount: 90 },
				{ price: 100.333, quantity: 3, tax: 12.3, discount: 5.333 },
			];

			expect(
				calculateProductsTotal(products, {
					retention: 0,
					taxIncluded: true,
				}),
			).toEqual({
				total: 286.71 + 52.63,
				subtotal: parseNumber(268.03 + 52.63),
				totalTax: 32.97 + 47.37,
				totalDiscount: 14.29 + 47.37,
				totalRetention: 0,
				totalRefunds: 0,
			});
		});
	});
});
