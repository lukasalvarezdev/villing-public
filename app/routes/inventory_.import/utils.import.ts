import { read, utils } from 'xlsx';
import * as z from 'zod';

type ParserArgs<Z extends z.ZodSchema> = {
	json: Array<unknown>;
	schema: Z;
	mapper: Record<string, keyof z.infer<Z>>;
	groupMapper?: Record<string, string>;
	initialItemJsonValue: Record<string, any>;
};
export function parseCsv<Z extends z.ZodSchema>(args: ParserArgs<Z>) {
	const { json, schema, mapper, groupMapper, initialItemJsonValue } = args;

	const products = json.map(product => {
		const productJson = structuredClone(initialItemJsonValue);

		for (const [key, value] of Object.entries(product as Record<string, any>)) {
			const realKey = key?.trim().toLowerCase();
			const isGroupKey = realKey.includes(':');

			if (isGroupKey && groupMapper) {
				const [groupName, groupValue] = realKey.split(':');
				const groupKey = groupName?.trim().toLowerCase();
				const newValue = groupValue?.trimStart();

				if (groupKey && newValue) {
					const group = groupMapper[groupKey];

					if (group) {
						if (!productJson[group]) productJson[group] = [];

						productJson[group].push({
							name: newValue,
							value: parseIfNumber(String(value)),
						});
					}
				}
			} else {
				productJson[mapper[realKey] as string] = parseIfNumber(String(value));
			}
		}

		return productJson;
	});

	return z.array(schema).safeParse(products);
}

/**
 * Identifies if the value could be a number, and if so, parse it
 * @example
 * parseNumber('1,000') -> 1000
 * parseNumber('1.000') -> 1000
 * parseNumber('1,000.00') -> 1000
 * parseNumber('$1,000') -> 1000
 */
function parseIfNumber(value: string) {
	// Remove all "," "." and "$" characters
	const cleanedValue = value.replace(/[$,.]/g, '');

	if (!/^\d+(\.\d+)?$/.test(cleanedValue)) {
		return value;
	}

	const parsedValue = parseFloat(cleanedValue);
	return isNaN(parsedValue) ? value : parsedValue;
}

export function parseCsvFileToJSON(file: File) {
	return new Promise<{ data: Array<unknown>; headers: Array<string> }>(
		(resolve, reject) => {
			const reader = new FileReader();
			reader.onload = e => {
				if (!e.target) return reject('No file selected');
				const workbook = read(e.target.result, { type: 'binary' });
				const worksheet = workbook.Sheets[workbook.SheetNames[0] as string];
				const range = utils.decode_range(worksheet?.['!ref'] as string);
				const headers = [] as Array<string>;

				for (let C = range.s.c; C <= range.e.c; ++C) {
					const cellAddress = { c: C, r: range.s.r }; // Assuming headers are in the first row
					const cellRef = utils.encode_cell(cellAddress);
					const cell = worksheet?.[cellRef];
					if (cell) headers.push(cell.v);
				}

				resolve({
					data: utils.sheet_to_json(worksheet || [], {
						rawNumbers: false,
					}),
					headers,
				});
			};
			reader.onerror = e => reject(e);
			reader.readAsBinaryString(file);
		},
	);
}
