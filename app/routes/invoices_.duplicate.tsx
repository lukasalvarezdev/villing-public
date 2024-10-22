import { type LoaderFunctionArgs } from '@remix-run/node';
import { type ClientLoaderFunctionArgs, redirect } from '@remix-run/react';
import * as z from 'zod';
import { RouteErrorBoundary } from '~/components/error-boundary';
import { PageWrapper } from '~/components/ui-library';
import {
	calculateProductsTotal,
	parseNumber,
} from '~/modules/invoice/invoice-math';
import {
	invoiceSessionSchemas,
	type InvoiceSessionSchema,
} from '~/modules/invoice/invoice-modules';
import {
	setElectronicInvoice,
	setPosInvoice,
	setRemisionInvoice,
	setPurchase,
	setPurchaseRemision,
	setPurchaseInvoice,
	setCreditNote,
	setDebitNote,
	setStockSetting,
} from '~/modules/invoice/invoice-session';
import { type PrismaClient, getOrgDbClient } from '~/utils/db.server';
import { getPercentageValue } from '~/utils/math';
import {
	type MakeNullableFieldsOptional,
	cn,
	getRequestSearchParams,
	invariant,
	addTax,
	toNumber,
	addTaxToPrice,
} from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';
import { defaultConfig } from './builder.$type.new.$(sub_id)/builder/context';
import {
	type Builder,
	builderSchema,
	type ProductType,
} from './builder.$type.new.$(sub_id)/builder/schemas';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request, '/invoices');

	const searchParams = getRequestSearchParams(request);
	const result = duplicateSchema.safeParse(Object.fromEntries(searchParams));

	if (!result.success) {
		throw new Response("Invalid 'searchParams' query", {
			status: 400,
		});
	}
	const { id, origin, destination } = result.data;
	const { db, orgId } = await getOrgDbClient(request);
	const { id: firstPriceListId } = await db.priceList.findFirstOrThrow({
		where: { organizationId: orgId },
		select: { id: true },
	});
	const invoice = await getDuplicator(db, orgId, id, firstPriceListId)[
		origin
	]();

	return { invoice, destination, origin };
}

export async function clientLoader({
	serverLoader,
	request,
}: ClientLoaderFunctionArgs) {
	const { invoice, destination, origin } = await serverLoader<typeof loader>();
	const searchParams = getRequestSearchParams(request);

	switch (destination) {
		case 'stockSetting': {
			await setStockSetting(builderSchema.parse(invoice));
			return redirect(`/builder/stockSetting/new`);
		}
		case 'legalInvoice': {
			await setElectronicInvoice(builderSchema.parse(invoice));
			return redirect(`/builder/electronic/new`);
		}
		case 'legalInvoiceRemision': {
			await setRemisionInvoice(builderSchema.parse(invoice));
			return redirect(`/builder/remision/new`);
		}
		case 'legalPosInvoice': {
			await setPosInvoice(builderSchema.parse(invoice));
			return redirect(`/builder/pos/new/${invoice.subId}`);
		}
		case 'purchase': {
			await setPurchase(builderSchema.parse(invoice));
			return redirect(`/builder/purchase/new`);
		}
		case 'purchaseRemision': {
			const purchaseId = searchParams.get('id');
			if (!purchaseId) throw new Error('Missing purchaseId');

			const newSearchParams = new URLSearchParams();

			if (origin === 'purchase') {
				newSearchParams.set('origin_purchase', purchaseId);
			}

			await setPurchaseRemision(builderSchema.parse(invoice));
			return redirect(
				`/builder/purchaseRemision/new?${newSearchParams.toString()}`,
			);
		}
		case 'purchaseInvoice': {
			const id = searchParams.get('id');
			if (!id) {
				throw new Error('Missing origin_purchase or origin_purchase_remision');
			}

			const newSearchParams = new URLSearchParams();

			if (origin === 'purchase') newSearchParams.set('origin_purchase', id);
			if (origin === 'purchaseRemision') {
				newSearchParams.set('origin_purchase_remision', id);
			}

			await setPurchaseInvoice(builderSchema.parse(invoice));
			return redirect(
				`/builder/purchaseInvoice/new?${newSearchParams.toString()}`,
			);
		}
		case 'creditNote': {
			const invoiceId = searchParams.get('id');
			if (!invoiceId) throw new Error('Missing invoiceId');

			await setCreditNote(builderSchema.parse(invoice));

			return redirect(`/builder/creditNote/new?origin_invoice=${invoiceId}`);
		}
		case 'debitNote': {
			const invoiceId = searchParams.get('id');
			if (!invoiceId) throw new Error('Missing invoiceId');

			await setDebitNote(builderSchema.parse(invoice));

			return redirect(`/builder/debitNote/new?origin_invoice=${invoiceId}`);
		}
		default:
			invariant(false, `Invalid destination: ${destination}`);
	}
}
clientLoader.hydrate = true;

