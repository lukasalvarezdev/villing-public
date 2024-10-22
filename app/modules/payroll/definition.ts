import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { addTax, compareStrings } from '~/utils/misc';
import { type ConfigType } from './payroll-schemas';

export const conceptTypeSchema = z.enum(['income', 'deduction']);
export type ConceptType = z.infer<typeof conceptTypeSchema>;
export type ConceptDefinition = {
	keyName: string;
	type: ConceptType;
	subType:
		| 'value'
		| 'valueFromDaysWorked'
		| 'quantity'
		| 'percentOfSalary'
		| 'layOff'
		| 'layOffInterests';
	required?: boolean;
	readOnly?: boolean;
	label?: string;
	multiplier?: number;
	getValueFromBaseSalary?: boolean;

	percentage: number; // Only active for subType: 'quantity' and 'percentOfSalary'

	valueOn30DaysWorked?: number; // Only active for subType: 'valueFromDaysWorked'
};
export type ConceptDefinitionSubType = ConceptDefinition['subType'];

export const conceptSchema = z.object({
	id: z.string(),
	keyName: z.string(),
	amount: z.number(),
	quantity: z.number(),
	customPercentage: z.number().optional().nullable(),
	type: conceptTypeSchema,
});

export type Concept = z.infer<typeof conceptSchema>;

