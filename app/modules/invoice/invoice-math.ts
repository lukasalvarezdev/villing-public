import { toNumber } from '~/utils/misc';

export type MathProductType = {
	price: number;
	quantity: number;
	tax: number;
	discount: number;
} & Record<string, any>;
type Config = { taxIncluded: boolean; retention: number };

export function calculateProductTotal(
	product: MathProductType,
	config: Config,
) {
	const totalAmount = parseNumber(product.price * product.quantity);
	const totalTax = config.taxIncluded
		? parseNumber(getIncludedPercentageValue(totalAmount, product.tax))
		: parseNumber(getPercentageValue(totalAmount, product.tax));

	const taxToSubtract = parseNumber(config?.taxIncluded ? totalTax : 0);
	const totalMinusTax = parseNumber(totalAmount - taxToSubtract);
	const baseValueForDiscount = totalMinusTax;

	const totalDiscount = parseNumber(
		getPercentageValue(baseValueForDiscount, product.discount),
	);
	const totalRetention = parseNumber(
		getPercentageValue(totalMinusTax, config?.retention || 0),
	);
	const subtotal = parseNumber(totalMinusTax - totalRetention);
	const total = parseNumber(subtotal + totalTax - totalDiscount);

	return { total, subtotal, totalTax, totalDiscount, totalRetention };
}

export function calculateProductsTotal(
	products: Array<MathProductType>,
	config: Config,
) {
	const totals = products.reduce(
		(acc, product) => {
			const productTotals = calculateProductTotal(product, config);
			acc.total += productTotals.total;
			acc.subtotal += productTotals.subtotal;
			acc.totalTax += productTotals.totalTax;
			acc.totalDiscount += productTotals.totalDiscount;
			acc.totalRetention += productTotals.totalRetention;

			if (product.quantity < 0) {
				acc.totalRefunds += productTotals.total;
			}
			return acc;
		},
		{
			total: 0,
			subtotal: 0,
			totalTax: 0,
			totalDiscount: 0,
			totalRetention: 0,
			totalRefunds: 0,
		},
	);

	return {
		total: parseNumber(totals.total),
		subtotal: parseNumber(totals.subtotal),
		totalTax: parseNumber(totals.totalTax),
		totalDiscount: parseNumber(totals.totalDiscount),
		totalRetention: parseNumber(totals.totalRetention),
		totalRefunds: parseNumber(totals.totalRefunds),
	};
}
export type MathTotalsType = ReturnType<typeof calculateProductsTotal>;

export function parseNumber(value: number) {
	return parseFloat(value.toFixed(2));
}

function getPercentageValue(number: number, percentage: number) {
	return number * (percentage / 100);
}

function getIncludedPercentageValue(number: number, percentage: number) {
	const numberWithoutDecimal = parseInt(percentage.toString().replace('.', ''));

	return number - number / Number(`1.${numberWithoutDecimal}`);
}

export function removePercentage(number: number, percentage: number) {
	return number - getIncludedPercentageValue(number, percentage);
}

export function getFloatParts(value: number) {
	const [integer, decimal] = value.toFixed(2).split('.');
	return { integer: toNumber(integer), decimal };
}

export function roundNumber(num: number) {
	return Math.round((num + Number.EPSILON) * 100) / 100;
}
