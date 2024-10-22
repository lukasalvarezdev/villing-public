import * as React from 'react';
import { LinkButton } from '~/components/form-utils';
import { Box, ButtonIcon } from '~/components/ui-library';
import { useOnClickOutside, cn, formatCurrency } from '~/utils/misc';
import { type BuilderType } from './builder/schemas';
import { useBuilderFetcher } from './misc';

export function SeeLastInvoiceButton() {
	const [isOpen, setIsOpen] = React.useState(false);
	const [openedSubmissions, setOpenedSumbissions] = React.useState(['']);
	const fetcher = useBuilderFetcher();
	const contRef = React.useRef(null);
	useOnClickOutside(contRef, () => setIsOpen(false));

	const invoice = fetcher?.data?.invoice;
	const intent = fetcher?.data?.intent;
	const submissionId = fetcher?.data?.submissionId;

	if (!invoice || !intent) return null;

	const { to, title } = infoByRecord[intent];
	const wasOpened = openedSubmissions.includes(submissionId as string);

	return (
		<div className="group relative" ref={contRef}>
			<ButtonIcon
				onClick={() => {
					setIsOpen(!isOpen);

					if (submissionId) {
						setOpenedSumbissions([...openedSubmissions, submissionId]);
					}
				}}
				className="w-9 h-9"
				aria-label="Ver última factura"
			>
				<i className="ri-file-list-2-line"></i>
			</ButtonIcon>

			<span
				className={cn(
					'w-4 h-4 bg-primary-600 rounded-full absolute -top-1 -right-1',
					'text-white flex items-center justify-center text-xs font-medium',
					!wasOpened && 'animate-bounce',
				)}
			>
				1
			</span>

			<span
				className={cn(
					'absolute top-full right-0 bg-black text-white text-xs px-2 py-1',
					'rounded-md whitespace-nowrap mt-1',
					'group-hover:opacity-100 opacity-0 transition-opacity duration-300',
				)}
			>
				Ver última factura
			</span>

			{isOpen ? (
				<Box
					className={cn('absolute top-full right-0 mt-1 z-10 w-52 shadow-md')}
				>
					<p className="text-sm font-bold">{title}</p>
					<p className="text-sm text-gray-500 mb-2">No. {invoice.internalId}</p>
					<p className="text-xs text-gray-500">Total</p>
					<p className="mb-4">
						<span className="font-bold">${formatCurrency(invoice.total)}</span>
					</p>

					<LinkButton
						to={`${to}/${invoice.id}?print=true`}
						prefetch="intent"
						target="_blank"
						size="sm"
						variant="secondary"
						className="w-full"
					>
						<i className="ri-printer-cloud-line"></i>
						Imprimir
					</LinkButton>
				</Box>
			) : null}
		</div>
	);
}

const infoByRecord: Record<BuilderType, { to: string; title: string }> = {
	pos: {
		to: '/invoices/pos',
		title: 'Factura de venta pos',
	},
	electronic: {
		to: '/invoices',
		title: 'Factura electrónica',
	},
	remision: {
		to: '/invoice-remisions',
		title: 'Remisión',
	},
	creditNote: {
		to: '/credit-notes',
		title: 'Nota de crédito',
	},
	debitNote: {
		to: '/debit-notes',
		title: 'Nota de débito',
	},
	purchase: {
		to: '/purchases',
		title: 'Factura de compra',
	},
	purchaseInvoice: {
		to: '/purchase-invoices',
		title: 'Factura de compra',
	},
	purchaseRemision: {
		to: '/remisions',
		title: 'Remisión de compra',
	},
	quote: {
		to: '/quotes',
		title: 'Cotización',
	},
	stockSetting: {
		to: '/stock-settings',
		title: 'Ajuste de inventario',
	},
};