export const definitions: ReadonlyArray<ConceptDefinition> = [
	{
		keyName: 'Salario',
		type: 'income',
		subType: 'value',
		percentage: 0,
		required: true,
	},
	{
		keyName: 'Auxilio de transporte',
		type: 'income',
		subType: 'valueFromDaysWorked',
		percentage: 0,
		valueOn30DaysWorked: 162_000,
		readOnly: true,
	},
	{
		keyName: 'Viaticos salariales',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Viaticos no salariales',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Horas diurnas extras (25%)',
		type: 'income',
		subType: 'quantity',
		percentage: 25,
		label: 'Horas trabajadas',
		readOnly: true,
	},
	{
		keyName: 'Horas nocturnas extras (75%)',
		type: 'income',
		subType: 'quantity',
		percentage: 75,
		label: 'Horas trabajadas',
		readOnly: true,
	},
	{
		keyName: 'Horas extras dominicales y festivas (100%)',
		type: 'income',
		subType: 'quantity',
		percentage: 100,
		label: 'Horas trabajadas',
		readOnly: true,
	},
	{
		keyName: 'Horas extras nocturnas dominicales y festivas (150%)',
		type: 'income',
		subType: 'quantity',
		percentage: 150,
		label: 'Horas trabajadas',
		readOnly: true,
	},
	{
		keyName: 'Horas recargos nocturnos (35%)',
		type: 'income',
		subType: 'quantity',
		percentage: 35,
		label: 'Horas trabajadas',
		readOnly: true,
	},
	{
		keyName: 'Horas de recargo dominicales y festivas (75%)',
		type: 'income',
		subType: 'quantity',
		percentage: 75,
		label: 'Horas trabajadas',
		readOnly: true,
	},
	{
		keyName: 'Horas de recargo nocturno dominicales y festivas (110%)',
		type: 'income',
		subType: 'quantity',
		percentage: 110,
		label: 'Horas trabajadas',
		readOnly: true,
	},
	{
		keyName: 'Vacaciones regulares',
		type: 'income',
		subType: 'quantity',
		percentage: 0,
		multiplier: 8, // 8 hours per day
		label: 'Días de vacaciones',
		readOnly: true,
		getValueFromBaseSalary: true,
	},
	{
		keyName: 'Vacaciones no tomadas',
		type: 'income',
		subType: 'quantity',
		percentage: 0,
		multiplier: 8, // 8 hours per day
		label: 'Días de vacaciones',
		readOnly: true,
		getValueFromBaseSalary: true,
	},
	{
		keyName: 'Prima',
		type: 'income',
		subType: 'percentOfSalary',
		percentage: 8.3333333,
		required: true,
		readOnly: true,
	},
	{
		keyName: 'Prima no salarial',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Cesantías',
		type: 'income',
		subType: 'layOff',
		percentage: 0,
		required: true,
		readOnly: true,
	},
	{
		keyName: 'Intereses a las cesantías',
		type: 'income',
		subType: 'layOffInterests',
		percentage: 0,
		required: true,
		readOnly: true,
	},
	{
		keyName: 'Incapacidad',
		type: 'income',
		subType: 'quantity',
		percentage: 100,
		label: 'Días de incapacidad',
		readOnly: true,
	},
	{
		keyName: 'Licencia de maternidad o paternidad',
		type: 'income',
		subType: 'quantity',
		percentage: 100,
		label: 'Días de licencia',
		readOnly: true,
	},
	{
		keyName: 'Licencia remunerada',
		type: 'income',
		subType: 'quantity',
		percentage: 100,
		label: 'Días de licencia',
		readOnly: true,
	},
	{
		keyName: 'Licencia no remunerada',
		type: 'income',
		subType: 'quantity',
		percentage: 0,
		label: 'Días de licencia',
		readOnly: true,
	},
	{
		keyName: 'Bonificación salarial',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Bonificación no salarial',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Auxilio salarial',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Auxilio no salarial',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Otro ingreso salarial',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Otro ingreso no salarial',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Compensación ordinaria',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Compensación extraordinaria',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Bono de alimentación',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Bono de alimentación no salarial',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Otros bonos',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Otros bonos no salariales',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Comisiones',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Pago a terceros',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Avances',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Dotación',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Apoyo de sostenimiento',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Teletrabajo',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Bonificación por retiro',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Indemnización por despido',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Reintegro',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Otros conceptos',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Otros conceptos no salariales',
		type: 'income',
		subType: 'value',
		percentage: 0,
	},

	// Deductions
	{
		keyName: 'Salud',
		type: 'deduction',
		subType: 'percentOfSalary',
		percentage: 4,
		required: true,
		readOnly: true,
	},
	{
		keyName: 'Pensión',
		type: 'deduction',
		subType: 'percentOfSalary',
		percentage: 4,
		required: true,
		readOnly: true,
	},
	{
		keyName: 'Fondo de seguridad pensional',
		type: 'deduction',
		subType: 'percentOfSalary',
		percentage: 1,
		readOnly: true,
	},
	{
		keyName: 'Sindicato',
		type: 'deduction',
		subType: 'percentOfSalary',
		percentage: 0,
	},
	{
		keyName: 'Sanción pública',
		type: 'deduction',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Sanción privada',
		type: 'deduction',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Libranza',
		type: 'deduction',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Pago a terceros',
		type: 'deduction',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Anticipos',
		type: 'deduction',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Otras deducciones',
		type: 'deduction',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Pensión voluntaria',
		type: 'deduction',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Retención en la fuente',
		type: 'deduction',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'AFC',
		type: 'deduction',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Cooperativa',
		type: 'deduction',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Embargo fiscal',
		type: 'deduction',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Plan complementario',
		type: 'deduction',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Educación',
		type: 'deduction',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Reintegro',
		type: 'deduction',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Pago de deudas',
		type: 'deduction',
		subType: 'value',
		percentage: 0,
	},
	{
		keyName: 'Fondo de subsistencia',
		type: 'deduction',
		subType: 'value',
		percentage: 0,
	},
];

export const incomeDefinitions = definitions.filter(d => d.type === 'income');
export const deductionDefinitions = definitions.filter(
	d => d.type === 'deduction',
);
export const mandatoryDefinitions = definitions.filter(d => d.required);

type CalculatorArgs = ConceptDefinition & {
	baseSalary: number;
	salary: number;
	quantity: number;
};

export const subTypeCalculators = {
	quantity: ({
		baseSalary,
		percentage,
		multiplier,
		quantity,
	}: CalculatorArgs) => {
		const baseHourlyWage = baseSalary / 240;
		const hourlyWage = addTax(baseHourlyWage, percentage);
		return hourlyWage * quantity * (multiplier || 1);
	},
	percentOfSalary: ({ salary, percentage }: CalculatorArgs) => {
		return salary * (percentage / 100);
	},
	layOff: ({ baseSalary, quantity }: CalculatorArgs) => {
		return (baseSalary * quantity) / 360;
	},
	layOffInterests: ({ baseSalary, quantity }: CalculatorArgs) => {
		const layoffValue = (baseSalary * quantity) / 360;
		const denominator = layoffValue * 0.12 * quantity;

		if (!denominator) return 0;

		return denominator / 360;
	},
};

