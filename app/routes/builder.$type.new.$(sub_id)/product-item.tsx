import * as React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { CircleDotsIcon } from '~/assets/jsx-icons';
import { Checkbox, CheckboxField } from '~/components/checkbox';
import { DatePicker } from '~/components/date-picker';
import { FloatFormatter } from '~/components/float-formatter';
import {
	Select,
	Input,
	Toast,
	CurrencyInput,
	Label,
	Button,
} from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import { TableRow, TableCell, TwoColumnsDiv } from '~/components/ui-library';
import {
	calculateProductTotal,
	parseNumber,
} from '~/modules/invoice/invoice-math';
import { PriceInput } from '~/modules/invoice/product-price-input';
import { useIsMobile } from '~/root';
import { formatCurrency, cn, toNumber } from '~/utils/misc';
import { useBuilderContext } from './builder/context';
import { type ProductType } from './builder/schemas';
import { useLegalActions } from './misc';

export function ProductItemRow({ product }: { product: ProductType }) {
	const id = product.id;
	const {
		dispatch,
		state: { priceListId, config },
	} = useBuilderContext();
	const [isOpen, setIsOpen] = React.useState(false);
	const { total } = calculateProductTotal(product, config);
	const { legalActions } = useLegalActions();

	return (
		<TableRow className="text-sm group hover:bg-gray-100">
			<TableCell className="w-full relative">
				<ProductName product={product} />
				<DiscountOrNotesIndicator product={product} />
			</TableCell>
			<TableCell>
				<QuantityInput product={product} />
			</TableCell>

			{legalActions.includes('see priceColumn') ? (
				<TableCell>
					<label className="sr-only" htmlFor={`${id}-price`}>
						Precio de {product.name}
					</label>
					<PriceInput
						key={priceListId}
						id={`${id}-price`}
						price={product.price}
						prices={product.prices}
						onChange={price => {
							dispatch({
								type: 'updateProduct',
								payload: { id: product.id, price },
							});
						}}
						productName={product.name}
					/>
				</TableCell>
			) : null}

			{legalActions.includes('see stockColumn') ? (
				<TableCell>{product.stock}</TableCell>
			) : null}

			{legalActions.includes('see totalColumn') ? (
				<TableCell>
					<FloatFormatter
						value={total}
						className="text-sm font-normal"
						floatClassName="text-xs"
					/>
				</TableCell>
			) : null}

			<TableCell>
				<div className="flex justify-end group-hover:text-primary-600 hover:scale-110 transition-all">
					<button type="button" onClick={() => setIsOpen(true)}>
						<span className="sr-only">Ver detalles de {product.name}</span>
						<CircleDotsIcon />
					</button>

					{isOpen ? (
						<EditProductDetails
							product={product}
							onClose={() => setIsOpen(false)}
						/>
					) : null}
				</div>
			</TableCell>
		</TableRow>
	);
}

export function MobileProductListItem({ product }: { product: ProductType }) {
	const [isOpen, setIsOpen] = React.useState(false);
	const {
		state: { config, priceListId },
		dispatch,
	} = useBuilderContext();
	const { total } = calculateProductTotal(product, config);
	const id = React.useId();
	const { legalActions } = useLegalActions();

	return (
		<div>
			<div
				className="bg-white rounded-md p-4 flex gap-4 text-sm shadow-sm relative"
				onClick={() => setIsOpen(true)}
			>
				<DiscountOrNotesIndicator product={product} />

				<div className="flex-1">
					<ProductName product={product} className="font-medium" />
					{legalActions.includes('see priceColumn') ? (
						<p>
							${formatCurrency(product.price)} (x{product.quantity})
						</p>
					) : (
						<p>(x{product.quantity})</p>
					)}
				</div>

				{legalActions.includes('see totalColumn') ? (
					<div>
						<FloatFormatter
							value={total}
							className="text-sm font-normal"
							floatClassName="text-xs"
						/>
					</div>
				) : (
					<p>x{product.stock}</p>
				)}
			</div>

			{isOpen ? (
				<EditProductDetails product={product} onClose={() => setIsOpen(false)}>
					<div className="flex gap-4 mb-4 children:flex-1">
						<div>
							<Label>Cantidad</Label>
							<QuantityInput
								product={product}
								className="h-9 w-full text-left pl-3"
							/>
						</div>

						{legalActions.includes('see priceColumn') ? (
							<div>
								<Label htmlFor={`${id}-price`}>Precio</Label>
								<PriceInput
									key={priceListId}
									id={`${id}-price`}
									price={product.price}
									prices={product.prices}
									onChange={price => {
										const id = product.id;
										dispatch({ type: 'updateProduct', payload: { id, price } });
									}}
									className="w-full h-9"
									productName={product.name}
								/>
							</div>
						) : null}
					</div>
				</EditProductDetails>
			) : null}
		</div>
	);
}

