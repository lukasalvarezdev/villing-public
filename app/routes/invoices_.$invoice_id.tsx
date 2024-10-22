import {
	type LoaderFunctionArgs,
	json,
	type MetaFunction,
} from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import * as z from 'zod';
import {
	InvoiceHeading,
	InvoiceObservations,
	InvoiceProductsTable,
	InvoiceQR,
	InvoiceRecipient,
	InvoiceTotals,
	LegalInvoicePdf,
} from '~/components/legal-invoice-pdf';
import {
	NonPrintableContent,
	PrintableContent,
} from '~/components/printable-content';
import { Box, PageWrapper, StatusBadge } from '~/components/ui-library';

import {
	DatesInfo,
	DuplicateInvoiceButton,
	InvoicePaidAt,
	PageHeading,
	PaymentsList,
	PrintInvoiceButton,
	ProductsTable,
	RecipientInfo,
	RememberToPayAlert,
	TotalsBox,
} from '~/modules/invoice/invoice-page-components';
import { useOrganization } from '~/root';
import { getOrgDbClient } from '~/utils/db.server';
import { errorLogger } from '~/utils/logger';
import { formatDate, getDaysLeft, invariant } from '~/utils/misc';
import { getFilePresignedUrlByKey } from '~/utils/misc.server';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction<typeof loader> = ({ data }) => [
	{
		title: `${
			!data?.isDianValid ? '(INVÁLIDA)' : ''
		} Factura electrónica de venta No. ${data?.invoice.internalId}`,
	},
];

export async function loader({ request, params }: LoaderFunctionArgs) {
	await protectRoute(request);

	invariant(params.invoice_id, 'Missing invoice_id');

	const { db, orgId, userId } = await getOrgDbClient(request);

	await legalActions.validateAndThrow(db, userId, 'see_invoices');

	const [invoice, organization] = await db.$transaction([
		db.legalInvoice.findFirst({
			where: { id: Number(params.invoice_id), organizationId: orgId },
			include: {
				products: {
					include: { product: true },
				},
				client: true,
				resolution: true,
				subOrganization: true,
				user: true,
				payments: true,
				paymentForms: true,
				organization: true,
			},
		}),
		db.organization.findFirstOrThrow({
			where: { id: orgId },
			select: { imageUri: true },
		}),
	]);

	if (!invoice) throw new Response('invoice not found', { status: 404 });

	const isCredit = invoice.type === 'loan';
	const pending = invoice.pending;

	const isPending = pending > 0;
	const wasEmailSent = invoice.wasEmailSent;
	const isDianValid = Boolean(invoice.cufe);
	const invoicePaidAt = !isPending
		? invoice.payments.reduce(
				(acc, curr) => (acc > curr.createdAt ? acc : curr.createdAt),
				invoice.createdAt,
			)
		: null;

	const expiresInDays =
		invoice.expiresAt && isPending ? getDaysLeft(invoice.expiresAt) : null;

	const dianNumeration = invoice.dianId.split('-')?.[1];
	const legalData = parseLegalData(invoice.legalInvoiceJson);

	return json({
		invoice,
		isPending,
		wasEmailSent,
		isDianValid,
		expiresInDays,
		invoicePaidAt,
		pending,
		qrCode: legalData?.qr_code,
		legalId:
			legalData?.legalId || `${invoice.resolution.prefix}-${dianNumeration}`,
		logoUrl: await getFilePresignedUrlByKey(organization?.imageUri),
		isCredit,
	});
}

export default function Component() {
	return (
		<div>
			<DianBill />
			<NonPrintableContent>
				<Invoice />
			</NonPrintableContent>
		</div>
	);
}

