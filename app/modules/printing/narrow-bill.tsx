import { DateString } from '~/components/client-only';
import { type DivProps } from '~/components/ui-library';
import { useOrganization } from '~/root';
import {
	formatDate,
	formatHours,
	parsePaymentMethod,
	formatCurrency,
	cn,
	toNumber,
} from '~/utils/misc';
import { calculateProductTotal } from '../invoice/invoice-math';

type ProductToPrintType = {
	internalId: number;
	name: string;
	reference?: string;
	batch?: string;
	notes?: string;
	expirationDate?: string;
	quantity: number;
	price: number;
	tax: number;
	discount: number;
	invimaRegistry?: string;
};

export function Separator(props: DivProps) {
	return (
		<div
			{...props}
			className={cn(
				'border-b border-black border-dashed my-1',
				props.className,
			)}
		/>
	);
}

export function OrganizationLogo({ logoUrl }: { logoUrl: string }) {
	return (
		<img
			id="logo-img"
			src={logoUrl}
			alt="logo de la empresa"
			className="mx-auto mb-2 h-full max-h-20 max-w-[5rem]"
			loading="eager"
		/>
	);
}

export function OrganizationInfo({
	name: defaultName,
	nit: defaultNit,
	tel: defaultTel,
	address: defaultAddress,
	text,
	children,
}: {
	name?: string;
	nit?: string;
	tel?: string;
	address?: string;
	text: string;
	children?: React.ReactNode;
}) {
	const {
		name,
		tradeName,
		email,
		address,
		idNumber,
		tel: telephone,
		website,
	} = useOrganization();

	const nit = defaultNit || idNumber;
	const baseTel = defaultTel || telephone;
	const baseAddress = defaultAddress || address;

	return (
		<div className="children:leading-4">
			<div className="text-center">
				<p className="font-bold uppercase text-xs">{tradeName}</p>
				<p className="mb-1 font-bold uppercase text-xs">
					{defaultName || name}
				</p>
				<p className="mb-2 text-center text-xs">{text}</p>
				{children}
			</div>

			<div className="text-left children:leading-4">
				{nit ? (
					<p>
						<strong>Nit:</strong> {nit}
					</p>
				) : null}
				<p>
					<strong>Email:</strong> {email}
				</p>
				{baseTel ? (
					<p>
						<strong>Tel:</strong> {baseTel}
					</p>
				) : null}
				{baseAddress ? (
					<p>
						<strong>Dir:</strong> {baseAddress}
					</p>
				) : null}

				{website ? (
					<p>
						<span className="font-bold">{website}</span>
					</p>
				) : null}
			</div>
		</div>
	);
}

export function ResolutionInfo({
	from,
	from_date,
	number,
	prefix,
	to,
	to_date,
	hide = false,
}: {
	number: string;
	from_date: string;
	to_date: string;
	prefix: string;
	from: number;
	to: number;
	hide?: boolean;
}) {
	if (hide) return null;

	return (
		<p className="leading-4 text-center">
			Autorización de numeración {number} del{' '}
			<DateString>
				<span>
					{formatDate(from_date!)} desde {prefix} {from} hasta {prefix} {to}.
					Vigencia: {formatDate(to_date!)}
				</span>
			</DateString>
		</p>
	);
}

export function DateMetadataInfo({
	createdAt,
	receivedAt,
	expiresAt,
}: {
	createdAt: string;
	receivedAt?: string | null;
	expiresAt?: string | null;
}) {
	return (
		<div className="children:leading-4">
			<DateString>
				<p>
					Facturación: {formatDate(createdAt)} {formatHours(createdAt)}
				</p>

				<p>
					Impresión: {formatDate(new Date())} {formatHours(new Date())}
				</p>

				{receivedAt ? (
					<p>
						Fecha de recepción: {formatDate(receivedAt)}{' '}
						{formatHours(receivedAt)}
					</p>
				) : null}

				{expiresAt ? (
					<p>
						Vence: {formatDate(expiresAt)} {formatHours(expiresAt)}
					</p>
				) : null}
			</DateString>
		</div>
	);
}

export function RecipientInfo({
	address,
	name,
	nit,
	tel,
	title,
	city,
	department,
}: {
	name: string;
	nit: string;
	tel: string;
	address: string;
	title: string;
	city?: string;
	department?: string;
}) {
	return (
		<section className="leading-4">
			<p>
				<span className="font-bold">{title}:</span> {name}
			</p>
			<div className="flex gap-2 flex-wrap children:">
				<p>
					<span className="font-bold">CC/NIT:</span> {nit}
				</p>
				<p>
					<span className="font-bold">Tel:</span> {tel}
				</p>
			</div>
			<p>
				<span className="font-bold">Dir:</span> {address}
			</p>

			{city ? (
				<p>
					<span className="font-bold">Ciudad:</span> {city},{' '}
					{department || 'N/A'}
				</p>
			) : null}
		</section>
	);
}

export function ProductsTable({
	products,
}: {
	products: Array<ProductToPrintType>;
}) {
	return (
		<section className="leading-4">
			<table className="mx-auto w-full table-auto">
				<thead>
					<tr className="text-left children:pb-1">
						<th>Art.</th>
						<th className="pl-1">Cant.</th>
						<th className="pl-1">Valor.</th>
						<th className="pl-1">Total</th>
					</tr>
				</thead>

				<tbody>
					{products.map((product, index) => (
						<PrintableInvoiceProductItem key={index} product={product} />
					))}
				</tbody>
			</table>
		</section>
	);
}

