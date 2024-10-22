import {
	json,
	redirect,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node';
import { type MetaFunction, useParams, Form } from '@remix-run/react';
import { IntentButton, LinkButton } from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { invariant } from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction<typeof loader> = ({ data }) => [
	{ title: `Eliminar producto - Villing` },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.product_id, 'params.product_id must be defined');

	await protectRoute(request);

	return json({});
}

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.product_id, 'params.product_id must be defined');
	const productId = parseInt(params.product_id);

	await protectRoute(request);

	const { db, orgId, userId } = await getOrgDbClient(request);

	const { error } = await legalActions.validate(db, userId, 'remove_product');

	if (error) return { error };

	try {
		await db.product.delete({
			where: { id: productId, organizationId: orgId },
		});

		return redirect(`/products?deleted=true`);
	} catch (error) {
		await logError({ request, error });

		return json({ error: 'No se pudo eliminar el producto' }, 500);
	}
}

export default function Component() {
	const { product_id } = useParams();

	return (
		<Modal className="max-w-lg">
			<ModalHeader href={`/products/${product_id}`}>
				<h4>¿Estás seguro de eliminar el producto?</h4>
			</ModalHeader>

			<p className="mb-4">
				Esta acción no se puede deshacer. Si eliminas el producto, no podrás
				recuperarlo.
			</p>

			<Form method="POST" className="flex gap-4 justify-end">
				<LinkButton to={`/products/${product_id}`} variant="secondary">
					Cancelar
				</LinkButton>
				<IntentButton intent="delete" type="submit" variant="destructive">
					Sí, eliminar
				</IntentButton>
			</Form>
		</Modal>
	);
}
