import {
	type LoaderFunctionArgs,
	json,
	type MetaFunction,
} from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import { LinkButton } from '~/components/form-utils';
import {
	NonPrintableContent,
	PrintableContent,
} from '~/components/printable-content';
import { Box, PageWrapper, StatusBadge } from '~/components/ui-library';
import { calculateProductsTotal } from '~/modules/invoice/invoice-math';
import {
	PageHeading,
	DuplicateInvoiceButton,
	PrintInvoiceButton,
	DatesInfo,
	TotalsBox,
	RecipientInfo as ClientInfo,
	ProductsTable as OverviewProductsTable,
} from '~/modules/invoice/invoice-page-components';

import {
	OrganizationInfo,
	DateMetadataInfo,
	RecipientInfo,
	ProductsTable,
	TotalsInfo,
	NotesInfo,
	PaymentInfo,
	BillFooter,
	OrganizationLogo,
	Separator,
} from '~/modules/printing/narrow-bill';
import { getOrgDbClient } from '~/utils/db.server';
import { invariant } from '~/utils/misc';
import { getFilePresignedUrlByKey } from '~/utils/misc.server';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction<typeof loader> = ({ data }) => [
	{
		title: `${
			data?.purchase.canceledAt ? '(ANULADA)' : ''
		} Órden de compra No. ${data?.purchase.internalId}`,
	},
];

export async function loader({ request, params }: LoaderFunctionArgs) {
	await protectRoute(request);

	invariant(params.purchase_id, 'Missing purchase_id');

	const { db, orgId, userId } = await getOrgDbClient(request);

	await legalActions.validateAndThrow(db, userId, 'see_purchases');

	const [purchase, organization] = await db.$transaction([
		db.purchase.findFirst({
			where: { id: Number(params.purchase_id), organizationId: orgId },
			include: {
				products: { include: { product: true } },
				supplier: { include: { address: true } },
				subOrganization: true,
				user: true,
				purchaseInvoice: true,
				purchaseRemision: true,
			},
		}),
		db.organization.findUnique({
			where: { id: orgId },
			select: { imageUri: true },
		}),
	]);

	if (!purchase) throw new Response('purchase not found', { status: 404 });

	return json({
		purchase,
		logoUrl: await getFilePresignedUrlByKey(organization?.imageUri),
	});
}

export default function Component() {
	return (
		<div>
			<Outlet />
			<NarrowBillToPrint />
			<NonPrintableContent>
				<Purchase />
			</NonPrintableContent>
		</div>
	);
}

function Purchase() {
	const { purchase } = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<PageHeading
				backLink="/purchases"
				backLinkText="Volver a ordenes de compra"
			>
				<PrintInvoiceButton text="Imprimir compra" />
				<DuplicateInvoiceButton
					moduleType="purchase"
					id={purchase.id}
					text="Duplicar compra"
				/>

				{!purchase.purchaseRemision && !purchase.purchaseRemision ? (
					<LinkButton
						to={`/invoices/duplicate?id=${purchase.id}&origin=purchase&destination=purchaseRemision`}
						prefetch="intent"
						variant="secondary"
					>
						<i className="ri-arrow-right-line" />
						Pasar a remisión
					</LinkButton>
				) : null}

				{!purchase.purchaseInvoice ? (
					<LinkButton
						to={`/invoices/duplicate?id=${purchase.id}&origin=purchase&destination=purchaseInvoice`}
						prefetch="intent"
						variant="secondary"
					>
						<i className="ri-arrow-right-line" />
						Pasar a factura
					</LinkButton>
				) : null}

				{!purchase.canceledAt ? (
					<LinkButton to="cancel?fromPos=true" variant="destructive">
						<i className="ri-close-line"></i>
						Anular compra
					</LinkButton>
				) : null}
			</PageHeading>

			<div className="flex flex-col-reverse lg:flex-row gap-6">
				<section className="flex-1">
					<Box className="p-0">
						<div className="p-4">
							<h4>Órden de compra #{purchase.internalId}</h4>

							<div className="flex gap-4 pb-4 border-b border-gray-200 mb-4 children:whitespace-nowrap flex-wrap">
								{purchase.canceledAt ? (
									<StatusBadge withBackground variant="error">
										Compra anulada
									</StatusBadge>
								) : null}
							</div>

							<DatesInfo createdAt={purchase.createdAt} expiresAt={null}>
								<span />
							</DatesInfo>

							<ClientInfo {...purchase.supplier} />
						</div>

						<OverviewProductsTable products={purchase.products} />

						{purchase.notes ? (
							<div className="p-4 border-t border-gray-200">
								<h5 className="mb-2">Notas y observaciones</h5>
								<p className="text-sm">{purchase.notes}</p>
							</div>
						) : null}
					</Box>
				</section>

				<section className="flex-1 max-w-[24rem] flex flex-col gap-4">
					<TotalsBox
						products={purchase.products}
						retention={purchase.retention}
					/>
				</section>
			</div>
		</PageWrapper>
	);
}

function NarrowBillToPrint() {
	const { purchase, logoUrl } = useLoaderData<typeof loader>();
	const { total, totalTax, totalDiscount, subtotal, totalRetention } =
		calculateProductsTotal(purchase.products, {
			taxIncluded: true,
			retention: purchase.retention || 0,
		});

	return (
		<PrintableContent>
			<div className="bg-white">
				<header className="text-center mx-auto text-sm border-b border-black border-dashed pb-1 mb-1">
					{logoUrl ? <OrganizationLogo logoUrl={logoUrl} /> : null}
				</header>
				<OrganizationInfo text={`Órden de compra No.${purchase.internalId}`} />
				<Separator />
				<RecipientInfo
					address={purchase.supplier.simpleAddress}
					name={purchase.supplier.name}
					nit={purchase.supplier.idNumber}
					tel={purchase.supplier.tel}
					title="Proveedor"
				/>
				<Separator />
				<DateMetadataInfo createdAt={purchase.createdAt} />

				<Separator className="border-solid mb-2" />
				<ProductsTable
					products={purchase.products.map(p => ({
						internalId: p.product?.internalId || p.id,
						discount: p.discount,
						name: p.name,
						price: p.price,
						quantity: p.quantity,
						tax: p.tax,
						batch: p.batch || '',
						expirationDate: p.expirationDate || '',
						notes: p.notes || '',
						reference: p.product?.reference || '',
						invimaRegistry: p.invimaRegistry || '',
					}))}
				/>
				<Separator />

				<TotalsInfo
					subtotal={subtotal}
					total={total}
					totalCollected={0}
					totalDiscount={totalDiscount}
					totalTax={totalTax}
					totalRetention={totalRetention}
				/>
				<NotesInfo notes={purchase.notes} />

				<Separator className="border-solid mb-2" />

				<PaymentInfo
					payment_forms={[]}
					subOrgName={purchase.subOrganization.name}
					userName={purchase.user.name}
				/>
				<Separator />
				<BillFooter />
			</div>
		</PrintableContent>
	);
}
