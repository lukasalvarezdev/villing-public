import * as React from 'react';
import { Combobox } from '~/components/combobox';
import { Button, Label } from '~/components/form-utils';
import { Box } from '~/components/ui-library';

type Employee = { name: string; email: string | null; id: string };

export function EmployeesList({
	employees,
	ids,
}: {
	employees: Array<Employee>;
	ids?: Array<string>;
}) {
	const [selectedIds, setSelectedIds] = React.useState<Array<string>>(
		ids || [],
	);
	const restEmployees = employees.filter(
		e => !selectedIds.includes(e.id.toString()),
	);

	return (
		<Box>
			{selectedIds.map(id => (
				<input
					key={id}
					type="hidden"
					name="employees"
					value={id}
					form="template-form"
				/>
			))}

			<h5 className="mb-2">Empleados usando esta plantilla</h5>
			<p className="text-sm text-gray-500 mb-4">
				La información que agregues en esta plantilla será usada por defecto en
				la nómina en los empleados que selecciones.
			</p>

			<div className="mb-4">
				<Label>Buscar empleado para agregar</Label>
				<Combobox
					name="employee"
					value=""
					placeholder="Presiona aquí para buscar"
					items={restEmployees.map(e => ({ label: e.name, value: e.id }))}
					onChange={value => setSelectedIds(ids => [...ids, value])}
				/>
			</div>

			{selectedIds.length > 0 ? (
				<div>
					<p className="mb-4 font-medium text-sm">Empleados seleccionados</p>

					<ul className="flex flex-col gap-4">
						{selectedIds.map(id => (
							<EmployeeItem
								key={id}
								employee={employees.find(e => e.id === id)}
								onRemove={() => {
									setSelectedIds(ids => ids.filter(i => i !== id));
								}}
							/>
						))}
					</ul>
				</div>
			) : null}
		</Box>
	);
}

function EmployeeItem({
	employee,
	onRemove,
}: {
	employee?: Employee;
	onRemove: () => void;
}) {
	if (!employee) return null;

	return (
		<li className="flex justify-between gap-4 items-center">
			<div className="flex-1 text-sm">
				<p className="font-medium">{employee.name}</p>
				<p className="text-gray-500">{employee.email}</p>
			</div>
			<Button variant="secondary" size="sm" type="button" onClick={onRemove}>
				Eliminar
			</Button>
		</li>
	);
}