function PrintableInvoiceProductItem({
	product,
	percentage,
	taxIncluded = true,
}: {
	product: ProductToPrintType;
	taxIncluded?: boolean;
	percentage?: number;
}) {
	const { total } = calculateProductTotal(product, {
		taxIncluded,
		retention: percentage || 0,
	});
	const [integer, decimal] = total.toFixed(2).split('.');

	return (
		<tr className="text-left align-top">
			<td>
				<p className="break-words uppercase">{product.name}</p>

				<div className="flex gap-2">
					{product.reference?.trim() ? (
						<p className="text-[9px]">Ref. {product.reference}</p>
					) : null}
					{product.batch ? (
						<p className="text-[9px]">Lote. {product.batch}</p>
					) : null}
				</div>

				<div className="flex gap-2">
					{product.invimaRegistry ? (
						<p className="text-[9px]">Invima. {product.invimaRegistry}</p>
					) : null}
					{product.expirationDate ? (
						<p className="text-[9px]">
							Vence: {formatDate(product.expirationDate)}
						</p>
					) : null}
				</div>

				{product.notes ? <p className="text-[9px]">{product.notes}</p> : null}
			</td>
			<td className="pl-1">x{product.quantity}</td>
			<td className="pl-1">${formatCurrency(product.price)}</td>
			<td className="pl-1">
				<div className="flex gap-1">
					<p>
						$<span>{formatCurrency(toNumber(integer))}</span>
						{decimal !== '00' ? (
							<span className="text-[9px]">.{decimal}</span>
						) : null}
					</p>

					{product.discount ? (
						<span className="text-[9px]">(-%{product.discount})</span>
					) : null}
				</div>
			</td>
		</tr>
	);
}

export function TotalsInfo({
	subtotal,
	total,
	totalCollected,
	totalDiscount,
	totalTax,
	totalRefunds,
	totalRetention,
}: {
	subtotal: number;
	totalTax: number;
	totalDiscount: number;
	totalCollected: number;
	total: number;
	totalRefunds?: number;
	totalRetention?: number;
}) {
	const toReturn = totalCollected - total;

	return (
		<div className="leading-4">
			<div className="flex justify-between items-center">
				<span className="font-bold">Subtotal:</span>
				<p>${formatCurrency(subtotal)}</p>
			</div>

			<div className="flex justify-between items-center">
				<span className="font-bold">Impuestos:</span>
				<p>${formatCurrency(totalTax)}</p>
			</div>

			<div className="flex justify-between items-center mb-1">
				<span className="font-bold">Descuentos:</span>
				<p>${formatCurrency(totalDiscount)}</p>
			</div>

			{totalRetention ? (
				<div className="flex justify-between items-center mb-1">
					<span className="font-bold">Retenciones:</span>
					<p>${formatCurrency(totalRetention)}</p>
				</div>
			) : null}

			{totalRefunds && totalRefunds !== 0 ? (
				<div className="flex justify-between items-center mb-1">
					<span className="font-bold">Devoluciones:</span>
					<p>${formatCurrency(totalRefunds)}</p>
				</div>
			) : null}

			<div className="flex justify-between items-center">
				<span className="font-bold">TOTAL:</span>
				<strong>${formatCurrency(total)}</strong>
			</div>

			<Separator />

			<div className="leading-4">
				<div className="flex justify-between items-center">
					<span className="font-bold">Recibido:</span>
					<p>${formatCurrency(totalCollected)}</p>
				</div>

				<div className="flex justify-between items-center">
					<span className="font-bold">Devuelta:</span>
					<p>${formatCurrency(toReturn > 0 ? toReturn : 0)}</p>
				</div>
			</div>
		</div>
	);
}

export function NotesInfo({ notes }: { notes: string | null }) {
	if (!notes) return null;

	return (
		<p className="text-left mt-1">
			<span className="font-bold">Observaciones:</span> {notes}
		</p>
	);
}

function getDaysFromNow(date: string) {
	const now = new Date();
	const then = new Date(date);

	const diff = now.getTime() - then.getTime();
	const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

	return days;
}

export function PaymentInfo({
	subOrgName,
	payment_forms,
	userName,
	expiresAt,
}: {
	payment_forms: Array<{
		type: 'cash' | 'card' | 'transfer' | 'loan';
		amount: number;
	}>;
	userName?: string;
	subOrgName?: string;
	expiresAt?: string | null;
}) {
	const paymentTerm = expiresAt ? getDaysFromNow(expiresAt) : 0;

	return (
		<section className="leading-4">
			{userName ? (
				<p>
					<span className="font-bold">Vendedor:</span> {userName}
				</p>
			) : null}
			{subOrgName ? (
				<p>
					<span className="font-bold">Caja:</span> {subOrgName}
				</p>
			) : null}

			<div>
				<span className="font-bold">Medios de pago:</span>
				<ul className="list-disc pl-6">
					{payment_forms.map((p, index) => (
						<li key={index}>
							{parsePaymentMethod(p.type)} ${formatCurrency(p.amount)}
						</li>
					))}
				</ul>
			</div>

			{expiresAt ? (
				<p>
					<strong>Forma de pago: </strong>

					{paymentTerm > 0 ? (
						<span>Crédito a {paymentTerm} días</span>
					) : (
						<span>De contado</span>
					)}
				</p>
			) : null}
		</section>
	);
}

export function BillFooter({
	text_in_invoice,
	text = 'Factura generada por Villing',
}: {
	text_in_invoice?: string;
	text?: string;
}) {
	return (
		<div className="mt-2 text-center leading-4">
			{text_in_invoice ? <p className="font-bold">{text_in_invoice}</p> : null}

			<p>
				{text}, visita <span className="underline">villing.io</span>
			</p>
		</div>
	);
}
