import * as z from 'zod';
import { currencyTransformer } from '~/components/form-utils';

export const employeeSchema = z.object({
	name: z.string({
		required_error: 'El nombre es requerido',
	}),
	surname: z.string({
		required_error: 'El apellido es requerido',
	}),
	idType: z.string(),
	idNumber: z.string({
		required_error: 'El número de identificación es requerido',
	}),
	city: z.string({
		required_error: 'El municipio es requerido',
	}),
	address: z.string({
		required_error: 'La dirección es requerida',
	}),
	email: z.string().email().optional(),

	jobTitle: z.string({
		required_error: 'El cargo es requerido',
	}),
	salary: z.string().transform(currencyTransformer),
	isIntegralSalary: z.boolean().default(false),
	typeContract: z.string(),
	startDate: z.date({
		required_error: 'La fecha de contratación es requerida',
		invalid_type_error: 'La fecha de contratación es inválida',
	}),
	typeEmployee: z.string({
		required_error: 'El tipo de trabajador es requerido',
	}),
	hasPension: z.boolean().default(false),
	hasTransportHelp: z.boolean().default(false),
	isHighRisk: z.boolean().default(false),

	paymentMethod: z.string({
		required_error: 'El método de pago es requerido',
	}),
	bank: z.string().optional(),
	accountType: z.string().optional(),
	accountNumber: z.string().optional(),

	eps: z.string({
		required_error: 'La EPS es requerida',
	}),
	compensationFund: z.string({
		required_error: 'La caja de compensación es requerida',
	}),
	pensionFund: z.string({
		required_error: 'El fondo de pensiones es requerido',
	}),
	redundancyFund: z.string({
		required_error: 'El fondo de cesantías es requerido',
	}),
});
export type EmployeeType = z.infer<typeof employeeSchema>;

export const frequencySchema = z.enum([
	'Semanal',
	'Decadal',
	'Quincenal',
	'Mensual',
]);
export const monthSchema = z.enum([
	'Enero',
	'Febrero',
	'Marzo',
	'Abril',
	'Mayo',
	'Junio',
	'Julio',
	'Agosto',
	'Septiembre',
	'Octubre',
	'Noviembre',
	'Diciembre',
]);
export const configSchema = z.object({
	month: monthSchema,
	frequency: frequencySchema,
	period: z.coerce.number().max(4),
});
export type ConfigType = z.infer<typeof configSchema>;
export type PeriodFrequency = ConfigType['frequency'];
