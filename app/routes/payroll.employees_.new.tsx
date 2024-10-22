import { parse } from '@conform-to/zod';
import {
	json,
	type ActionFunctionArgs,
	redirect,
	type LoaderFunctionArgs,
	type MetaFunction,
} from '@remix-run/node';
import { useActionData, useLoaderData } from '@remix-run/react';
import { LinkButton, IntentButton, Toast } from '~/components/form-utils';
import { GoBackLinkButton } from '~/components/ui-library';
import { EmployeeForm } from '~/modules/payroll/employee-form';
import { employeeSchema } from '~/modules/payroll/payroll-schemas';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { desNullify, getRequestSearchParams, toNumber } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [{ title: `Nuevo empleado - Villing` }];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const searchParams = getRequestSearchParams(request);
	const template_id = searchParams.get('template_id');

	const [employee, template] = await db.$transaction([
		db.employee.findUnique({
			where: {
				id: searchParams.get('employee_id') || '',
				organizationId: orgId,
			},
		}),
		db.payrollTemplate.findUnique({
			where: { id: template_id ?? '' },
			select: {
				name: true,
				employees: { select: { id: true } },
				payrollConcepts: { where: { keyName: 'Salario' } },
			},
		}),
	]);
	const defaultSalary = toNumber(template?.payrollConcepts[0]?.amount);

	return {
		employee: employee ? desNullify(employee) : undefined,
		defaultSalary,
	};
}

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const formData = await request.formData();
	const submission = parse(formData, { schema: employeeSchema });

	if (!submission.value) {
		return json({ submission }, 400);
	}

	const employee = submission.value;

	try {
		await db.$transaction(async tx => {
			const { employeesCount: internalId } = await tx.counts.update({
				where: { id: orgId },
				data: { employeesCount: { increment: 1 } },
			});

			const searchParams = getRequestSearchParams(request);
			const template_id = searchParams.get('template_id');

			await tx.employee.create({
				data: {
					internalId,
					organizationId: orgId,
					...employee,
					startDate: new Date(employee.startDate),
					templateId: template_id || null,
				},
			});
		});

		return redirect('/payroll/employees');
	} catch (error) {
		await logError({ error, request });
		return json({ error: 'No pudimos crear el empleado' }, 400);
	}
}

export default function Component() {
	const { employee, defaultSalary } = useLoaderData<typeof loader>();
	const actionData = useActionData<any>();
	const error = actionData?.error;

	function getDefaultValue() {
		if (!employee) return { salary: defaultSalary };

		const {
			name,
			surname,
			idNumber,
			city,
			address,
			email,
			startDate,
			accountNumber,
			salary,
			...defaultValue
		} = employee;

		return { ...defaultValue, startDate: undefined } as any;
	}

	return (
		<div>
			<GoBackLinkButton to="/payroll/employees">
				Volver a empleados
			</GoBackLinkButton>

			<div className="pb-4 border-b border-gray-200 mb-4">
				<h3>Crea un empleado</h3>
				<p className="text-gray-500 text-sm">
					Introduce los datos del empleado.
				</p>
			</div>

			<EmployeeForm defaultValue={getDefaultValue()}>
				{error ? <Toast variant="error">{error}</Toast> : null}

				<div className="flex gap-4">
					<LinkButton to="/payroll" variant="secondary">
						Cancelar
					</LinkButton>
					<IntentButton intent="primary">Crear empleado</IntentButton>
				</div>
			</EmployeeForm>
		</div>
	);
}
