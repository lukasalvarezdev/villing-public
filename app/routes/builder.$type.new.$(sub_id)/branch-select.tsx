import * as React from 'react';
import { Label, Select } from '~/components/form-utils';
import { useBuilderContext } from './builder/context';
import { useBranches, useBuilderType } from './misc';

export function BranchSelect({ className }: { className?: string }) {
	const branches = useBranches();
	const { state, dispatch } = useBuilderContext();
	const id = React.useId();
	const builderType = useBuilderType();

	return (
		<div className={className}>
			<Label htmlFor={id}>Sucursal</Label>
			<Select
				id={id}
				options={[
					{ label: 'Selecciona una sucursal', value: '' },
					...branches.map(branch => ({
						label: branch.name,
						value: branch.id,
					})),
				]}
				disabled={builderType === 'pos'}
				value={state.subId}
				onChange={e => {
					if (builderType === 'pos') return;

					const payload = parseInt(e.currentTarget.value);
					dispatch({ type: 'setBranchId', payload });
				}}
			/>
		</div>
	);
}

export function BranchToTransferSelect() {
	const branches = useBranches();
	const { state, dispatch } = useBuilderContext();
	const id = React.useId();
	const availableBranches = branches.filter(
		branch => branch.id !== state.subId,
	);

	if (availableBranches.length === 0) return null;

	return (
		<div>
			<Label htmlFor={id}>Sucursal destino (para transferencia)</Label>
			<Select
				id={id}
				options={[
					{ label: 'Selecciona una sucursal', value: '' },
					...availableBranches.map(branch => ({
						label: branch.name,
						value: branch.id,
					})),
				]}
				value={state.transferToBranchId || ''}
				onChange={e => {
					const payload = parseInt(e.currentTarget.value);
					dispatch({ type: 'setTransferToBranchId', payload });
				}}
			/>
			<p className="text-xs mt-1 text-gray-500">
				Selecciona una sucursal destino para convertir el ajuste en una
				transferencia de inventario.
			</p>
		</div>
	);
}
