import { Button, CurrencyInput, Label, Select } from '~/components/form-utils';
import { ButtonIcon } from '~/components/ui-library';
import { formatCurrency, toNumber } from '~/utils/misc';
import { useBuilderContext } from './builder/context';

export function PaymentFormsForm() {
	const {
		dispatch,
		state: { paymentForms },
	} = useBuilderContext();
	const paymentForm = paymentForms.length === 1 ? paymentForms[0] : null;

	if (!paymentForm) {
		return (
			<div>
				{paymentForms.map(paymentForm => (
					<div key={paymentForm.id} className="flex gap-2 mb-2 items-end">
						<div className="flex-1">
							<Label htmlFor={`${paymentForm.id}-method`}>Método de pago</Label>
							<Select
								id={`${paymentForm.id}-method`}
								value={paymentForm.type}
								onChange={e => {
									dispatch({
										type: 'updatePaymentForm',
										payload: {
											id: paymentForm.id,
											type: e.currentTarget.value as any,
										},
									});
								}}
								options={paymentFormsOptions}
							/>
						</div>

						<div className="flex-1">
							<Label htmlFor={`${paymentForm.id}-amount`}>Monto</Label>
							<CurrencyInput
								id={`${paymentForm.id}-amount`}
								placeholder="$ 00.0"
								defaultValue={formatCurrency(paymentForm.amount)}
								onValueChange={amount => {
									dispatch({
										type: 'updatePaymentForm',
										payload: { id: paymentForm.id, amount: toNumber(amount) },
									});
								}}
								onFocus={e => e.currentTarget.select()}
							/>
						</div>
						{paymentForms.length > 1 ? (
							<ButtonIcon
								className="text-error-600 flex-shrink-0"
								onClick={() => {
									dispatch({
										type: 'removePaymentForm',
										payload: paymentForm.id,
									});
								}}
							>
								<span className="sr-only">
									Eliminar método de pago {paymentForm.type}
								</span>
								<i className="ri-delete-bin-2-line"></i>
							</ButtonIcon>
						) : null}
					</div>
				))}

				<Button
					variant="secondary"
					className="mt-2"
					onClick={() => dispatch({ type: 'addPaymentForm' })}
					type="button"
				>
					<i className="ri-add-circle-line mr-2"></i>
					Agregar forma de pago
				</Button>
			</div>
		);
	}

	return (
		<div className="group">
			<Label>Método de pago</Label>
			<Select
				options={paymentFormsOptions}
				value={paymentForm?.type}
				onChange={e => {
					dispatch({
						type: 'updatePaymentForm',
						payload: { id: paymentForm?.id, type: e.target.value as any },
					});
				}}
			/>
			<button
				className="font-medium text-sm mt-1 group-hover:text-primary-600 hover:underline"
				onClick={() => dispatch({ type: 'addPaymentForm' })}
				type="button"
			>
				Agregar más métodos de pago
			</button>
		</div>
	);
}

const paymentFormsOptions = [
	{ value: 'cash', label: 'Efectivo' },
	{ value: 'transfer', label: 'Transferencia' },
	{ value: 'card', label: 'Datáfono' },
	{ value: 'loan', label: 'Entidad crediticia' },
];
