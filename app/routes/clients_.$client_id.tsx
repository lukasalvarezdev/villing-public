import { useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	type MetaFunction,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	json,
	redirect,
} from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react';

import { RouteErrorBoundary } from '~/components/error-boundary';
import { IntentButton } from '~/components/form-utils';
import { PageWrapper, Container } from '~/components/ui-library';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { cn, invariant } from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { clientSchema as schema } from '~/utils/schemas';
import { protectRoute } from '~/utils/session.server';
import { ClientForm } from './clients/client-form';

export const meta: MetaFunction<typeof loader> = ({ data }) => [
	{ title: `Actualizar cliente ${data?.client.name} - Villing` },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.client_id, 'client_id is required');
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);
	const [client, priceLists] = await db.$transaction([
		db.client.findUniqueOrThrow({
			where: { id: Number(params.client_id), organizationId: orgId },
		}),
		db.priceList.findMany({
			where: { organizationId: orgId, deletedAt: null },
			orderBy: { name: 'asc' },
			select: { id: true, name: true },
		}),
	]);

	return json({
		client,
		priceLists: priceLists.map(p => ({ label: p.name, value: p.id })),
	});
}

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.client_id, 'client_id is required');
	await protectRoute(request);

	const { db, orgId, userId } = await getOrgDbClient(request);

	const { error } = await legalActions.validate(db, userId, 'update_clients');
	if (error) {
		return json(
			{
				error: 'No tienes permisos para actualizar clientes',
				submission: null,
			},
			403,
		);
	}

	const formData = await request.formData();
	const intent = formData.get('intent');

	if (intent === 'delete') {
		await db.client.update({
			where: { id: parseInt(params.client_id), organizationId: orgId },
			data: { deletedAt: new Date() },
		});

		return redirect('/clients?deleted=true');
	}

	const submission = parse(formData, { schema });
	if (submission.intent !== 'submit' || !submission.value) {
		return json({ submission, error: null }, 400);
	}

	try {
		const { address: simpleAddress, ...client } = submission.value;
		await db.client.update({
			where: { id: parseInt(params.client_id), organizationId: orgId },
			data: { ...client, simpleAddress },
			select: { id: true },
		});

		return redirect('/clients?updated=true');
	} catch (error) {
		await logError({ request, error });

		return json(
			{ submission, error: 'Hubo un error al actualizar el cliente' },
			500,
		);
	}
}

export default function Component() {
	const { priceLists, client } = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const methods = useForm({
		id: 'client-form',
		constraint: getFieldsetConstraint(schema),
		shouldValidate: 'onBlur',
		onValidate: ({ formData }) => parse(formData, { schema }),
		lastSubmission: actionData?.submission,
		defaultValue: { ...client, address: client.simpleAddress },
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
					<h3>Actualiza a {client.name}</h3>
				</div>

				<ClientForm methods={methods} priceLists={priceLists}>
					<IntentButton intent="update">Actualizar cliente</IntentButton>
				</ClientForm>
				<DeleteClientForm />
			</Container>
		</PageWrapper>
	);
}

function DeleteClientForm() {
	return (
		<Form
			method="POST"
			className={cn(
				'p-4 border bg-gray-50 border-gray-200 rounded-md mt-4',
				'flex justify-between items-center',
			)}
		>
			<p className="text-sm">Eliminar cliente y todos sus datos</p>
			<IntentButton intent="delete" variant="destructive">
				Eliminar cliente
			</IntentButton>
		</Form>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con el cliente. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}
