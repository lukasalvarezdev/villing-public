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
	DatesInfo,
	TotalsBox,
	RecipientInfo as ClientInfo,
	ProductsTable as OverviewProductsTable,
	PrintInvoiceButton,
	PaymentsList,
	RememberToPayAlert,
	InvoicePaidAt,
} from '~/modules/invoice/invoice-page-components';
import {
	DateMetadataInfo,
	RecipientInfo,
	ProductsTable,
	TotalsInfo,
	NotesInfo,
	PaymentInfo,
	BillFooter,
	Separator,
	OrganizationInfo,
} from '~/modules/printing/narrow-bill';
import { useOrganization } from '~/root';
import { getOrgDbClient } from '~/utils/db.server';
import { getDaysDiff, getDaysLeft, invariant } from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction<typeof loader> = ({ data }) => [
	{
		title: `${
			data?.purchaseInvoice.canceledAt ? '(ANULADA)' : ''
		} Factura de compra No. ${data?.purchaseInvoice.internalId}`,
	},
];

export async function loader({ request, params }: LoaderFunctionArgs) {
	await protectRoute(request);

	invariant(params.invoice_id, 'Missing invoice_id');

	const { db, orgId, userId } = await getOrgDbClient(request);

	await legalActions.validateAndThrow(db, userId, 'see_invoices');

	const purchaseInvoice = await db.purchaseInvoice.findFirst({
		where: { id: parseInt(params.invoice_id), organizationId: orgId },
		include: {
			products: { include: { product: true } },
			supplier: true,
			subOrganization: true,
			user: true,
			payments: true,
		},
	});

	if (!purchaseInvoice) {
		throw new Response('invoice not found', { status: 404 });
	}

	const pending = purchaseInvoice.pending;
	const isCredit = purchaseInvoice.type === 'loan';

	const isPending = pending > 0;

	const invoicePaidAt = !isPending
		? purchaseInvoice.payments.reduce(
				(acc, curr) => (acc > curr.createdAt ? acc : curr.createdAt),
				purchaseInvoice.createdAt,
			)
		: null;

	const expiresInDays =
		purchaseInvoice.expiresAt && isPending
			? getDaysLeft(purchaseInvoice.expiresAt)
			: null;

	return json({
		purchaseInvoice,
		isPending,
		pending,
		isCredit,
		expiresInDays,
		invoicePaidAt,
		creditTerm: purchaseInvoice.expiresAt
			? getDaysDiff(
					new Date(purchaseInvoice.expiresAt),
					new Date(purchaseInvoice.createdAt),
				)
			: 0,
	});
}

export default function Component() {
	return (
		<div>
			<Outlet />
			<NarrowBillToPrint />
			<NonPrintableContent>
				<Invoice />
			</NonPrintableContent>
		</div>
	);
}

