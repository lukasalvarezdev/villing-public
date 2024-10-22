import { useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	type MetaFunction,
	json,
	redirect,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react';

import { RouteErrorBoundary } from '~/components/error-boundary';
import { IntentButton } from '~/components/form-utils';
import { Container, PageWrapper } from '~/components/ui-library';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { cn, invariant } from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { supplierSchema as schema } from '~/utils/schemas';
import { protectRoute } from '~/utils/session.server';
import { SupplierForm } from './suppliers/supplier-form';

export const meta: MetaFunction<typeof loader> = ({ data }) => [
	{ title: `Actualizar proveedor ${data?.supplier.name} - Villing` },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.supplier_id, 'supplier_id is required');
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);
	const supplier = await db.supplier.findUniqueOrThrow({
		where: { id: parseInt(params.supplier_id), organizationId: orgId },
	});

	return json({ supplier });
}

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.supplier_id, 'supplier_id is required');
	await protectRoute(request);

	const { db, orgId, userId } = await getOrgDbClient(request);
	const { error } = await legalActions.validate(db, userId, 'update_suppliers');
	if (error) {
		return json(
			{
				submission: null,
				error: 'No tienes permisos para actualizar proveedores',
			},
			403,
		);
	}

	const formData = await request.formData();
	const intent = formData.get('intent');

	if (intent === 'delete') {
		await db.supplier.update({
			where: { id: parseInt(params.supplier_id), organizationId: orgId },
			data: { deletedAt: new Date() },
		});

		return redirect('/suppliers?deleted=true');
	}

	const submission = parse(formData, { schema });
	if (submission.intent !== 'submit' || !submission.value) {
		return json({ submission, error: null }, 400);
	}

	try {
		const { address: simpleAddress, ...supplier } = submission.value;
		await db.supplier.update({
			where: { id: parseInt(params.supplier_id), organizationId: orgId },
			data: { ...supplier, simpleAddress },
			select: { id: true },
		});

		return redirect('/suppliers?updated=true');
	} catch (error) {
		await logError({ request, error });

		return json(
			{ submission, error: 'Hubo un error al actualizar el proveedor' },
			500,
		);
	}
}

export default function Component() {
	const { supplier } = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const methods = useForm({
		id: 'supplier',
		constraint: getFieldsetConstraint(schema),
		shouldValidate: 'onBlur',
		onValidate: ({ formData }) => parse(formData, { schema }),
		lastSubmission: actionData?.submission,
		defaultValue: { ...supplier, address: supplier.simpleAddress },
	});

	return (
		<PageWrapper>
			<Container className="max-w-3xl">
				<Link
					to="/clients"
					className="mb-4 flex items-center gap-2 max-w-max"
					prefetch="intent"
				>
					<i className="ri-arrow-left-line"></i>
					Volver a clientes
				</Link>

				<div className="pb-4 border-b border-gray-200 mb-4">
					<h3>Editar a {supplier.name}</h3>
				</div>

				<SupplierForm methods={methods}>
					<IntentButton intent="update">Actualizar proveedor</IntentButton>
				</SupplierForm>

				<DeleteSupplierForm />
			</Container>
		</PageWrapper>
	);
}

function DeleteSupplierForm() {
	return (
		<Form
			method="POST"
			className={cn(
				'p-4 border bg-gray-50 border-gray-200 rounded-md mt-4',
				'flex justify-between items-center',
			)}
		>
			<p className="text-sm">Eliminar proveedor y todos sus datos</p>
			<IntentButton intent="delete" variant="destructive">
				Eliminar proveedor
			</IntentButton>
		</Form>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con el proveedor. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}
