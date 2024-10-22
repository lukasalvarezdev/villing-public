import { Link, useLocation, type LinkProps, NavLink } from '@remix-run/react';
import * as React from 'react';
import { cn, formatDate, formatHours, getTo } from '~/utils/misc';
import { DateString } from './client-only';
import { type ParagraphProps } from './form-utils';

export type DivProps = Omit<React.HTMLProps<HTMLDivElement>, 'classID'>;

export const Container = React.forwardRef<HTMLDivElement, DivProps>(
	(props, ref) => {
		return (
			<div
				{...props}
				className={cn(
					'mx-auto w-[90%] md:w-[95%] max-w-screen-2xl',
					props.className,
				)}
				ref={ref}
			>
				{props.children}
			</div>
		);
	},
);
Container.displayName = 'Container';

export function PageWrapper(props: DivProps) {
	return (
		<div
			className={cn(
				'mx-auto w-[90%] md:w-[95%] max-w-screen-2xl pt-[calc(60px+1.25rem)] pb-6',
				props.className,
			)}
		>
			{props.children}
		</div>
	);
}

type ButtonProps = React.DetailedHTMLProps<
	React.ButtonHTMLAttributes<HTMLButtonElement>,
	HTMLButtonElement
>;

type ButtonIconProps = ButtonProps & {
	variant?: 'icon' | 'iconAndText';
};

export const ButtonIcon = React.forwardRef<HTMLButtonElement, ButtonIconProps>(
	({ variant = 'icon', className, ...props }, ref) => {
		return (
			<button
				className={cn(
					'flex items-center justify-center gap-2 h-9 w-9 rounded-md shadow-sm',
					'border border-gray-200 hover:bg-gray-100 transition-colors',
					className,
				)}
				type="button"
				{...props}
				ref={ref}
			>
				{props.children}
			</button>
		);
	},
);
ButtonIcon.displayName = 'ButtonIcon';

export function Box({ children, className, ...props }: DivProps) {
	return (
		<div
			{...props}
			className={cn(
				'bg-white border border-gray-100 shadow-sm rounded-lg p-4',
				className,
			)}
		>
			{children}
		</div>
	);
}

export function TwoColumnsDiv({ children, className }: DivProps) {
	return (
		<div
			className={cn(
				'flex gap-4 flex-col md:flex-row children:flex-1',
				className,
			)}
		>
			{children}
		</div>
	);
}

type StepProps = {
	icon: string;
	title: string;
	step: number;
	activeStep: number;
	totalSteps?: number;
	href: string;
	disabled?: boolean;
};
export function Step(props: StepProps) {
	const { icon, step, title, activeStep, totalSteps, href, disabled } = props;
	return (
		<Link
			to={href}
			prefetch="intent"
			className="flex gap-2 group"
			onClick={e => {
				if (disabled) {
					e.preventDefault();
					e.stopPropagation();
				}
			}}
		>
			<div
				className={cn(
					'h-9 w-9 rounded-full flex items-center justify-center relative',
					'shrink-0',
					activeStep === step
						? 'bg-primary-600 text-white'
						: 'bg-primary-25 text-primary-600',
					activeStep !== step &&
						'group-hover:bg-primary-50 group-hover:text-primary-600',
				)}
			>
				<i className={cn(icon, 'text-lg')}></i>

				<span
					className={cn(
						'absolute bg-gray-900 text-white rounded px-4 py-2',
						'whitespace-nowrap text-sm top-full mt-1 left-0',
						'opacity-0 transition-opacity duration-300 group-hover:opacity-100',
					)}
				>
					{title}
				</span>
			</div>

			{activeStep === step ? (
				<div>
					<span className="text-xs text-primary-600 leading-3 block">
						Paso {step} / {totalSteps || 4}
					</span>
					<p className="text-sm font-medium whitespace-nowrap">{title}</p>
				</div>
			) : null}
		</Link>
	);
}

export function StepSeparatorLine({
	activeStep,
	step,
}: {
	activeStep: number;
	step: number;
}) {
	return (
		<hr
			className={cn(
				'flex-1 border-t-2 self-center',
				activeStep > step ? 'border-primary-600' : 'border-primary-100',
			)}
		/>
	);
}

