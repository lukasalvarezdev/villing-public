import { Link, useFetcher, useLocation } from '@remix-run/react';
import React from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { Button, Input, IntentButton, Label } from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import { cn } from '~/utils/misc';
import { type BuilderClient } from './builder/schemas';

export function CreateClientButton({
	onCreate,
}: {
	onCreate: (client: BuilderClient) => void;
}) {
	const [isOpen, setIsOpen] = React.useState(false);
	const { pathname } = useLocation();
	const [key, setKey] = React.useState('1');
	const fetcher = useFetcher<any>({ key });
	const debouncedOnCreate = useDebouncedCallback(onCreate, 500);
	const client = fetcher.data?.client;
	const shouldCallOnCreate = fetcher.state === 'loading' && client;

	React.useEffect(() => {
		if (!isOpen) setKey(new Date().getTime().toString());
	}, [isOpen]);

	React.useEffect(() => {
		if (client && shouldCallOnCreate) {
			setIsOpen(false);
			debouncedOnCreate(client);
		}
	}, [client, shouldCallOnCreate, debouncedOnCreate]);

	return (
		<div>
			<button
				className={cn(
					'group-hover:text-primary-600 text-sm font-medium hover:underline',
				)}
				type="button"
				onClick={() => setIsOpen(true)}
			>
				Crear
			</button>

			{isOpen ? (
				<Modal className="max-w-md">
					<ModalHeader onClick={() => setIsOpen(false)} className="mb-4">
						<h4>Crea un cliente temporal</h4>
					</ModalHeader>

					<fetcher.Form method="POST" action="/clients/temporary/new">
						<div className="mb-2">
							<Label htmlFor="name">Nombre</Label>
							<Input
								id="name"
								placeholder="Ej. Mostrador"
								name="name"
								autoFocus
							/>
						</div>

						<Link
							to={`/clients/new?redirectTo=${pathname}`}
							className="block mb-4 text-sm text-primary-600 hover:underline"
						>
							Quiero crear un cliente con más información
						</Link>

						<div className="flex justify-end gap-4 flex-col lg:flex-row">
							<Button
								variant="secondary"
								type="button"
								onClick={() => setIsOpen(false)}
							>
								Cancelar
							</Button>
							<IntentButton
								state={fetcher.state !== 'idle' ? 'pending' : 'idle'}
								className={cn(
									'text-sm px-4 h-9 rounded',
									'bg-gray-900 text-white hover:bg-gray-800',
								)}
								type="button"
							>
								Crear cliente temporal
							</IntentButton>
						</div>
					</fetcher.Form>
				</Modal>
			) : null}
		</div>
	);
}
