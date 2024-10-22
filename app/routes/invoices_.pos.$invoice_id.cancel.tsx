import {
	type ActionFunctionArgs,
	redirect,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node';
import {
	Form,
	Link,
	useActionData,
	useParams,
	useSearchParams,
} from '@remix-run/react';
import { IntentButton, LinkButton, Toast } from '~/components/form-utils';
import { Modal } from '~/components/modal';
import {
	invoiceDianClient,
	invoiceResponseSchema,
	originInvoiceSchema,
} from '~/modules/invoice/invoice-dian-client.server';
import { getOrgDbClient } from '~/utils/db.server';
import { errorLogger } from '~/utils/logger';
import { invariant } from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';
import { generateUpdateProductsStockSql } from '~/utils/sql.server';
import { parseInvoiceProducts } from './invoices_.duplicate';

export async function loader({ request, params }: LoaderFunctionArgs) {
	await protectRoute(request);
	invariant(params.invoice_id, 'Missing invoice_id');

	const { db, orgId, userId } = await getOrgDbClient(request);

	await legalActions.validateAndThrow(db, userId, 'cancel_pos_and_remision');

	const invoice = await db.legalPosInvoice.findFirst({
		where: {
			id: parseInt(params.invoice_id),
			organizationId: orgId,
		},
		select: { canceledAt: true },
	});
	if (invoice?.canceledAt) return redirect('/invoices');
	return {};
}

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.invoice_id, 'Missing invoice_id');
	await protectRoute(request);

	const invoice_id = parseInt(params.invoice_id);
	const { db, userId, orgId } = await getOrgDbClient(request);

	const { error } = await legalActions.validate(
		db,
		userId,
		'cancel_pos_and_remision',
	);

	if (error) return json({ error });

	try {
		await db.$transaction(
			async tx => {
				const {
					organization,
					legalJson,
					resolution,
					subOrganizationId: branchId,
					products,
					...invoice
				} = await tx.legalPosInvoice.update({
					where: {
						id: invoice_id,
						organizationId: orgId,
						canceledAt: null,
					},
					data: { canceledAt: new Date() },
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
						subOrganizationId: true,
						legalJson: true,
						resolution: { select: { soenacId: true, enabledInDian: true } },
						organization: { select: { soenacToken: true } },
						clientId: true,
						total: true,
						subtotal: true,
						totalTax: true,
						totalDiscount: true,
					},
				});

				const productsToUpdate = products
					.filter(p => p.productId)
					.map(p => ({ ...p, id: p.productId as number }));

				if (productsToUpdate.length === 0) return;

				await tx.$executeRawUnsafe(
					generateUpdateProductsStockSql(productsToUpdate, branchId, 'add'),
				);

				await creditNoteFlow();

				async function creditNoteFlow() {
					const relatedInvoiceResult = originInvoiceSchema.safeParse(legalJson);

					if (!relatedInvoiceResult.data) return;

					const relatedInvoice = relatedInvoiceResult.data;

					if (!relatedInvoice.uuid) return;

					const { posCreditNotesCount: internalId } = await tx.counts.update({
						where: { id: orgId },
						data: {
							posCreditNotesCount: { increment: 1 },
						},
					});

					const mappedProducts = parseInvoiceProducts(products);
					const productsToCreate = mappedProducts.map(
						({
							id,
							internalId,
							ref,
							barCodes,
							markedForRefund,
							prices,
							stocks,
							stock,
							...p
						}) => p,
					);

					const { id } = await tx.legalCreditNote.create({
						data: {
							...invoice,

							userId,
							branchId,
							internalId,
							reason: 'cancel',
							posId: invoice_id,
							organizationId: orgId,
							products: { create: productsToCreate },
						},
						select: { id: true },
					});

					const result = await invoiceDianClient.createPosCreditNote({
						orgId,
						totals: {
							subtotal: invoice.subtotal,
							totalTax: invoice.totalTax,
							totalDiscount: invoice.totalDiscount,
							total: invoice.total,
							totalRefunds: 0,
							totalRetention: 0,
						},
						subId: branchId,
						clientId: invoice.clientId,
						products: mappedProducts,
						numeration: internalId,
						relatedInvoice,
						reason: 'cancel',
					});

					if (!result.success) {
						throw new Error(`Error with DIAN: ${result.referenceId}`);
					}

					const jsonData = getJsonData();
					await tx.legalCreditNote.update({
						where: { id },
						data: jsonData,
						select: { id: true },
					});

					return jsonData;

					function getJsonData() {
						if (!result.success) throw '';

						const res = invoiceResponseSchema.safeParse(result.data);

						if (!res.success) return { legalJson: result.data };

						return {
							cude: res.data.uuid,
							legalJson: result.data,
							qrCode: res.data.qr_code,
						};
					}
				}
			},
			{ timeout: 60_000 },
		);

		return redirect('/invoices');
	} catch (error) {
		if (typeof error === 'string') {
			return json({ error }, 400);
		}

		const referenceId = errorLogger({ error, path: request.url });
		const message = 'Hubo un error al anular la factura';

		return json({ error: message, referenceId }, 500);
	}
}

export default function Component() {
	const { invoice_id } = useParams();
	const [searchParams] = useSearchParams();
	const actionData = useActionData<typeof action>();
	const error = actionData?.error;
	const fromPos = searchParams.get('fromPos') === 'true';
	const goBackUrl = fromPos ? `/invoices/pos/${invoice_id}` : '/invoices';

	return (
		<Modal className="max-w-md pb-20 md:pb-6">
			<div className="mb-4 flex justify-between">
				<h4>¿Deseas anular esta factura?</h4>

				<Link to={goBackUrl} aria-label="Volver a todos los cajeros">
					<i className="ri-close-line text-2xl"></i>
				</Link>
			</div>

			<p className="mb-4">
				Si anulas la factura, el dinero se restará de tu balance y el stock de
				los productos será agregado nuevamente.
			</p>

			<Toast variant="warning" className="mb-4">
				Esta acción no se puede deshacer. Si estás seguro, haz click en el botón
				de abajo.
			</Toast>

			{error ? (
				<Toast variant="error" className="mb-4">
					{error}
				</Toast>
			) : null}

			<Form
				method="POST"
				className="flex justify-end gap-4 flex-col lg:flex-row"
			>
				<LinkButton to={goBackUrl} prefetch="intent" variant="secondary">
					Cancelar
				</LinkButton>

				<IntentButton intent="cancel" variant="destructive">
					Anular factura
				</IntentButton>
			</Form>
		</Modal>
	);
}
