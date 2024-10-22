import { z } from 'zod';
import { errorLogger } from '~/utils/logger';
import { compareStrings, toNumber } from '~/utils/misc';
import {
	type Concept,
	conceptSchema,
	mandatoryDefinitions,
} from './definition';

type ParseResult = {
	errors: Array<string>;
	concepts: Array<Concept>;
	salary: number;
};
export function parseConcepts(formData: URLSearchParams): ParseResult {
	try {
		const result = conceptsSchema.safeParse(
			JSON.parse(formData.get('concepts') as string),
		);

		if (!result.success) {
			return { errors: getZodErrors(result.error), concepts: [], salary: 0 };
		}

		const salary = toNumber(
			result.data.find(c => compareStrings(c.keyName, 'salario')),
		);
		return { errors: [], concepts: result.data, salary };
	} catch (error) {
		const referenceId = errorLogger({ error, path: 'parseConcepts' });

		return {
			errors: [`Ha ocurrido un error inesperado. Ref: ${referenceId}`],
			concepts: [],
			salary: 0,
		};
	}

	function getZodErrors(error: z.ZodError) {
		const fieldErrors = error.flatten().fieldErrors;
		if ('concepts' in fieldErrors) {
			const errors = fieldErrors['concepts'] as Array<string>;
			return errors;
		}

		return [];
	}
}

const conceptsSchema = z.array(conceptSchema).transform((concepts, ctx) => {
	const mandatoryConcepts = mandatoryDefinitions.map(def => {
		const concept = concepts.find(c => c.keyName === def.keyName);
		if (!concept) {
			ctx.addIssue({
				code: 'custom',
				message: `El concepto "${def.keyName.toLowerCase()}" es obligatorio`,
				path: ['concepts'],
			});
		}
		return concept;
	});

	if (mandatoryConcepts.some(c => !c)) {
		return z.NEVER;
	}

	const vacations = concepts.find(c =>
		compareStrings(c.keyName, 'vacaciones regulares'),
	);

	// if quantity is not an integer, return an error
	if (vacations && vacations.quantity % 1 !== 0) {
		ctx.addIssue({
			code: 'custom',
			message: 'Las vacaciones deben ser un número entero',
			path: ['concepts'],
		});
		return z.NEVER;
	}

	// make sure there are no repeated concepts
	const repeatedConcepts = concepts.filter(
		(c, i) => concepts.findIndex(c2 => c2.keyName === c.keyName) !== i,
	);

	if (repeatedConcepts.length > 0) {
		ctx.addIssue({
			code: 'custom',
			message: 'No pueden haber conceptos repetidos',
			path: ['concepts'],
		});
		return z.NEVER;
	}

	return concepts;
});
