import { type FetcherWithComponents, useFetcher } from '@remix-run/react';
import * as React from 'react';
import { ActionErrorToast } from '~/components/action-error-toast';
import { Checkbox, CheckboxField } from '~/components/checkbox';
import { FloatFormatter } from '~/components/float-formatter';
import {
	Button,
	CurrencyInput,
	Input,
	IntentButton,
	Label,
	Select,
	Textarea,
	Toast,
	getInputClasses,
} from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import { TwoColumnsDiv } from '~/components/ui-library';
import { useIsMobile } from '~/root';
import { UVT_VALUE, cn, formatCurrency, toNumber } from '~/utils/misc';
import { BranchSelect, BranchToTransferSelect } from './branch-select';
import { useBuilderContext, useBuilderTotals } from './builder/context';
import { type BuilderType } from './builder/schemas';
import { BuilderRecipients } from './builder-recipients';
import { useBuilderKeyboardShorcuts } from './keyboard-shorcuts';
import {
	useBuilderFetcher,
	useBuilderTexts,
	useBuilderType,
	useIsPosAboveMaxUvt,
	useLegalActions,
	useResolutions,
	useTargetSetter,
} from './misc';
import { type clientAction } from './route';

type ConfirmInvoiceButtonProps = {
	children?: React.ReactNode;
	showActionsButton?: boolean;
};
export function ConfirmInvoiceButton(props: ConfirmInvoiceButtonProps) {
	const { showActionsButton = true, children } = props;

	const {
		dispatch,
		state: { target },
	} = useBuilderContext();
	const setTarget = useTargetSetter();
	const builderType = useBuilderType();
	const fetcher = useFetcher<typeof clientAction>({ key: 'builder' });
	useBuilderKeyboardShorcuts();

	const submissionId = fetcher?.data?.submissionId;
	const reset = fetcher?.data?.reset;

	React.useEffect(() => {
		if (reset) setTarget(undefined);
	}, [reset, setTarget, submissionId]);

	return (
		<div>
			<Button
				className="w-full font-medium text-base whitespace-nowrap mb-2 h-10"
				onClick={() => {
					setTarget(builderType);
					dispatch({ type: 'setPrint', payload: true });
				}}
			>
				{children || (
					<p>
						Confirmar detalles{' '}
						<span className="text-sm opacity-65">(Ctrl + M)</span>
					</p>
				)}
			</Button>
			{showActionsButton ? (
				<OtherActionsButton>
					{({ onClick }) => (
						<Button
							className="w-full font-medium text-base h-10"
							variant="secondary"
							onClick={onClick}
						>
							Otras acciones
						</Button>
					)}
				</OtherActionsButton>
			) : null}

			{target ? (
				<ConfirmInvoiceModal onClose={() => setTarget(undefined)}>
					<CreateInvoiceButton fetcher={fetcher} />
				</ConfirmInvoiceModal>
			) : null}
		</div>
	);
}

