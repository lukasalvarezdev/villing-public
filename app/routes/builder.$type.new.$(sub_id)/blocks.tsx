import { Link, useSearchParams } from '@remix-run/react';
import * as React from 'react';
import { DatePicker } from '~/components/date-picker';
import { FloatFormatter } from '~/components/float-formatter';
import {
	Button,
	Input,
	Label,
	LinkButton,
	Select,
	Toast,
} from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '~/components/primitives/dropdown';
import {
	Container,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeadCell,
	TableRow,
} from '~/components/ui-library';
import {
	creditNoteCorrectionResponses,
	debitNoteCorrectionResponses,
} from '~/utils/legal-values';
import { cn, formatCurrency, safeNewDate, toNumber } from '~/utils/misc';
import { BranchSelect, BranchToTransferSelect } from './branch-select';
import { useBuilderContext, useBuilderTotals } from './builder/context';
import { type ProductType } from './builder/schemas';
import { BuilderRecipients } from './builder-recipients';
import {
	ConfirmInvoiceButton,
	OtherActionsButton,
} from './confirm-invoice-button';
import { CreateProductButton } from './create-product/form';
import { SeeLastInvoiceButton } from './last-invoice-button';
import { useBuilderTexts, useLegalActions, useOriginInvoice } from './misc';
import { PaymentFormsForm } from './payment-methods';
import { PriceListSelect } from './price-list-selector';
import { MobileProductListItem, ProductItemRow } from './product-item';
import { ProductSearchCombobox } from './products-search/combobox';
import { RetentionSelect } from './retention-select';
import { SaleSettingsButton } from './sale-settings-button';
import { VillingLogo } from './villing-logo';

export function MobileLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex flex-col h-[100svh] bg-slate-100 justify-between">
			{children}
		</div>
	);
}

function ProductsSearchBlock() {
	const { dispatch } = useBuilderContext();
	const [searchParams] = useSearchParams();
	const highlight = searchParams.get('onboarding') === 'true';

	const onAdd = React.useCallback(
		(product: ProductType) => {
			dispatch({ type: 'addProduct', payload: product });
		},
		[dispatch],
	);

	return (
		<div className="flex gap-2 items-end flex-1">
			<div className="flex-1">
				<ProductSearchCombobox />
			</div>
			<CreateProductButton onCreate={onAdd} highlight={highlight} />
		</div>
	);
}

MobileLayout.Heading = () => {
	return (
		<header className="h-14 bg-white shadow-md w-full fixed top-0 z-10">
			<Container className="flex gap-4 items-center h-full">
				<VillingLogo />
				<div className="flex-1">
					<ProductsSearchBlock />
				</div>
			</Container>
		</header>
	);
};

MobileLayout.ProductsList = ProductsList;

MobileLayout.Footer = function Footer() {
	const { total } = useBuilderTotals();

	return (
		<div>
			<div className="p-4 pb-2">
				<ConfirmInvoiceButton showActionsButton={false}>
					<p className="flex justify-between w-full text-sm items-center">
						<span className="font-medium">Confirmar detalles</span>
						<span className="text-base font-bold">
							${formatCurrency(total)}
						</span>
					</p>
				</ConfirmInvoiceButton>
			</div>

			<div className="bg-white w-full py-3 shadow-negative-sm">
				<div className="flex justify-around gap-4 text-xl w-[80%] mx-auto children:flex-1">
					<InvoiceDetailsButton />
					<OtherActionsButton>
						{({ onClick }) => (
							<button className="text-center" onClick={onClick}>
								<p className="grid place-items-center mx-auto">
									<i className="ri-add-circle-line"></i>
								</p>
								<p className="text-xs leading-3 font-medium">Otras acciones</p>
							</button>
						)}
					</OtherActionsButton>

					<div className="children:text-center">
						<SettingsButton>
							<button className="text-center">
								<p className="grid place-items-center mx-auto">
									<i className="ri-equalizer-2-line"></i>
								</p>
								<p className="text-xs leading-3 font-medium">Ajustes</p>
							</button>
						</SettingsButton>
					</div>
				</div>
			</div>
		</div>
	);
};

