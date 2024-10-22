/* Math utils */

export function getPriceMinusTax({
	price,
	tax,
}: {
	price: number;
	tax: number;
}) {
	return price / Number(`1.${tax}`);
}

export function getPercentageValue(number: number, tax: number) {
	return number * (tax / 100);
}

export function getIncludedPercentageValue(number: number, tax: number) {
	return number - number / Number(`1.${tax}`);
}