export default function HydrateFallback() {
	return (
		<PageWrapper>
			<div className="flex items-center justify-center h-screen -mt-[calc(60px+4rem)] w-full flex-col gap-8">
				<div className="lds-ring">
					<div></div>
					<div></div>
					<div></div>
					<div></div>
				</div>

				<p
					className={cn(
						'loadingButton animated-background',
						'py-3 px-8 rounded-md text-white font-bold text-lg',
					)}
				>
					Estamos duplicando tu factura
				</p>
			</div>
		</PageWrapper>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con la duplicación. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}

const duplicateSchema = z.object({
	id: z.coerce.number(),
	origin: invoiceSessionSchemas,
	destination: invoiceSessionSchemas,
});

function getDuplicator(
	db: PrismaClient,
	orgId: number,
	id: number,
	firstPriceListId: number,
): Record<InvoiceSessionSchema, () => Promise<Builder>> {
	return {
		legalPosInvoice: async () => {
			const invoice = await db.legalPosInvoice.findFirstOrThrow({
				where: { id, organizationId: orgId },
				include: {
					products: productsInclude,
					client: true,
					subOrganization: { select: { defaultPriceListId: true } },
				},
			});

			return {
				products: parseInvoiceProducts(invoice.products),
				subId: invoice.subOrganizationId,
				paymentForms: [{ id: 1, amount: invoice.total, type: 'cash' }],
				totalCollected: 0,
				client: { id: invoice.client.id, name: invoice.client.name },
				resolutionId: invoice.resolutionId,
				shouldPrint: true,
				priceListId:
					invoice.subOrganization.defaultPriceListId || firstPriceListId,
				notes: invoice.notes || '',
				config: defaultConfig,
			};
		},
		legalInvoice: async () => {
			const invoice = await db.legalInvoice.findFirstOrThrow({
				where: { id, organizationId: orgId },
				include: {
					products: productsInclude,
					client: true,
					subOrganization: { select: { defaultPriceListId: true } },
				},
			});

			const { total } = calculateProductsTotal(invoice.products, {
				taxIncluded: invoice.isTaxIncluded,
				retention: 0,
			});

			return {
				products: parseInvoiceProducts(invoice.products),
				subId: invoice.subOrganizationId,
				paymentForms: [{ id: 1, amount: total, type: 'cash' }],
				totalCollected: 0,
				currency: 'COP',
				client: { id: invoice.client.id, name: invoice.client.name },
				resolutionId: invoice.resolutionId,
				shouldPrint: true,
				priceListId:
					invoice.subOrganization.defaultPriceListId || firstPriceListId,
				notes: invoice.notes || '',
				config: defaultConfig,
			};
		},
		creditNote: async () => {
			const creditNote = await db.creditNote.findFirstOrThrow({
				where: { id, organizationId: orgId },
				include: {
					products: productsInclude,
					invoice: {
						select: {
							client: true,
							subOrganizationId: true,
							resolutionId: true,
							subOrganization: { select: { defaultPriceListId: true } },
						},
					},
				},
			});

			const { total } = calculateProductsTotal(creditNote.products, {
				taxIncluded: creditNote.isTaxIncluded,
				retention: 0,
			});

			return {
				products: parseInvoiceProducts(creditNote.products),
				subId: creditNote.invoice.subOrganizationId,
				paymentForms: [{ id: 1, amount: total, type: 'cash' }],
				totalCollected: 0,
				currency: 'COP',
				client: {
					id: creditNote.invoice.client.id,
					name: creditNote.invoice.client.name,
				},
				resolutionId: creditNote.invoice.resolutionId,
				shouldPrint: true,
				priceListId:
					creditNote.invoice.subOrganization.defaultPriceListId ||
					firstPriceListId,
				notes: creditNote.notes || '',
				config: defaultConfig,
			};
		},
		debitNote: async () => {
			const debitNote = await db.debitNote.findFirstOrThrow({
				where: { id, organizationId: orgId },
				include: {
					products: productsInclude,
					invoice: {
						select: {
							client: true,
							subOrganizationId: true,
							resolutionId: true,
							subOrganization: { select: { defaultPriceListId: true } },
						},
					},
				},
			});

			const { total } = calculateProductsTotal(debitNote.products, {
				taxIncluded: debitNote.isTaxIncluded,
				retention: 0,
			});

			return {
				products: parseInvoiceProducts(debitNote.products),
				subId: debitNote.invoice.subOrganizationId,
				paymentForms: [{ id: 1, amount: total, type: 'cash' }],
				totalCollected: 0,
				currency: 'COP',
				client: {
					id: debitNote.invoice.client.id,
					name: debitNote.invoice.client.name,
				},
				resolutionId: debitNote.invoice.resolutionId,
				shouldPrint: true,
				priceListId:
					debitNote.invoice.subOrganization.defaultPriceListId ||
					firstPriceListId,
				notes: debitNote.notes || '',
				config: defaultConfig,
			};
		},
		legalInvoiceRemision: async () => {
			const invoice = await db.legalInvoiceRemision.findFirstOrThrow({
				where: { id, organizationId: orgId },
				include: {
					products: productsInclude,
					client: true,
					subOrganization: { select: { defaultPriceListId: true } },
				},
			});

			const { total } = calculateProductsTotal(invoice.products, {
				taxIncluded: invoice.isTaxIncluded,
				retention: 0,
			});

			return {
				products: parseInvoiceProducts(invoice.products),
				subId: invoice.subOrganizationId,
				paymentForms: [{ id: 1, amount: total, type: 'cash' }],
				totalCollected: 0,
				currency: 'COP',
				client: { id: invoice.client.id, name: invoice.client.name },
				shouldPrint: true,
				priceListId:
					invoice.subOrganization.defaultPriceListId || firstPriceListId,
				notes: invoice.notes || '',
				config: defaultConfig,
			};
		},
		quote: async () => {
			const invoice = await db.quoteInvoice.findFirstOrThrow({
				where: { id, organizationId: orgId },
				include: {
					products: productsInclude,
					client: true,
					subOrganization: { select: { defaultPriceListId: true } },
				},
			});

			return {
				products: parseInvoiceProducts(invoice.products),
				subId: invoice.subOrganizationId,
				paymentForms: [{ id: 1, amount: invoice.total, type: 'cash' }],
				totalCollected: 0,
				currency: 'COP',
				client: { id: invoice.client.id, name: invoice.client.name },
				shouldPrint: true,
				priceListId:
					invoice.subOrganization.defaultPriceListId || firstPriceListId,
				notes: invoice.notes || '',
				config: defaultConfig,
			};
		},
		purchase: async () => {
			const invoice = await db.purchase.findFirstOrThrow({
				where: { id, organizationId: orgId },
				include: { products: productsInclude, supplier: true },
			});

			return {
				products: parseInvoiceProducts(invoice.products),
				subId: invoice.subOrganizationId,
				paymentForms: [{ id: 1, amount: invoice.total, type: 'cash' }],
				totalCollected: 0,
				currency: 'COP',
				supplier: { id: invoice.supplier.id, name: invoice.supplier.name },
				shouldPrint: true,
				priceListId: 0,
				notes: invoice.notes || '',
				config: { ...defaultConfig, retention: invoice.retention },
			};
		},
		purchaseRemision: async () => {
			const invoice = await db.purchaseRemision.findFirstOrThrow({
				where: { id, organizationId: orgId },
				include: {
					products: {
						include: {
							product: {
								include: {
									stocks: { include: { subOrg: true } },
									prices: { include: { priceList: true } },
								},
							},
						},
					},
					supplier: true,
				},
			});

			return {
				products: parseInvoiceProducts(invoice.products),
				subId: invoice.subOrganizationId,
				paymentForms: [{ id: 1, amount: invoice.total, type: 'cash' }],
				totalCollected: 0,
				currency: 'COP',
				externalInvoiceId: invoice.externalInvoiceId,
				receivedAt: invoice.receivedAt?.toString(),
				supplier: { id: invoice.supplier.id, name: invoice.supplier.name },
				shouldPrint: true,
				priceListId: 0,
				notes: invoice.notes || '',
				config: { ...defaultConfig, retention: invoice.retention },
			};
		},
		purchaseInvoice: async () => {
			const invoice = await db.purchaseInvoice.findFirstOrThrow({
				where: { id, organizationId: orgId },
				include: { products: productsInclude, supplier: true },
			});

			return {
				products: parseInvoiceProducts(invoice.products),
				subId: invoice.subOrganizationId,
				paymentForms: [{ id: 1, amount: invoice.total, type: 'cash' }],
				totalCollected: 0,
				currency: 'COP',
				externalInvoiceId: invoice.externalInvoiceId,
				receivedAt: invoice.receivedAt?.toString(),
				supplier: { id: invoice.supplier.id, name: invoice.supplier.name },
				shouldPrint: true,
				priceListId: 0,
				notes: invoice.notes || '',
				config: { ...defaultConfig, retention: invoice.retention },
			};
		},
		stockSetting: async () => {
			const setting = await db.inventorySetting.findFirstOrThrow({
				where: { id, organizationId: orgId },
				include: { products: productsInclude },
			});

			return {
				products: parseInvoiceProducts(
					setting.products.map(p => ({
						...p,
						tax: 0,
						discount: 0,
						price: 0,
						prices: [],
						stocks: [],
						barCodes: [],
						internalId: 0,
						cost: 0,
						oldStock: 0,
						newStock: 0,
					})),
				),
				subId: setting.subOrganizationId,
				paymentForms: [{ id: 1, amount: 0, type: 'cash' }],
				totalCollected: 0,
				currency: 'COP',
				client: undefined,
				shouldPrint: false,
				priceListId: 0,
				config: defaultConfig,
			};
		},
		order: async () => {
			const { OrderProduct: products, store } = await db.order.findFirstOrThrow(
				{
					where: { id, store: { organizationId: orgId } },
					include: {
						OrderProduct: productsInclude,
						store: {
							select: {
								subOrganization: {
									select: { defaultPriceListId: true, id: true },
								},
							},
						},
					},
				},
			);
			const total = products.reduce(
				(acc, product) => acc + product.price * product.quantity,
				0,
			);

			return {
				products: parseInvoiceProducts(
					products.map(p => {
						const tax = toNumber(p.product?.tax);

						return {
							tax,
							id: 0,
							discount: 0,
							name: p.name,
							price: p.price,
							product: p.product,
							quantity: p.quantity,
							createdAt: new Date(),
							updatedAt: new Date(),
							cost: addTax(p.price, tax),
							oldStock: 0,
							newStock: 0,
						};
					}),
				),
				subId: toNumber(store.subOrganization?.id),
				paymentForms: [{ id: 1, amount: total, type: 'cash' }],
				totalCollected: 0,
				currency: 'COP',
				shouldPrint: true,
				priceListId:
					store.subOrganization?.defaultPriceListId || firstPriceListId,
				client: undefined,
				config: defaultConfig,
			};
		},
	};
}

type DbProductType = MakeNullableFieldsOptional<
	Awaited<ReturnType<typeof getInvoiceProducts>>[0]
>;
export function parseInvoiceProducts(
	products: Array<DbProductType>,
): Array<ProductType> {
	return products.map(product => {
		// This is to support duplicating with a product that is not in the db
		const productToMap = product.product ?? {
			id: 0,
			name: product.name,
			prices: [],
			stocks: [],
			barCodes: [],
			batch: null,
			expirationDate: null,
			invimaRegistry: null,
			internalId: 0,
			reference: null,
		};

		const prices =
			product.product?.prices.map(p => ({
				id: p.priceListId,
				name: p.priceList.name,
				price: parseNumber(p.value + getPercentageValue(p.value, product.tax)),
			})) || [];

		const stocks =
			product.product?.stocks.map(p => ({
				branchId: p.subOrgId,
				quantity: p.value,
			})) || [];

		const cost = product.product?.price
			? addTaxToPrice(product.product?.price, product.tax)
			: product.cost;

		return {
			id: productToMap.id,
			name: productToMap.name,
			ref: productToMap.reference || undefined,
			barCodes: productToMap.barCodes,
			internalId: productToMap.internalId,
			markedForRefund: false,

			quantity: product.quantity,
			discount: product.discount,
			tax: product.tax,
			price: product.price,
			cost,

			prices,
			stocks,
			stock: 0,
			notes: product.notes || '',

			batch: product.batch ?? undefined,
			expirationDate: product.expirationDate?.toString() ?? undefined,
			invimaRegistry: product.invimaRegistry ?? undefined,
		};
	});
}

async function getInvoiceProducts(db: PrismaClient) {
	const invoice = await db.legalInvoice.findFirstOrThrow({
		where: { id: 0 },
		select: {
			products: {
				include: {
					product: {
						include: {
							stocks: { include: { subOrg: true } },
							prices: { include: { priceList: true } },
						},
					},
				},
			},
		},
	});

	return invoice.products;
}

const productsInclude = {
	include: {
		product: {
			include: {
				stocks: { include: { subOrg: true } },
				prices: { include: { priceList: true } },
			},
		},
	},
} as const;
