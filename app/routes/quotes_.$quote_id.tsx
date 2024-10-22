import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import {
	NonPrintableContent,
	PrintableContent,
} from '~/components/printable-content';

import { Box, PageWrapper } from '~/components/ui-library';
import {
	PageHeading,
	DuplicateInvoiceButton,
	DatesInfo,
	TotalsBox,
	RecipientInfo as ClientInfo,
	ProductsTable as OverviewProductsTable,
	PrintInvoiceButton,
} from '~/modules/invoice/invoice-page-components';
import {
	OrganizationLogo,
	OrganizationInfo,
	DateMetadataInfo,
	RecipientInfo,
	ProductsTable,
	TotalsInfo,
	NotesInfo,
	PaymentInfo,
	BillFooter,
	Separator,
} from '~/modules/printing/narrow-bill';
import { getOrgDbClient } from '~/utils/db.server';
import { invariant } from '~/utils/misc';
import { getFilePresignedUrlByKey } from '~/utils/misc.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
	await protectRoute(request);

	invariant(params.quote_id, 'Missing quote_id');

	const { db, orgId } = await getOrgDbClient(request);

	const [quote, organization] = await db.$transaction([
		db.quoteInvoice.findFirst({
			where: { id: Number(params.quote_id), organizationId: orgId },
			include: {
				products: { include: { product: true } },
				client: true,
				subOrganization: true,
				user: true,
			},
		}),
		db.organization.findUnique({
			where: { id: orgId },
			select: { imageUri: true },
		}),
	]);

	if (!quote) throw new Response('invoice not found', { status: 404 });

	return json({
		quote,
		logoUrl: await getFilePresignedUrlByKey(organization?.imageUri),
	});
}

export default function Component() {
	return (
		<div>
			<NarrowBillToPrint />
			<NonPrintableContent>
				<Quote />
			</NonPrintableContent>
		</div>
	);
}

function Quote() {
	const { quote } = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<PageHeading
				backLink="/quotes"
				backLinkText="Volver a cotizaciones de venta"
			>
				<PrintInvoiceButton text="Imprimir cotización" />
				<DuplicateInvoiceButton
					moduleType="quote"
					id={quote.id}
					text="Duplicar cotización"
					destination="legalPosInvoice"
				/>
			</PageHeading>

			<div className="flex flex-col-reverse lg:flex-row gap-6">
				<section className="flex-1">
					<Box className="p-0">
						<div className="p-4">
							<h4 className="mb-4">Cotización de venta #{quote.internalId}</h4>

							<DatesInfo createdAt={quote.createdAt} expiresAt={null}>
								<span />
							</DatesInfo>

							<ClientInfo {...quote.client} />
						</div>

						<OverviewProductsTable products={quote.products} />

						{quote.notes ? (
							<div className="p-4 border-t border-gray-200">
								<h5 className="mb-2">Notas y observaciones</h5>
								<p className="text-sm">{quote.notes}</p>
							</div>
						) : null}
					</Box>
				</section>

				<section className="flex-1 max-w-[24rem] flex flex-col gap-4">
					<TotalsBox products={quote.products} />
				</section>
			</div>
		</PageWrapper>
	);
}

function NarrowBillToPrint() {
	const { quote, logoUrl } = useLoaderData<typeof loader>();

	return (
		<PrintableContent>
			<div className="bg-white">
				<header className="text-center mx-auto text-sm border-b border-black border-dashed pb-1 mb-1">
					{logoUrl ? <OrganizationLogo logoUrl={logoUrl} /> : null}
				</header>
				<OrganizationInfo text={`Cotización de venta No.${quote.internalId}`} />

				<Separator />
				<RecipientInfo
					name={quote.client.name}
					nit={quote.client.idNumber}
					tel={quote.client.tel}
					address={quote.client.simpleAddress}
					city={quote.client.city}
					department={quote.client.department}
					title="Cliente"
				/>
				<Separator />
				<DateMetadataInfo createdAt={quote.createdAt} />

				<Separator className="border-solid mb-2" />

				<ProductsTable
					products={quote.products.map(p => ({
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
					subtotal={quote.total - quote.totalTax - quote.totalDiscount}
					total={quote.total}
					totalCollected={0}
					totalDiscount={quote.totalDiscount}
					totalTax={quote.totalTax}
				/>
				<NotesInfo notes={quote.notes} />

				<Separator className="border-solid mb-2" />

				<PaymentInfo
					payment_forms={[]}
					subOrgName={quote.subOrganization.name}
					userName={quote.user.name}
				/>

				<Separator />

				<BillFooter />
			</div>
		</PrintableContent>
	);
}