function Invoice() {
	const {
		invoice,
		isPending,
		wasEmailSent,
		isDianValid,
		expiresInDays,
		invoicePaidAt,
		pending,
		legalId,
		isCredit,
	} = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<PageHeading
				backLink="/invoices"
				backLinkText="Volver a facturas de venta"
			>
				<PrintInvoiceButton />
				<DuplicateInvoiceButton moduleType="legalInvoice" id={invoice.id} />
			</PageHeading>

			<div className="flex flex-col-reverse lg:flex-row gap-6">
				<section className="flex-1 lg:max-w-[70%]">
					<Box className="p-0">
						<div className="p-4">
							<div className="flex justify-between gap-4 flex-wrap items-center mb-4">
								<h4>Factura de venta #{invoice.internalId}</h4>

								<button className="text-gray-700 text-sm flex gap-2">
									<i className="ri-file-copy-line"></i>
									{legalId}
								</button>
							</div>

							<div className="flex gap-4 pb-4 border-b border-gray-200 mb-4 children:whitespace-nowrap flex-wrap">
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

								{wasEmailSent ? (
									<StatusBadge withBackground variant="success">
										Email enviado
									</StatusBadge>
								) : (
									<StatusBadge withBackground variant="error">
										Email no enviado
									</StatusBadge>
								)}

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

							<DatesInfo
								createdAt={invoice.createdAt}
								expiresAt={invoice.expiresAt}
							>
								<InvoicePaidAt
									expiresInDays={expiresInDays}
									invoicePaidAt={invoicePaidAt}
									isCredit={isCredit}
								/>
							</DatesInfo>

							<RecipientInfo {...invoice.client} />
						</div>

						<ProductsTable products={invoice.products} />

						{invoice.notes ? (
							<div className="p-4 border-t border-gray-200">
								<h5 className="mb-2">Notas y observaciones</h5>
								<p className="text-sm">{invoice.notes}</p>
							</div>
						) : null}
					</Box>

					{invoice.cufe ? (
						<p className="break-words mt-4 text-sm">
							<span className="font-bold">CUFE:</span> {invoice.cufe}
						</p>
					) : null}
				</section>

				<section className="flex-1 max-w-[24rem] flex flex-col gap-4">
					{invoice.expiresAt && isPending ? (
						<RememberToPayAlert
							expiresAt={invoice.expiresAt}
							pending={pending}
						/>
					) : null}

					<TotalsBox products={invoice.products} />

					{invoice.type === 'loan' && isDianValid ? (
						<PaymentsList
							invoiceId={invoice.id}
							isPending={isPending}
							payments={invoice.payments}
							pending={pending}
							moduleType="invoice"
						/>
					) : null}
				</section>
			</div>
		</PageWrapper>
	);
}

const legalDataSchema = z.object({
	legalId: z.string(),
	qr_code: z.string(),
});

function parseLegalData(data: any) {
	const result = legalDataSchema.safeParse({
		legalId: data?.number,
		qr_code: data?.qr_code,
	});

	if (!result.success) {
		errorLogger({
			body: result.error.flatten(),
			error: data,
			path: 'parseLegalData',
			customMessage: 'Error parsing response from DIAN in invoice page',
		});
		return null;
	}

	return result.data;
}

function DianBill() {
	const { invoice, logoUrl, legalId, qrCode } = useLoaderData<typeof loader>();
	const organization = useOrganization();
	const { client, resolution } = invoice;
	const products = invoice.products.map(p => ({ ...p.product, ...p }));

	return (
		<PrintableContent>
			<LegalInvoicePdf textInInvoice={organization.textInInvoice}>
				<InvoiceHeading
					logo={logoUrl}
					number={legalId}
					createdAt={invoice.createdAt}
					expiresAt={invoice.expiresAt}
					name={organization.name}
					address={organization.address || 'Sin dirección'}
					idNumber={organization.idNumber || 'Sin NIT'}
					email={organization.email}
					phone={organization.tel || 'Sin teléfono'}
					website={organization.website}
					resolution={`Autorización de numeración ${resolution.resolutionNumber} de ${formatDate(
						resolution.fromDate!,
					)} desde ${resolution.from} hasta ${resolution.to}`}
				/>

				<InvoiceRecipient
					name={client.name}
					address={client.simpleAddress}
					email={client.email}
					idNumber={client.idNumber}
					phone={client.tel}
				>
					{qrCode ? <InvoiceQR url={qrCode} /> : null}
				</InvoiceRecipient>

				<InvoiceProductsTable products={products} />
				<InvoiceTotals products={products} cufe={invoice.cufe} />

				<InvoiceObservations notes={invoice.notes} />
			</LegalInvoicePdf>
		</PrintableContent>
	);
}
