import * as React from 'react';
import { Button, Label, Select } from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import { useBuilderContext } from './builder/context';
import { useBuilderPriceList } from './misc';

export function PriceListSelect() {
	const {
		dispatch,
		state: { priceListId },
	} = useBuilderContext();
	const [target, setTarget] = React.useState<number | null>(null);
	const { priceLists } = useBuilderPriceList();

	return (
		<div>
			{target ? (
				<Modal onClose={() => setTarget(null)} className="max-w-md">
					<ModalHeader onClick={() => setTarget(null)} className="mb-4">
						<h4>Cambiar lista de precios</h4>
					</ModalHeader>

					<p className="mb-4">
						Si cambias la lista de precios, el precio de todos los productos en
						la lista se verá modificado, ¿estás seguro de esta acción?
					</p>

					<div className="flex gap-4">
						<Button
							type="button"
							onClick={() => {
								setTarget(null);
								dispatch({ type: 'setPriceListId', payload: target });
							}}
							variant="black"
						>
							Si, cambiar
						</Button>
						<Button
							type="button"
							onClick={() => setTarget(null)}
							variant="secondary"
						>
							No, cancelar
						</Button>
					</div>
				</Modal>
			) : null}

			<Label htmlFor="priceList">Lista de precios</Label>
			<Select
				id="priceList"
				name="priceList"
				options={[
					{ label: 'Sin lista de precio', value: '' },
					...priceLists.map(priceList => ({
						value: priceList.id,
						label: priceList.name,
					})),
				]}
				value={priceListId}
				className="pr-8"
				onChange={e => {
					setTarget(parseInt(e.currentTarget.value));
				}}
			/>
		</div>
	);
}
