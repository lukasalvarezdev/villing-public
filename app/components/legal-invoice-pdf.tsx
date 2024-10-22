import QRCode from 'react-qr-code';
import { ClientOnly } from '~/components/client-only';
import {
	calculateProductTotal,
	calculateProductsTotal,
} from '~/modules/invoice/invoice-math';
import { defaultConfig } from '~/routes/builder.$type.new.$(sub_id)/builder/context';
import { cn, formatCurrency, formatDate, formatHours } from '~/utils/misc';

export function LegalInvoicePdf({
	children,
	textInInvoice,
}: {
	children: React.ReactNode;
	textInInvoice?: string | null;
}) {
	return (
		<div
			className="h-screen text-[9px] flex flex-col"
			style={{ fontFamily: 'Hepta Slab, sans-serif' }}
		>
			<div className="flex-1">{children}</div>

			<footer className="leading-4 pb-4">
				{textInInvoice ? <p>{textInInvoice}</p> : null}
				<p>Factura generada por Villing</p>
				<p>
					<strong>Página web </strong>
					<span>villing.io</span>
				</p>
			</footer>
		</div>
	);
}

type InvoiceHeadingProps = {
	logo?: string;
	number: string;
	reference?: string;
	createdAt: string;
	expiresAt: string | null;
	userName?: string;
	branchName?: string;

	name: string;
	idNumber: string;
	address: string;
	email: string;
	website: string | null;
	phone: string;

	resolution: string;
	title?: string;

	children?: React.ReactNode;
};
export function InvoiceHeading(props: InvoiceHeadingProps) {
	const {
		logo,
		number,
		reference: ref,
		createdAt,
		expiresAt,
		branchName,
		userName,

		name,
		idNumber,
		address,
		email,
		website,
		phone,

		resolution,
		title,
		children,
	} = props;

	return (
		<div className="flex gap-6 h-32">
			<div className="w-32 border-b border-gray-400 border-dotted">
				<div className="w-20 h-20">
					{logo ? (
						<img src={logo} alt="Logo" className="max-h-full max-w-full" />
					) : null}
				</div>
			</div>

			<div className={cn('flex-1 border-t pt-2 border-black')}>
				<div className="border-b border-gray-400 border-dotted h-full flex flex-col justify-between">
					<div className="flex flex-row-reverse justify-between gap-6">
						<div className="text-right">
							<h1 className="text-base leading-3">
								{title || 'Factura electrónica'}
							</h1>
							<p className="font-bold">{number}</p>
							{ref ? <p className="font-bold">Factura: {ref}</p> : null}

							<div className="leading-4">
								{children ?? (
									<div>
										<p className="border-b border-gray-400 mb-0.5">
											<strong>Creación </strong>
											<span>
												{formatDate(createdAt)} {formatHours(createdAt)}
											</span>
										</p>

										{expiresAt ? (
											<p className="border-b border-gray-400">
												<strong>Vence </strong>
												<span>
													{formatDate(expiresAt)} {formatHours(expiresAt)}
												</span>
											</p>
										) : null}

										{userName ? (
											<p className="border-b border-gray-400">
												<strong>Vendedor </strong>
												<span>{userName}</span>
											</p>
										) : null}

										{branchName ? (
											<p className="border-b border-gray-400">
												<strong>Caja </strong>
												<span>{branchName}</span>
											</p>
										) : null}
									</div>
								)}
							</div>
						</div>

						<div className="flex-1">
							<p className="leading-5 font-bold">{name}</p>
							<p className="leading-3">{idNumber}</p>
							<p className="leading-3">{address}</p>
							<p className="leading-3">{email}</p>
							<p className="leading-3">{phone}</p>
							{website ? <p className="leading-3">{website}</p> : null}
						</div>
					</div>

					<p>{resolution}</p>
				</div>
			</div>
		</div>
	);
}

type InvoiceRecipientProps = {
	name: string;
	idNumber: string;
	address: string;
	email: string;
	phone: string;

	children?: React.ReactNode;
};
export function InvoiceRecipient(props: InvoiceRecipientProps) {
	const { name, idNumber, address, email, phone, children } = props;
	return (
		<div className="flex border-b border-gray-400 border-dotted py-4 mb-4">
			<div className="flex-1">
				<p className="leading-3 font-bold mb-2 text-xs">RECEPTOR</p>

				<p className="leading-5 font-bold">{name}</p>
				<p className="leading-3">{idNumber}</p>
				<p className="leading-3">{address}</p>
				<p className="leading-3">{email}</p>
				<p className="leading-3">{phone}</p>
			</div>

			<div>{children}</div>
		</div>
	);
}

type InvoiceTotalsProps = {
	products: Array<ProductItemType>;
	cufe?: string | null;
};

