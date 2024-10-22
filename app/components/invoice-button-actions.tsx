import { Link } from '@remix-run/react';
import { Box, ButtonIcon } from '~/components/ui-library';
import { cn, getTo, useContextMenuState } from '~/utils/misc';
import { type InvoiceSessionSchema } from '../modules/invoice/invoice-modules';

type ActionType = 'duplicate';
type InvoiceButtonActionsProps = {
	destination: InvoiceSessionSchema;
	origin: InvoiceSessionSchema;
	sourceId: number;
	options: Array<{
		name: string;
		icon: string;
		to: string;
		action?: ActionType;
		destination?: InvoiceSessionSchema;
		condition?: boolean;
	}>;
	no: string;
};
export function InvoiceButtonActions(props: InvoiceButtonActionsProps) {
	const { options, no } = props;
	const { menuState, containerRef, toggleMenu, menuId } = useContextMenuState();
	const { isOpen } = menuState;

	return (
		<div ref={containerRef} className="relative">
			<ButtonIcon
				className={cn('border-none shadow-none', isOpen && 'bg-gray-100')}
				onClick={toggleMenu}
			>
				<span className="sr-only">
					Abrir opciones de acciones para la factura {no}
				</span>
				<i className="ri-more-fill text-gray-600" />
			</ButtonIcon>

			<Box
				className={cn(
					'!p-1 text-sm min-w-[150px] z-10 fixed',
					!isOpen && 'opacity-0 pointer-events-none',
				)}
				style={{ top: menuState.top, left: menuState.left }}
				id={menuId}
			>
				<ul>
					{options
						.filter(o => o.condition === undefined || o.condition)
						.map((option, index) => (
							<li key={index} className="w-full">
								<LinkOption
									option={option}
									destination={props.destination}
									origin={props.origin}
									sourceId={props.sourceId}
								/>
							</li>
						))}
				</ul>
			</Box>
		</div>
	);
}

function LinkOption({
	option,
	destination,
	origin,
	sourceId,
}: {
	option: InvoiceButtonActionsProps['options'][0];
	sourceId: number;
	origin: InvoiceSessionSchema;
	destination: InvoiceSessionSchema;
}) {
	const searchParams = new URLSearchParams();

	if (option.action === 'duplicate') {
		searchParams.set('id', sourceId.toString());
		searchParams.set('origin', origin);
		searchParams.set('destination', option.destination || destination);
	}

	return (
		<Link
			className={cn(
				'flex justify-between items-center gap-4 px-4 py-1.5 rounded w-full',
				'hover:bg-gray-100 whitespace-nowrap',
			)}
			to={getTo({ pathname: option.to, search: searchParams.toString() })}
			prefetch="intent"
		>
			{option.name}
			<i className={option.icon} />
		</Link>
	);
}