function InvoiceDetailsButton() {
	const [isOpen, setIsOpen] = React.useState(false);
	const { legalActions } = useLegalActions();

	return (
		<div className="text-center">
			<button className="text-center" onClick={() => setIsOpen(true)}>
				<p className="grid place-items-center mx-auto">
					<i className="ri-more-fill"></i>
				</p>
				<p className="text-xs leading-3 font-medium">Detalles</p>
			</button>
			{isOpen ? (
				<Modal onClose={() => setIsOpen(false)}>
					<ModalHeader onClick={() => setIsOpen(false)} className="mb-4">
						<h4>Detalles de la venta</h4>
					</ModalHeader>

					<div className="flex flex-col gap-4 pb-4 border-b border-gray-200 mb-4">
						<BranchSelect />
						<BuilderRecipients />

						{legalActions.includes('update priceList') ? (
							<PriceListSelect />
						) : null}
					</div>

					<div className="flex flex-col gap-4">
						{legalActions.includes('update paymentForms') ? (
							<PaymentFormsForm />
						) : null}

						{legalActions.includes('update globalDiscount') ? (
							<GlobalDiscountField />
						) : null}

						{legalActions.includes('update stockType') ? (
							<StockTypeField />
						) : null}

						{legalActions.includes('update stockType') ? (
							<StockIncomeOrExitField />
						) : null}

						<Button variant="secondary" onClick={() => setIsOpen(false)}>
							Cerrar
						</Button>
					</div>
				</Modal>
			) : null}
		</div>
	);
}

export function DesktopLayout({ children }: { children: React.ReactNode }) {
	return (
		<div
			className={cn(
				'flex h-[100svh] mx-auto max-w-7xl relative',
				'bg-slate-50 border-l border-gray-100',
			)}
		>
			{children}
		</div>
	);
}

DesktopLayout.ProductsColumn = function ProductsColumn() {
	const { legalActions } = useLegalActions();

	return (
		<div className="flex flex-col gap-4 w-2/3 p-8">
			<div className="flex gap-4 items-end">
				<ProductsSearchBlock />
				{legalActions.includes('update priceList') ? <PriceListSelect /> : null}
			</div>

			<ProductsTable />
		</div>
	);
};

DesktopLayout.SummaryColumn = function SummaryColumn() {
	const { legalActions } = useLegalActions();
	const { title } = useBuilderTexts();

	return (
		<div
			className={cn(
				'w-1/3 p-8 bg-white border-x border-gray-100 min-w-[420px]',
				'flex flex-col justify-between',
			)}
		>
			<div className="flex justify-between items-center mb-4">
				<div className="flex gap-4 items-center">
					<VillingLogo />
					<h4>{title}</h4>
				</div>

				<div className="flex gap-4">
					<SeeLastInvoiceButton />
					<LinkButton
						to="/home"
						variant="secondary"
						prefetch="intent"
						className="w-9 h-9"
					>
						<i className="ri-logout-circle-line"></i>
						<span className="sr-only">Volver al inicio</span>
					</LinkButton>
				</div>
			</div>

			<div className="flex-1">
				<div
					className={cn(
						'flex flex-col gap-4 pb-4 mb-4',
						'border-b border-gray-200',
					)}
				>
					<div className="flex gap-4 items-end">
						<BranchSelect className="flex-1" />
						<SettingsButton>
							<Button variant="secondary">
								<i className="ri-equalizer-2-line"></i>
								<span>Ajustes</span>
							</Button>
						</SettingsButton>
					</div>

					{legalActions.includes('see branchToTransfer') ? (
						<BranchToTransferSelect />
					) : null}

					<BuilderRecipients />
					{legalActions.includes('see originInvoice') ? (
						<OriginInvoice />
					) : null}
				</div>

				<div className="flex flex-col gap-4">
					<h6>Detalles</h6>

					{legalActions.includes('update paymentForms') ? (
						<PaymentFormsForm />
					) : null}

					{legalActions.includes('update globalDiscount') ? (
						<GlobalDiscountField />
					) : null}

					{legalActions.includes('update stockType') ? (
						<StockTypeField />
					) : null}

					{legalActions.includes('update stockType') ? (
						<StockIncomeOrExitField />
					) : null}

					{legalActions.includes('update creditNoteReason') ? (
						<CreditNoteReasonSelect />
					) : null}
					{legalActions.includes('update debitNoteReason') ? (
						<DebitNoteReasonSelect />
					) : null}
					{legalActions.includes('update receivedAt') &&
					legalActions.includes('update externalInvoiceId') ? (
						<PurchaseFields />
					) : null}
					{legalActions.includes('update retention') ? (
						<RetentionSelect />
					) : null}
				</div>
			</div>

			<div>
				<GrandTotalSummary />
				<ConfirmInvoiceButton />
			</div>
		</div>
	);
};

