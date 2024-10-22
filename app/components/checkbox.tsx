import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import * as React from 'react';
import { cn } from '~/utils/misc';

type CheckboxProps = Omit<
	React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>,
	'onCheckedChange'
> & {
	onCheckedChange?: (checked: boolean) => void;
};

const Checkbox = React.forwardRef<
	React.ElementRef<typeof CheckboxPrimitive.Root>,
	CheckboxProps
>(({ className, ...props }, ref) => (
	<CheckboxPrimitive.Root
		ref={ref}
		className={cn(
			'peer h-4 w-4 shrink-0 rounded border border-black ring-offset-black',
			'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
			'focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
			'data-[state=checked]:bg-black data-[state=checked]:text-white',
			className,
		)}
		{...props}
		onCheckedChange={value => props.onCheckedChange?.(!!value.valueOf())}
	>
		<CheckboxPrimitive.Indicator
			className={cn('flex items-center justify-center text-current')}
		>
			<i className="ri-check-line w-3 h-3 flex items-center justify-center" />
		</CheckboxPrimitive.Indicator>
	</CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export function CheckboxField({
	label,
	...props
}: React.ComponentPropsWithoutRef<'label'> & {
	label: string;
}) {
	return (
		<label
			{...props}
			className={cn('flex items-center gap-2', props.className)}
		>
			{props.children}
			{label}
		</label>
	);
}

export { Checkbox };
