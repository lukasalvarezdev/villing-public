import {
	type ActionFunctionArgs,
	json,
	redirect,
	type LoaderFunctionArgs,
} from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react';
import { Button, Input, Label, Select } from '~/components/form-utils';
import { Modal } from '~/components/modal';
import { useUser } from '~/root';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { dianClient } from '~/utils/dian-client.server';
import { parseFormData, toNumber } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const [providers, members] = await db.$transaction([
		db.supplier.findMany({
			where: { organizationId: orgId },
			select: { id: true, name: true },
		}),
		db.user.findMany({
			where: { organizations: { some: { organizationId: orgId } } },
			select: { id: true, name: true },
		}),
	]);

	return json({ providers, members });
}

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const form = await parseFormData(request);
	const cufe = form.get('cufe');
	const userId = form.get('userId');
	const providerId = toNumber(form.get('providerId'));

	if (!cufe) return json({ error: 'El CUFE es requerido' }, 400);
	if (!userId) return json({ error: 'El usuario es requerido' }, 400);

	const { db, orgId } = await getOrgDbClient(request);

	try {
		const id = await db.$transaction(async tx => {
			const [
				{ invoiceReceiptCount: internalId },
				existingReceipt,
				{ soenacToken },
			] = await Promise.all([
				tx.counts.update({
					where: { id: orgId },
					data: { invoiceReceiptCount: { increment: 1 } },
					select: { invoiceReceiptCount: true },
				}),
				tx.invoiceReceipt.findFirst({
					where: { cufe },
					select: { id: true },
				}),
				tx.organization.findFirstOrThrow({
					where: { id: orgId },
					select: { soenacToken: true },
				}),
			]);

			if (existingReceipt) return existingReceipt.id;

			const receipt = await tx.invoiceReceipt.create({
				data: {
					cufe,
					internalId,
					organizationId: orgId,
					personWhoReceivedId: parseInt(userId),
					providerId: providerId || undefined,
				},
				select: { id: true, personWhoReceived: true },
			});

			const { number, uuid } = await dianClient({
				action: 'createInvoiceReceipt',
				accessToken: soenacToken!,
				body: {
					id: internalId,
					cufe,
					person: {
						name: receipt.personWhoReceived.name,
						lastName: 'Alvarez',
						idNumber: '1111',
					},
				},
			});
			await tx.invoiceReceipt.update({
				where: { id: receipt.id },
				data: { number: number as string, receiptCufe: uuid as string },
			});
			return receipt.id;
		});

		return redirect(`/invoices/receipts/${id}`);
	} catch (error) {
		await logError({ error, request });
		return json(
			{ error: 'Ocurrió un error al crear la recepción de factura' },
			500,
		);
	}
}

export default function Component() {
	const { providers, members } = useLoaderData<typeof loader>();
	const user = useUser();
	const actionData = useActionData<typeof action>();
	const error = actionData?.error;

	return (
		<Modal className="p-4 max-w-md">
			<div className="mb-4 flex justify-between items-center">
				<h3>Nueva recepción de factura</h3>
				<Link
					className="w-10 h-10 grid place-content-center hover:bg-gray-100 text-xl rounded"
					to="/invoices/receipts"
					prefetch="intent"
				>
					<i className="ri-close-line" />
				</Link>
			</div>

			<Form method="POST">
				<Label>CUFE</Label>
				<Input
					name="cufe"
					className="mb-2"
					placeholder="Código único de factura electrónica"
					autoComplete="off"
				/>

				<div className="mb-2">
					<Label>Proveedor</Label>
					<Select
						name="providerId"
						options={providers
							.map(provider => ({ value: provider.id, label: provider.name }))
							.concat({ value: 0, label: 'Sin proveedor' })}
						defaultValue=""
					/>
				</div>

				<div className="mb-4">
					<Label htmlFor="userId">Persona que recibió la factura</Label>
					<Select
						id="userId"
						name="userId"
						options={members.map(member => ({
							value: member.id,
							label: member.name,
						}))}
						defaultValue={user.id}
					/>
				</div>

				{error ? <p className="text-error-500 text-sm mb-4">{error}</p> : null}

				<div className="flex gap-2 justify-end">
					<Link to="/invoices/receipts" prefetch="intent">
						<Button type="button" variant="secondary">
							Cancelar
						</Button>
					</Link>
					<Button>Recibir factura</Button>
				</div>
			</Form>
		</Modal>
	);
}
