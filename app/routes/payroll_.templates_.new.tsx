import {
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	redirect,
	json,
	type MetaFunction,
} from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
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
import { parseFormData } from '~/utils/misc';
import { actionError } from '~/utils/misc.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: `Nueva plantilla de nómina - Villing` },
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const employees = await db.employee.findMany({
		where: { organizationId: orgId, deletedAt: null },
		select: { id: true, name: true, email: true },
	});

	return { employees };
}

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);
	const formData = await parseFormData(request);

	try {
		const { errors, salary, concepts } = parseConcepts(formData);
		const employees = formData.getAll('employees');
		const name = formData.get('name');

		if (errors.length) return json({ errors }, 400);

		const template = await db.payrollTemplate.create({
			data: {
				organizationId: orgId,
				name: name || 'Plantilla de nómina',
				salary,
				payrollConcepts: {
					create: concepts.map(c => ({ ...c, organizationId: orgId })),
				},
				employees: { connect: employees.map(id => ({ id })) },
			},
			select: { id: true },
		});

		return redirect(`/payroll/templates/${template.id}`);
	} catch (error) {
		const message = 'Hubo un error al crear la plantilla';
		return actionError({ error, message, request, formData });
	}
}

export default function Component() {
	const { employees } = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<Container>
				<GoBackLinkButton to="/payroll/templates">
					Volver a plantillas
				</GoBackLinkButton>

				<div className="pb-4 border-b border-gray-200 mb-4">
					<h3>Crea una plantilla de nómina</h3>
					<p className="text-gray-500 text-sm">
						Usa la misma plantilla mes a mes para no tener que introducir los
						datos manualmente.
					</p>
				</div>

				<ConceptsForm>
					<BuilderContainer.BigColumn>
						<ConceptsForm.Name />
						<ConceptsForm.ConceptsList />
					</BuilderContainer.BigColumn>

					<BuilderContainer.SmallColumn>
						<Box className="sticky z-10 top-[calc(60px+1rem)]">
							<ConceptsForm.Totals />
							<ConceptsForm.SaveButton />
						</Box>

						<EmployeesList employees={employees} />
					</BuilderContainer.SmallColumn>
				</ConceptsForm>
			</Container>
		</PageWrapper>
	);
}