type ProductNameProps = { product: ProductType; className?: string };
function ProductName({ product, className }: ProductNameProps) {
	return (
		<div className={className}>
			<p className="flex gap-2 items-center">
				{product.name}
				{product.markedForRefund ? (
					<span className="text-error-600 text-xs">
						<i className="ri-error-warning-line mr-1"></i>
						Devolución
					</span>
				) : null}
			</p>

			{product.ref ? (
				<span className="text-xs text-gray-600 font-normal">{product.ref}</span>
			) : null}
		</div>
	);
}

type EditProductDetailsProps = {
	product: ProductType;
	onClose: () => void;
	children?: React.ReactNode;
};
function EditProductDetails(props: EditProductDetailsProps) {
	const { product, onClose, children } = props;
	const { dispatch } = useBuilderContext();
	const { legalActions } = useLegalActions();
	useHotkeys('esc', onClose);

	return (
		<Modal
			className={cn(
				'p-4 text-sm',
				legalActions.includes('update product prices')
					? 'max-w-2xl'
					: 'max-w-md',
			)}
			onClose={onClose}
		>
			<ModalHeader onClick={onClose} className="mb-4">
				<div>
					<h5 className="leading-5">{product.name}</h5>
					<p className="text-gray-500 text-sm">Modifica el producto</p>
				</div>
			</ModalHeader>

			<div className="flex flex-col lg:flex-row gap-4 children:flex-1">
				<div>
					{children}

					{legalActions.includes('update tax') ? (
						<TaxField product={product} />
					) : null}

					<div className="flex gap-4 mb-4">
						<DiscountField product={product} />
						<NotesField product={product} />
					</div>

					{legalActions.includes('update pharma fields') ? (
						<div className="pt-4 border-t border-gray-200">
							<TwoColumnsDiv className="mb-4">
								<BatchField product={product} />
								<InvimaField product={product} />
							</TwoColumnsDiv>

							<ExpirationDateField product={product} />
						</div>
					) : null}
				</div>

				{legalActions.includes('update product prices') ? (
					<div className="pl-4 border-l border-gray-200">
						<Toast variant="info" className="mb-4">
							<i className="ri-information-line mr-2"></i>
							Actualiza los precios de venta. (IVA incluido)
						</Toast>

						<UpdatePricesList product={product} />
					</div>
				) : null}
			</div>

			{legalActions.includes('update markForRefund') ? (
				<MarkToRefundSwitch product={product} />
			) : null}

			<div className="flex gap-4 justify-between mt-4">
				<Button
					variant="destructive"
					onClick={() => {
						dispatch({ type: 'removeProduct', payload: product.id });
					}}
					type="button"
				>
					<i className="ri-delete-bin-2-line text-sm"></i>
					Eliminar
				</Button>

				<Button variant="black" onClick={onClose} type="button">
					Confirmar cambios
				</Button>
			</div>
		</Modal>
	);
}

function TaxField({ product }: { product: ProductType }) {
	const { dispatch } = useBuilderContext();
	const id = React.useId();

	return (
		<div className="mb-4">
			<Label htmlFor={`${id}-tax`}>Impuesto (%)</Label>
			<Select
				id={`${id}-tax`}
				name="tax"
				options={[
					{ value: 0, label: 'No aplica' },
					{ value: 5, label: '5%' },
					{ value: 8, label: '8%' },
					{ value: 19, label: '19%' },
				]}
				value={product.tax}
				onChange={e => {
					const value = toNumber(e.target.value);
					if (value < 0 || value > 100) return;
					dispatch({
						type: 'updateProduct',
						payload: { id: product.id, tax: value },
					});
				}}
			/>
		</div>
	);
}

function DiscountField({ product }: { product: ProductType }) {
	const { dispatch } = useBuilderContext();
	const id = React.useId();

	return (
		<div className="max-w-min">
			<Label className="whitespace-nowrap" htmlFor={`${id}-discount`}>
				Desc. (%)
			</Label>
			<Input
				id={`${id}-discount`}
				name="discount"
				placeholder="0%"
				value={product.discount}
				onChange={e => {
					const value = toNumber(e.target.value);
					if (value < 0 || value > 100) return;
					dispatch({
						type: 'updateProduct',
						payload: { id: product.id, discount: value },
					});
				}}
				inputMode="numeric"
				onFocus={e => e.target.select()}
			/>
		</div>
	);
}

function NotesField({ product }: { product: ProductType }) {
	const { dispatch } = useBuilderContext();
	const id = React.useId();

	return (
		<div className="flex-1">
			<Label htmlFor={`${id}-notes`}>Notas</Label>
			<Input
				id={`${id}-notes`}
				name="notes"
				placeholder="Notas del producto"
				value={product.notes}
				onChange={e => {
					dispatch({
						type: 'updateProduct',
						payload: { id: product.id, notes: e.target.value },
					});
				}}
			/>
		</div>
	);
}

function BatchField({ product }: { product: ProductType }) {
	const { dispatch } = useBuilderContext();
	const id = React.useId();

	return (
		<div>
			<Label htmlFor={`${id}-batch`}>Lote</Label>
			<Input
				id={`${id}-batch`}
				placeholder="Lote del producto"
				value={product.batch}
				onChange={e => {
					dispatch({
						type: 'updateProduct',
						payload: { id: product.id, batch: e.target.value },
					});
				}}
			/>
		</div>
	);
}

