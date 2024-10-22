import ReactDOM from 'react-dom';
import { cn } from '~/utils/misc';
import { ClientOnly } from './client-only';

type PrintableContentProps = {
	children: React.ReactNode;
};

export function PrintableContent({ children }: PrintableContentProps) {
	return (
		<ClientOnly>
			{() =>
				ReactDOM.createPortal(
					<div
						className={cn(
							'sr-only print:not-sr-only bg-white z-50',
							'p-0 m-0 text-[11px]',
						)}
					>
						{children}
					</div>,
					document.getElementById('print-portal') || document.body,
				)
			}
		</ClientOnly>
	);
}

export function NonPrintableContent({
	children,
}: {
	children: React.ReactNode;
}) {
	return <div className="print:hidden">{children}</div>;
}