function Invoice() {
	const {
		purchaseInvoice,
		isPending,
		pending,
		isCredit,
		expiresInDays,
		invoicePaidAt,
		creditTerm,
	} = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<PageHeading
				backLink="/purchase-invoices"
				backLinkText="Volver a facturas de compra"
			>
				<PrintInvoiceButton text="Imprimir factura" />
				<DuplicateInvoiceButton
					moduleType="purchaseInvoice"
					id={purchaseInvoice.id}
					text="Duplicar factura"
				/>
				{!purchaseInvoice.canceledAt ? (
					<LinkButton to="cancel?fromPurchase=true" variant="destructive">
						<i className="ri-close-line"></i>
						Anular factura
					</LinkButton>
				) : null}
			</PageHeading>

			<div className="flex flex-col-reverse lg:flex-row gap-6">
				<section className="flex-1 lg:max-w-[70%]">
					<Box className="p-0">
						<div className="p-4">
							<div className="flex justify-between gap-4 flex-wrap items-center mb-4">
								<h4>Factura de compra #{purchaseInvoice.internalId}</h4>
								<p className="text-gray-700 text-sm flex gap-2">
									No. externa: {purchaseInvoice.externalInvoiceId}
								</p>
							</div>

							<div className="flex gap-4 pb-4 border-b border-gray-200 mb-4 children:whitespace-nowrap flex-wrap">
								{isCredit ? (
									<div className="flex gap-4">
										{isPending ? (
											<StatusBadge withBackground variant="error">
												Pago pendiente
											</StatusBadge>
										) : (
											<StatusBadge withBackground variant="success">
												Pagada
											</StatusBadge>
										)}

										<StatusBadge withBackground variant="info">
											Crédito a {creditTerm} días
										</StatusBadge>
									</div>
								) : null}

								{purchaseInvoice.canceledAt ? (
									<StatusBadge withBackground variant="error">
										Factura anulada
									</StatusBadge>
								) : null}

								{purchaseInvoice.updatePrices ? (
									<StatusBadge withBackground variant="info">
										Los precios de los productos fueron actualizados
									</StatusBadge>
								) : null}
							</div>

							<DatesInfo
								createdAt={purchaseInvoice.createdAt}
								expiresAt={purchaseInvoice.expiresAt}
								receivedAt={purchaseInvoice.receivedAt}
							>
								<InvoicePaidAt
									expiresInDays={expiresInDays}
									invoicePaidAt={invoicePaidAt}
									isCredit={isCredit}
								/>
							</DatesInfo>

							<ClientInfo {...purchaseInvoice.supplier} />
						</div>

						<OverviewProductsTable products={purchaseInvoice.products} />

						{purchaseInvoice.notes ? (
							<div className="p-4 border-t border-gray-200">
								<h5 className="mb-2">Notas y observaciones</h5>
								<p className="text-sm">{purchaseInvoice.notes}</p>
							</div>
						) : null}
					</Box>
				</section>

				<section className="flex-1 max-w-[24rem] flex flex-col gap-4">
					{purchaseInvoice.expiresAt && isPending ? (
						<RememberToPayAlert
							expiresAt={purchaseInvoice.expiresAt}
							pending={pending}
						/>
					) : null}

					<TotalsBox
						products={purchaseInvoice.products}
						retention={purchaseInvoice.retention}
					/>

					{isCredit ? (
						<PaymentsList
							invoiceId={purchaseInvoice.id}
							isPending={isPending}
							payments={purchaseInvoice.payments}
							pending={pending}
							moduleType="purchase-invoice"
						/>
					) : null}
				</section>
			</div>
		</PageWrapper>
	);
}

function NarrowBillToPrint() {
	const { purchaseInvoice, creditTerm, isCredit } =
		useLoaderData<typeof loader>();
	const organization = useOrganization();
	const { total, totalTax, totalDiscount, subtotal, totalRetention } =
		calculateProductsTotal(purchaseInvoice.products, {
			taxIncluded: true,
			retention: purchaseInvoice.retention || 0,
		});

	return (
		<PrintableContent>
			<div className="bg-white">
				<p className="font-bold text-center">Factura de compra</p>

				<OrganizationInfo
					text={`Factura de compra No.${purchaseInvoice.internalId}`}
				>
					<p className="text-center text-sm leading-4">
						Factura externa No. {purchaseInvoice.externalInvoiceId}
					</p>
				</OrganizationInfo>

				<RecipientInfo
					address={purchaseInvoice.supplier.simpleAddress || ''}
					name={purchaseInvoice.supplier.name}
					nit={purchaseInvoice.supplier.idNumber}
					tel={purchaseInvoice.supplier.tel}
					title="Proveedor"
				/>
				<Separator />

				<DateMetadataInfo
					createdAt={purchaseInvoice.createdAt}
					expiresAt={purchaseInvoice.expiresAt}
				/>
				{isCredit ? (
					<p className="text-xs ">
						<span className="font-bold">Forma de pago: </span> Crédito a{' '}
						{creditTerm} días
					</p>
				) : null}

				<Separator className="border-solid mb-2" />

				<ProductsTable
					products={purchaseInvoice.products.map(p => ({
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

				<NotesInfo notes={purchaseInvoice.notes} />
				<Separator className="border-solid mb-2" />

				<PaymentInfo
					payment_forms={[]}
					subOrgName={purchaseInvoice.subOrganization.name}
					userName={purchaseInvoice.user.name}
				/>

				<Separator />

				<BillFooter text_in_invoice={organization.textInInvoice || undefined} />
			</div>
		</PrintableContent>
	);
}
