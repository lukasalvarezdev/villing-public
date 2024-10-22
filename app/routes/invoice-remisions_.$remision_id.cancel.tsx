import {
	type ActionFunctionArgs,
	redirect,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node';
import {
	Form,
	Link,
	useActionData,
	useParams,
	useSearchParams,
} from '@remix-run/react';
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

	const { db, orgId, userId } = await getOrgDbClient(request);

	await legalActions.validateAndThrow(db, userId, 'cancel_pos_and_remision');

	const invoice = await db.legalInvoiceRemision.findFirst({
		where: {
			id: parseInt(params.remision_id),
			organizationId: orgId,
		},
		select: { canceledAt: true },
	});
	if (invoice?.canceledAt) return redirect('/invoice-remisions');
	return {};
}

export async function action({ request, params }: ActionFunctionArgs) {
	await protectRoute(request);
	const { db, userId, orgId } = await getOrgDbClient(request);

	const { error } = await legalActions.validate(
		db,
		userId,
		'cancel_pos_and_remision',
	);

	if (error) return json({ error });

	try {
		await db.$transaction(
			async tx => {
				invariant(params.remision_id, 'Missing remision_id');

				const invoice = await tx.legalInvoiceRemision.update({
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
						'add',
					),
				);
			},
			{ timeout: 10_000 },
		);

		return redirect('/invoice-remisions');
	} catch (error) {
		await logError({ request, error });

		return json({ error: 'Error al anular la remisión' }, 500);
	}
}

export default function Component() {
	const { remision_id } = useParams();
	const [searchParams] = useSearchParams();
	const actionData = useActionData<typeof action>();
	const error = actionData?.error;
	const fromRemision = searchParams.get('fromRemision') === 'true';
	const goBackUrl = fromRemision
		? `/invoice-remisions/${remision_id}`
		: '/invoice-remisions';

	return (
		<Modal className="max-w-md pb-20 md:pb-6">
			<div className="mb-4 flex justify-between">
				<h4>¿Deseas anular esta remisión de venta?</h4>

				<Link to={goBackUrl} aria-label="Volver a remisiones">
					<i className="ri-close-line text-2xl"></i>
				</Link>
			</div>

			<p className="mb-4">
				Si anulas la remisión, el dinero se restará de tu balance y el stock de
				los productos será agregado nuevamente.
			</p>

			<Toast variant="warning" className="mb-4">
				Esta acción no se puede deshacer. Si estás seguro, haz click en el botón
				de abajo.
			</Toast>

			<Toast variant="error" className="mb-4">
				{error}
			</Toast>

			<Form
				method="POST"
				className="flex justify-end gap-4 flex-col lg:flex-row"
			>
				<LinkButton to={goBackUrl} prefetch="intent" variant="secondary">
					Cancelar
				</LinkButton>

				<IntentButton intent="cancel" variant="destructive">
					Anular remisión
				</IntentButton>
			</Form>
		</Modal>
	);
}
