import * as z from 'zod';
import {
	VillingOrganizationType,
	taxDetail,
	typeDocumentIdentification,
	typeLiability,
	typeOrganization,
	typeRegime,
} from '~/utils/enums';

export const organizationSchema = z.object({
	name: z.string({ required_error: 'El nombre es obligatorio' }),
	tradeName: z.string().optional(),
	email: z
		.string({ required_error: 'El correo es obligatorio' })
		.email({ message: 'Introduce un correo válido' }),
	tel: z.string({ required_error: 'El teléfono es obligatorio' }),
	phone: z.string().optional(),
	idNumber: z
		.string({
			required_error: 'El número de identificación es obligatorio',
		})
		.transform((val, ctx) => {
			const isNan = isNaN(Number(val));
			const isLength = val.length < 5;
			if (isNan || isLength) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						'El número de identificación es inválido, debe ser numérico y mayor a 5 dígitos',
					path: [],
				});
			}

			return val;
		}),
	address: z.string({ required_error: 'La dirección es obligatoria' }),
	typeDocumentIdentification: z.nativeEnum(typeDocumentIdentification, {
		errorMap: () => ({ message: 'El tipo de documento es obligatorio' }),
	}),
	typeOrganization: z.nativeEnum(typeOrganization, {
		errorMap: () => ({ message: 'El tipo de persona es obligatorio' }),
	}),
	typeLiability: z.nativeEnum(typeLiability, {
		errorMap: () => ({ message: 'El tipo de responsabilidad es obligatorio' }),
	}),
	typeRegime: z.nativeEnum(typeRegime, {
		errorMap: () => ({ message: 'El tipo de régimen es obligatorio' }),
	}),
	taxDetail: z.nativeEnum(taxDetail, {
		errorMap: () => ({ message: 'El detalle de impuestos es obligatorio' }),
	}),
	municipalityId: z.coerce.number({
		invalid_type_error: 'El municipio es obligatorio',
		required_error: 'El municipio es obligatorio',
	}),
	website: z.string().optional(),
	textInInvoice: z.string().optional(),
	type: z.nativeEnum(VillingOrganizationType),
	country: z.enum(['col', 'ven']),
});
export type CompanyType = z.infer<typeof organizationSchema>;

export const clientSchema = organizationSchema
	.pick({
		name: true,
		address: true,
		email: true,
		idNumber: true,
		taxDetail: true,
		tel: true,
		typeLiability: true,
		typeOrganization: true,
		typeRegime: true,
	})
	.extend({
		retention: z.number().optional(),
		priceListId: z.number().optional(),
		city: z.string().optional(),
		department: z.string().optional(),
	});

export const supplierSchema = organizationSchema
	.pick({
		name: true,
		address: true,
		email: true,
		idNumber: true,
		tel: true,
	})
	.extend({
		retention: z.number().optional(),
	});
