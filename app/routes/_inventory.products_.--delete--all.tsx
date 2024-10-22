import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { Form } from '@remix-run/react';
import { IntentButton, Toast } from '~/components/form-utils';
import { Box, PageWrapper } from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	return {};
}

export async function action({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	await db.product.deleteMany({
		where: { organizationId: orgId },
	});
	await db.counts.update({
		where: { id: orgId },
		data: { productsCount: 0 },
	});

	return redirect('/products');
}

export default function Component() {
	return (
		<PageWrapper>
			<Box className="mx-auto max-w-md">
				<h4 className="mb-4">Eliminar todos los productos</h4>

				<Toast variant="warning" className="mb-4">
					¿Estás seguro que deseas eliminar todos los productos?. Esta acción no
					se puede deshacer
				</Toast>

				<Form method="POST">
					<IntentButton intent="danger" type="submit" variant="destructive">
						Eliminar todos los productos
					</IntentButton>
				</Form>
			</Box>
		</PageWrapper>
	);
}
