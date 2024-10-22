import { Link } from '@remix-run/react';
import * as React from 'react';
import { cn } from '~/utils/misc';
import { ClientOnly } from './client-only';
import { Dialog, DialogContent } from './dialog';

type ModalProps = {
	children: React.ReactNode;
	className?: string;
	onClose?: () => void;
};

export function Modal({ children, className, onClose }: ModalProps) {
	return (
		<ClientOnly>
			{() => (
				<Dialog open onOpenChange={onClose}>
					<DialogContent
						onOpenAutoFocus={e => e.preventDefault()}
						className={className}
					>
						<div>{children}</div>
					</DialogContent>
				</Dialog>
			)}
		</ClientOnly>
	);
}

type ModalHeaderProps = {
	children: React.ReactNode;
	href?: string;
	onClick?: () => void;
	className?: string;
	closeButtonName?: string;
};
export function ModalHeader(props: ModalHeaderProps) {
	const { children, href, onClick, className, closeButtonName } = props;

	return (
		<div className={cn('flex justify-between gap-4', className)}>
			<div>{children}</div>

			{href ? (
				<Link
					className={cn(
						'border border-transparent hover:border-gray-200',
						'flex items-center justify-center',
						'shrink-0 rounded w-8 h-8 text-xl',
					)}
					to={href}
					prefetch="intent"
				>
					<i className="ri-close-line text-gray-400"></i>
				</Link>
			) : (
				<button
					className={cn(
						'border border-transparent hover:border-gray-200',
						'flex items-center justify-center',
						'shrink-0 rounded w-8 h-8 text-xl',
					)}
					onClick={onClick}
				>
					<span className="sr-only">{closeButtonName}</span>
					<i className="ri-close-line text-gray-400"></i>
				</button>
			)}
		</div>
	);
}
