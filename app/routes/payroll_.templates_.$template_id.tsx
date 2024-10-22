import {
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	redirect,
	json,
	type MetaFunction,
} from '@remix-run/node';
import { Outlet, useLoaderData } from '@remix-run/react';
import {
	Box,
	BuilderContainer,
	Container,
	GoBackLinkButton,
	PageWrapper,
} from '~/components/ui-library';
import { ConceptsForm } from '~/modules/payroll/concept-forms';
import { parseConcepts } from '~/modules/payroll/concept-parser';
import { EmployeesList } from '~/modules/payroll/employees-list';
import { getOrgDbClient } from '~/utils/db.server';
import { invariant, parseFormData } from '~/utils/misc';
import { actionError } from '~/utils/misc.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: `Editar plantilla de nómina - Villing` },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.template_id, 'Missing template_id');
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const [template, employees] = await db.$transaction([
		db.payrollTemplate.findUnique({
			where: { id: params.template_id },
			select: {
				name: true,
				employees: { select: { id: true } },
				payrollConcepts: true,
			},
		}),
		db.employee.findMany({
			where: { organizationId: orgId, deletedAt: null },
			select: { id: true, name: true, email: true },
		}),
	]);

	if (!template) {
		throw new Response('No se encontró la plantilla', { status: 404 });
	}

	return {
		employees,
		name: template.name,
		concepts: template.payrollConcepts,
		selectedEmployees: template.employees.map(e => e.id),
	};
}

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.template_id, 'Missing template_id');

	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);
	const formData = await parseFormData(request);

	try {
		const { errors, salary, concepts } = parseConcepts(formData);
		const employees = formData.getAll('employees');
		const name = formData.get('name');

		if (errors.length) return json({ errors }, 400);

		await db.$transaction(async tx => {
			await tx.payrollTemplate.update({
				where: { id: params.template_id, organizationId: orgId },
				data: { payrollConcepts: { deleteMany: {} } },
				select: { id: true },
			});

			await tx.payrollTemplate.update({
				where: { id: params.template_id, organizationId: orgId },
				data: {
					organizationId: orgId,
					name: name || 'Plantilla de nómina',
					salary,
					payrollConcepts: {
						create: concepts.map(c => ({ ...c, organizationId: orgId })),
					},
					employees: { set: employees.map(e => ({ id: e })) },
				},
				select: { id: true },
			});
		});

		return redirect('/payroll/templates');
	} catch (error) {
		const message = 'Hubo un error al crear la plantilla';
		return actionError({ error, message, request, formData });
	}
}

export default function Component() {
	const { employees, concepts, name, selectedEmployees } =
		useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<Outlet />

			<Container>
				<GoBackLinkButton to="/payroll/templates">
					Volver a plantillas
				</GoBackLinkButton>

				<div className="pb-4 border-b border-gray-200 mb-4">
					<h3>Actualiza la plantilla de nómina</h3>
					<p className="text-gray-500 text-sm">
						Usa la misma plantilla mes a mes para no tener que introducir los
						datos manualmente.
					</p>
				</div>

				<ConceptsForm concepts={concepts}>
					<BuilderContainer.BigColumn>
						<ConceptsForm.Name name={name} />
						<ConceptsForm.ConceptsList />
					</BuilderContainer.BigColumn>

					<BuilderContainer.SmallColumn>
						<Box className="sticky z-10 top-[calc(60px+1rem)]">
							<ConceptsForm.Totals />
							<ConceptsForm.SaveButton />
						</Box>

						<EmployeesList employees={employees} ids={selectedEmployees} />
					</BuilderContainer.SmallColumn>
				</ConceptsForm>
			</Container>
		</PageWrapper>
	);
}