export function StepsContainer({ children }: { children: React.ReactNode }) {
	return (
		<Box
			className={cn(
				'p-4 shadow-none border-gray-100 mb-4 rounded-lg',
				'flex gap-4 justify-between overflow-x-auto overflow-y-hidden md:overflow-visible',
			)}
		>
			{children}
		</Box>
	);
}

export function NextArrowIcon() {
	return (
		<i className="ri-arrow-right-line ml-2 group-hover:translate-x-1 transition-transform" />
	);
}

export function Table({
	children,
	className,
	id,
}: {
	children: React.ReactNode;
	className?: string;
	id?: string;
}) {
	return (
		<div className={cn('w-full overflow-x-auto', className)} id={id}>
			<table className="w-full">{children}</table>
		</div>
	);
}

export function TableHead({ children }: { children: React.ReactNode }) {
	return (
		<thead className="border-b border-gray-200">
			<tr className="text-left text-gray-500">{children}</tr>
		</thead>
	);
}

export function RawTableHead({ children }: { children: React.ReactNode }) {
	return <thead className="border-b border-gray-200">{children}</thead>;
}

export function TableHeadRow({ children }: { children: React.ReactNode }) {
	return <tr className="text-left text-gray-500">{children}</tr>;
}

export function TableHeadCell(props: {
	children?: React.ReactNode;
	className?: string;
	colSpan?: number;
}) {
	const { children, className, colSpan } = props;
	return (
		<th
			className={cn('h-10 px-2 font-medium text-sm align-middle', className)}
			colSpan={colSpan}
		>
			{children}
		</th>
	);
}

export function TableBody({ children }: { children: React.ReactNode }) {
	return <tbody>{children}</tbody>;
}

export function TableRow({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<tr
			className={cn(
				'border-b border-gray-200 last-of-type:border-none',
				className,
			)}
		>
			{children}
		</tr>
	);
}

export function TableCell({
	children,
	className,
	colSpan,
}: {
	children: React.ReactNode;
	className?: string;
	colSpan?: number;
}) {
	return (
		<td className={cn('p-2 align-middle', className)} colSpan={colSpan}>
			{children}
		</td>
	);
}

type LinkTableCellProps = {
	children: React.ReactNode;
	className?: string;
	to: string;
};
export function LinkTableCell({ children, className, to }: LinkTableCellProps) {
	return (
		<td className="h-[1px]">
			<Link
				prefetch="intent"
				to={to}
				className={cn('flex items-center gap-2 p-2 py-1 h-full', className)}
			>
				{children}
			</Link>
		</td>
	);
}

type DateWithTimeProps = ParagraphProps & { date: string };
export function DateWithTime({ date, className, ...props }: DateWithTimeProps) {
	return (
		<DateString>
			<p
				{...props}
				className={cn('flex gap-2 whitespace-nowrap flex-nowrap', className)}
			>
				{formatDate(date)}
				<span className="text-gray-400">({formatHours(date)})</span>
			</p>
		</DateString>
	);
}

type StatusBadgeProps = {
	className?: string;
	variant: 'success' | 'warning' | 'error' | 'info';
	children: React.ReactNode;
	size?: 'sm' | 'md' | 'xs';
	withBackground?: boolean;
};
export function StatusBadge(props: StatusBadgeProps) {
	const { className, variant, children, size = 'sm', withBackground } = props;

	return (
		<div
			className={cn(
				'flex gap-2 items-center text-gray-600',
				size === 'xs' && 'text-xs',
				size === 'sm' && 'text-sm',
				size === 'md' && 'text-base',
				variant === 'success' && 'text-success-600',
				variant === 'warning' && 'text-orange-600',
				variant === 'error' && 'text-error-600',
				withBackground &&
					'bg-gray-100 rounded-md px-2 py-0.5 border border-gray-200',
				withBackground &&
					variant === 'success' &&
					'bg-success-50 border border-success-200',
				withBackground &&
					variant === 'error' &&
					'bg-error-50 border border-error-200',
				withBackground &&
					variant === 'warning' &&
					'bg-orange-50 border border-orange-200',
				className,
			)}
		>
			{variant === 'info' ? <i className="ri-information-line"></i> : null}
			{variant === 'success' ? <i className="ri-check-line"></i> : null}
			{variant === 'warning' ? <i className="ri-alert-line"></i> : null}
			{variant === 'error' ? <i className="ri-error-warning-line"></i> : null}
			{children}
		</div>
	);
}

