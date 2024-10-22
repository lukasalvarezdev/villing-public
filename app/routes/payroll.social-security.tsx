import { type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, type MetaFunction } from '@remix-run/react';
import { ContextMenu } from '~/components/dropdown-menu';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
} from '~/components/ui-library';
import { months as allMonths } from '~/utils/dates-misc';
import { getOrgDbClient } from '~/utils/db.server';
import { cn, compareStrings, formatCurrency, toNumber } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: `Seguridad social - Villing` },
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const payrolls = await db.payroll.findMany({
		where: { organizationId: orgId, status: 'emitted' },
		select: {
			month: true,
			daysWorked: true,
			employees: {
				where: { employee: { deletedAt: null } },
				select: { payrollConcepts: true, employeeId: true },
			},
		},
	});

	const payrollEmployees = getAllMappedPayrollEmployees();
	const employeesMonthData = getEmployeeDataByMonth();

	const months = allMonths.map(month => {
		// only available if all employees have worked 30 days
		const status: MonthStatus = employeesMonthData.every(employee => {
			const daysWorked = employee.data[month]?.daysWorked || 0;
			return daysWorked >= 30;
		})
			? 'available'
			: 'unavailable';

		const paidPerMonth = employeesMonthData.map(x => x.data[month]?.total || 0);
		const paid = paidPerMonth.reduce((acc, item) => acc + item, 0);

		return { month, employees: employeesMonthData.length, paid, status };
	});

	return { months };

	function getAllMappedPayrollEmployees() {
		return payrolls.flatMap(payroll => {
			const { employees, month, daysWorked } = payroll;

			return employees.map(employee => {
				const { payrollConcepts, employeeId } = employee;

				const health = toNumber(
					payrollConcepts.find(x => compareStrings(x.keyName, 'salud'))?.amount,
				);
				const pension = toNumber(
					payrollConcepts.find(x => compareStrings(x.keyName, 'pensión'))
						?.amount,
				);

				const total = health + pension;

				return { total, employeeId, daysWorked, month };
			});
		});
	}

	function getEmployeeDataByMonth() {
		return payrollEmployees.reduce((acc, employee) => {
			const { month, daysWorked, employeeId, total } = employee;

			const current = acc.find(x => x.employeeId === employeeId);

			if (!current) {
				acc.push({ employeeId, data: { [month]: getData() } });
				return acc;
			}

			current.data[month] = getData();

			return acc;

			function getData() {
				const current = acc.find(x => x.employeeId === employeeId);
				const currentMonth = current?.data[month];

				return {
					daysWorked: daysWorked + toNumber(currentMonth?.daysWorked),
					total: total + toNumber(currentMonth?.total),
				};
			}
		}, [] as Array<EmployeeByMonth>);

		type EmployeeByMonth = {
			employeeId: string;
			data: Record<string, { daysWorked: number; total: number }>;
		};
	}
}

export default function Component() {
	const { months } = useLoaderData<typeof loader>();

	return (
		<div>
			<div className="pb-4 border-b border-gray-200 mb-4">
				<h3>Planillas para seguridad social</h3>
				<p className="text-gray-500 text-sm">
					Descarga las planillas de seguridad social de tus empleados mes a mes.
				</p>
			</div>

			<div className="rounded border border-gray-200 shadow-sm mb-4 text-sm bg-white">
				<Table>
					<TableHead>
						<TableHeadCell>Mes</TableHeadCell>
						<TableHeadCell>Empleados</TableHeadCell>
						<TableHeadCell>Total</TableHeadCell>
						<TableHeadCell>Estado</TableHeadCell>
						<TableHeadCell></TableHeadCell>
					</TableHead>
					<TableBody>
						{months.map(month => (
							<TableRow key={month.month} className="h-11">
								<TableCell className="capitalize">
									<p className="flex whitespace-nowrap gap-1">
										<span>{month.month}</span>
										<span>{new Date().getFullYear()}</span>
									</p>
								</TableCell>
								<TableCell>{month.employees}</TableCell>
								<TableCell>${formatCurrency(month.paid)}</TableCell>
								<TableCell>
									<MonthStatusBadge status={month.status} />
								</TableCell>
								<td>
									<ContextMenu
										srLabel={`Opciones de periodo ${month.month}`}
										items={[
											{ label: 'Imprimir', href: `${month.month}?print=true` },
											{ label: 'Ver detalles', href: month.month },
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

type MonthStatus = 'available' | 'unavailable';
function MonthStatusBadge({ status }: { status: MonthStatus }) {
	const text = status === 'available' ? 'Disponible' : 'No disponible';

	return (
		<p className={cn('px-2 py-0.5 rounded text-sm text-gray-500')}>
			{status === 'available' ? (
				<i className="ri-checkbox-circle-line text-success-600 mr-2"></i>
			) : (
				<i className="ri-close-circle-line mr-2"></i>
			)}

			{text}
		</p>
	);
}
