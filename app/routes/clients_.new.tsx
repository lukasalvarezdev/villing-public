import { useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	type MetaFunction,
	type DataFunctionArgs,
	json,
	redirect,
	type ActionFunctionArgs,
} from '@remix-run/node';
import { Link, useActionData, useLoaderData } from '@remix-run/react';

import { RouteErrorBoundary } from '~/components/error-boundary';
import {
	IntentButton,
	addCustomErrorToSubmission,
} from '~/components/form-utils';
import { PageWrapper, Container } from '~/components/ui-library';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { getRequestSearchParams, safeRedirect } from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { clientSchema as schema } from '~/utils/schemas';
import { protectRoute } from '~/utils/session.server';
import { ClientForm } from './clients/client-form';

export const meta: MetaFunction = () => [
	{ title: 'Crea un nuevo cliente - Villing' },
];

export async function loader({ request }: DataFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);
	const priceLists = await db.priceList.findMany({
		where: { organizationId: orgId, deletedAt: null },
		orderBy: { name: 'asc' },
		select: { id: true, name: true },
	});

	return json({
		priceLists: priceLists.map(p => ({ label: p.name, value: p.id })),
	});
}

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const formData = await request.formData();
	const searchParams = getRequestSearchParams(request);

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
		const { address: simpleAddress, ...client } = submission.value;
		await db.$transaction(async tx => {
			const { clientsCount: internalId } = await tx.counts.update({
				where: { id: orgId, organizationId: orgId },
				data: { clientsCount: { increment: 1 } },
				select: { clientsCount: true },
			});

			await tx.client.create({
				data: { ...client, simpleAddress, internalId, organizationId: orgId },
				select: { id: true },
			});
		});

		const redirectTo = searchParams.get('redirectTo');
		if (redirectTo) return redirect(safeRedirect(redirectTo));
		return redirect('/clients?created=true');
	} catch (error) {
		await logError({ request, error });

		return json(
			{ submission, error: 'Hubo un error al crear el cliente' },
			500,
		);
	}
}

export default function Component() {
	const { priceLists } = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const methods = useForm({
		id: 'login',
		constraint: getFieldsetConstraint(schema),
		shouldValidate: 'onBlur',
		onValidate: ({ formData }) => parse(formData, { schema }),
		lastSubmission: actionData?.submission,
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
					<h3>Crea un cliente</h3>
					<p className="text-gray-500 text-sm">
						Los clientes son las personas o empresas que compran tus productos o
						servicios.
					</p>
				</div>
				<ClientForm methods={methods} priceLists={priceLists}>
					<IntentButton intent="create">Crear cliente</IntentButton>
				</ClientForm>
			</Container>
		</PageWrapper>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado creando el cliente. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}