export function ProfitArrow({ positive }: { positive: boolean }) {
	return (
		<i
			className={cn(
				'ri-arrow-right-up-line block',
				positive ? 'text-success-600' : 'text-error-600 rotate-90',
			)}
		></i>
	);
}

export function IsCancelledToast({
	canceledAt,
}: {
	canceledAt: string | null;
}) {
	if (!canceledAt) return null;

	return (
		<div className="whitespace-nowrap text-gray-600 text-sm items-center gap-2 flex">
			<i className="ri-information-line text-error-600"></i>
			<p>Anulada</p>
		</div>
	);
}

interface GoBackLinkButtonProps extends LinkProps {
	to: string;
}
export function GoBackLinkButton({
	className,
	...props
}: GoBackLinkButtonProps) {
	const { search } = useLocation();

	return (
		<Link
			{...props}
			prefetch="intent"
			className={cn('flex items-center gap-2 mb-4 max-w-max', className)}
			to={{ pathname: props.to, search }}
		>
			<i className="ri-arrow-left-line"></i>
			<p className="underline">{props.children}</p>
		</Link>
	);
}

export function WithSidebarUIContainer(props: DivProps) {
	return <div {...props} className={cn('flex gap-6', props.className)}></div>;
}

export function SidebarContainer(props: DivProps) {
	return (
		<div {...props} className={cn('md:w-1/5 mt-2', props.className)}></div>
	);
}

interface LinkWithCurrentSearchProps extends LinkProps {
	to: string;
}
export function LinkWithCurrentSearch({
	className,
	...props
}: LinkWithCurrentSearchProps) {
	const { search } = useLocation();

	return (
		<Link
			{...props}
			prefetch="intent"
			to={getTo({ pathname: props.to, search })}
			className={className}
		>
			{props.children}
		</Link>
	);
}

type NavItemProps = { to: string; text: string; home?: string };
export function MobileNavItem({ to, text, home }: NavItemProps) {
	const { pathname } = useLocation();
	const isSettingsPage = pathname === home;
	const isSettingsItem = to === home;

	return (
		<li>
			<NavLink
				to={to}
				className={({ isActive }) =>
					cn(
						'block px-3 py-1',
						(isSettingsItem && isSettingsPage) ||
							(isActive && !isSettingsPage && !isSettingsItem)
							? 'bg-white rounded-sm shadow-sm border border-gray-200'
							: ' rounded text-gray-500 border border-transparent',
					)
				}
				prefetch="intent"
			>
				{text}
			</NavLink>
		</li>
	);
}

export function NavItem({ to, text, home }: NavItemProps) {
	const { pathname } = useLocation();
	const isSettingsPage = pathname === home;
	const isSettingsItem = to === home;

	return (
		<li>
			<NavLink
				to={to}
				className={({ isActive }) =>
					cn(
						'block py-1 px-4 font-medium text-gray-700',
						(isSettingsItem && isSettingsPage) ||
							(isActive && !isSettingsPage && !isSettingsItem)
							? 'bg-gray-100 rounded-sm'
							: 'hover:underline',
					)
				}
				prefetch="intent"
			>
				{text}
			</NavLink>
		</li>
	);
}

export function BuilderContainer(props: DivProps) {
	return (
		<div
			{...props}
			className={cn('flex flex-col-reverse lg:flex-row gap-6', props.className)}
		/>
	);
}

BuilderContainer.BigColumn = function BigColumn(props: DivProps) {
	return (
		<div {...props} className={cn('flex-1 lg:max-w-[70%]', props.className)} />
	);
};

BuilderContainer.SmallColumn = function SmallColumn(props: DivProps) {
	return (
		<section
			{...props}
			className={cn(
				'flex-1 max-w-[24rem] flex flex-col gap-4',
				props.className,
			)}
		/>
	);
};
