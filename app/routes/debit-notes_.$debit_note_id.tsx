import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { Link, useLoaderData, useSearchParams } from '@remix-run/react';
import * as React from 'react';
import * as z from 'zod';
import { Button } from '~/components/form-utils';
import {
	LegalInvoicePdf,
	InvoiceHeading,
	InvoiceRecipient,
	InvoiceQR,
	InvoiceProductsTable,
	InvoiceTotals,
	InvoiceObservations,
} from '~/components/legal-invoice-pdf';
import { PrintableContent } from '~/components/printable-content';
import { DateWithTime, PageWrapper } from '~/components/ui-library';
import { useOrganization } from '~/root';
import { getOrgDbClient } from '~/utils/db.server';
import {
	formatCurrency,
	parsePaymentMethod,
	waitForElm,
	invariant,
} from '~/utils/misc';
import { getFilePresignedUrlByKey } from '~/utils/misc.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
	await protectRoute(request);

	invariant(params.debit_note_id, 'Missing debit_note_id');

	const { db, orgId } = await getOrgDbClient(request);

	const [debitNote, organization] = await db.$transaction([
		db.debitNote.findFirst({
			where: { id: Number(params.debit_note_id), organizationId: orgId },
			include: {
				products: { include: { product: true } },
				paymentForms: true,
				invoice: {
					select: {
						client: true,
						dianId: true,
						id: true,
						cufe: true,
						legalInvoiceJson: true,
					},
				},
			},
		}),
		db.organization.findFirst({
			where: { id: orgId },
			select: { imageUri: true },
		}),
	]);

	if (!debitNote) throw new Response('invoice not found', { status: 404 });

	return json({
		debitNote,
		invoice: debitNote.invoice,
		dianJson: getDianJson(debitNote.legalInvoiceJson),
		invoiceDianJson: getDianJson(debitNote.invoice.legalInvoiceJson),
		logoUrl: await getFilePresignedUrlByKey(organization?.imageUri),
	});
}

