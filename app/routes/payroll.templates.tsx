import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, type MetaFunction, useLoaderData } from '@remix-run/react';
import { ContextMenu } from '~/components/dropdown-menu';
import { LinkButton } from '~/components/form-utils';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
} from '~/components/ui-library';
import { calculateConceptsTotals } from '~/modules/payroll/concepts-context';
import { getOrgDbClient } from '~/utils/db.server';
import { formatCurrency } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: `Plantillas de nómina - Villing` },
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);
	const templates = await db.payrollTemplate.findMany({
		where: { organizationId: orgId },
		orderBy: { name: 'asc' },
		select: {
			id: true,
			name: true,
			salary: true,
			_count: { select: { employees: true } },
			payrollConcepts: true,
		},
	});

	return json({
		templates: templates.map(template => {
			const { total, totalDeductions, totalIncomes } = calculateConceptsTotals(
				template.payrollConcepts,
			);

			return {
				id: template.id,
				name: template.name,
				total: total,
				incomes: totalIncomes,
				deductions: totalDeductions,
				employees: template._count.employees,
			};
		}),
	});
}

export default function Component() {
	const { templates } = useLoaderData<typeof loader>();

	return (
		<div>
			<div className="pb-4 border-b border-gray-200 mb-4">
				<h3>Plantillas</h3>
				<p className="text-gray-500 text-sm">
					Administra las plantillas de ingresos y deducciones.
				</p>
			</div>

			<div className="mb-4 flex justify-end">
				<LinkButton variant="black" to="new">
					<i className="ri-add-circle-line"></i>
					Crear plantilla
				</LinkButton>
			</div>

			<div className="rounded border border-gray-200 shadow-sm mb-4 text-sm bg-white">
				<Table>
					<TableHead>
						<TableHeadCell>Nombre</TableHeadCell>
						<TableHeadCell>Empleados</TableHeadCell>
						<TableHeadCell>Ingresos</TableHeadCell>
						<TableHeadCell>Deducciones</TableHeadCell>
						<TableHeadCell>Total</TableHeadCell>
						<TableHeadCell></TableHeadCell>
					</TableHead>
					<TableBody>
						{templates.map(template => (
							<TableRow key={template.id}>
								<TableCell className="whitespace-nowrap">
									<Link to={`${template.id}`} prefetch="intent">
										<p className="font-medium">{template.name}</p>
									</Link>
								</TableCell>
								<TableCell>
									<Link to={`${template.id}`} prefetch="intent">
										{template.employees}
									</Link>
								</TableCell>
								<TableCell>
									<Link to={`${template.id}`} prefetch="intent">
										${formatCurrency(template.incomes)}
									</Link>
								</TableCell>
								<TableCell>
									<Link to={`${template.id}`} prefetch="intent">
										${formatCurrency(template.deductions)}
									</Link>
								</TableCell>
								<TableCell>
									<Link to={`${template.id}`} prefetch="intent">
										${formatCurrency(template.total)}
									</Link>
								</TableCell>
								<td>
									<ContextMenu
										srLabel={`Opciones para ${template.name}`}
										items={[
											{
												label: 'Ver y editar',
												icon: 'ri-pencil-line',
												href: `/payroll/templates/${template.id}`,
											},
											{
												label: 'Eliminar',
												icon: 'ri-delete-bin-line',
												href: `/payroll/templates/${template.id}/delete`,
											},
										]}
									/>
								</td>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
