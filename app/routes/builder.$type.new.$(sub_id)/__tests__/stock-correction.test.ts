import { describe, expect, it } from 'vitest';
import { type Builder } from '../builder/schemas';
import { mapProductsWithStockCorrection } from '../misc';

type Products = Builder['products'];

describe('mapProductsWithStockCorrection', () => {
	it('should subtract origin quantities from product quantities where IDs match', () => {
		const products = [
			{ id: 1, quantity: 10 },
			{ id: 2, quantity: 5 },
		] as Products;
		const originProducts = [
			{ productId: 1, quantity: 3 },
			{ productId: 2, quantity: 2 },
		];

		const result = mapProductsWithStockCorrection(products, originProducts);
		expect(result).toEqual([
			{ id: 1, quantity: 7 },
			{ id: 2, quantity: 3 },
		]);
	});

	it('should handle products with no corresponding origin product', () => {
		const products = [
			{ id: 1, quantity: 10 },
			{ id: 3, quantity: 5 },
		] as Products;
		const originProducts = [{ productId: 1, quantity: 3 }];

		const result = mapProductsWithStockCorrection(products, originProducts);
		expect(result).toEqual([
			{ id: 1, quantity: 7 },
			{ id: 3, quantity: 5 },
		]);
	});

	it('should handle origin products with null productId', () => {
		const products = [
			{ id: 1, quantity: 10 },
			{ id: 2, quantity: 20 },
		] as Products;
		const originProducts = [
			{ productId: null, quantity: 5 },
			{ productId: 2, quantity: 10 },
		];

		const result = mapProductsWithStockCorrection(products, originProducts);
		expect(result).toEqual([
			{ id: 1, quantity: 10 },
			{ id: 2, quantity: 10 },
		]);
	});

	it('should handle empty products array', () => {
		const products = [] as Products;
		const originProducts = [{ productId: 1, quantity: 3 }];

		const result = mapProductsWithStockCorrection(products, originProducts);
		expect(result).toEqual([]);
	});

	it('should handle empty origin products array', () => {
		const products = [
			{ id: 1, quantity: 10 },
			{ id: 2, quantity: 20 },
		] as Products;
		const originProducts = [] as any;

		const result = mapProductsWithStockCorrection(products, originProducts);
		expect(result).toEqual([
			{ id: 1, quantity: 10 },
			{ id: 2, quantity: 20 },
		]);
	});
});