export function InvoiceTotals({ products, cufe }: InvoiceTotalsProps) {
	const { total, subtotal, totalDiscount, totalTax } = calculateProductsTotal(
		products,
		defaultConfig,
	);

	return (
		<div className="flex justify-end pt-2 gap-6">
			<div className="flex-1 flex flex-col justify-end border-b border-dotted border-black">
				<p
					className="text-[8px] break-words mt-1"
					style={{ lineHeight: '1.5' }}
				>
					{cufe}
				</p>
			</div>
			<div className="w-52 flex flex-col">
				<div
					className={cn(
						'border-b border-dotted border-gray-400 pr-2',
						'flex justify-between items-center',
					)}
				>
					<p>SUBTOTAL</p>
					<p>${formatCurrency(subtotal)}</p>
				</div>

				<div
					className={cn(
						'border-b border-dotted border-gray-400 pr-2',
						'flex justify-between items-center',
					)}
				>
					<p>DESCUENTOS</p>
					<p>${formatCurrency(totalDiscount)}</p>
				</div>

				<div className="flex justify-between items-center pr-2">
					<p>IVA</p>
					<p>${formatCurrency(totalTax)}</p>
				</div>

				<div className="flex justify-between items-center h-full border-y border-black">
					<p className="font-bold">TOTAL</p>

					<p
						className={cn(
							'font-bold text-sm h-full',
							'flex items-center pr-2 pl-6',
						)}
					>
						${formatCurrency(total)}
					</p>
				</div>
			</div>
		</div>
	);
}

export function InvoiceObservations({
	notes = 'Sin observaciones.',
}: {
	notes: string | null;
}) {
	return (
		<div className="flex justify-end pt-2 gap-6">
			<div className="flex-1">
				<p>
					<strong>Observaciones: </strong>
					<span>{notes}</span>
				</p>

				<div className="flex gap-6 mt-32 justify-between">
					<div className="flex-1 max-w-40">
						<div className="border-b border-gray-800" />
						<p>Firma emisor</p>
					</div>

					<div className="flex-1 max-w-40">
						<div className="border-b border-gray-800" />
						<p>Firma receptor</p>
					</div>
				</div>
			</div>
			<div className="w-52"></div>
		</div>
	);
}

type ProductItemType = {
	name: string;
	reference?: string | null;
	notes?: string | null;
	quantity: number;
	discount: number;
	price: number;
	tax: number;
	batch?: string | null;
	expirationDate?: string | null;
};
type ProductsTableProps = {
	products: Array<ProductItemType>;
};
export function InvoiceProductsTable({ products }: ProductsTableProps) {
	return (
		<table className="mx-auto w-full table-auto border-b border-black border-dotted">
			<thead>
				<tr className="text-left children:pb-1 children:font-normal border-b border-black">
					<th>ITEM</th>
					<th className="pl-1">CANT</th>
					<th className="pl-1">PRECIO</th>
					<th className="pl-1">DESC.</th>
					<th className="pl-1">TOTAL</th>
				</tr>
			</thead>

			<tbody className="text-[9px]">
				{products.map((product, index) => (
					<ProductItem key={index} {...product} />
				))}
			</tbody>
		</table>
	);
}

export function ProductItem(product: ProductsTableProps['products'][0]) {
	const {
		name,
		reference,
		notes,
		quantity,
		price,
		tax,
		batch,
		expirationDate: expiresAt,
	} = product;
	const { total, totalDiscount } = calculateProductTotal(
		{ ...product },
		defaultConfig,
	);

	return (
		<tr
			className={cn(
				'text-left align-center border-b border-gray-400 border-dotted',
				'last:border-b-0 last:border-dotted-0 even:bg-gray-50',
			)}
		>
			<td className="leading-4">
				<p className="break-words uppercase">{name}</p>
				{reference ? <p className="text-[8px]">{reference}</p> : null}
				{notes ? <p className="text-[8px] text-gray-500">{notes}</p> : null}
				{batch || expiresAt ? (
					<div className="flex gap-2 text-[8px] text-gray-500">
						{batch ? <p>Lote: {batch}</p> : null}
						{expiresAt ? <p>Vence: {formatDate(expiresAt)}</p> : null}
					</div>
				) : null}
			</td>
			<td className="pl-1">{quantity}</td>
			<td className="pl-1">
				${formatCurrency(price)} {tax ? `(IVA ${tax}%)` : null}
			</td>
			<td className="pl-1">${formatCurrency(totalDiscount)}</td>
			<td className="pl-1">${formatCurrency(total)}</td>
		</tr>
	);
}

export function InvoiceQR({ url }: { url: string }) {
	return (
		<ClientOnly>
			{() => (
				<div className="w-[100px]">
					<QRCode value={url} size={100} />
				</div>
			)}
		</ClientOnly>
	);
}
