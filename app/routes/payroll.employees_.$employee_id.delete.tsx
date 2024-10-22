import {
	redirect,
	json,
	type ActionFunctionArgs,
	type MetaFunction,
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
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: `Eliminar empleado - Villing` },
];

export async function action({ request, params }: ActionFunctionArgs) {
	await protectRoute(request);

	const { db, userId, orgId } = await getOrgDbClient(request);

	const { error } = await legalActions.validate(db, userId, 'update_members');

	if (error) return json({ error });

	try {
		await db.employee.update({
			where: {
				id: params.employee_id,
				organizationId: orgId,
				deletedAt: null,
			},
			data: { deletedAt: new Date() },
			select: { id: true },
		});

		return redirect('/payroll/employees');
	} catch (error) {
		await logError({ request, error });

		return json({ error: 'Error al eliminar el empleado' }, 500);
	}
}

export default function Component() {
	const { employee_id } = useParams();
	const [searchParams] = useSearchParams();
	const actionData = useActionData<typeof action>();
	const error = actionData?.error;
	const fromSource = searchParams.get('from_source') === 'true';
	const goBackUrl = fromSource
		? `/payroll/employees/${employee_id}`
		: '/payroll/employees';

	return (
		<Modal className="max-w-md pb-20 md:pb-6">
			<div className="mb-4 flex justify-between">
				<h4>¿Deseas eliminar este empleado?</h4>

				<Link to={goBackUrl} aria-label="Volver a todos los cajeros">
					<i className="ri-close-line text-2xl"></i>
				</Link>
			</div>

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
				<LinkButton to={goBackUrl} prefetch="intent" variant="secondary">
					Cancelar
				</LinkButton>

				<IntentButton intent="cancel" variant="destructive">
					Eliminar empleado
				</IntentButton>
			</Form>
		</Modal>
	);
}