function InvimaField({ product }: { product: ProductType }) {
	const { dispatch } = useBuilderContext();
	const id = React.useId();

	return (
		<div>
			<Label htmlFor={`${id}-invima`}>Registro Invima</Label>
			<Input
				id={`${id}-invima`}
				placeholder="Registro Invima"
				value={product.invimaRegistry}
				onChange={e => {
					dispatch({
						type: 'updateProduct',
						payload: {
							id: product.id,
							invimaRegistry: e.target.value,
						},
					});
				}}
			/>
		</div>
	);
}

function ExpirationDateField({ product }: { product: ProductType }) {
	const { dispatch } = useBuilderContext();
	const id = React.useId();

	return (
		<div>
			<Label htmlFor={`${id}-expirationDate`}>Fecha de vencimiento</Label>
			<DatePicker
				name="expirationDate"
				id={`${id}-expirationDate`}
				className="w-full"
				defaultDate={
					product.expirationDate ? new Date(product.expirationDate) : undefined
				}
				onSave={date => {
					dispatch({
						type: 'updateProduct',
						payload: {
							id: product.id,
							expirationDate: date.toISOString(),
						},
					});
				}}
			/>
		</div>
	);
}

function UpdatePricesList({ product }: { product: ProductType }) {
	const { dispatch } = useBuilderContext();
	const id = React.useId();
	const prices = product.prices;

	return (
		<div className="flex flex-col gap-2">
			{prices.map((price, index) => (
				<div key={index}>
					<Label htmlFor={`${id}-price`}>{price.name}</Label>
					<CurrencyInput
						id={`${id}-price`}
						value={`${formatCurrency(price.price)}`}
						onFocus={e => e.target.select()}
						onValueChange={value => {
							dispatch({
								type: 'updateProduct',
								payload: {
									id: product.id,
									prices: prices.map(p =>
										p.id === price.id ? { ...p, price: toNumber(value) } : p,
									),
								},
							});
						}}
					/>
				</div>
			))}
		</div>
	);
}

function MarkToRefundSwitch({ product }: { product: ProductType }) {
	const { dispatch } = useBuilderContext();
	const isMobile = useIsMobile();

	const onSwitch = () => {
		const markedForRefund = !product.markedForRefund;
		const quantity = markedForRefund
			? toNegativeNumber(product.quantity)
			: toPositiveNumber(product.quantity);

		dispatch({
			type: 'updateProduct',
			payload: { id: product.id, markedForRefund, quantity },
		});

		function toPositiveNumber(value: number) {
			return value < 0 ? value * -1 : value;
		}

		function toNegativeNumber(value: number) {
			return value > 0 ? value * -1 : value;
		}
	};

	useHotkeys('d', onSwitch);

	return (
		<CheckboxField
			label={
				isMobile
					? 'Marcar para devolución'
					: "Marcar para devolución (Presiona 'D' para marcar)"
			}
			className="my-4 text-sm items-start"
		>
			<Checkbox
				className="mt-0.5"
				checked={product.markedForRefund}
				onCheckedChange={onSwitch}
			/>
		</CheckboxField>
	);
}

type QuantityInputProps = { product: ProductType; className?: string };
function QuantityInput({ product, className }: QuantityInputProps) {
	const inputRef = React.useRef<HTMLInputElement>(null);
	const { dispatch } = useBuilderContext();
	const id = product.id;

	React.useEffect(() => {
		if (inputRef.current) {
			inputRef.current.value = product.quantity.toString();
		}
	}, [product.quantity]);

	return (
		<div>
			<label className="sr-only" htmlFor={`${id}-quantity`}>
				Cantidad de {product.name}
			</label>
			<Input
				className={cn('h-7 w-14 text-center px-0', className)}
				id={`${id}-quantity`}
				name="quantity"
				ref={inputRef}
				defaultValue={product.quantity}
				onChange={event => {
					const endsInDot = event.target.value.endsWith('.');
					if (endsInDot) return;

					const value = parseNumber(toNumber(event.target.value));

					if (value < 0) return;

					event.target.value = value.toString();
					dispatch({
						type: 'updateProduct',
						payload: { id: product.id, quantity: value },
					});
				}}
				autoComplete="off"
				onClick={event => {
					event.preventDefault();
				}}
				onFocus={event => {
					event.preventDefault();
					event.target.select();
				}}
				inputMode="numeric"
				onKeyDown={e => {
					if (e.key === 'Enter') {
						const priceInput = document.getElementById(`${id}-price`);
						priceInput?.focus();
					}
				}}
			/>
		</div>
	);
}

function DiscountOrNotesIndicator({ product }: { product: ProductType }) {
	if (!product.discount && !product.notes) return null;

	return (
		<div className="flex absolute left-0 top-0 bg-black text-white text-[10px] leading-4 px-1 gap-1">
			{product.discount ? <span>{product.discount}%</span> : null}
			{product.notes ? <span>Con notas</span> : null}
		</div>
	);
}
