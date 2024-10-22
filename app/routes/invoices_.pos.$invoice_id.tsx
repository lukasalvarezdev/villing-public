import {
	type LoaderFunctionArgs,
	json,
	type MetaFunction,
} from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import QRCode from 'react-qr-code';
import { ClientOnly } from '~/components/client-only';
import { LinkButton } from '~/components/form-utils';
import {
	NonPrintableContent,
	PrintableContent,
} from '~/components/printable-content';
import { Box, PageWrapper, StatusBadge } from '~/components/ui-library';
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
	ResolutionInfo,
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
import { useOrganization } from '~/root';
import { getOrgDbClient } from '~/utils/db.server';
import { invariant } from '~/utils/misc';
import { getFilePresignedUrlByKey } from '~/utils/misc.server';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction<typeof loader> = ({ data }) => {
	const canceledAt = data?.invoice.canceledAt;
	const no = data?.invoice.internalId;

	return [
		{
			title: `${canceledAt ? '(ANULADA)' : ''} Factura de venta pos No. ${no}`,
		},
	];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
	await protectRoute(request);

	invariant(params.invoice_id, 'Missing invoice_id');

	const { db, orgId, userId } = await getOrgDbClient(request);

	await legalActions.validateAndThrow(db, userId, 'see_invoices');

	const [invoice, organization] = await db.$transaction([
		db.legalPosInvoice.findFirst({
			where: { id: Number(params.invoice_id), organizationId: orgId },
			include: {
				products: { include: { product: true } },
				client: true,
				resolution: true,
				subOrganization: true,
				user: true,
				paymentForms: true,
				cashier: true,
				LegalCreditNote: true,
			},
		}),
		db.organization.findFirst({
			where: { id: orgId },
			select: { imageUri: true },
		}),
	]);

	if (!invoice) throw new Response('invoice not found', { status: 404 });

	return json({
		invoice,
		logoUrl: await getFilePresignedUrlByKey(organization?.imageUri),
		legalId: invoice.dianId,
		isDianValid: Boolean(invoice.cude),
		wasSentToDian: Boolean(invoice.legalJson),
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
	const { invoice, legalId } = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<PageHeading
				backLink="/invoices"
				backLinkText="Volver a facturas de venta"
			>
				<PrintInvoiceButton />
				<DuplicateInvoiceButton moduleType="legalPosInvoice" id={invoice.id} />
				{!invoice.canceledAt ? (
					<LinkButton to="cancel?fromPos=true" variant="destructive">
						<i className="ri-close-line"></i>
						Anular factura
					</LinkButton>
				) : null}
			</PageHeading>

			<div className="flex flex-col-reverse lg:flex-row gap-6">
				<section className="flex-1">
					<Box className="p-0">
						<div className="p-4">
							<div className="flex justify-between gap-4 flex-wrap items-center mb-4">
								<h4>Factura de venta #{invoice.internalId}</h4>

								{legalId ? (
									<button className="text-gray-700 text-sm flex gap-2">
										<i className="ri-file-copy-line"></i>
										{legalId}
									</button>
								) : null}
							</div>

							<div className="flex gap-4 pb-4 border-b border-gray-200 mb-4 children:whitespace-nowrap flex-wrap">
								{invoice.canceledAt ? (
									<StatusBadge withBackground variant="error">
										Factura anulada
									</StatusBadge>
								) : null}
								<DianStatus />
							</div>

							<DatesInfo createdAt={invoice.createdAt} expiresAt={null}>
								<span />
							</DatesInfo>

							<ClientInfo {...invoice.client} />
						</div>

						<OverviewProductsTable products={invoice.products} />

						{invoice.notes ? (
							<div className="p-4 border-t border-gray-200">
								<h5 className="mb-2">Notas y observaciones</h5>
								<p className="text-sm">{invoice.notes}</p>
							</div>
						) : null}
					</Box>

					{invoice.cude ? (
						<p className="break-words mt-4 text-sm">
							<span className="font-bold">CUDE:</span> {invoice.cude}
						</p>
					) : null}
				</section>

				<section className="flex-1 max-w-[24rem] flex flex-col gap-4">
					<TotalsBox products={invoice.products} />
					<CreditNote />
				</section>
			</div>
		</PageWrapper>
	);
}

function CreditNote() {
	const {
		invoice: { LegalCreditNote },
	} = useLoaderData<typeof loader>();
	const creditNote = LegalCreditNote[0];

	if (!creditNote?.qrCode) return null;

	return (
		<a
			href={creditNote.qrCode}
			target="_blank"
			rel="noopener noreferrer"
			className="text-sm underline text-primary-600"
		>
			Ver nota crédito de anulación
		</a>
	);
}

function DianStatus() {
	const { wasSentToDian, isDianValid } = useLoaderData<typeof loader>();

	if (!wasSentToDian) {
		return (
			<StatusBadge withBackground variant="info">
				Sin POS electrónico
			</StatusBadge>
		);
	}

	return (
		<div className="flex gap-4">
			{isDianValid ? (
				<StatusBadge withBackground variant="success">
					Válida en la DIAN
				</StatusBadge>
			) : (
				<StatusBadge withBackground variant="error">
					Factura no válida en la DIAN
				</StatusBadge>
			)}
		</div>
	);
}

function NarrowBillToPrint() {
	const { invoice, logoUrl } = useLoaderData<typeof loader>();
	const organization = useOrganization();

	return (
		<PrintableContent>
			<div className="bg-white">
				<header className="text-center mx-auto text-sm">
					{logoUrl ? <OrganizationLogo logoUrl={logoUrl} /> : null}
				</header>

				<OrganizationInfo
					name={invoice.subOrganization.name}
					address={invoice.subOrganization.address}
					tel={invoice.subOrganization.tel || ''}
					nit={invoice.subOrganization.nit || ''}
					text={`Factura de venta No. ${invoice.internalId}`}
				/>
				<Separator />
				<RecipientInfo
					name={invoice.client.name}
					nit={invoice.client.idNumber}
					address={invoice.client.simpleAddress}
					tel={invoice.client.tel}
					city={invoice.client.city}
					department={invoice.client.department}
					title="Cliente"
				/>
				<Separator />

				<DateMetadataInfo createdAt={invoice.createdAt} />

				<Separator className="border-solid mb-2" />

				<ProductsTable
					products={invoice.products.map(p => ({
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
					subtotal={invoice.subtotal}
					total={invoice.total}
					totalCollected={invoice.totalCollected}
					totalDiscount={invoice.totalDiscount}
					totalTax={invoice.totalTax}
					totalRefunds={invoice.totalRefunded}
				/>

				<NotesInfo notes={invoice.notes} />

				<Separator className="border-solid mb-2" />

				<PaymentInfo
					payment_forms={invoice.paymentForms}
					subOrgName={invoice.subOrganization.name}
					userName={invoice.user.name}
				/>

				<Separator className="mb-2" />

				<ResolutionInfo
					number={invoice.resolution.resolutionNumber}
					from_date={invoice.resolution.fromDate?.toString() || ''}
					to_date={invoice.resolution.toDate?.toString() || ''}
					prefix={invoice.resolution.prefix || ''}
					from={invoice.resolution.from || 0}
					to={invoice.resolution.to || 0}
					hide={!invoice.resolution.enabledInDian}
				/>

				<ClientOnly>
					{() =>
						invoice.qrCode && invoice.cude ? (
							<InvoiceQR url={invoice.qrCode} cude={invoice.cude} />
						) : null
					}
				</ClientOnly>

				<BillFooter text_in_invoice={organization.textInInvoice || undefined} />
			</div>
		</PrintableContent>
	);
}

function InvoiceQR({ url, cude }: { url: string; cude: string }) {
	return (
		<div className="flex items-center justify-center flex-col gap-2 mt-2">
			<div className="w-[150px]">
				<QRCode value={url} size={150} />
			</div>
			<p className="text-wrap break-all leading-3 text-center">{cude}</p>
		</div>
	);
}