type OtherActionsButtonProps = {
	children: ({ onClick }: { onClick: () => void }) => React.ReactNode;
};
export function OtherActionsButton(props: OtherActionsButtonProps) {
	const { children } = props;
	const [isOpen, setIsOpen] = React.useState(false);
	const { dispatch } = useBuilderContext();
	const builderType = useBuilderType();
	const setTarget = useTargetSetter();

	function handleSelect(target: BuilderType) {
		setTarget(target);
		setIsOpen(false);
	}

	const className = cn(
		'text-sm flex justify-between items-center w-full',
		'p-4 border border-gray-200 rounded-md',
		'hover:border-primary-600 hover:bg-gray-50',
		'transition-colors duration-200 ease-in-out',
	);

	if (builderType !== 'pos') return null;

	return (
		<div className="text-center">
			{children({ onClick: () => setIsOpen(true) })}

			{isOpen ? (
				<Modal className="max-w-sm" onClose={() => setIsOpen(false)}>
					<ModalHeader
						onClick={() => setIsOpen(false)}
						closeButtonName="Cerrar confirmación"
						className="mb-4"
					>
						<h4>Otras acciones</h4>
					</ModalHeader>

					<div className="flex flex-col gap-4">
						<button
							className={className}
							onClick={() => {
								setTarget('pos');
								setIsOpen(false);
								dispatch({ type: 'setPrint', payload: false });
							}}
						>
							<span className="font-medium">Crear venta sin imprimir</span>
							<span className="text-gray-500">Ctrl + U</span>
						</button>

						<button className={className} onClick={() => handleSelect('quote')}>
							<span className="font-medium">Crear cotización de venta</span>
							<span className="text-gray-500">Ctrl + K</span>
						</button>

						<button
							className={className}
							onClick={() => handleSelect('remision')}
						>
							<span className="font-medium">Crear remisión de venta</span>
							<span className="text-gray-500">Ctrl + J</span>
						</button>

						<button
							className={className}
							onClick={() => {
								setTarget('electronic');
								setIsOpen(false);
							}}
						>
							<span className="font-medium">Crear factura electrónica</span>
							<span className="text-gray-500">Ctrl + I</span>
						</button>
					</div>
				</Modal>
			) : null}
		</div>
	);
}

type ConfirmInvoiceModalProps = {
	onClose: () => void;
	children: React.ReactNode;
};
function ConfirmInvoiceModal({ onClose, children }: ConfirmInvoiceModalProps) {
	const { modalTitle, modalDescription } = useBuilderTexts();
	const { legalActions } = useLegalActions();
	const {
		state: { updatePrices },
	} = useBuilderContext();

	return (
		<Modal className="max-w-2xl" onClose={onClose}>
			<ModalHeader
				onClick={onClose}
				className="mb-4"
				closeButtonName="Cerrar confirmación"
			>
				<h4>{modalTitle}</h4>
			</ModalHeader>

			<Toast variant="info" className="mb-4">
				<i className="ri-information-line mr-2"></i>
				{modalDescription}
			</Toast>

			{updatePrices && legalActions.includes('update product prices') ? (
				<Toast variant="error" className="mb-4">
					<i className="ri-information-line mr-2"></i>
					Los precios de venta de los productos seleccionados serán
					actualizados.
				</Toast>
			) : null}

			<TwoColumnsDiv className="mb-4">
				<div className="flex flex-col gap-2 pr-4 md:border-r border-gray-200">
					<BranchSelect />

					{legalActions.includes('see branchToTransfer') ? (
						<BranchToTransferSelect />
					) : null}

					<BuilderRecipients showCreate={false} />
					{legalActions.includes('update resolution') ? (
						<ResolutionSelect />
					) : null}
					<NotesField />
				</div>
				<div>
					{legalActions.includes('update paymentTerm') ? (
						<CreditTermField />
					) : null}
					{legalActions.includes('update totalCollected') ? (
						<TotalCollectedField />
					) : null}

					<TotalsSummary />
				</div>
			</TwoColumnsDiv>

			{children}
		</Modal>
	);
}