export function getDefaultIncomes({
	salary,
	daysWorked,
	baseSalary,
	hasTransportAid,
}: {
	salary: number;
	daysWorked: number;
	baseSalary: number;
	hasTransportAid: boolean;
}): Array<Concept> {
	const concepts = incomeDefinitions
		.filter(d => d.required)
		.map(definition => {
			let amount = 0;
			let quantity = 0;

			if (compareStrings(definition.keyName, 'salario')) {
				amount = salary;
			}

			return {
				id: uuid(),
				keyName: definition.keyName,
				amount,
				quantity,
				type: definition.type,
			};
		});

	if (hasTransportAid) {
		const transportAid = incomeDefinitions.find(d =>
			compareStrings(d.keyName, 'Auxilio de transporte'),
		);

		if (transportAid) {
			const amount = getPortionValueFromFullValueByDaysWorked(
				transportAid.valueOn30DaysWorked || 0,
				daysWorked,
			);

			concepts.push({
				id: uuid(),
				keyName: transportAid.keyName,
				amount,
				quantity: daysWorked,
				type: transportAid.type,
			});
		}
	}

	return adjustConceptsToBaseSalary({
		baseSalary,
		concepts,
		daysWorked,
		salary,
	});
}

export function getDefaultDeductions(salary: number): Array<Concept> {
	return deductionDefinitions
		.filter(d => d.required)
		.map(d => {
			const amount = d.percentage ? (salary * d.percentage) / 100 : 0;
			return {
				id: uuid(),
				keyName: d.keyName,
				amount,
				quantity: 0,
				type: d.type,
			};
		});
}

export function adjustConceptsToBaseSalary({
	baseSalary,
	concepts,
	daysWorked,
	salary,
}: {
	concepts: Array<Concept>;
	baseSalary: number;
	daysWorked: number;
	salary: number;
}): Array<Concept> {
	return concepts.map(c => {
		const definition = definitions.find(d =>
			compareStrings(d.keyName, c.keyName),
		);
		if (!definition) return c;

		let amount = c.amount;
		let quantity = c.quantity;

		if (definition.subType === 'percentOfSalary') {
			amount = subTypeCalculators.percentOfSalary({
				...definition,
				baseSalary,
				salary,
				quantity,
			});
		}

		switch (definition.keyName) {
			case 'Salario': {
				amount = salary;
				break;
			}
			case 'Cesantías': {
				quantity = daysWorked;
				amount = subTypeCalculators.layOff({
					...definition,
					salary,
					baseSalary,
					quantity,
				});
				break;
			}
			case 'Intereses a las cesantías': {
				amount = subTypeCalculators.layOffInterests({
					...definition,
					salary,
					baseSalary,
					quantity: daysWorked,
				});
				break;
			}
			default:
				break;
		}

		return { ...c, quantity, amount };
	});
}

export function getBaseSalaryFromSalaryPortionByFrequency(
	frequency: ConfigType['frequency'],
	salary: number,
): number {
	switch (frequency) {
		case 'Semanal':
			return salary * 4;
		case 'Decadal':
			return salary * 3;
		case 'Quincenal':
			return salary * 2;
		case 'Mensual':
			return salary;
		default:
			return 0;
	}
}

export function getBaseSalaryFromSalaryPortionByDaysWorked(
	salary: number,
	daysWorked: number,
): number {
	switch (daysWorked) {
		case 7:
			return salary * 4;
		case 10:
			return salary * 3;
		case 15:
			return salary * 2;
		case 30:
			return salary;
		default:
			return 0;
	}
}

export function getPortionValueFromFullValueByDaysWorked(
	value: number,
	daysWorked: number,
): number {
	switch (daysWorked) {
		case 7:
			return value / 4;
		case 10:
			return value / 3;
		case 15:
			return value / 2;
		case 30:
			return value;
		default:
			return 0;
	}
}
