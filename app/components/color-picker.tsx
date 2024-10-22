import * as React from 'react';
import { HexColorPicker } from 'react-colorful';
import { cn, useOnClickOutside } from '~/utils/misc';

type ColorPickerProps = {
	inputName: string;
	defaultColor: string;
	label: string;
	className?: string;
};

function ColorPicker({
	defaultColor,
	inputName,
	label,
	className,
}: ColorPickerProps) {
	const [isOpened, setIsOpened] = React.useState(false);
	const [color, setColor] = React.useState(`#${defaultColor}`);
	const contRef = React.useRef<HTMLDivElement>(null);
	useOnClickOutside(contRef, () => setIsOpened(false));

	return (
		<div className={cn('relative max-w-max', className)} ref={contRef}>
			<input type="hidden" name={inputName} value={color.replace('#', '')} />

			<div className="flex gap-4 items-center mb-2">
				<button
					className="w-8 h-8 rounded-md"
					style={{ backgroundColor: color }}
					onClick={() => setIsOpened(!isOpened)}
					type="button"
				></button>
				<div>
					<span className="block text-xs text-gray-500">{label}</span>
					<p className="font-medium -mt-1 uppercase">{color}</p>
				</div>
			</div>

			{isOpened ? (
				<div className="absolute z-10 bottom-full left-3">
					<HexColorPicker color={color} onChange={setColor} />
				</div>
			) : null}
		</div>
	);
}

export { ColorPicker };