function TotalsSummary() {
	const { legalActions } = useLegalActions();
	const {
		state: { products },
	} = useBuilderContext();
	const {
		subtotal,
		total,
		totalDiscount,
		totalRefunds,
		totalRetention,
		totalTax,
	} = useBuilderTotals();
	const quantity = products.reduce((acc, product) => acc + product.quantity, 0);
	const unitsText = quantity === 1 ? 'unidad' : 'unidades';

	return (
		<div className="p-4 bg-gray-100 rounded-md">
			{legalActions.includes('see totals') ? (
				<div className="mb-2">
					<p className="flex justify-between gap-2">
						<span className="text-sm text-gray-600">Subtotal</span>{' '}
						<span className="font-medium">${formatCurrency(subtotal)}</span>
					</p>
					<p className="flex justify-between gap-2">
						<span className="text-sm text-gray-600">Impuestos</span>{' '}
						<span className="font-medium">${formatCurrency(totalTax)}</span>
					</p>

					{totalDiscount ? (
						<p className="flex justify-between gap-2">
							<span className="text-sm text-gray-600">Descuentos</span>{' '}
							<span className="font-medium">
								-${formatCurrency(totalDiscount)}
							</span>
						</p>
					) : null}

					{totalRetention ? (
						<p className="flex justify-between gap-2">
							<span className="text-sm text-gray-600">Retención</span>{' '}
							<span className="font-medium">
								-${formatCurrency(totalRetention)}
							</span>
						</p>
					) : null}

					{totalRefunds !== 0 ? (
						<p className="flex justify-between gap-2">
							<span className="text-sm text-gray-600">Devoluciones</span>{' '}
							<span className="font-medium">
								${formatCurrency(totalRefunds)}
							</span>
						</p>
					) : null}
				</div>
			) : null}

			<p className={cn('flex justify-between gap-2')}>
				<span className="text-sm text-gray-600">Artículos</span>{' '}
				<span className="text-sm">
					{products.length} ({quantity} {unitsText})
				</span>
			</p>

			{legalActions.includes('see totals') ? (
				<div className="mt-2">
					<div className="my-4 border-b-2 border-dashed border-gray-400"></div>

					<div className="flex justify-between gap-2 items-center">
						<span className="text-sm text-gray-600">Total</span>
						<FloatFormatter value={total} />
					</div>
				</div>
			) : null}
		</div>
	);
}

function TotalCollectedField() {
	const {
		state: { totalCollected },
		dispatch,
	} = useBuilderContext();
	const { total } = useBuilderTotals();
	const isMobile = useIsMobile();
	const id = React.useId();
	const toRefund = totalCollected === 0 ? 0 : totalCollected - total;

	return (
		<div className="mb-4">
			<TwoColumnsDiv>
				<div>
					<Label htmlFor={id}>Dinero recibido</Label>
					<CurrencyInput
						id={id}
						placeholder="$0.00"
						defaultValue={totalCollected}
						onValueChange={amount => {
							dispatch({
								type: 'updateTotalCollected',
								payload: toNumber(amount),
							});
						}}
						autoFocus={!isMobile}
						onFocus={e => e.target.select()}
						form="builder-form"
					/>
				</div>
				<div>
					<Label>Por devolver</Label>
					<p className={cn(getInputClasses(), 'items-center font-medium')}>
						{formatCurrency(toRefund)}
					</p>
				</div>
			</TwoColumnsDiv>
			<p className="text-xs text-gray-500 mt-2">
				La cantidad de dinero que el cliente te entregó.
			</p>
		</div>
	);
}

function ResolutionSelect() {
	const {
		state: { target },
	} = useBuilderContext();
	const resolutions = useResolutions(target || 'pos');
	const {
		state: { resolutionId },
		dispatch,
	} = useBuilderContext();
	const id = React.useId();

	return (
		<div>
			<Label htmlFor={id}>Resolución</Label>
			<Select
				id={id}
				options={[
					{ label: 'Selecciona una resolución', value: '' },
					...resolutions,
				]}
				value={resolutionId || ''}
				onChange={e => {
					const payload = parseInt(e.currentTarget.value);
					dispatch({ type: 'setResolutionId', payload });
				}}
			/>
			{!resolutionId ? (
				<p className="text-xs text-error-600">
					Debes seleccionar una resolución.
				</p>
			) : null}
		</div>
	);
}

function NotesField() {
	const {
		state: { notes },
		dispatch,
	} = useBuilderContext();

	return (
		<div>
			<Label>Notas</Label>
			<Textarea
				name="notes"
				placeholder="Escribe las notas de la factura"
				onChange={e => {
					dispatch({ type: 'setNotes', payload: e.currentTarget.value });
				}}
				value={notes}
			/>
		</div>
	);
}

