import * as React from 'react';
import { CurrencyInput } from '~/components/form-utils';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/popover';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
} from '~/components/radix-command';
import { type ProductType } from '~/routes/builder.$type.new.$(sub_id)/builder/schemas';
import { cn, formatCurrency, toNumber } from '~/utils/misc';

type PriceInputProps = {
	onChange: (price: number) => void;
	prices: ProductType['prices'];
	price: number;
	id: string;
	className?: string;
	productName: string;
};
export function PriceInput(props: PriceInputProps) {
	const { onChange, prices, price, id, className, productName } = props;
	const [open, setOpen] = React.useState(false);
	const [count, setCount] = React.useState(0);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<div className="relative">
				<CurrencyInput
					name="price"
					id={id}
					className={cn('w-24 h-7', className)}
					defaultValue={formatCurrency(price)}
					onValueChange={value => onChange(toNumber(value))}
					onFocus={e => e.target.select()}
					// This is to update the input value when `onSelect` is called
					key={count}
					autoComplete="off"
					onKeyDown={e => {
						if (e.key === 'Enter') {
							const searchInput = document.getElementById(
								'product-search-combobox',
							);
							searchInput?.focus();
						}
					}}
				/>
				{prices.length ? (
					<PopoverTrigger
						className={cn(
							'absolute right-1 top-0 h-full flex items-center justify-center',
						)}
					>
						<span className="sr-only">Cambiar precio de {productName}</span>
						<i className="ri-expand-up-down-line"></i>
					</PopoverTrigger>
				) : null}
			</div>

			<PopoverContent className="w-36 p-0 bg-white" align="end">
				<Command className="w-full">
					<CommandEmpty>No hay precios.</CommandEmpty>

					<CommandGroup className="max-h-96 overflow-y-scroll">
						{prices.map((item, index) => (
							<CommandItem
								key={index}
								value={String(item.price)}
								onSelect={currentValue => {
									setOpen(false);
									onChange(toNumber(currentValue));
									setCount(count + 1);
								}}
								aria-label={`${item.name} $${formatCurrency(item.price)}`}
							>
								<div>
									<p className="text-xs">{item.name}</p>
									<p className="font-medium">${formatCurrency(item.price)}</p>
								</div>
							</CommandItem>
						))}
					</CommandGroup>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
