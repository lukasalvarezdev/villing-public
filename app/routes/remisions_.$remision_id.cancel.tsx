import {
	type ActionFunctionArgs,
	redirect,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node';
import { Form, Link, useActionData } from '@remix-run/react';
import { IntentButton, LinkButton, Toast } from '~/components/form-utils';
import { Modal } from '~/components/modal';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { invariant } from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';
import { generateUpdateProductsStockSql } from '~/utils/sql.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
	await protectRoute(request);
	invariant(params.remision_id, 'Missing remision_id');

	const { db, orgId } = await getOrgDbClient(request);

	const invoice = await db.purchaseRemision.findFirst({
		where: {
			id: parseInt(params.remision_id),
			organizationId: orgId,
		},
		select: { canceledAt: true },
	});
	if (invoice?.canceledAt) return redirect('/remisions');
	return {};
}

export async function action({ request, params }: ActionFunctionArgs) {
	await protectRoute(request);
	const { db, userId, orgId } = await getOrgDbClient(request);

	const { error } = await legalActions.validate(db, userId, 'cancel_purchase');

	if (error) return json({ error });

	try {
		await db.$transaction(
			async tx => {
				invariant(params.remision_id, 'Missing remision_id');

				const invoice = await tx.purchaseRemision.update({
					where: {
						id: parseInt(params.remision_id),
						organizationId: orgId,
						canceledAt: null,
					},
					data: { canceledAt: new Date() },
					select: {
						products: { select: { quantity: true, productId: true } },
						subOrganizationId: true,
					},
				});

				const productsToUpdate = invoice.products
					.filter(p => p.productId)
					.map(p => ({ ...p, id: p.productId as number }));

				if (productsToUpdate.length === 0) return;

				await tx.$executeRawUnsafe(
					generateUpdateProductsStockSql(
						productsToUpdate,
						invoice.subOrganizationId,
						'subtract',
					),
				);
			},
			{ timeout: 10_000 },
		);

		return redirect('/remisions');
	} catch (error) {
		await logError({ request, error });

		return json({ error: 'Error al anular la factura' }, 500);
	}
}

export default function Component() {
	const actionData = useActionData<typeof action>();
	const error = actionData?.error;

	return (
		<Modal className="max-w-md pb-20 md:pb-6">
			<div className="mb-4 flex justify-between">
				<h4>¿Deseas anular esta remisión de compra?</h4>

				<Link to="/invoices" aria-label="Volver a todos los cajeros">
					<i className="ri-close-line text-2xl"></i>
				</Link>
			</div>

			<p className="mb-4">
				Si anulas la remisión de compra, el stock de los productos se
				restaurará.
			</p>

			<Toast variant="warning" className="mb-4">
				Esta acción no se puede deshacer. Si estás seguro, haz click en el botón
				de abajo.
			</Toast>

			{error ? (
				<Toast variant="error" className="mb-4">
					{error}
				</Toast>
			) : null}

			<Form
				method="POST"
				className="flex justify-end gap-4 flex-col lg:flex-row"
			>
				<LinkButton to=".." prefetch="intent" variant="secondary">
					Cancelar
				</LinkButton>

				<IntentButton intent="cancel" variant="destructive">
					Anular remisión
				</IntentButton>
			</Form>
		</Modal>
	);
}
