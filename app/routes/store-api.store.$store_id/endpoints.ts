import { parse } from '@conform-to/zod';
import * as z from 'zod';
import { getLastPage, getQueryPositionData } from '~/components/pagination';
import { scheduledOrderEmail } from '~/utils/admin.server';
import { __prisma, logError } from '~/utils/db.server';
import {
	getRequestSearchParams,
	invariantResponse,
	toNumber,
} from '~/utils/misc';
import { getFilePresignedUrlByKey } from '~/utils/misc.server';
import { queryBuilder } from '~/utils/query-builder.server';
import {
	type GetStoreById,
	type GetProducts,
	type GetProduct,
	orderSchema,
	type CreateOrderType,
	type GetProductsImages,
} from './schemas';

const dbClient = __prisma;

export async function getStoreById(id: string): Promise<GetStoreById> {
	const store = await dbClient.store.findFirst({
		where: { id },
		select: {
			id: true,
			name: true,
			bannerTitle: true,
			bannerSubtitle: true,
			logoObjectId: true,
			bannerObjectId: true,
			primaryColor: true,
			secondaryColor: true,
			whatsapp: true,
			stocksProductsBehavior: true,
			organization: {
				select: { Brand: true, Category: true, address: true, email: true },
			},
			subOrganization: {
				select: { address: true },
			},
		},
	});

	if (!store) throw new Error(`Store not found: ${id}`);

	const [logoUrl, bannerUrl] = await Promise.all([
		getFilePresignedUrlByKey(store.logoObjectId),
		getFilePresignedUrlByKey(store.bannerObjectId),
	]);

	return {
		store: {
			id: store.id,
			name: store.name,
			title: store.bannerTitle || store.name,
			subtitle: store.bannerSubtitle || undefined,
			logoUrl,
			bannerUrl,
			brands: store.organization.Brand.map(b => ({ id: b.id, name: b.name })),
			categories: store.organization.Category.map(c => ({
				id: c.id,
				name: c.name,
			})),
			address:
				store.subOrganization?.address || store.organization.address || '',
			email: store.organization.email,
			number: store.whatsapp,
			primaryColor: store.primaryColor || '',
			secondaryColor: store.secondaryColor || '',
		},
	};
}

export async function getProducts(
	storeId: string,
	request: Request,
): Promise<GetProducts> {
	const pagination = getQueryPositionData(request);

	const searchParams = getRequestSearchParams(request);
	const query = queryBuilder(searchParams, ['name', 'brandId', 'categoryId']);

	const [products, count] = await dbClient.$transaction(async tx => {
		const store = await tx.store.findFirstOrThrow({
			where: { id: storeId },
			select: {
				priceListId: true,
				subOrganizationId: true,
				stocksProductsBehavior: true,
			},
		});

		const priceListId = store.priceListId || 0;
		const branchId = store.subOrganizationId || 0;

		let [products, count] = await Promise.all([
			tx.product.findMany({
				where: { storeId, ...query },
				select: {
					id: true,
					name: true,
					price: true,
					imagesUrl: true,
					stocks: { where: { subOrgId: branchId }, select: { value: true } },
					prices: { where: { priceListId }, select: { value: true } },
				},
				...pagination,
			}),
			tx.product.count({ where: { storeId, ...query } }),
		]);

		if (store.stocksProductsBehavior === 'hide') {
			products = products.filter(p => toNumber(p.stocks[0]?.value) > 0);
		}

		return [products, count] as const;
	});

	return {
		products: products.map(p => ({
			id: p.id,
			name: p.name,
			image: p.imagesUrl[0],
			price: toNumber(p.prices[0]?.value),
			stock: toNumber(p.stocks[0]?.value),
		})),
		lastPage: getLastPage(pagination, count),
	};
}

