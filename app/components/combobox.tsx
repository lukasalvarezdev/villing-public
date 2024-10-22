import * as React from 'react';
import { cn } from '~/utils/misc';
import { Button } from './form-utils';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Command, CommandGroup, CommandItem } from './radix-command';

export function Combobox({
	name,
	items,
	placeholder,
	defaultValue,
	value: controlledValue,
	onChange,
	inputProps,
}: {
	name: string;
	placeholder?: string;
	defaultValue?: string | number | ReadonlyArray<string> | undefined;
	value?: string | number | ReadonlyArray<string> | undefined;
	items: Array<{ value: string | number; label: string }>;
	onChange?: (value: string) => void;
	inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
}) {
	const [open, setOpen] = React.useState(false);
	const [_value, setValue] = React.useState(defaultValue || '');
	const [search, setSearch] = React.useState('');
	const [list, setList] = React.useState(items);
	const id = React.useId();
	const value = controlledValue ?? _value;
	const inputRef = React.useRef<HTMLInputElement>(null);

	React.useEffect(() => {
		setList(items);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [items.length]);

	if (controlledValue !== undefined && !onChange) {
		console.warn(
			'Combobox: You are using a controlled component without providing an `onChange` handler.',
		);
	}

	const selected = items.find(
		item => String(item.value).toLowerCase() === String(value).toLowerCase(),
	);

	const label = selected?.label ?? placeholder ?? 'Selecciona una opción';

	function triggerFormValidation() {
		setTimeout(() => {
			inputRef.current?.focus();
			inputRef.current?.blur();
		}, 200);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<input
				name={name}
				{...inputProps}
				value={value ?? ''}
				onChange={() => {}}
				className="sr-only"
				ref={inputRef}
			/>

			<PopoverTrigger asChild>
				<Button
					variant="secondary"
					role="combobox"
					aria-expanded={open}
					className="justify-between w-full px-3"
					disabled={inputProps?.disabled}
				>
					<p className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px]">
						{label}
					</p>

					<i className="ri-expand-up-down-line ml-2 text-sm shrink-0"></i>
				</Button>
			</PopoverTrigger>

			<PopoverContent className="w-full p-0 bg-white PopoverContent">
				<Command className="w-full">
					<div
						className="flex items-center border-b px-3 gap-4"
						cmdk-input-wrapper=""
					>
						<div>
							<i className="ri-search-line h-4 w-4 shrink-0 text-gray-500"></i>
						</div>

						<input
							placeholder="Busca por nombre"
							className={cn(
								'flex h-10 w-full rounded-md bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
							)}
							autoFocus
							id={id}
							value={search}
							onChange={e => {
								setSearch(e.target.value);
								const newList = items.filter(
									item =>
										String(item.value)
											.toLowerCase()
											.includes(e.target.value.toLowerCase()) ||
										item.label
											.toLowerCase()
											.includes(e.target.value.toLowerCase()),
								);

								setList(search ? newList : items);
							}}
						/>
					</div>

					<CommandGroup className="max-h-52 overflow-y-scroll">
						{list.slice(0, 50).map((item, index) => (
							<CommandItem
								key={index}
								value={String(item.value)}
								onSelect={currentValue => {
									setValue(currentValue === value ? '' : currentValue);
									setOpen(false);
									setSearch('');
									setList(items);
									onChange?.(currentValue);
									triggerFormValidation();
								}}
							>
								<i
									className={cn(
										'ri-check-line mr-2 h-4 w-4 shrink-0 opacity-50',
										value === item.value ? 'opacity-100' : 'opacity-0',
									)}
								></i>
								{item.label}
							</CommandItem>
						))}
					</CommandGroup>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
