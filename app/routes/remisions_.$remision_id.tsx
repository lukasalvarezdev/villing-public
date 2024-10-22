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
	InvoicePaidAt,
	RememberToPayAlert,
	PaymentsList,
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
import { getDaysLeft, invariant } from '~/utils/misc';
import { getFilePresignedUrlByKey } from '~/utils/misc.server';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction<typeof loader> = ({ data }) => [
	{
		title: `${
			data?.remision.canceledAt ? '(ANULADA)' : ''
		} Remisión de compra No. ${data?.remision.internalId}`,
	},
];

export async function loader({ request, params }: LoaderFunctionArgs) {
	await protectRoute(request);

	invariant(params.remision_id, 'Missing remision_id');

	const { db, orgId, userId } = await getOrgDbClient(request);

	await legalActions.validateAndThrow(db, userId, 'see_purchases');

	const [remision, organization] = await db.$transaction([
		db.purchaseRemision.findFirst({
			where: { id: Number(params.remision_id), organizationId: orgId },
			include: {
				products: { include: { product: true } },
				supplier: true,
				subOrganization: true,
				user: true,
				purchaseInvoice: true,
				purchase: true,
				payments: true,
			},
		}),
		db.organization.findUnique({
			where: { id: orgId },
			select: { imageUri: true },
		}),
	]);

	if (!remision) throw new Response('purchase not found', { status: 404 });

	const isCredit = remision.type === 'loan';
	const pending = remision.pending;
	const isPending = pending > 0;
	const expiresInDays =
		remision.expiresAt && isPending ? getDaysLeft(remision.expiresAt) : null;
	const invoicePaidAt = !isPending
		? remision.payments.reduce(
				(acc, curr) => (acc > curr.createdAt ? acc : curr.createdAt),
				remision.createdAt,
			)
		: null;

	return json({
		remision,
		isPending,
		isCredit,
		expiresInDays,
		pending,
		invoicePaidAt,
		logoUrl: await getFilePresignedUrlByKey(organization?.imageUri),
	});
}

export default function Component() {
	return (
		<div>
			<Outlet />
			<NarrowBillToPrint />
			<NonPrintableContent>
				<Remision />
			</NonPrintableContent>
		</div>
	);
}

function Remision() {
	const {
		remision,
		isPending,
		isCredit,
		expiresInDays,
		pending,
		invoicePaidAt,
	} = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<PageHeading
				backLink="/remisions"
				backLinkText="Volver a remisiones de compra"
			>
				<PrintInvoiceButton text="Imprimir compra" />
				<DuplicateInvoiceButton
					moduleType="purchaseRemision"
					id={remision.id}
					text="Duplicar remisión"
				/>

				{!remision.purchaseInvoice ? (
					<LinkButton
						to={`/invoices/duplicate?id=${remision.id}&origin=purchaseRemision&destination=purchaseInvoice`}
						prefetch="intent"
						variant="secondary"
					>
						<i className="ri-arrow-right-line" />
						Pasar a factura
					</LinkButton>
				) : null}

				{!remision.canceledAt ? (
					<LinkButton to="cancel?fromPos=true" variant="destructive">
						<i className="ri-close-line"></i>
						Anular remisión
					</LinkButton>
				) : null}
			</PageHeading>

			<div className="flex flex-col-reverse lg:flex-row gap-6">
				<section className="flex-1">
					<Box className="p-0">
						<div className="p-4">
							<div className="flex justify-between gap-4 flex-wrap items-center mb-4">
								<h4>Remisión de compra #{remision.internalId}</h4>

								<p className="text-gray-700 text-sm flex gap-2">
									No. externa: {remision.externalInvoiceId}
								</p>
							</div>

							<div className="flex gap-4 pb-4 border-b border-gray-200 mb-4 children:whitespace-nowrap flex-wrap">
								{remision.canceledAt ? (
									<StatusBadge withBackground variant="error">
										Compra anulada
									</StatusBadge>
								) : null}
								{remision.updatePrices ? (
									<StatusBadge withBackground variant="info">
										Los precios de los productos fueron actualizados
									</StatusBadge>
								) : null}

								{isCredit ? (
									isPending ? (
										<StatusBadge withBackground variant="error">
											Pago pendiente
										</StatusBadge>
									) : (
										<StatusBadge withBackground variant="success">
											Pagada
										</StatusBadge>
									)
								) : null}
							</div>

							<DatesInfo
								createdAt={remision.createdAt}
								receivedAt={remision.receivedAt}
								expiresAt={remision.expiresAt}
							>
								<InvoicePaidAt
									expiresInDays={expiresInDays}
									invoicePaidAt={invoicePaidAt}
									isCredit={isCredit}
								/>
							</DatesInfo>

							<ClientInfo {...remision.supplier} />
						</div>

						<OverviewProductsTable products={remision.products} />

						{remision.notes ? (
							<div className="p-4 border-t border-gray-200">
								<h5 className="mb-2">Notas y observaciones</h5>
								<p className="text-sm">{remision.notes}</p>
							</div>
						) : null}
					</Box>
				</section>

				<section className="flex-1 max-w-[24rem] flex flex-col gap-4">
					{remision.expiresAt && isPending ? (
						<RememberToPayAlert
							expiresAt={remision.expiresAt}
							pending={pending}
						/>
					) : null}

					<TotalsBox
						products={remision.products}
						retention={remision.retention}
					/>

					{remision.type === 'loan' && !remision.canceledAt ? (
						<PaymentsList
							invoiceId={remision.id}
							isPending={isPending}
							payments={remision.payments}
							pending={pending}
							moduleType="purchase-remision"
						/>
					) : null}
				</section>
			</div>
		</PageWrapper>
	);
}

function NarrowBillToPrint() {
	const { remision, logoUrl } = useLoaderData<typeof loader>();
	const { total, totalTax, totalDiscount, subtotal, totalRetention } =
		calculateProductsTotal(remision.products, {
			taxIncluded: true,
			retention: remision.retention || 0,
		});

	return (
		<PrintableContent>
			<div className="bg-white">
				<header className="text-center mx-auto text-sm border-b border-black border-dashed pb-1 mb-1">
					{logoUrl ? <OrganizationLogo logoUrl={logoUrl} /> : null}
				</header>
				<OrganizationInfo
					text={`Remisión de compra No.${remision.internalId}`}
				/>

				<p className="text-center text-sm">
					Factura externa No. {remision.externalInvoiceId}
				</p>

				<Separator />
				<RecipientInfo
					address={remision.supplier.simpleAddress}
					name={remision.supplier.name}
					nit={remision.supplier.idNumber}
					tel={remision.supplier.tel}
					title="Proveedor"
				/>
				<Separator />
				<DateMetadataInfo
					createdAt={remision.createdAt}
					expiresAt={remision.expiresAt}
				/>

				<Separator className="border-solid mb-2" />
				<ProductsTable
					products={remision.products.map(p => ({
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
				<NotesInfo notes={remision.notes} />

				<Separator className="border-solid mb-2" />

				<PaymentInfo
					payment_forms={[]}
					subOrgName={remision.subOrganization.name}
					userName={remision.user.name}
				/>
				<Separator />
				<BillFooter />
			</div>
		</PrintableContent>
	);
}
