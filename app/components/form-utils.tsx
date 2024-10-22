import { type FieldConfig, type Submission } from '@conform-to/react';
import { type FetcherWithComponents, Link } from '@remix-run/react';
import * as React from 'react';
import { z, type ZodTypeAny, type output } from 'zod';
import {
	cn,
	formatCurrency,
	rawRemoveComas,
	toNumber,
	useIsSubmitting,
} from '~/utils/misc';
import { type DivProps } from './ui-library';

export interface InputProps
	extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
	({ className, ...props }, ref) => {
		return (
			<input
				className={cn(getInputClasses(), className)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Input.displayName = 'Input';

interface CurrencyInputProps
	extends Omit<
		InputProps,
		'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'step'
	> {
	value?: string | number;
	defaultValue?: string | number;
	onValueChange?: (value: string | number) => void;
	onBlur?: (value: number) => void;
}
export function CurrencyInput({
	defaultValue = 0,
	value: controlledValue,
	onValueChange,
	onBlur,
	...props
}: CurrencyInputProps) {
	const [value, setValue] = React.useState(defaultValue);

	if (controlledValue && !onValueChange) {
		console.warn(
			'CurrencyInput: controlledValue is set but onValueChange is not',
		);
	}

	return (
		<Input
			value={controlledValue ?? value}
			onChange={e => {
				const input = e.target;
				const endsInDot = input.value.endsWith('.');

				const val = endsInDot
					? input.value
					: formatCurrency(input.value as any);

				setValue(val);
				onValueChange?.(val);
			}}
			onBlur={e => {
				onBlur?.(toNumber(e.target.value.replace('$', '')));
			}}
			{...props}
		/>
	);
}

interface TextareaProps
	extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
	({ className, ...props }, ref) => {
		return (
			<textarea
				className={cn(
					getInputClasses(),
					'min-h-[6rem] resize-none pt-2',
					className,
				)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Textarea.displayName = 'Textarea';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export function Label({ className, ...props }: LabelProps) {
	return (
		<label
			{...props}
			className={cn('block font-medium text-sm mb-1', className)}
		/>
	);
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: ButtonVariant;
	size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant = 'primary', size, ...props }, ref) => {
		return (
			<button
				className={cn(getButtonClasses(variant, size), className)}
				ref={ref}
				{...props}
			/>
		);
	},
);
Button.displayName = 'Button';

export interface ParagraphProps
	extends React.DetailedHTMLProps<
		React.HTMLAttributes<HTMLParagraphElement>,
		HTMLParagraphElement
	> {}

export function ErrorText({ className, ...props }: ParagraphProps) {
	if (!props.children) return null;

	return <p className={cn('text-sm text-red-500', className)} {...props} />;
}

type ToastProps = ParagraphProps & {
	variant?: 'error' | 'success' | 'warning' | 'info' | 'blue';
};
export function Toast({ className, variant = 'error', ...props }: ToastProps) {
	if (!props.children) return null;

	return (
		<div
			className={cn(
				'text-sm border',
				'px-4 py-2 rounded-md',
				variant === 'error' && 'text-error-600 bg-error-50 border-error-200',
				variant === 'blue' && 'text-primary-600 bg-blue-50 border-blue-200',
				variant === 'success' &&
					'text-success-600 bg-success-50 border-success-200',
				variant === 'warning' &&
					'text-orange-600 bg-orange-50 border-orange-200',
				variant === 'info' && 'text-gray-800 bg-gray-100 border-gray-200',
				className,
			)}
			role="alert"
			{...props}
		/>
	);
}

/**
 * Use it for form submissions. It will show a loading indicator and disable the button.
 */
interface IntentButtonProps extends ButtonProps {
	intent?: string;
	state?: 'pending' | 'idle';
	size?: 'sm' | 'md' | 'lg';
	fetcher?: FetcherWithComponents<any>;
}
export const IntentButton = React.forwardRef<
	HTMLButtonElement,
	IntentButtonProps
>((props, ref) => {
	const {
		fetcher,
		className,
		intent,
		state,
		variant = 'primary',
		size = 'md',
		disabled,
		...buttonProps
	} = props;
	const isPendingAction = useIsSubmitting(intent);
	const isPendingFetcher = fetcher?.state !== 'idle';
	const isPending = fetcher ? isPendingFetcher : isPendingAction;

	return (
		<button
			className={cn(getButtonClasses(variant, size), className)}
			ref={ref}
			{...buttonProps}
			name="intent"
			value={intent}
			disabled={
				disabled
					? disabled || isPending
					: state
						? state === 'pending'
						: isPending
			}
			type="submit"
		/>
	);
});
IntentButton.displayName = 'IntentButton';

type LinkProps = React.ComponentProps<typeof Link> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
};
export function LinkButton({
	className,
	variant = 'primary',
	size = 'md',
	...props
}: LinkProps) {
	return (
		<Link {...props} className={cn(getButtonClasses(variant, size), className)}>
			{props.children}
		</Link>
	);
}

type SelectProps = React.DetailedHTMLProps<
	React.SelectHTMLAttributes<HTMLSelectElement>,
	HTMLSelectElement
> & {
	options: Array<{ value: string | number; label: string }>;
	readOnly?: boolean;
};
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
	({ className, readOnly, options, ...props }, ref) => {
		return (
			<select
				{...props}
				className={cn(
					'h-9 px-3 block w-full rounded-md border border-gray-200 appearance-none text-sm shadow-sm',
					"bg-[url('/img/expand-up-down-line.svg')] bg-[length:14px_14px] bg-select bg-no-repeat",
					'bg-[position:calc(100%-0.75rem)_center]',
					props.disabled || readOnly
						? 'bg-gray-100 text-gray-700 pointer-events-none'
						: 'bg-white',
					className,
				)}
				ref={ref}
			>
				{options.map((option, index) => (
					<option key={index} value={option.value}>
						{option.label}
					</option>
				))}
			</select>
		);
	},
);
Select.displayName = 'Select';

type FormFieldProps = {
	label: string;
	field: FieldConfig<any>;
	children: React.ReactNode;
	divProps?: DivProps;
};
export function FormField(props: FormFieldProps) {
	const { label, field, children, divProps } = props;

	return (
		<div {...divProps}>
			<Label htmlFor={field.id}>{label}</Label>
			{children}
			{field.error ? (
				<ErrorText id={field.errorId}>{field.error}</ErrorText>
			) : null}
		</div>
	);
}

type ButtonVariant =
	| 'primary'
	| 'secondary'
	| 'destructive'
	| 'black'
	| 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';
export function getButtonClasses(
	variant: ButtonVariant,
	size: ButtonSize = 'md',
) {
	return cn(
		'flex items-center gap-2 rounded-md px-4 transition duration-300 ease-in-out',
		'text-sm justify-center border border-transparent',
		variant === 'primary' && 'bg-primary-600 hover:bg-primary-700 text-white',
		variant === 'secondary' &&
			'bg-white border border-gray-200 shadow-sm hover:bg-gray-100',
		variant === 'destructive' &&
			'bg-white border border-error-600 hover:bg-gray-100 text-error-600',
		variant === 'black' &&
			'bg-black border border-black hover:opacity-80 text-white',
		variant === 'ghost' &&
			'bg-transparent border-transparent hover:bg-gray-100 text-gray-800 hover:underline',
		size === 'sm' && 'h-8',
		size === 'md' && 'h-9',
		size === 'lg' && 'h-11 px-6',
		'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-600',
		'disabled:border disabled:border-gray-200',
	);
}

export function getInputClasses() {
	return cn(
		'flex h-9 w-full rounded-md px-3 text-sm ring-offset-background placeholder:text-gray-400',
		'border border-gray-200 bg-white shadow-sm',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
		'disabled:cursor-not-allowed disabled:opacity-50',
		'aria-[invalid]:border-red-300',
	);
}

export function addCustomErrorToSubmission<Schema extends ZodTypeAny>(
	error: string,
	submission: Submission<output<Schema>>,
): Submission<output<Schema>> {
	return { ...submission, error: { '': [error] } };
}

export function currencyTransformer(val: string, ctx: z.RefinementCtx) {
	const number = rawRemoveComas(val.replace('$', ''));

	if (isNaN(number)) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'El precio debe ser un número',
		});
		return z.NEVER;
	}

	if (number <= 0) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'El precio debe ser mayor a 0',
		});
		return z.NEVER;
	}

	return number;
}
