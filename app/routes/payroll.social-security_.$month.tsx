import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { type MetaFunction, useLoaderData } from '@remix-run/react';
import * as React from 'react';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
	GoBackLinkButton,
} from '~/components/ui-library';
import { months } from '~/utils/dates-misc';
import { getOrgDbClient } from '~/utils/db.server';
import { cn, compareStrings, formatCurrency, toNumber } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = ({ params }) => [
	{ title: `Seguridad social de ${params.month} - Villing` },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
	await protectRoute(request);
	assertMonth(params.month);

	const month = params.month;

	const { db, orgId } = await getOrgDbClient(request);

	const payrolls = await getPayrolls();

	const payrollEmployees = getAllMappedPayrollEmployees();
	const employees = getEmployeeDataByMonth();

	return { month, employees };

	async function getPayrolls() {
		const payrolls = await db.payroll.findMany({
			where: { organizationId: orgId, status: 'emitted', month },
			select: {
				month: true,
				daysWorked: true,
				employees: {
					where: { employee: { deletedAt: null } },
					select: {
						payrollConcepts: true,
						employee: {
							select: { id: true, name: true },
						},
					},
				},
			},
		});

		return payrolls.map(payroll => {
			return {
				...payroll,
				employees: payroll.employees.map(employee => {
					return {
						id: employee.employee.id,
						name: employee.employee.name,
						payrollConcepts: employee.payrollConcepts,
					};
				}),
			};
		});
	}

	function getAllMappedPayrollEmployees() {
		return payrolls.flatMap(payroll => {
			const { employees, daysWorked } = payroll;

			return employees.map(employee => {
				const { payrollConcepts, id, name } = employee;

				const health = toNumber(
					payrollConcepts.find(x => compareStrings(x.keyName, 'salud'))?.amount,
				);
				const pension = toNumber(
					payrollConcepts.find(x => compareStrings(x.keyName, 'pensión'))
						?.amount,
				);
				const salary = toNumber(
					payrollConcepts.find(x => compareStrings(x.keyName, 'salario'))
						?.amount,
				);

				return { id, name, daysWorked, health, pension, salary };
			});
		});
	}

	function getEmployeeDataByMonth() {
		return payrollEmployees.reduce((acc, employee) => {
			const { id } = employee;

			const current = acc.find(x => x.id === id);

			if (!current) {
				acc.push(employee);
				return acc;
			}

			current.health += employee.health;
			current.pension += employee.pension;
			current.salary += employee.salary;

			return acc;
		}, [] as Array<EmployeeByMonth>);

		type EmployeeByMonth = {
			id: string;
			name: string;
			salary: number;
			health: number;
			pension: number;
		};
	}
}

export default function Component() {
	const { month, employees } = useLoaderData<typeof loader>();

	return (
		<div>
			<GoBackLinkButton to="/payroll/social-security" className="mb-2">
				Volver a seguridad social
			</GoBackLinkButton>

			<div className="pb-4 border-b border-gray-200 mb-4">
				<h3>Planillas de seguridad social de {month.toLowerCase()}</h3>
				<p className="text-gray-500 text-sm">
					Consulta la lista detalla de las planillas de seguridad social de tus
					empleados en el mes de {month.toLowerCase()}.
				</p>
			</div>

			<div className="rounded border border-gray-200 shadow-sm mb-4 text-sm bg-white">
				<Table>
					<TableHead>
						<TableHeadCell>Empleado</TableHeadCell>
						<TableHeadCell>Salario</TableHeadCell>
						<TableHeadCell>Salud</TableHeadCell>
						<TableHeadCell>Pensión</TableHeadCell>
					</TableHead>
					<TableBody>
						{employees.map(employee => (
							<TableRow key={employee.id} className="h-11">
								<TableCell className="capitalize">
									<p className="flex whitespace-nowrap gap-1">
										{employee.name}
									</p>
								</TableCell>
								<TableCell>
									<CopyButton value={employee.salary} />
								</TableCell>
								<TableCell>
									<CopyButton value={employee.health} />
								</TableCell>
								<TableCell>
									<CopyButton value={employee.pension} />
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

function CopyButton({ value }: { value: number }) {
	const [copied, setCopied] = React.useState(false);

	return (
		<div className="relative group max-w-max">
			<button
				className="flex gap-2 items-center"
				type="button"
				onClick={() => {
					navigator.clipboard.writeText(value.toString());
					setCopied(true);
					setTimeout(() => setCopied(false), 1000);
				}}
			>
				<i className="ri-file-copy-line text-gray-400 group-hover:scale-110 transition-all"></i>
				<p>${formatCurrency(value)}</p>
			</button>

			<span
				className={cn(
					'fixed bg-gray-800 text-white transition-all',
					'text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100',
				)}
			>
				{copied ? 'Copiado!' : 'Copiar'}
			</span>
		</div>
	);
}

function assertMonth(month?: string): asserts month is (typeof months)[number] {
	if (!months.includes(month as any)) {
		throw redirect('/payroll/social-security');
	}
}
