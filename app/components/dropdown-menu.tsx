import { Link } from '@remix-run/react';
import { cn } from '~/utils/misc';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from './primitives/dropdown';
import { ButtonIcon } from './ui-library';

export function ContextMenu({
	srLabel,
	items,
}: {
	srLabel: string;
	items: Array<{
		label: string;
		icon?: string;
		href?: string;
		target?: string;
	}>;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<ButtonIcon
					className={cn(
						'border-none shadow-none h-8 w-8 rounded-md',
						'data-[state=open]:bg-gray-100',
					)}
				>
					<span className="sr-only fixed">{srLabel}</span>
					<i className="ri-more-fill text-gray-600" />
				</ButtonIcon>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="bg-white min-w-40">
				{items.map((item, index) => (
					<DropdownMenuItem
						key={index}
						className="flex gap-2 items-center"
						asChild={Boolean(item.href)}
					>
						{item.href ? (
							<Link
								to={item.href}
								prefetch="intent"
								className={cn('flex gap-2 items-center justify-between')}
								target={item.target}
							>
								{item.label}
								{item.icon ? (
									<i className={cn(item.icon, 'text-base text-gray-300')} />
								) : null}
							</Link>
						) : (
							<div>
								{item.icon ? (
									<i className={cn(item.icon, 'text-base')} />
								) : null}
								{item.label}
							</div>
						)}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
