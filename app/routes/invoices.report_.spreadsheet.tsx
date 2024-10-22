import { useLoaderData, useLocation } from '@remix-run/react';
import { utils, writeFile } from 'xlsx';
import { Button, LinkButton } from '~/components/form-utils';
import { Modal } from '~/components/modal';
import { cn, formatDate, formatHours } from '~/utils/misc';
import { loader as reportLoader } from './invoices.report';

export { reportLoader as loader };

export default function Component() {
	const { invoicesToPrint } = useLoaderData<typeof reportLoader>();
	const { search } = useLocation();

	return (
		<Modal className="max-w-lg">
			<h3 className="font-medium mb-1">Exportar reporte de ventas a excel</h3>

			<p className="mb-4 text-gray-500 text-sm">
				Estás a punto de generar un reporte de ventas con un total de{' '}
				<strong>{invoicesToPrint.length}</strong> facturas. ¿Deseas continuar?
			</p>

			<div>
				<Button
					className={cn('w-full mb-2')}
					variant="black"
					onClick={() => {
						try {
							const headers = [
								'No.',
								'Sucursal',
								'Fecha',
								'Cliente',
								'NIT',
								'Subtotal',
								'Impuestos',
								'Total',
							];

							const data = invoicesToPrint.map(invoice => {
								return {
									'No.': invoice.internalId,
									Sucursal: invoice.subOrganizationName,
									Fecha: `${formatDate(invoice.createdAt)} ${formatHours(
										invoice.createdAt,
									)}`,
									Cliente: invoice.clientName,
									NIT: invoice.clientIdNumber,
									Subtotal: invoice.subtotal,
									Impuestos: invoice.totalTax,
									Total: invoice.subtotal + invoice.totalTax,
								};
							});

							const wb = utils.book_new();
							const ws = utils.json_to_sheet(data, { header: headers });
							utils.book_append_sheet(wb, ws, 'Facturas');
							writeFile(
								wb,
								`reporte-${formatDate(new Date())}-${formatHours(
									new Date(),
								)}.xlsx`,
							);
						} catch (error) {}
					}}
				>
					<i className="ri-file-excel-line"></i>
					Exportar reporte de ventas
				</Button>
				<LinkButton
					variant="secondary"
					to={`/invoices${search}`}
					prefetch="intent"
				>
					Cancelar
				</LinkButton>
			</div>
		</Modal>
	);
}
