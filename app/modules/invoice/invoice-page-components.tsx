import { useForm, conform } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	type PurchasePayment,
	type InvoiceRemisionPayment,
	type LegalInvoicePayment,
	type LegalInvoiceProduct,
	type Product,
	type PurchaseRemisionPayment,
} from '@prisma/client';
import { type SerializeFrom } from '@remix-run/node';
import { useSearchParams, useFetcher } from '@remix-run/react';
import * as React from 'react';
import * as ReactToPrint from 'react-to-print';
import * as z from 'zod';
import { ClientOnly, DateString } from '~/components/client-only';
import {
	Button,
	CurrencyInput,
	ErrorText,
	IntentButton,
	Label,
	LinkButton,
	Select,
	Toast,
} from '~/components/form-utils';
import {
	Box,
	GoBackLinkButton,
	StatusBadge,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeadCell,
	TableRow,
} from '~/components/ui-library';
import { addPaymentFormSchema } from '~/routes/api.payments';
import {
	cn,
	formatCurrency,
	formatDate,
	formatHours,
	waitForElm,
} from '~/utils/misc';
import { BillFooter, Separator } from '../printing/narrow-bill';
import { calculateProductTotal, calculateProductsTotal } from './invoice-math';
import { type InvoiceSessionSchema } from './invoice-modules';
const { useReactToPrint } = ReactToPrint;

export function PageHeading({
	children,
	backLink,
	backLinkText,
}: {
	children: React.ReactNode;
	backLink: string;
	backLinkText: string;
}) {
	return (
		<div className="flex justify-between gap-4 flex-wrap mb-4 items-center">
			<GoBackLinkButton to={backLink} className="mb-0">
				{backLinkText}
			</GoBackLinkButton>

			<div className="flex gap-4 flex-wrap">{children}</div>
		</div>
	);
}

export function PrintInvoiceButton({
	text = 'Imprimir factura',
}: {
	text?: string;
}) {
	const [searchParams, setSearchParams] = useSearchParams();
	const shouldPrint = searchParams.get('print') === 'true';

	const printInvoice = React.useCallback(async () => {
		const elem = document.querySelector('#logo-img');
		if (elem) await waitForElm('#logo-img');
		window.print();
	}, []);

	React.useEffect(() => {
		if (shouldPrint) {
			setTimeout(() => {
				printInvoice();
				setSearchParams(
					search => {
						search.delete('print');
						return search;
					},
					{ replace: true },
				);
			}, 1000);
		}
	}, [shouldPrint, setSearchParams, printInvoice]);

	return (
		<Button variant="secondary" onClick={() => window.print()}>
			<i className="ri-printer-cloud-line"></i>
			{text}
		</Button>
	);
}

export function DuplicateInvoiceButton({
	text = 'Duplicar factura',
	moduleType,
	destination,
	id,
}: {
	text?: string;
	moduleType: InvoiceSessionSchema;
	destination?: InvoiceSessionSchema;
	id: number;
}) {
	return (
		<LinkButton
			to={`/invoices/duplicate?origin=${moduleType}&destination=${destination || moduleType}&id=${id}`}
			variant="secondary"
		>
			<i className="ri-file-copy-line"></i>
			{text}
		</LinkButton>
	);
}

export function DatesInfo({
	createdAt,
	expiresAt,
	children,
	className,
	receivedAt,
}: {
	createdAt: string;
	expiresAt: string | null;
	children?: React.ReactNode;
	className?: string;
	receivedAt?: string | null;
}) {
	return (
		<div
			className={cn(
				'flex justify-between text-right text-sm gap-4',
				'pb-4 border-b border-gray-200 mb-4 flex-wrap children:whitespace-nowrap',
				className,
			)}
		>
			{children}

			<div className="flex gap-4 md:gap-6 flex-wrap">
				{receivedAt ? (
					<p>
						Recepción:{' '}
						<span className="font-medium">
							<DateString>
								{formatDate(receivedAt)} {formatHours(receivedAt)}
							</DateString>
						</span>
					</p>
				) : null}

				{expiresAt ? (
					<p>
						Vence:{' '}
						<span className="font-medium">
							<DateString>
								{formatDate(expiresAt)} {formatHours(expiresAt)}
							</DateString>
						</span>
					</p>
				) : null}

				<p>
					Fecha:{' '}
					<span className="font-medium">
						<DateString>
							{formatDate(createdAt)} {formatHours(createdAt)}
						</DateString>
					</span>
				</p>
			</div>
		</div>
	);
}

