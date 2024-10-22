import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Modal, ModalHeader } from '~/components/modal';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
	DateWithTime,
} from '~/components/ui-library';
import { DuplicateInvoiceButton } from '~/modules/invoice/invoice-page-components';
import { getOrgDbClient } from '~/utils/db.server';
import { formatCurrency, invariant } from '~/utils/misc';

export async function loader({ params, request }: LoaderFunctionArgs) {
	invariant(params.order_id, 'order_id is required');

	const { db, orgId } = await getOrgDbClient(request);
	const order = await db.order.findUniqueOrThrow({
		where: {
			id: parseInt(params.order_id),
			store: { organizationId: orgId },
		},
		include: {
			address: true,
			OrderProduct: true,
			store: { select: { subOrganizationId: true } },
		},
	});

	return json({ order });
}

export default function Component() {
	const { order } = useLoaderData<typeof loader>();

	return (
		<Modal className="max-w-4xl">
			<ModalHeader href="/store/orders" className="mb-4">
				<h3 className="flex items-center gap-4 flex-wrap">
					Pedido No. {order.internalId}
					<p className="text-base font-normal">
						<DateWithTime date={order.createdAt} />
					</p>
				</h3>
			</ModalHeader>

			<div className="rounded-md p-4 text-sm bg-gray-50 border border-gray-200 mb-4">
				<p>
					<strong className="font-medium">Nombre:</strong> {order.clientName}
				</p>
				<p>
					<strong className="font-medium">Correo electrónico:</strong>{' '}
					{order.clientMail}
				</p>
				<p>
					<strong className="font-medium">Celular:</strong> {order.clientTel}
				</p>

				<span className="my-2 border-b border-gray-300 block" />

				<p>
					<strong className="font-medium">Dirección:</strong>{' '}
					{order.address.street}, {order.address.zip} {order.address.state},{' '}
					{order.address.city}, {order.address.country}
				</p>

				{order.notes ? (
					<div>
						<span className="my-2 border-b border-gray-300 block" />
						<p>
							<strong className="font-medium">Notas:</strong> {order.notes}
						</p>
					</div>
				) : null}
			</div>

			<div className="rounded border border-gray-200 shadow-sm">
				<Table>
					<TableHead>
						<TableHeadCell>Producto</TableHeadCell>
						<TableHeadCell>Cantidad</TableHeadCell>
						<TableHeadCell>Total</TableHeadCell>
					</TableHead>
					<TableBody>
						{order.OrderProduct.map(product => (
							<TableRow key={product.id}>
								<TableCell className="whitespace-nowrap text-sm">
									{product.name}
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									{product.quantity}
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap font-medium">
									${formatCurrency(product.price * product.quantity)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<div className="mt-4 flex justify-between gap-4 flex-col md:flex-row">
				<DuplicateInvoiceButton
					id={order.id}
					moduleType="order"
					destination="legalPosInvoice"
					text="Pasar a factura"
				/>

				<div className="flex items-center justify-end gap-4">
					<p className="text-sm font-medium text-gray-500">Total</p>
					<p className="text-2xl font-medium">
						${formatCurrency(order.totalAmount)}
					</p>
				</div>
			</div>
		</Modal>
	);
}
