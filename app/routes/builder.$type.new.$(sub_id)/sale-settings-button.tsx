import { useFetcher } from '@remix-run/react';
import * as React from 'react';
import { Button } from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import { Switch } from '~/components/switch';
import { useOrganization } from '~/root';
import { cn } from '~/utils/misc';

export function SaleSettingsButton() {
	const [isOpen, setIsOpen] = React.useState(false);
	const fetcher = useFetcher();
	const { updatePricesOnPurchases } = useOrganization();

	return (
		<div>
			<button
				className={cn(
					'hover:bg-gray-100 text-sm w-full rounded-sm px-4 py-1.5',
					'flex gap-4 items-center cursor-default',
				)}
				onClick={() => setIsOpen(true)}
			>
				<i className="ri-equalizer-2-line"></i>
				Ajustes generales
			</button>

			{isOpen ? (
				<Modal onClose={() => setIsOpen(false)} className="max-w-md">
					<ModalHeader onClick={() => setIsOpen(false)} className="mb-4">
						<h5>Ajustes generales</h5>
					</ModalHeader>

					<fetcher.Form
						method="POST"
						action="/builder/settings"
						onChange={e => {
							const formData = new FormData(e.currentTarget);
							fetcher.submit(formData, {
								method: 'POST',
								action: '/builder/settings',
							});
						}}
					>
						<div
							className={cn(
								'flex justify-between gap-4 border-b border-gray-200',
								'items-center mb-4 pb-4',
							)}
						>
							<div>
								<label className="font-medium">
									Actualizar precios de venta
								</label>
								<p className="text-sm text-gray-700">
									Los precios de venta se actualizarán automáticamente cuando
									hagas una compra.
								</p>
							</div>

							<Switch
								name="updatePricesOnPurchases"
								defaultChecked={updatePricesOnPurchases}
							/>
						</div>
					</fetcher.Form>

					<Button onClick={() => setIsOpen(false)} variant="secondary">
						Cerrar
					</Button>
				</Modal>
			) : null}
		</div>
	);
}
