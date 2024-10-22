import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { cn, formatDate, useOnClickOutside } from '~/utils/misc';
import { Button } from './form-utils';
import { Popover, PopoverContent, PopoverTrigger } from './popover';

type DatePickerProps = {
	defaultDate?: Date;
	className?: string;
	onSave?: (date: Date) => void;
	name: string;
	id?: string;
	inputProps?: React.InputHTMLAttributes<HTMLInputElement>;
};
export function DatePicker(props: DatePickerProps) {
	const { onSave, defaultDate, name, className, id, inputProps } = props;
	const containerRef = React.useRef<HTMLDivElement>(null);
	const [selected, setSelected] = React.useState<Date | undefined>(defaultDate);
	useOnClickOutside(containerRef, () => onClose());

	function onClose() {
		if (selected) onSave?.(selected);
	}

	function handleDaySelect(date: Date | undefined) {
		if (!date) {
			setSelected(date);
			return;
		}

		const newDate = new Date(
			date.getFullYear(),
			date.getMonth(),
			date.getDate(),
		);
		setSelected(newDate);
	}

	return (
		<div className={cn('relative w-full', className)} ref={containerRef}>
			<input
				name={name}
				id={id}
				{...inputProps}
				value={selected?.toISOString()}
				onChange={() => {}}
				className="sr-only"
			/>

			<Popover>
				<PopoverTrigger asChild>
					<Button variant="secondary" className="w-full justify-start">
						<i className="ri-calendar-line text-base"></i>
						{selected ? formatDate(selected) : 'Seleccionar fecha'}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-2 bg-white" align="end">
					<DayPicker
						mode="single"
						selected={selected}
						onSelect={handleDaySelect}
						classNames={{
							months:
								'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
							month: 'space-y-4',
							caption: 'flex justify-center pt-1 relative items-center',
							caption_label: 'text-sm font-medium',
							nav: 'space-x-1 flex items-center',
							nav_button: cn(
								'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
							),
							nav_button_previous: 'absolute left-1',
							nav_button_next: 'absolute right-1',
							table: 'w-full border-collapse space-y-1',
							head_row: 'flex',
							head_cell:
								'text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]',
							row: 'flex w-full mt-2',
							cell: cn(
								'h-9 w-9 text-center text-sm p-0 relative focus-within:z-20 rounded-md',
								'first:[&:has([aria-selected])]:rounded-l-md last:[&:has focus-within:relative',
								'[&:has([aria-selected])]:bg-gray-100 ([aria-selected])]:rounded-r-md',
							),
							day: cn(
								'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
								'rounded-md',
							),
							day_selected:
								'bg-black !text-white hover:bg-primary hover:text-white focus:bg-black focus:text-white',
							day_today: 'bg-gray-100 text-black',
							day_range_middle:
								'aria-selected:bg-gray-100 aria-selected:text-black',
							day_hidden: 'invisible',
						}}
						components={{
							IconLeft: () => (
								<span className="w-8 h-8 border border-gray-200 shadow-sm rounded flex items-center justify-center">
									<i className="ri-arrow-left-s-line"></i>
								</span>
							),
							IconRight: () => (
								<span className="w-8 h-8 border border-gray-200 shadow-sm rounded flex items-center justify-center">
									<i className="ri-arrow-right-s-line"></i>
								</span>
							),
						}}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}
