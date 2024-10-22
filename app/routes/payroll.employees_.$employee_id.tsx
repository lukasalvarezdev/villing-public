import { parse } from '@conform-to/zod';
import {
	json,
	type ActionFunctionArgs,
	redirect,
	type LoaderFunctionArgs,
	type MetaFunction,
} from '@remix-run/node';
import { Link, Outlet, useActionData, useLoaderData } from '@remix-run/react';
import { IntentButton, LinkButton, Toast } from '~/components/form-utils';
import { GoBackLinkButton } from '~/components/ui-library';
import { EmployeeForm } from '~/modules/payroll/employee-form';
import { employeeSchema } from '~/modules/payroll/payroll-schemas';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { desNullify, invariant } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: `Actualizar empleado - Villing` },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.employee_id, 'No employee id provided');
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const employee = await db.employee.findUniqueOrThrow({
		where: { id: params.employee_id, organizationId: orgId },
		include: { template: true },
	});

	return { employee: desNullify(employee) };
}

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.employee_id, 'No employee id provided');

	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const formData = await request.formData();
	const submission = parse(formData, { schema: employeeSchema });

	if (!submission.value) {
		return json({ submission }, 400);
	}

	try {
		const employee = submission.value;

		await db.employee.update({
			where: { id: params.employee_id, organizationId: orgId },
			data: {
				...employee,
				startDate: new Date(employee.startDate),
			},
		});

		return redirect('/payroll/employees');
	} catch (error) {
		await logError({ error, request });
		return json({ error: 'No pudimos actualizar el empleado' }, 400);
	}
}

export default function Component() {
	const { employee } = useLoaderData<typeof loader>();
	const actionData = useActionData<any>();
	const error = actionData?.error;

	return (
		<div>
			<Outlet />

			<GoBackLinkButton to="/payroll/employees">
				Volver a empleados
			</GoBackLinkButton>

			<div className="pb-4 border-b border-gray-200 mb-4">
				<h3>Actualiza a {employee.name}</h3>
				<p className="text-gray-500 text-sm">
					Introduce los datos del empleado.
				</p>
			</div>

			{employee.template ? (
				<Toast variant="info" className="mb-4 max-w-3xl">
					Este empleado está relacionado a la plantilla{' '}
					<Link
						to={`/payroll/templates/${employee.template.id}`}
						className="font-bold underline"
						target="_blank"
					>
						{employee.template.name}
					</Link>
					. Esta plantilla será usada para rellenar automáticamente sus ingresos
					y deducciones a la hora de crear una nómina.
				</Toast>
			) : null}

			<EmployeeForm
				defaultValue={{ ...employee, startDate: new Date(employee.startDate) }}
			>
				{error ? <Toast variant="error">{error}</Toast> : null}

				<div className="flex justify-between">
					<div className="flex gap-4">
						<LinkButton to="/payroll" variant="secondary">
							Cancelar
						</LinkButton>
						<IntentButton intent="update">Actualizar empleado</IntentButton>
					</div>

					<LinkButton to="delete?from_source=true" variant="destructive">
						Eliminar
					</LinkButton>
				</div>
			</EmployeeForm>
		</div>
	);
}
