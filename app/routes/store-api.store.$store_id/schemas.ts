import * as z from 'zod';

export const getStoreByIdShema = z.object({
	store: z.object({
		id: z.string(),
		name: z.string(),
		title: z.string().optional(),
		subtitle: z.string().optional(),
		logoUrl: z.string().optional(),
		bannerUrl: z.string().optional(),
		brands: z.array(z.object({ id: z.number(), name: z.string() })),
		categories: z.array(z.object({ id: z.number(), name: z.string() })),
		number: z.string().optional(),
		aboutUs: z.string().optional(),
		email: z.string(),
		address: z.string(),
		primaryColor: z.string(),
		secondaryColor: z.string(),
	}),
});
export type GetStoreById = z.infer<typeof getStoreByIdShema>;

const productListSchema = z.object({
	id: z.number(),
	name: z.string(),
	price: z.number(),
	image: z.string().optional(),
});

export const getProductsSchema = z.object({
	products: z.array(productListSchema),
	lastPage: z.number(),
});
export type GetProducts = z.infer<typeof getProductsSchema>;

export const getProductSchema = productListSchema.omit({ image: true }).merge(
	z.object({
		description: z.string(),
		images: z.array(z.string()),
		relatedProducts: z.array(productListSchema),
		stock: z.number(),
		brand: z.string().optional(),
		category: z.string().optional(),
	}),
);
export type GetProduct = z.infer<typeof getProductSchema>;

export const cartSchema = z.array(
	z.object({
		id: z.number(),
		name: z.string(),
		price: z.number(),
		image: z.string().optional(),
		quantity: z.number(),
	}),
);

export const orderSchema = z.object({
	name: z.string({ required_error: 'El nombre es requerido' }),
	email: z
		.string({ required_error: 'El email es requerido' })
		.email({ message: 'El email no es válido' }),
	phone: z.string({ required_error: 'El teléfono es requerido' }),
	address: z.string({ required_error: 'La dirección es requerida' }),
	complement: z.string().optional(),
	department: z.string(),
	city: z.string(),
	notes: z.string().optional(),
	products: cartSchema,
});

const createOrderSchema = z.union([
	z.object({ error: z.string(), success: z.literal(false) }),
	z.object({ success: z.literal(true), created: z.boolean() }),
]);
export type CreateOrderType = z.infer<typeof createOrderSchema>;

export const getProductsImagesSchema = z.object({
	images: z.array(
		z.object({ productId: z.number(), image: z.string().optional() }),
	),
});
export type GetProductsImages = z.infer<typeof getProductsImagesSchema>;
