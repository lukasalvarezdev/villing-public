import * as React from 'react';
import { Button, Input, Label } from '~/components/form-utils';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
	PopoverClose,
} from '~/components/popover';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
} from '~/components/radix-command';
import { useRecipientsLoader } from '~/routes/api.$recipient_type.all-recipients';
import { cn } from '~/utils/misc';

type Recipient = { id: number; name: string };
export function RecipientSelect({
	children,
	onSelect,
	recipient,
	type,
}: {
	children?: React.ReactNode;
	onSelect: (recipient?: Recipient) => void;
	recipient?: Recipient;
	type: 'clients' | 'suppliers';
}) {
	const id = React.useId();
	const { recipients } = useRecipientsLoader(type);
	const [search, setSearch] = React.useState('');
	const [list, setList] = React.useState(recipients);

	React.useEffect(() => {
		setList(recipients);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [recipients.length]);

	return (
		<Popover>
			<div className="group">
				<div className="flex justify-between mb-1 pr-2">
					<Label className="mb-0 flex items-center" htmlFor={id}>
						{type === 'clients' ? 'Cliente' : 'Proveedor'}
					</Label>
					{children}
				</div>

				<PopoverTrigger asChild>
					<Button
						variant="secondary"
						className="justify-between gap-4 w-full text-left"
						type="button"
					>
						<p className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px]">
							{recipient?.name || 'Selecciona una opción'}
						</p>
						<i className="ri-expand-up-down-line"></i>
					</Button>
				</PopoverTrigger>
			</div>

			<PopoverContent className="p-0 bg-white w-72 PopoverContent" align="end">
				<div className="p-1 border-b border-gray-200">
					<Input
						placeholder="Busca por nombre o NIT"
						id={id}
						className={cn(
							'border-none shadow-none border-transparent outline-none focus-visible:ring-0',
						)}
						value={search}
						onChange={e => {
							setSearch(e.target.value);
							const newList = recipients.filter(item => {
								return String(item.name)
									.toLowerCase()
									.includes(e.target.value.toLowerCase());
							});

							setList(search ? newList : recipients);
						}}
					/>
				</div>

				<Command className="w-full">
					<CommandEmpty>No hay opciones.</CommandEmpty>

					<CommandGroup className="max-h-96 overflow-y-scroll">
						{list.map((r, index) => (
							<CommandItem
								key={index}
								value={String(r.id)}
								onSelect={value => {
									const selected = recipients.find(x => x.id === Number(value));

									onSelect(
										value === String(recipient?.id) ? undefined : selected,
									);
								}}
								className="p-0"
							>
								<PopoverClose className="w-full h-full px-2 py-1.5 text-left">
									<div className="flex justify-between w-full">
										<p>{r.name}</p>

										{r.id === recipient?.id ? (
											<i className="ri-check-line"></i>
										) : null}
									</div>
								</PopoverClose>
							</CommandItem>
						))}
					</CommandGroup>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
