import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, type MetaFunction, useLoaderData, Form } from '@remix-run/react';
import * as React from 'react';
import { Combobox } from '~/components/combobox';
import { ContextMenu } from '~/components/dropdown-menu';
import { SearchInput } from '~/components/filters';
import { Button, IntentButton, Label, Toast } from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
} from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import { formatCurrency, getRequestSearchParams } from '~/utils/misc';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [{ title: `Empleados - Villing` }];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const searchParams = getRequestSearchParams(request);
	const query = queryBuilder(searchParams, ['name', 'idNumber']);

	const { db, orgId } = await getOrgDbClient(request);
	const [employees, templates] = await db.$transaction([
		db.employee.findMany({
			where: { organizationId: orgId, ...query, deletedAt: null },
			orderBy: { name: 'asc' },
		}),
		db.payrollTemplate.findMany({
			where: { organizationId: orgId },
			select: { id: true, name: true },
		}),
	]);

	return json({ employees, templates });
}

export default function Component() {
	const { employees } = useLoaderData<typeof loader>();

	return (
		<div>
			<div className="pb-4 border-b border-gray-200 mb-4">
				<h3>Empleados</h3>
				<p className="text-gray-500 text-sm">
					Administra los empleados de tu empresa.
				</p>
			</div>

			<div className="mb-4 flex gap-4">
				<div className="flex-1">
					<SearchInput placeholder="Busca por nombre, email o NIT" />
				</div>
				<CreateEmployeeButton />
			</div>

			<div className="rounded border border-gray-200 shadow-sm mb-4 text-sm bg-white">
				<Table>
					<TableHead>
						<TableHeadCell>Empleado</TableHeadCell>
						<TableHeadCell className="whitespace-nowrap">Cargo</TableHeadCell>
						<TableHeadCell>Salario</TableHeadCell>
						<TableHeadCell></TableHeadCell>
					</TableHead>
					<TableBody>
						{employees.map(employee => (
							<TableRow key={employee.id}>
								<TableCell className="whitespace-nowrap">
									<Link to={`${employee.id}`} prefetch="intent">
										<p className="font-medium">{employee.name}</p>
										<span className="text-gray-500">{employee.idNumber}</span>
									</Link>
								</TableCell>
								<TableCell>
									<Link to={`${employee.id}`} prefetch="intent">
										{employee.jobTitle}
									</Link>
								</TableCell>
								<TableCell>
									<Link to={`${employee.id}`} prefetch="intent">
										${formatCurrency(employee.salary)}
									</Link>
								</TableCell>
								<td>
									<ContextMenu
										srLabel={`Opciones para ${employee.name}`}
										items={[
											{
												label: 'Ver y editar',
												icon: 'ri-pencil-line',
												href: `/payroll/employees/${employee.id}`,
											},
											{
												label: 'Duplicar',
												icon: 'ri-file-copy-2-line',
												href: `/payroll/employees/new?employee_id=${employee.id}`,
											},
											{
												label: 'Eliminar',
												icon: 'ri-delete-bin-line',
												href: `/payroll/employees/${employee.id}/delete`,
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

function CreateEmployeeButton() {
	const [isOpen, setIsOpen] = React.useState(false);
	const { templates } = useLoaderData<typeof loader>();

	return (
		<div>
			<Button variant="black" type="button" onClick={() => setIsOpen(true)}>
				<i className="ri-add-circle-line"></i>
				Crear empleado
			</Button>

			{isOpen ? (
				<Modal className="max-w-md">
					<ModalHeader onClick={() => setIsOpen(false)} className="mb-4">
						<h4>Crear un empleado</h4>
					</ModalHeader>

					<Form action="/payroll/employees/new">
						<Toast variant="info" className="mb-4">
							Puedes crear un empleado y asignarle una plantilla de nómina. Esta
							contentrá cosas como el salario, deducciones e ingresos.
						</Toast>

						<div className="mb-4">
							<Label>Plantilla de nómina (opcional)</Label>
							<Combobox
								name="template_id"
								placeholder="Selecciona una plantilla"
								items={templates.map(t => ({ label: t.name, value: t.id }))}
							/>
						</div>

						<div className="flex gap-4 justify-end">
							<Button
								variant="secondary"
								type="button"
								onClick={() => setIsOpen(false)}
							>
								Cancelar
							</Button>
							<IntentButton intent="create">Crear empleado</IntentButton>
						</div>
					</Form>
				</Modal>
			) : null}
		</div>
	);
}
