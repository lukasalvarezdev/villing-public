import {
	type LoaderFunctionArgs,
	json,
	type MetaFunction,
} from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';

import { LinkButton } from '~/components/form-utils';
import {
	LegalInvoicePdf,
	InvoiceHeading,
	InvoiceRecipient,
	InvoiceProductsTable,
	InvoiceTotals,
	InvoiceObservations,
} from '~/components/legal-invoice-pdf';
import {
	NonPrintableContent,
	PrintableContent,
} from '~/components/printable-content';
import { Box, PageWrapper, StatusBadge } from '~/components/ui-library';
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
import { useOrganization, useOrganizationPrintInfo } from '~/root';
import { getOrgDbClient } from '~/utils/db.server';
import { getDaysLeft, invariant } from '~/utils/misc';
import { getFilePresignedUrlByKey } from '~/utils/misc.server';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction<typeof loader> = ({ data }) => [
	{
		title: `${
			data?.remision.canceledAt ? '(ANULADA)' : ''
		} Remisión de venta No. ${data?.remision.internalId}`,
	},
];

export async function loader({ request, params }: LoaderFunctionArgs) {
	await protectRoute(request);

	invariant(params.remision_id, 'Missing remision_id');

	const { db, orgId, userId } = await getOrgDbClient(request);

	await legalActions.validateAndThrow(db, userId, 'see_invoices');

	const remision = await db.legalInvoiceRemision.findFirst({
		where: { id: parseInt(params.remision_id), organizationId: orgId },
		include: {
			products: { include: { product: true } },
			client: true,
			subOrganization: true,
			user: true,
			paymentForms: true,
			payments: true,
			organization: {
				select: { imageUri: true },
			},
		},
	});

	if (!remision) throw new Response('invoice not found', { status: 404 });

	const pending = remision.pending;
	const isCredit = remision.type === 'loan';
	const isPending = isCredit ? pending > 0 : false;
	const invoicePaidAt = !isPending
		? remision.payments.reduce(
				(acc, curr) => (acc > curr.createdAt ? acc : curr.createdAt),
				remision.createdAt,
			)
		: null;

	const expiresInDays =
		remision.expiresAt && isPending ? getDaysLeft(remision.expiresAt) : null;

	return json({
		remision,
		isPending,
		pending,
		isCredit,
		expiresInDays,
		invoicePaidAt,
		logoUrl: await getFilePresignedUrlByKey(remision.organization.imageUri),
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
		remision,
		isPending,
		pending,
		isCredit,
		expiresInDays,
		invoicePaidAt,
	} = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<PageHeading
				backLink="/invoice-remisions"
				backLinkText="Volver a remisiones de venta"
			>
				<PrintInvoiceButton text="Imprimir remisión" />
				<DuplicateInvoiceButton
					moduleType="legalInvoiceRemision"
					id={remision.id}
					text="Duplicar remisión"
				/>
				{!remision.canceledAt ? (
					<LinkButton to="cancel?fromRemision=true" variant="destructive">
						<i className="ri-close-line"></i>
						Anular remisión
					</LinkButton>
				) : null}
			</PageHeading>

			<div className="flex flex-col-reverse lg:flex-row gap-6">
				<section className="flex-1 lg:max-w-[70%]">
					<Box className="p-0">
						<div className="p-4">
							<h4 className="mb-4">Remisión de venta #{remision.internalId}</h4>

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

								{remision.canceledAt ? (
									<StatusBadge withBackground variant="error">
										Remisión anulada
									</StatusBadge>
								) : null}
							</div>

							<DatesInfo
								createdAt={remision.createdAt}
								expiresAt={remision.expiresAt}
							>
								<InvoicePaidAt
									expiresInDays={expiresInDays}
									invoicePaidAt={invoicePaidAt}
									isCredit={isCredit}
								/>
							</DatesInfo>

							<ClientInfo {...remision.client} />
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

					<TotalsBox products={remision.products} />

					{remision.type === 'loan' ? (
						<PaymentsList
							invoiceId={remision.id}
							isPending={isPending}
							payments={remision.payments}
							pending={pending}
							moduleType="remision"
						/>
					) : null}
				</section>
			</div>
		</PageWrapper>
	);
}

function NarrowBillToPrint() {
	const { remision, logoUrl } = useLoaderData<typeof loader>();
	const { client } = remision;
	const { textInInvoice, showCompanyInfoInRemision } = useOrganization();
	const organizationInfo = useOrganizationPrintInfo();
	const products = remision.products.map(p => ({ ...p.product, ...p }));

	return (
		<PrintableContent>
			<LegalInvoicePdf textInInvoice={textInInvoice}>
				<InvoiceHeading
					number={`RE-${remision.internalId}`}
					createdAt={remision.createdAt}
					expiresAt={remision.expiresAt}
					userName={remision.user.name}
					branchName={remision.subOrganization.name}
					resolution=""
					title="Remisión de venta"
					logo={showCompanyInfoInRemision ? logoUrl : undefined}
					{...organizationInfo}
				/>

				<InvoiceRecipient
					name={client.name}
					address={client.simpleAddress}
					email={client.email}
					idNumber={client.idNumber}
					phone={client.tel}
				/>

				<InvoiceProductsTable products={products} />
				<InvoiceTotals products={products} />

				<InvoiceObservations notes={remision.notes} />
			</LegalInvoicePdf>
		</PrintableContent>
	);
}
