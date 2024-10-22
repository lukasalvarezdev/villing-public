import { faker } from '@faker-js/faker';
import { calculateProductsTotal } from '~/modules/invoice/invoice-math';
import { __prisma } from '~/utils/db.server';
import { invariant } from '~/utils/misc';
import { type setupUser } from './setup-user';

export const password = 'Password123!';

export async function createProduct(orgId: number) {
	const [priceLists, branches] = await __prisma.$transaction([
		__prisma.priceList.findMany({
			where: { organizationId: orgId },
		}),
		__prisma.subOrganization.findMany({
			where: { organizationId: orgId },
		}),
	]);

	return __prisma.product.create({
		data: {
			internalId: faker.number.int({ max: 100 }),
			organizationId: orgId,

			tax: 19,
			name: faker.commerce.productName(),
			price: faker.number.int({ max: 1000 }),

			barCodes: { set: [getBarcode()] },
			prices: { createMany: { data: mapPrices() } },
			stocks: { createMany: { data: mapStocks() } },
		},
		include: {
			prices: { include: { priceList: true } },
			stocks: { include: { subOrg: true } },
		},
	});

	function mapPrices() {
		return priceLists.map(priceList => ({
			value: faker.number.int({ max: 1000 }),
			priceListId: priceList.id,
			organizationId: orgId,
		}));
	}

	function mapStocks() {
		return branches.map(branch => ({
			value: faker.number.int({ max: 100 }),
			subOrgId: branch.id,
			organizationId: orgId,
		}));
	}
}

function getBarcode() {
	return faker.number.int({ max: 20000000, min: 10000000 }).toString();
}

/**
 * Seeds the database with two products and returns an InvoiceProduct tuple
 * @param orgId
 * @returns
 */
export async function getProductsData(orgId: number) {
	const [product1, product2] = (
		await Promise.all([createProduct(orgId), createProduct(orgId)])
	).map(({ price, ...product }) => {
		return [] as any;
	});

	invariant(product1 && product2, 'Products not found');

	return [product1, product2] as [typeof product1, typeof product2];
}

type SeedProps = Awaited<ReturnType<typeof setupUser>>;
export async function createPos(props: SeedProps) {
	const { orgId } = props;
	const products = await getProductsData(orgId);
	const totals = calculateProductsTotal(products, {
		retention: 0,
		taxIncluded: true,
	});

	const { supplierId, ...data } = getRelationsData(props);
	await __prisma.legalPosInvoice.create({
		data: {
			internalId: 1,
			total: totals.total,
			totalTax: totals.totalTax,
			totalDiscount: totals.totalDiscount,
			products: { create: mapProducts(products) },
			...data,
		},
	});

	return {
		total: totals.total,
		client: props.client.name,
	};
}

export async function createRemisionInvoice(props: SeedProps) {
	const { orgId } = props;
	const products = await getProductsData(orgId);
	const totals = calculateProductsTotal(products, {
		retention: 0,
		taxIncluded: true,
	});

	const { cashierId, resolutionId, supplierId, ...data } =
		getRelationsData(props);
	await __prisma.legalInvoiceRemision.create({
		data: {
			internalId: 1,
			subtotal: totals.subtotal,
			totalTax: totals.totalTax,
			totalDiscount: totals.totalDiscount,
			products: { create: mapProducts(products) },
			...data,
		},
	});

	return {
		total: totals.total,
		client: props.client.name,
	};
}

export async function createPurchase(props: SeedProps) {
	const { orgId } = props;
	const products = await getProductsData(orgId);
	const totals = calculateProductsTotal(products, {
		retention: 0,
		taxIncluded: true,
	});

	const { cashierId, resolutionId, clientId, ...data } =
		getRelationsData(props);
	await __prisma.purchase.create({
		data: {
			internalId: 1,
			total: totals.subtotal,
			totalTax: totals.totalTax,
			totalDiscount: totals.totalDiscount,
			products: { create: mapProducts(products) },
			...data,
		},
	});

	return {
		total: totals.total,
		supplier: props.supplier.name,
	};
}

export async function createPurchaseRemision(props: SeedProps) {
	const { orgId } = props;
	const products = await getProductsData(orgId);
	const totals = calculateProductsTotal(products, {
		retention: 0,
		taxIncluded: true,
	});

	const { cashierId, resolutionId, clientId, ...data } =
		getRelationsData(props);
	await __prisma.purchaseRemision.create({
		data: {
			internalId: 1,
			total: totals.subtotal,
			totalTax: totals.totalTax,
			totalDiscount: totals.totalDiscount,
			externalInvoiceId: '',
			products: { create: mapProducts(products) },
			...data,
		},
	});

	return {
		total: totals.total,
		supplier: props.supplier.name,
	};
}

export async function createPurchaseInvoice(props: SeedProps) {
	const { orgId } = props;
	const products = await getProductsData(orgId);
	const totals = calculateProductsTotal(products, {
		retention: 0,
		taxIncluded: true,
	});

	const { cashierId, resolutionId, clientId, ...data } =
		getRelationsData(props);
	await __prisma.purchaseInvoice.create({
		data: {
			internalId: 1,
			total: totals.subtotal,
			totalTax: totals.totalTax,
			totalDiscount: totals.totalDiscount,
			externalInvoiceId: '',
			products: { create: mapProducts(products) },
			...data,
		},
	});

	return {
		total: totals.total,
		supplier: props.supplier.name,
	};
}

function mapProducts(products: Awaited<ReturnType<typeof getProductsData>>) {
	return products.map(p => ({
		productId: p.id,
		name: p.name,
		quantity: p.quantity,
		price: p.price,
		cost: p.cost,
		discount: p.discount,
		tax: p.tax,
	}));
}

function getRelationsData(props: SeedProps) {
	const {
		client,
		branchId,
		orgId,
		resolutionId,
		user: { id: userId },
		cashier,
		supplier,
	} = props;

	return {
		cashierId: cashier.id,
		clientId: client.id,
		subOrganizationId: branchId,
		organizationId: orgId,
		resolutionId: resolutionId,
		userId,
		supplierId: supplier.id,
	};
}