export async function getProduct(
	storeId: string,
	productId: string,
): Promise<GetProduct> {
	const store = await dbClient.store.findFirstOrThrow({
		where: { id: storeId },
		select: {
			priceListId: true,
			subOrganizationId: true,
		},
	});

	const priceListId = store.priceListId || 0;
	const branchId = store.subOrganizationId || 0;

	const product = await dbClient.product.findFirst({
		where: { id: parseInt(productId), storeId },
		select: {
			id: true,
			name: true,
			description: true,
			imagesUrl: true,
			stocks: { select: { value: true }, where: { subOrgId: branchId } },
			prices: { select: { value: true }, where: { priceListId } },
			category: { select: { name: true } },
			brand: { select: { name: true } },
		},
	});

	invariantResponse(product, `Product not found: ${productId}`);

	const images = await Promise.allSettled(
		product.imagesUrl.map(i => getFilePresignedUrlByKey(i)),
	);

	product.imagesUrl.forEach((_, idx) => {
		const response = images[idx];

		if (response?.status === 'fulfilled' && response.value) {
			product.imagesUrl[idx] = response.value;
		}
	});

	return {
		id: product.id,
		name: product.name,
		description: product.description ?? '',
		images: product.imagesUrl,
		relatedProducts: [],
		price: toNumber(product.prices[0]?.value),
		stock: toNumber(product.stocks[0]?.value),
		brand: product.brand?.name,
		category: product.category?.name,
	};
}

export async function createOrder(
	storeId: string,
	request: Request,
): Promise<CreateOrderType> {
	const formData = await request.formData();

	const submission = parse(formData, { schema: orderSchema });

	if (!submission.value) {
		await logError({ error: submission.error, request });
		return { error: 'La órden es inválida', success: false };
	}

	const data = submission.value;
	const total = data.products.reduce((acc, p) => acc + p.price * p.quantity, 0);

	await dbClient.$transaction(async tx => {
		const {
			name: storeName,
			whatsapp,
			organization: { id: orgId, email: adminEmail },
		} = await tx.store.findFirstOrThrow({
			where: { id: storeId },
			select: {
				name: true,
				organization: { select: { id: true, email: true } },
				whatsapp: true,
			},
		});

		const [address, { ordersCount: internalId }, dbProducts] =
			await Promise.all([
				tx.address.create({
					data: {
						city: data.city,
						country: 'Colombia',
						state: data.department,
						street: data.address,
						complement: data.complement,
					},
				}),
				tx.counts.update({
					where: { id: orgId },
					data: { ordersCount: { increment: 1 } },
					select: { ordersCount: true },
				}),
				tx.product.findMany({
					where: {
						id: { in: data.products.map(p => p.id) },
						organizationId: orgId,
					},
					select: { id: true, price: true },
				}),
			]);

		const products = data.products.map(p => {
			const dbProduct = dbProducts.find(dp => dp.id === p.id);
			if (!dbProduct) throw new Error(`Product not found: ${p.id}`);
			return {
				productId: p.id,
				name: p.name,
				price: p.price,
				cost: dbProduct.price,
				quantity: p.quantity,
			};
		});

		const { id: orderId } = await tx.order.create({
			data: {
				storeId,
				internalId,
				addressId: address.id,
				clientName: data.name,
				clientMail: data.email,
				clientTel: data.phone,
				OrderProduct: { create: products },
				totalAmount: total,
			},
		});

		await scheduledOrderEmail({
			to: data.email,
			clientName: data.name,
			orderId,
			adminEmail,
			storeName,
			items: products.map(p => ({
				name: p.name,
				quantity: p.quantity,
				price: p.price,
			})),
			number: whatsapp || '',
		});
	});

	return { success: true, created: true };
}

export async function getProductsImages(
	storeId: string,
	request: Request,
): Promise<GetProductsImages> {
	const searchParams = getRequestSearchParams(request);
	const query = queryBuilder(searchParams, ['id']);

	const products = await dbClient.product.findMany({
		where: { storeId, ...query },
		select: { id: true, imagesUrl: true },
	});

	const images = products.map(p => ({
		productId: p.id,
		image: p.imagesUrl[0],
	}));

	const signedUrls = await Promise.allSettled(
		images.map(i => getFilePresignedUrlByKey(i.image)),
	);

	images.forEach((i, idx) => {
		const response = signedUrls[idx];

		if (response?.status === 'fulfilled') {
			i.image = response?.value;
		}
	});

	return { images };
}

export const proceduresSchema = z.enum([
	'getStoreById',
	'getProducts',
	'getProduct',
	'createOrder',
	'getProductsImages',
]);
export const procedures = {
	getStoreById,
	getProducts,
	getProduct,
	createOrder,
	getProductsImages,
};
