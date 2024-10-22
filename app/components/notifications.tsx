import * as React from 'react';
import { useNotifications } from '~/routes/api.notifications';
import { cn, useOnClickOutside } from '~/utils/misc';
import { Box, ButtonIcon } from './ui-library';

export function NotificationButton() {
	const notifications = useNotifications();
	const [isOpen, setIsOpen] = React.useState(false);
	const containerRef = React.useRef<HTMLDivElement>(null);
	useOnClickOutside(containerRef, () => setIsOpen(false));

	return (
		<div ref={containerRef} className="relative">
			<ButtonIcon onClick={() => setIsOpen(!isOpen)} className="relative">
				<i className="ri-notification-3-line"></i>

				{notifications.length > 0 ? (
					<span
						className={cn(
							'absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center',
							'bg-primary-600 text-white rounded-full text-xs',
						)}
					>
						{notifications.length}
					</span>
				) : null}
			</ButtonIcon>

			{isOpen ? (
				<div
					className={cn(
						'p-4 md:p-0 fixed top-10 left-0',
						'md:left-auto md:top-auto md:absolute md:right-0 md:mt-1',
					)}
				>
					<Box
						className={cn(
							'p-0 text-sm min-w-[350px] max-w-sm',
							'border-gray-100 shadow-lg',
						)}
					>
						<p className="p-4 text-lg font-bold pb-0">Notificaciones</p>

						<p className="p-4">No tienes notificaciones.</p>
					</Box>
				</div>
			) : null}
		</div>
	);
}