export function RecipientInfo(recipient: {
	name: string;
	tel: string;
	email: string;
	simpleAddress: string;
}) {
	return (
		<div className="text-sm">
			<p className="text-xs text-primary-600">PARA:</p>
			<p className="font-bold text-base">{recipient.name}</p>
			<p className="text-gray-700">{recipient.tel}</p>
			<p className="text-gray-700">{recipient.email}</p>
			<p className="text-gray-700">{recipient.simpleAddress}</p>
		</div>
	);
}

type ProductType = SerializeFrom<
	LegalInvoiceProduct & { product: Product | null }
>;
export function ProductsTable({ products }: { products: Array<ProductType> }) {
	return (
		<div className="border-t border-gray-200">
			<Table className="min-w-sm w-full">
				<TableHead>
					<TableHeadCell className="pl-4">Artículo</TableHeadCell>
					<TableHeadCell>Cant.</TableHeadCell>
					<TableHeadCell>Stock</TableHeadCell>
					<TableHeadCell>Imp.</TableHeadCell>
					<TableHeadCell>Precio</TableHeadCell>
					<TableHeadCell>Desc.</TableHeadCell>
					<TableHeadCell>Total</TableHeadCell>
				</TableHead>

				<TableBody>
					{products.map(product => (
						<ProductItem key={product.id} product={product} />
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function ProductItem({ product }: { product: ProductType }) {
	const { totalDiscount, total } = calculateProductTotal(product, {
		retention: 0,
		taxIncluded: true,
	});

	return (
		<TableRow className="border-b border-gray-200 children:align-bottom text-sm">
			<TableCell className="pl-4">
				<p className="leading-5 mb-2">{product.name}</p>
				<p className="text-xs text-gray-600">{product.notes}</p>
				<p className="text-xs text-gray-600">{product.product?.reference}</p>
				{product.batch ? (
					<p className="text-xs text-gray-600">Lote: {product.batch}</p>
				) : null}
				{product.expirationDate ? (
					<p className="text-xs text-gray-600">
						Exp: {formatDate(product.expirationDate)}
					</p>
				) : null}
				{product.invimaRegistry ? (
					<p className="text-xs text-gray-600">
						Invima: {product.invimaRegistry}
					</p>
				) : null}
			</TableCell>
			<TableCell>{product.quantity}</TableCell>
			<TableCell>
				<p>Ant: {product.oldStock}</p>
				<p>Nuevo: {product.newStock}</p>
			</TableCell>
			<TableCell>{product.tax}%</TableCell>
			<TableCell>${formatCurrency(product.price)}</TableCell>
			<TableCell>${formatCurrency(totalDiscount)}</TableCell>
			<TableCell>${formatCurrency(total)}</TableCell>
		</TableRow>
	);
}

export function RememberToPayAlert({
	expiresAt,
	pending,
}: {
	pending: number;
	expiresAt: string;
}) {
	return (
		<Box className="bg-gray-50 text-center flex flex-col gap-2">
			<p className="text-sm text-gray-700">Factura pendiente de pago</p>
			<p className="font-bold text-xl">${formatCurrency(pending)}</p>
			<DateString>
				<p className="text-sm text-gray-700">
					Vence:{' '}
					<span className="font-medium">
						{formatDate(expiresAt)} {formatHours(expiresAt)}
					</span>
				</p>
			</DateString>
			<Button
				variant="primary"
				className="mt-2"
				type="button"
				onClick={() => {
					const button = document.getElementById(ADD_PAYMENT_BUTTON_ID);
					if (button) button.click();
				}}
			>
				Pagar o abonar a esta factura
			</Button>
		</Box>
	);
}

const ADD_PAYMENT_BUTTON_ID = 'add-payment-button';

type PaymentType = SerializeFrom<
	| LegalInvoicePayment
	| InvoiceRemisionPayment
	| PurchasePayment
	| PurchaseRemisionPayment
>;
export function PaymentsList({
	payments,
	pending,
	isPending,
	invoiceId,
	moduleType,
}: {
	payments: Array<PaymentType>;
	pending: number;
	isPending: boolean;
	invoiceId: number;
	moduleType: PaymentModule;
}) {
	const fetcher = useFetcher();

	if (fetcher.state !== 'idle') return null;

	return (
		<Box>
			<h5>Abonos de pago</h5>

			<div>
				{payments.length ? (
					<ul>
						{payments.map(p => (
							<li
								className={cn(
									'border-b border-gray-200 py-4',
									'flex gap-2 w-full',
									!isPending && 'last-of-type:border-none last-of-type:pb-0',
								)}
								key={p.id}
							>
								<span
									className={cn(
										'grid place-items-center w-8 h-8 bg-success-50',
										'shrink-0 rounded-full text-success-600',
									)}
								>
									<i className="ri-file-line"></i>
								</span>

								<div className="flex-1">
									<div className="flex justify-between flex-1 items-center">
										<div>
											<p className="text-gray-600 text-xs">Abono</p>
											<p># {p.id}</p>
										</div>

										<div>
											<p className="text-gray-600 text-xs text-right">Monto</p>
											<p className="font-bold">${formatCurrency(p.amount)}</p>
										</div>
									</div>

									<DateString>
										<p className="text-gray-700 text-sm">
											{formatDate(p.createdAt)} {formatHours(p.createdAt)}
										</p>
									</DateString>

									<div className="flex gap-2">
										<ClientOnly>
											{() => <PrintPaymentButton payment={p} />}
										</ClientOnly>
										<fetcher.Form method="POST" action="/api/payments-cancel">
											<input type="hidden" name="id" value={p.id} />
											<input type="hidden" name="invoiceId" value={invoiceId} />
											<input type="hidden" name="intent" value="cancel" />
											<input
												type="hidden"
												name="moduleType"
												value={moduleType}
											/>
											<button
												className="mt-2 font-medium text-sm text-error-600 hover:underline"
												type="submit"
											>
												Anular abono
											</button>
										</fetcher.Form>
									</div>
								</div>
							</li>
						))}
					</ul>
				) : (
					<p className="mt-4">
						No hay abonos de pago asociados con esta factura.
					</p>
				)}
			</div>

			{isPending ? (
				<AddPaymentForm
					invoiceId={invoiceId}
					pending={pending}
					moduleType={moduleType}
				/>
			) : null}
		</Box>
	);
}

function PrintPaymentButton({ payment }: { payment: PaymentType }) {
	const componentRef = React.useRef<HTMLDivElement>(null);
	const handlePrint = useReactToPrint({
		content: () => componentRef.current,
		bodyClass: 'p-1',
	});

	return (
		<div>
			<button
				className="mt-2 font-medium text-sm hover:underline"
				type="button"
				onClick={handlePrint}
			>
				Imprimir recibo
			</button>

			<div ref={componentRef} className="hidden print:block text-xs">
				<p className="font-bold mb-2 text-center text-sm">Recibo de abono</p>

				<p>
					<strong>Abono No.</strong> {payment.id}
				</p>
				<p>
					<strong>Monto:</strong> ${formatCurrency(payment.amount)}
				</p>
				<p>
					<strong>Fecha:</strong>{' '}
					<DateString>
						{formatDate(payment.createdAt)} {formatHours(payment.createdAt)}
					</DateString>
				</p>

				<Separator />

				<BillFooter text="Abono generado por Villing" />
			</div>
		</div>
	);
}

type PaymentModule =
	| 'invoice'
	| 'remision'
	| 'purchase-invoice'
	| 'purchase-remision';

function AddPaymentForm({
	pending,
	invoiceId,
	moduleType,
}: {
	pending: number;
	invoiceId: number;
	moduleType: PaymentModule;
}) {
	const [searchParams, setSearchParams] = useSearchParams();
	const pay = searchParams.get('pay') === 'true';
	const [isAdding, setIsAdding] = React.useState(pay);
	const fetcher = useFetcher<any>();
	const paymentSchema = addPaymentFormSchema.transform((value, ctx) => {
		if (value.amount > pending) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `El monto no puede ser mayor a $${formatCurrency(pending)}`,
			});
		}

		return value;
	});
	const [form, fields] = useForm({
		id: 'payment-form',
		constraint: getFieldsetConstraint(paymentSchema),
		onValidate: ({ formData }) => parse(formData, { schema: paymentSchema }),
		shouldValidate: 'onBlur',
		defaultValue: { amount: formatCurrency(pending) },
	});

	React.useEffect(() => {
		if (fetcher.data?.success && fetcher.state === 'loading') {
			setIsAdding(false);
		}
	}, [fetcher.data?.success, fetcher.state]);

	React.useEffect(() => {
		if (pay) setSearchParams({});
	}, [pay, setSearchParams]);

	if (!isAdding) {
		return (
			<Button
				variant="secondary"
				className="mt-4"
				onClick={() => setIsAdding(true)}
				id={ADD_PAYMENT_BUTTON_ID}
			>
				Registrar abono de pago
			</Button>
		);
	}

	return (
		<fetcher.Form
			method="POST"
			{...form.props}
			className="flex flex-col gap-4 pt-4"
			action="/api/payments"
		>
			<input type="hidden" name="id" value={invoiceId} />
			<input type="hidden" name="moduleType" value={moduleType} />

			<p className="font-bold">Nuevo abono de pago</p>

			<Toast variant="info">
				El monto restante es de{' '}
				<span className="font-medium">${formatCurrency(pending)}</span>
			</Toast>

			<div>
				<Label htmlFor={fields.amount.id}>Monto</Label>
				<CurrencyInput
					placeholder="$0.00"
					autoFocus
					onFocus={e => e.target.select()}
					{...conform.input(fields.amount)}
				/>
				<ErrorText id={fields.amount.errorId} className="mt-2">
					{fields.amount.error}
				</ErrorText>
			</div>
			<div>
				<Label htmlFor={fields.method.id}>Método de pago</Label>
				<Select
					options={[
						{ value: 'cash', label: 'Efectivo' },
						{ value: 'credit_card', label: 'Datáfono' },
						{ value: 'transfer', label: 'Transferencia' },
					]}
					{...conform.select(fields.method)}
				/>
			</div>

			<ErrorText id={form.errorId}>{form.error}</ErrorText>

			<div className="flex justify-end gap-4">
				<Button
					variant="secondary"
					type="button"
					onClick={() => setIsAdding(false)}
				>
					Cancelar
				</Button>
				<IntentButton
					intent="submit"
					variant="primary"
					state={fetcher.state !== 'idle' ? 'pending' : undefined}
				>
					Agregar pago
				</IntentButton>
			</div>
		</fetcher.Form>
	);
}

export function TotalsBox({
	products,
	retention,
}: {
	products: Array<ProductType>;
	retention?: number;
}) {
	const {
		total,
		totalTax,
		totalDiscount,
		subtotal,
		totalRefunds,
		totalRetention,
	} = calculateProductsTotal(products, {
		taxIncluded: true,
		retention: retention || 0,
	});

	return (
		<Box>
			<h5 className="mb-4">Totales discriminados</h5>

			<div className="flex flex-col gap-2 text-sm">
				<div className="flex justify-between gap-4">
					<p>Subtotal</p>
					<p className="font-medium">${formatCurrency(subtotal)}</p>
				</div>

				<div className="flex justify-between gap-4">
					<p>Impuestos</p>
					<p className="font-medium">${formatCurrency(totalTax)}</p>
				</div>

				<div className="flex justify-between gap-4">
					<p>Descuentos</p>
					<p className="font-medium">${formatCurrency(totalDiscount)}</p>
				</div>

				{totalRefunds !== 0 ? (
					<div className="flex justify-between gap-4">
						<p>Devoluciones</p>
						<p className="font-medium">${formatCurrency(totalRefunds)}</p>
					</div>
				) : null}

				{totalRetention !== 0 ? (
					<div className="flex justify-between gap-4">
						<p>Retenciones</p>
						<p className="font-medium">-${formatCurrency(totalRetention)}</p>
					</div>
				) : null}

				<div className="flex justify-between gap-4">
					<p>Artículos</p>

					<p>
						{products.length} (
						{products.reduce((acc, curr) => acc + curr.quantity, 0)} unidades)
					</p>
				</div>

				<div className="flex justify-between gap-4 pt-4 mt-2 border-t border-gray-200">
					<p>Total</p>
					<p className="font-bold text-xl">${formatCurrency(total)}</p>
				</div>
			</div>
		</Box>
	);
}

export function InvoicePaidAt({
	expiresInDays,
	invoicePaidAt,
	isCredit,
}: {
	invoicePaidAt: string | null;
	isCredit: boolean;
	expiresInDays: number | null;
}) {
	return (
		<div>
			{typeof expiresInDays === 'number' && isCredit ? (
				<StatusBadge variant="error">
					Esta factura vence en{' '}
					{expiresInDays === 1 ? '1 día' : expiresInDays + ' días'}
				</StatusBadge>
			) : invoicePaidAt && isCredit ? (
				<StatusBadge variant="info">
					Esta factura fue pagada el{' '}
					<DateString>
						{formatDate(invoicePaidAt)} {formatHours(invoicePaidAt)}
					</DateString>
				</StatusBadge>
			) : (
				<span />
			)}
		</div>
	);
}