export default function Component() {
	const {
		debitNote,
		invoice,
		invoice: { client },
		dianJson,
	} = useLoaderData<typeof loader>();

	return (
		<div>
			<DianBill />

			<PageWrapper className="print:hidden">
				<Link
					to="/debit-notes"
					className="mb-4 flex items-center gap-2 max-w-max"
					prefetch="intent"
				>
					<i className="ri-arrow-left-line"></i>
					Volver a todas las notas débito
				</Link>

				<div className="flex flex-col lg:flex-row gap-6">
					<section className="flex-1 lg:max-w-[70%]">
						<div className="mb-6 bg-white p-6 rounded-md border border-gray-200 shadow-sm">
							<div className="flex justify-between flex-wrap gap-4 mb-6">
								<h2 className="text-xl lg:text-2xl">
									Nota débito de venta No. {debitNote.internalId}
								</h2>

								<InvoiceStatus />
							</div>

							<div className="flex flex-col lg:flex-row children:flex-1">
								<div>
									<div className="flex gap-2 mb-2">
										<i className="ri-calendar-line"></i>
										<div className="flex items-center gap-2 flex-wrap">
											<p className="font-medium whitespace-nowrap">
												Fecha de creación:
											</p>
											<DateWithTime date={debitNote.createdAt} />
										</div>
									</div>

									{dianJson?.is_valid ? (
										<div>
											<div className="max-w-[90%]">
												{debitNote.cude ? (
													<p className="break-words mb-2">
														<strong>CUDE:</strong>
														<span className="opacity-0 pointer-events-none">
															s
														</span>
														{debitNote.cude}
													</p>
												) : null}
											</div>

											<p>
												<span className="font-medium">Numeración: </span>
												<span>{dianJson.number}</span>
											</p>
										</div>
									) : null}
								</div>
							</div>

							<div className="p-4 bg-gray-50 border border-gray-200 text-sm">
								<div className="flex gap-4 items-center mb-2 flex-wrap">
									<h4>Información de la factura origen</h4>

									<Link
										className="text-primary-600 flex items-center gap-2"
										to={`/invoices/${invoice.id}`}
										prefetch="intent"
									>
										<span className="underline">Ver la factura</span>
										<i className="ri-arrow-right-line" />
									</Link>
								</div>

								<div className="flex gap-2 items-center mb-2">
									<i className="ri-user-line"></i>
									<p className="font-medium">Cliente:</p>
									<p>
										{client.name} ({client.idNumber})
									</p>
								</div>

								{invoice.dianId ? (
									<div className="flex gap-2 items-center mb-2">
										<i className="ri-numbers-line"></i>
										<p className="font-medium">Numeración:</p>
										<p>{invoice.dianId}</p>
									</div>
								) : null}

								<div>
									{invoice.cufe ? (
										<p className="break-words text-sm">
											<strong>CUFE:</strong>
											<span className="opacity-0 pointer-events-none">s</span>
											{invoice.cufe}
										</p>
									) : null}
								</div>
							</div>
						</div>

						<div className="bg-white p-4 px-0 rounded-md border border-gray-200 shadow-sm">
							<div className="flex justify-between items-center flex-wrap px-4 mb-4 gap-4">
								<h2 className="text-xl">Artículos</h2>
							</div>

							<div className="overflow-x-auto md:overflow-x-visible">
								<table className="min-w-sm w-full">
									<thead className="text-left h-8 bg-gray-50 text-gray-600 text-sm border-y border-gray-200">
										<tr className="children:pl-4 children:font-medium">
											<th>Artículo</th>
											<th>Cant.</th>
											<th>Imp.</th>
											<th>Precio</th>
											<th>Total</th>
										</tr>
									</thead>

									<tbody>
										{debitNote.products.map(product => (
											<tr
												className="border-b border-gray-200 children:align-bottom"
												key={product.id}
											>
												<td>
													<div className="block pl-4 py-3">
														<p className="font-medium leading-5 mb-2">
															{product.name}
														</p>
														<p className="text-sm text-gray-600">
															{product.notes}
														</p>
													</div>
												</td>
												<td>
													<div className="block pl-4 py-3">
														{product.quantity}
													</div>
												</td>
												<td>
													<div className="block pl-4 py-3">{product.tax}%</div>
												</td>
												<td>
													<div className="block pl-4 py-3">
														${formatCurrency(product.price)}
													</div>
												</td>
												<td>
													<div className="block pl-4 py-3">
														${formatCurrency(product.quantity * product.price)}
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							<div className="p-4 pb-0">
								<h4 className="mb-2">Observaciones</h4>
								<p>
									{debitNote.notes ||
										'No hay observaciones para esta nota débito.'}
								</p>
							</div>
						</div>
					</section>

					<section className="flex-1 max-w-[24rem] relative">
						<div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm sticky top-0">
							<div className="lg:max-w-md flex-1">
								<div className="flex mb-2 gap-4 items-center justify-between text-sm">
									<div className="flex gap-2 items-center">
										<i className="ri-money-dollar-circle-line"></i>
										<p className="font-medium">Subtotal</p>
									</div>

									<p>${formatCurrency(debitNote.subtotal)}</p>
								</div>

								<div className="flex mb-2 gap-4 items-center justify-between text-sm">
									<div className="flex gap-2 items-center">
										<i className="ri-percent-line"></i>
										<p className="font-medium">Descuentos</p>
									</div>

									<p>${formatCurrency(debitNote.totalDiscount)}</p>
								</div>

								<div className="flex mb-2 gap-4 items-center justify-between text-sm">
									<div className="flex gap-2 items-center">
										<i className="ri-auction-line"></i>
										<p className="font-medium">Impuestos</p>
									</div>

									<p>${formatCurrency(debitNote.totalTax)}</p>
								</div>

								<div className="flex gap-4 items-center justify-between text-sm mb-4">
									<div className="flex gap-2 items-center">
										<i className="ri-archive-line"></i>
										<p className="font-medium">Artículos</p>
									</div>

									<p>
										{debitNote.products.length} (
										{debitNote.products.reduce(
											(acc, curr) => acc + curr.quantity,
											0,
										)}{' '}
										unidades)
									</p>
								</div>

								<div className="flex items-center gap-4 justify-between">
									<p className="font-medium">Total</p>

									<p className="font-medium text-2xl">
										$
										{formatCurrency(
											debitNote.subtotal +
												debitNote.totalTax -
												debitNote.totalDiscount,
										)}
									</p>
								</div>

								{debitNote.paymentForms.length ? (
									<div>
										<h4 className="mb-2">Formas de pago</h4>

										<ul>
											{debitNote.paymentForms.map(paymentForm => (
												<li
													key={paymentForm.id}
													className="flex items-center gap-2 mt-2"
												>
													<span className="w-1 h-1 bg-black rounded-full"></span>
													<p>{parsePaymentMethod(paymentForm.type)}</p>
													<span className="font-medium">
														${formatCurrency(paymentForm.amount)}
													</span>
												</li>
											))}
										</ul>
									</div>
								) : null}

								{debitNote.cude ? <PrintInvoiceButton /> : null}
							</div>
						</div>
					</section>
				</div>
			</PageWrapper>
		</div>
	);
}

function InvoiceStatus() {
	const { debitNote } = useLoaderData<typeof loader>();

	if (debitNote.cude) {
		return (
			<div className="flex items-center gap-2 flex-wrap">
				<div className="badge badge-success flex items-center gap-2 text-sm whitespace-nowrap">
					<i className="ri-check-line"></i>
					<p>Enviada a la DIAN</p>
				</div>
			</div>
		);
	}

	return (
		<div className="badge badge-error flex items-center gap-2 text-sm whitespace-nowrap">
			<i className="ri-information-line"></i>
			<p>Nota débito inválida</p>
		</div>
	);
}

function PrintInvoiceButton() {
	const [searchParams, setSearchParams] = useSearchParams();
	const shouldPrint = searchParams.get('print') === 'true';

	const printInvoice = React.useCallback(async () => {
		const elem = document.querySelector('#logo-img');
		if (elem) await waitForElm('#logo-img');
		window.print();
	}, []);

	React.useEffect(() => {
		if (shouldPrint) {
			printInvoice();
			setSearchParams(
				search => {
					search.delete('print');
					return search;
				},
				{ replace: true },
			);
		}
	}, [shouldPrint, setSearchParams, printInvoice]);

	return (
		<Button variant="secondary" onClick={() => window.print()}>
			<i className="ri-printer-line"></i>
			Imprimir o descargar
		</Button>
	);
}

function DianBill() {
	const { debitNote, logoUrl, dianJson } = useLoaderData<typeof loader>();
	const organization = useOrganization();
	const { client } = debitNote.invoice;

	if (!dianJson) return null;

	const { qr_code, number } = dianJson;

	const products = debitNote.products.map(p => ({ ...p.product, ...p }));

	return (
		<PrintableContent>
			<LegalInvoicePdf textInInvoice={organization.textInInvoice}>
				<InvoiceHeading
					logo={logoUrl}
					number={number}
					reference={debitNote.invoice.dianId}
					createdAt={debitNote.createdAt}
					expiresAt={null}
					name={organization.name}
					address={organization.address || 'Sin dirección'}
					idNumber={organization.idNumber || 'Sin NIT'}
					email={organization.email}
					phone={organization.tel || 'Sin teléfono'}
					website={organization.website}
					resolution=""
					title="Nota débito"
				/>

				<InvoiceRecipient
					name={client.name}
					address={client.simpleAddress}
					email={client.email}
					idNumber={client.idNumber}
					phone={client.tel}
				>
					{qr_code ? <InvoiceQR url={qr_code} /> : null}
				</InvoiceRecipient>

				<InvoiceProductsTable products={products} />
				<InvoiceTotals products={products} cufe={debitNote.cude} />

				<InvoiceObservations notes={debitNote.notes} />
			</LegalInvoicePdf>
		</PrintableContent>
	);
}

const dianJsonSchema = z.object({
	is_valid: z.boolean(),
	number: z.string(),
	qr_code: z.string(),
});

function getDianJson(json: any) {
	try {
		return dianJsonSchema.parse(json);
	} catch (error) {}
}
