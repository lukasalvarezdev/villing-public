import { v4 as uuid } from 'uuid';
import { __prisma } from '~/utils/db.server';
import { compareStrings, toNumber } from '~/utils/misc';
import {
	adjustConceptsToBaseSalary,
	getBaseSalaryFromSalaryPortionByFrequency,
	getDefaultDeductions,
	getDefaultIncomes,
} from './definition';
import {
	getNoveltyValueByPeriodFrequency,
	getWorkedDaysByPeriodFrequency,
} from './payroll-misc';
import { type ConfigType } from './payroll-schemas';

export function employeeMapper({
	config,
	employee,
	orgId,
}: {
	employee: EmployeeType;
	orgId: number;
	config: ConfigType;
}) {
	const salary = getSalary();
	const daysWorked = getWorkedDaysByPeriodFrequency(config.frequency);
	const baseSalary = getBaseSalaryFromSalaryPortionByFrequency(
		config.frequency,
		salary,
	);

	const defaultConcepts = getDefaultConcepts();
	const concepts = adjustConceptsToBaseSalary({
		concepts: extractTemplateExtraProps() || defaultConcepts,
		...getBaseProps(),
	}).map(c => ({ ...c, organizationId: orgId }));

	return {
		salary,
		isSelected: true,
		organizationId: orgId,
		employeeId: employee.id,
		payrollConcepts: { create: concepts },
	};

	function extractTemplateExtraProps() {
		return employee.template?.payrollConcepts.map(
			({ id, payrollEmployeeId, payrollTemplateId, ...c }) => ({
				...c,
				id: uuid(),
				organizationId: orgId,
			}),
		);
	}

	function getDefaultConcepts() {
		const incomes = getDefaultIncomes(getBaseProps());
		const deductions = getDefaultDeductions(salary);

		return [...incomes, ...deductions].map(c => ({
			...c,
			organizationId: orgId,
		}));
	}

	function getSalary() {
		const amount =
			toNumber(
				employee.template?.payrollConcepts.find(c => {
					return compareStrings(c.keyName, 'salario');
				})?.amount,
			) || employee.salary;

		return getNoveltyValueByPeriodFrequency(config.frequency, amount);
	}

	function getBaseProps() {
		return {
			baseSalary,
			daysWorked,
			salary,
			hasTransportAid: employee.hasTransportHelp,
		};
	}
}

function getEmployees() {
	return __prisma.employee.findMany({
		where: { deletedAt: null },
		select: {
			id: true,
			salary: true,
			template: {
				select: { payrollConcepts: true, salary: true },
			},
			hasTransportHelp: true,
		},
	});
}
export type EmployeeType = Awaited<ReturnType<typeof getEmployees>>[0];