function CreditTermField() {
	const {
		state: { paysInDays },
		dispatch,
	} = useBuilderContext();

	return (
		<div className="mb-4">
			<Label htmlFor="paysInDays">Forma de pago</Label>
			<Select
				id="paysInDays"
				name="paysInDays"
				value={paysInDays}
				onChange={e => {
					dispatch({
						type: 'setPaysInDays',
						payload: parseInt(e.currentTarget.value),
					});
				}}
				options={[
					{ value: 0, label: 'De contado' },
					{ value: 7, label: 'Crédito a 7 días' },
					{ value: 15, label: 'Crédito a 15 días' },
					{ value: 30, label: 'Crédito a 30 días' },
					{ value: 60, label: 'Crédito a 60 días' },
					{ value: 90, label: 'Crédito a 90 días' },
				]}
			/>
			<p className="text-xs text-gray-500 mt-2">
				Escoge si la factura será de contado o a crédito.
			</p>
		</div>
	);
}

function CreateInvoiceButton({
	fetcher,
}: {
	fetcher: FetcherWithComponents<unknown>;
}) {
	const { state } = useBuilderContext();
	const { isConfirmed, setIsConfirmed, confirmWithDian, confirmWithText } =
		useIsInvoiceConfirmed();
	const isPosAboveMaxUvt = useIsPosAboveMaxUvt();
	const data = useBuilderFetcher()?.data;
	if (!state.target) return null;

	const error = data?.error;
	const referenceId = data?.referenceId;

	const shouldPrint =
		state.target === 'pos' || state.target === 'quote'
			? state.shouldPrint
			: false;

	return (
		<fetcher.Form
			method="POST"
			onSubmit={e => {
				e.preventDefault();

				if (!state.target) return;

				fetcher.submit(
					{ invoice: JSON.stringify(state), intent: state.target },
					{ method: 'POST' },
				);
			}}
			id="builder-form"
		>
			{isPosAboveMaxUvt && state.target === 'electronic' ? (
				<Toast variant="warning" className="mb-4">
					<i className="ri-information-line mr-2"></i>
					El valor de la factura supera los 5 UVT ($
					{formatCurrency(UVT_VALUE * 5)}), por lo tanto es necesario que crees
					una factura electrónica.
				</Toast>
			) : null}

			{confirmWithDian ? (
				<div className="flex mb-4 items-center gap-2">
					<CheckboxField
						label="Confirmo que los datos son correctos y deseo que esta se envie a la
						DIAN"
					>
						<Checkbox checked={isConfirmed} onCheckedChange={setIsConfirmed} />
					</CheckboxField>
				</div>
			) : null}

			{confirmWithText ? (
				<div className="mb-4">
					<Toast variant="error" className="mb-2">
						<i className="ri-information-line mr-2"></i>
						El stock de todos los productos que no estén en el ajuste serán
						modificados a <strong>0 (CERO)</strong>. Esta acción no se puede
						deshacer.
					</Toast>

					<Label htmlFor="confirmationText">
						Para confirmar que los datos son correctos, escribe la palabra
						"total" en minúsculas
					</Label>
					<Input
						id="confirmationText"
						type="text"
						placeholder="Esperando confirmación..."
						onChange={e => setIsConfirmed(e.target.value === 'total')}
					/>
				</div>
			) : null}

			<ActionErrorToast error={error} referenceId={referenceId} />
			<IntentButton
				fetcher={fetcher}
				className="h-10 w-full font-medium text-base"
				disabled={!isConfirmed}
			>
				{shouldPrint ? 'Crear e imprimir' : 'Crear sin imprimir'}
			</IntentButton>
		</fetcher.Form>
	);
}

function useIsInvoiceConfirmed() {
	const { state } = useBuilderContext();
	const { legalActions } = useLegalActions();
	const [isConfirmed, setIsConfirmed] = React.useState(false);

	const confirmWithDian = legalActions.includes(
		'update dianConfirmationWarning',
	);
	const confirmWithText =
		legalActions.includes('update textConfirmationWarning') &&
		state.stockType === 'total';

	const base = { confirmWithDian, confirmWithText, setIsConfirmed };

	if (!confirmWithDian && !confirmWithText) {
		return { isConfirmed: true, ...base };
	}

	return { isConfirmed, ...base };
}