export function SettingsButton({ children }: { children: React.ReactNode }) {
	const {
		state: { subId },
		dispatch,
	} = useBuilderContext();
	const { legalActions } = useLegalActions();

	const className = cn(
		'hover:bg-gray-50 text-sm w-full rounded px-4 py-1.5',
		'flex gap-4 items-center',
	);

	return (
		<div>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>

				<DropdownMenuContent align="end" className="bg-white min-w-40">
					{legalActions.includes('close cashier') ? (
						<DropdownMenuItem asChild>
							<Link
								className={className}
								to="/invoices/pos/new"
								prefetch="intent"
							>
								<i className="ri-lock-line"></i>
								Cerrar el cajero
							</Link>
						</DropdownMenuItem>
					) : null}

					<DropdownMenuItem asChild>
						<button
							className={className}
							onClick={() => dispatch({ type: 'resetSale' })}
						>
							<i className="ri-loop-left-line"></i>
							Limpiar la venta
						</button>
					</DropdownMenuItem>

					{legalActions.includes('update config') ? (
						<div>
							<DropdownMenuItem asChild>
								<Link
									className={className}
									to={{
										pathname: `/settings/suborganizations/${subId}`,
										search: '?from=pos',
									}}
									prefetch="intent"
								>
									<i className="ri-settings-line"></i>
									Ajustes de sucursal
								</Link>
							</DropdownMenuItem>
						</div>
					) : null}

					{legalActions.includes('update general config') ? (
						<SaleSettingsButton />
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

function GrandTotalSummary() {
	const {
		state: { products },
	} = useBuilderContext();
	const { total } = useBuilderTotals();
	const { legalActions } = useLegalActions();
	const quantity = products.reduce((acc, product) => acc + product.quantity, 0);
	const text = quantity === 1 ? 'unidad' : 'unidades';

	return (
		<div className="mb-4">
			<p className="text-sm text-gray-600">
				{products.length} artículos ({quantity} {text})
			</p>

			{legalActions.includes('see totalColumn') ? (
				<div className="flex justify-between items-center">
					<p className="font-medium text-sm">Total:</p>
					<FloatFormatter value={total} />
				</div>
			) : null}
		</div>
	);
}

function ProductsTable() {
	const {
		state: { products },
	} = useBuilderContext();
	const { legalActions } = useLegalActions();

	return (
		<Table id="products">
			<TableHead>
				<TableHeadCell>Nombre</TableHeadCell>
				<TableHeadCell>Cant.</TableHeadCell>

				{legalActions.includes('see priceColumn') ? (
					<TableHeadCell>Precio</TableHeadCell>
				) : null}
				{legalActions.includes('see totalColumn') ? (
					<TableHeadCell>Total</TableHeadCell>
				) : null}
				{legalActions.includes('see stockColumn') ? (
					<TableHeadCell>Stock</TableHeadCell>
				) : null}
			</TableHead>
			<TableBody>
				{products.length ? (
					products.map(product => (
						<ProductItemRow key={product.id} product={product} />
					))
				) : (
					<TableRow className="text-sm">
						<TableCell className="w-full relative text-gray-600">
							No hay productos en la venta. Presiona la tecla / para buscar un
							producto
						</TableCell>
					</TableRow>
				)}
			</TableBody>
		</Table>
	);
}

function ProductsList() {
	const {
		state: { products },
	} = useBuilderContext();

	return (
		<div className="flex-1 p-4 flex flex-col gap-4 pb-36 bg-slate-100 pt-[calc(60px+1rem)]">
			{products.length ? (
				<p className="text-sm">Presiona un producto para editar</p>
			) : (
				<p className="text-sm">
					Presiona en la barra de búsqueda para comenzar con tu venta
				</p>
			)}

			<ul id="products" className="flex flex-col gap-2">
				{products.map(product => (
					<MobileProductListItem key={product.id} product={product} />
				))}
			</ul>
		</div>
	);
}

function GlobalDiscountField() {
	const { dispatch } = useBuilderContext();

	return (
		<div>
			<Label htmlFor="global-discount">Descuento global (%)</Label>
			<Input
				id="global-discount"
				placeholder="0%"
				type="number"
				autoComplete="off"
				onChange={e => {
					const numberValue = toNumber(e.target.value);

					if (numberValue < 0) return;
					if (numberValue > 100) return;

					dispatch({ type: 'setGlobalDiscount', payload: numberValue });
				}}
				onFocus={e => e.currentTarget.select()}
				inputMode="numeric"
			/>
		</div>
	);
}

function StockTypeField() {
	const {
		state: { stockType, transferToBranchId },
		dispatch,
	} = useBuilderContext();

	return (
		<div>
			<Label htmlFor="stockType">Tipo de ajuste</Label>
			<Select
				id="stockType"
				name="stockType"
				value={stockType}
				disabled={Boolean(transferToBranchId)}
				onChange={e => {
					dispatch({
						type: 'setStockType',
						payload: e.currentTarget.value as typeof stockType,
					});
				}}
				options={[
					{ value: 'partial', label: 'Ajuste parcial' },
					{ value: 'total', label: 'Ajuste total' },
				]}
			/>

			{transferToBranchId ? (
				<p className="text-xs mt-1 text-gray-500">
					Estás transfiriendo inventario, por lo que no puedes hacer un ajuste.
				</p>
			) : null}
		</div>
	);
}

function StockIncomeOrExitField() {
	const {
		state: { stockIncomeOrExit, stockType, transferToBranchId },
		dispatch,
	} = useBuilderContext();
	const disabled = Boolean(stockType === 'total' || transferToBranchId);

	return (
		<div>
			<Label htmlFor="stockIncomeOrExit">Ingreso o egreso</Label>
			<Select
				id="stockIncomeOrExit"
				name="stockIncomeOrExit"
				value={stockIncomeOrExit}
				onChange={e => {
					dispatch({
						type: 'setStockIncomeOrExit',
						payload: e.currentTarget.value as typeof stockIncomeOrExit,
					});
				}}
				disabled={disabled}
				options={[
					{ value: 'income', label: 'Ingreso de inventario' },
					{ value: 'exit', label: 'Egreso de inventario' },
				]}
			/>

			{stockType === 'total' ? (
				<Toast variant="info" className="mt-2">
					Si el ajuste es total, solo puedes seleccionar ingreso de inventario.
				</Toast>
			) : null}

			{transferToBranchId ? (
				<p className="text-xs mt-1 text-gray-500">
					Estás transfiriendo inventario, por lo que no puedes hacer un ajuste.
				</p>
			) : null}
		</div>
	);
}

function PurchaseFields() {
	const {
		dispatch,
		state: { externalInvoiceId, receivedAt },
	} = useBuilderContext();

	return (
		<div>
			<div className="mb-4">
				<Label htmlFor="externalInvoiceId">No. de factura externa</Label>
				<Input
					name="externalInvoiceId"
					id="externalInvoiceId"
					placeholder="Ej. 10"
					value={externalInvoiceId || ''}
					onChange={e => {
						dispatch({ type: 'setExternalInvoiceId', payload: e.target.value });
					}}
				/>
			</div>

			<div>
				<Label htmlFor="receivedAt">Fecha de recepción</Label>
				<DatePicker
					name="receivedAt"
					id="receivedAt"
					className="w-full"
					defaultDate={safeNewDate(receivedAt)}
					key={receivedAt}
					onSave={date => {
						dispatch({ type: 'setReceivedAt', payload: date.toISOString() });
					}}
				/>
			</div>
		</div>
	);
}

function CreditNoteReasonSelect() {
	const {
		state: { creditNoteReason },
		dispatch,
	} = useBuilderContext();

	return (
		<div>
			<Label htmlFor="creditNoteReason">Razón</Label>
			<Select
				id="creditNoteReason"
				value={creditNoteReason}
				onChange={e => {
					dispatch({
						type: 'setCreditNoteReason',
						payload: e.currentTarget.value as any,
					});
				}}
				options={[
					{ label: 'Selecciona una razón', value: '' },
					...creditNoteCorrectionResponses,
				]}
			/>
		</div>
	);
}

function DebitNoteReasonSelect() {
	const {
		state: { debitNoteReason },
		dispatch,
	} = useBuilderContext();

	return (
		<div>
			<Label htmlFor="debitNoteReason">Razón</Label>
			<Select
				id="debitNoteReason"
				value={debitNoteReason}
				onChange={e => {
					dispatch({
						type: 'setDebitNoteReason',
						payload: e.currentTarget.value as any,
					});
				}}
				options={[
					{ label: 'Selecciona una razón', value: '' },
					...debitNoteCorrectionResponses,
				]}
			/>
		</div>
	);
}

function OriginInvoice() {
	const invoice = useOriginInvoice();

	if (!invoice) return null;

	return (
		<div className="flex gap-4 items-end">
			<div className="flex-1">
				<Label>Factura origen</Label>
				<Input readOnly defaultValue={invoice.number} />
			</div>
			<LinkButton
				variant="secondary"
				to={`/invoices/${invoice.id}`}
				target="_blank"
			>
				Ver factura <i className="ri-arrow-right-line"></i>
			</LinkButton>
		</div>
	);
}
