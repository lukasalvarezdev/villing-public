import { useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	type MetaFunction,
	json,
	redirect,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/node';
import { Link, useActionData } from '@remix-run/react';

import { RouteErrorBoundary } from '~/components/error-boundary';
import {
	IntentButton,
	addCustomErrorToSubmission,
} from '~/components/form-utils';
import { PageWrapper, Container } from '~/components/ui-library';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { legalActions } from '~/utils/permissions.server';
import { supplierSchema as schema } from '~/utils/schemas';
import { protectRoute } from '~/utils/session.server';
import { SupplierForm } from './suppliers/supplier-form';

export const meta: MetaFunction = () => [
	{ title: 'Crea un nuevo proveedor - Villing' },
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);
	return json({});
}

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const formData = await request.formData();

	const submission = parse(formData, { schema });
	if (submission.intent !== 'submit' || !submission.value) {
		return json({ submission, error: null }, 400);
	}

	const { db, orgId, userId } = await getOrgDbClient(request);
	const { error } = await legalActions.validate(db, userId, 'update_clients');
	if (error) {
		return json(
			{ submission: addCustomErrorToSubmission(error, submission) },
			403,
		);
	}

	try {
		const { address: simpleAddress, ...supplier } = submission.value;
		await db.$transaction(async tx => {
			const { suppliersCount: internalId } = await tx.counts.update({
				where: { id: orgId, organizationId: orgId },
				data: { suppliersCount: { increment: 1 } },
				select: { suppliersCount: true },
			});

			await tx.supplier.create({
				data: { ...supplier, simpleAddress, internalId, organizationId: orgId },
				select: { id: true },
			});
		});

		return redirect('/suppliers?created=true');
	} catch (error) {
		await logError({ request, error });

		return json(
			{ submission, error: 'Hubo un error al crear el proveedor' },
			500,
		);
	}
}

export default function Component() {
	const actionData = useActionData<typeof action>();
	const methods = useForm({
		id: 'supplier',
		constraint: getFieldsetConstraint(schema),
		shouldValidate: 'onBlur',
		onValidate: ({ formData }) => parse(formData, { schema }),
		lastSubmission: actionData?.submission,
	});

	return (
		<PageWrapper>
			<Container className="max-w-3xl">
				<Link
					to="/suppliers"
					className="mb-4 flex items-center gap-2 max-w-max"
					prefetch="intent"
				>
					<i className="ri-arrow-left-line"></i>
					Volver a proveedores
				</Link>

				<div className="pb-4 border-b border-gray-200 mb-4">
					<h3>Crea un proveedor</h3>
					<p className="text-gray-500 text-sm">
						Los proveedores son las personas o empresas que te venden productos.
					</p>
				</div>
				<SupplierForm methods={methods}>
					<IntentButton intent="create">Crear proveedor</IntentButton>
				</SupplierForm>
			</Container>
		</PageWrapper>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado creando el proveedor. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}
