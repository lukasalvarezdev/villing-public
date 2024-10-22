import { type DataFunctionArgs, json } from '@remix-run/node';
import {
	Form,
	Link,
	useActionData,
	useLoaderData,
	useNavigation,
	useSearchParams,
} from '@remix-run/react';
import * as React from 'react';
import { DateString } from '~/components/client-only';
import { Button, Label, Select } from '~/components/form-utils';
import { Modal } from '~/components/modal';
import { useUser } from '~/root';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { dianClient } from '~/utils/dian-client.server';
import {
	parseFormData,
	formatDate,
	formatHours,
	invariant,
} from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request, params }: DataFunctionArgs) {
	invariant(params.receipt_id, 'receipt_id is required');

	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const [receipt, members] = await db.$transaction([
		db.invoiceReceipt.findFirstOrThrow({
			where: { organizationId: orgId, id: parseInt(params.receipt_id) },
			include: {
				personWhoReceived: true,
				personWhoReceivedTheMerchandise: true,
				provider: true,
			},
		}),
		db.user.findMany({
			where: { organizations: { some: { organizationId: orgId } } },
			select: { id: true, name: true },
		}),
	]);

	return json({ receipt, members });
}

export async function action({ request, params }: DataFunctionArgs) {
	await protectRoute(request);
	const { db, orgId } = await getOrgDbClient(request);

	const form = await parseFormData(request);
	const userId = form.get('userId');

	try {
		if (!userId) return json({ error: 'Este campo es obligatorio' }, 400);

		await db.$transaction(async tx => {
			invariant(params.receipt_id, 'receipt_id is required');

			const [
				{ id, internalId, cufe, personWhoReceivedTheMerchandise },
				{ soenacToken },
			] = await Promise.all([
				tx.invoiceReceipt.update({
					where: { organizationId: orgId, id: parseInt(params.receipt_id) },
					data: { personWhoReceivedTheMerchandiseId: parseInt(userId) },
					include: { personWhoReceivedTheMerchandise: true },
				}),
				tx.organization.findFirstOrThrow({
					where: { id: orgId },
					select: { soenacToken: true },
				}),
			]);

			const uuid = await dianClient({
				action: 'createInvoiceMerchantReceipt',
				accessToken: soenacToken!,
				body: {
					id: internalId,
					cufe,
					person: {
						name: personWhoReceivedTheMerchandise!.name,
						lastName: 'Alvarez',
						idNumber: '1111',
					},
				},
			});

			await tx.invoiceReceipt.update({
				where: { id: id },
				data: { receiptCufe: uuid as string },
			});
		});

		return json({ success: true });
	} catch (error) {
		await logError({ error, request });

		return json(
			{ error: 'Ocurrió un error al crear la recepción de factura' },
			500,
		);
	}
}

export default function Component() {
	const { receipt, members } = useLoaderData<typeof loader>();
	const user = useUser();
	const [searchParams] = useSearchParams();
	const defaultIsReceivingMerchandise =
		searchParams.get('isReceivingMerchandise') === 'true' &&
		!receipt.personWhoReceivedTheMerchandiseId;
	const [isReceivingMerchandise, setIsReceivingMerchandise] = React.useState(
		defaultIsReceivingMerchandise,
	);
	const actionData = useActionData<typeof action>();
	const navigation = useNavigation();
	const done =
		navigation.state === 'loading' && actionData && 'success' in actionData;
	const error = actionData && 'error' in actionData && actionData.error;

	React.useEffect(() => {
		if (done) setIsReceivingMerchandise(false);
	}, [done, navigation, receipt.id]);

	return (
		<Modal className="p-4 max-w-md">
			<div className="mb-4 flex justify-between items-center">
				<h3>Recepción de factura</h3>
				<Link
					className="w-10 h-10 grid place-content-center hover:bg-gray-100 text-xl rounded"
					to="/invoices/receipts"
					prefetch="intent"
				>
					<i className="ri-close-line" />
				</Link>
			</div>

			<div className="flex flex-col gap-2">
				<div>
					<p className="text-sm font-medium">CUFE</p>
					<p className="break-words mb-2">{receipt.cufe}</p>
					<button
						className="text-sm flex items-center gap-2 group hover:text-primary-600"
						onClick={() => navigator.clipboard.writeText(receipt.cufe)}
					>
						<i className="ri-file-copy-line" />
						<span className="underline hover:no-underline">Copiar CUFE</span>
					</button>
				</div>

				<div className="flex gap-4 children:flex-1 mb-2">
					<div>
						<p className="text-sm text-gray-500">Comprobante No.</p>
						{receipt.number}
					</div>

					<div>
						<p className="text-sm text-gray-500">Fecha de recepción</p>
						<DateString>
							{formatDate(receipt.createdAt)} {formatHours(receipt.createdAt)}
						</DateString>
					</div>
				</div>

				<div className="flex gap-4 children:flex-1 mb-4">
					<div>
						<p className="text-sm text-gray-500">Persona responsable</p>
						{receipt.personWhoReceived.name}
					</div>

					<div>
						<p className="text-sm text-gray-500">Proveedor</p>
						{receipt.provider?.name || 'Sin proveedor'}
					</div>
				</div>

				{receipt.personWhoReceivedTheMerchandise ? (
					<div>
						<h4>Datos de recepción de mercancía</h4>

						<div className="flex gap-4 children:flex-1 mb-4">
							<div>
								<p className="text-sm text-gray-500">Persona responsable</p>
								{receipt.personWhoReceivedTheMerchandise.name}
							</div>

							<div>
								<p className="text-sm text-gray-500">Fecha de recepción</p>
								<DateString>
									{formatDate(receipt.updatedAt)}{' '}
									{formatHours(receipt.updatedAt)}
								</DateString>
							</div>
						</div>
					</div>
				) : !isReceivingMerchandise ? (
					<Button
						variant="black"
						className="max-w-max"
						onClick={() => setIsReceivingMerchandise(true)}
					>
						<i className="ri-truck-line mr-2"></i>
						Recibir mercancía
					</Button>
				) : null}

				{isReceivingMerchandise ? (
					<div className="border-t border-gray-200 pt-4">
						<h4>Datos de recepción de mercancía</h4>
						<p className="text-sm mb-4">
							Completa los datos de la recepción de la mercancía
						</p>
						<Form method="PATCH">
							<div className="mb-4">
								<Label htmlFor="userId">Persona que recibió la mercancía</Label>
								<Select
									id="userId"
									name="userId"
									options={members.map(m => ({ label: m.name, value: m.id }))}
									defaultValue={user.id}
								/>
								{error && (
									<p className="text-error-500 text-sm mt-1 pl-2">{error}</p>
								)}
							</div>

							<div className="flex gap-2 justify-end">
								<Button
									type="button"
									variant="secondary"
									onClick={() => setIsReceivingMerchandise(false)}
								>
									Cancelar
								</Button>
								<Button>Recibir mercancía</Button>
							</div>
						</Form>
					</div>
				) : null}
			</div>
		</Modal>
	);
}
