import { type PrismaClient, type PayrollStatus } from '@prisma/client';
import { type PeriodFrequency } from './payroll-schemas';

export function PayrollStatusBadge({ status }: { status: PayrollStatus }) {
	switch (status) {
		case 'emitted':
			return (
				<div className="flex gap-2 text-gray-500 items-center">
					<i className="ri-checkbox-circle-line text-success-600"></i>
					Emitida
				</div>
			);
		case 'emitted_with_errors':
			return (
				<div className="flex gap-2 text-error-600 items-center">
					<i className="ri-close-circle-line"></i>
					Emitida con errores
				</div>
			);
		case 'missing_emissions':
			return (
				<div className="flex gap-2 text-orange-600 items-center whitespace-nowrap">
					<i className="ri-error-warning-line"></i>
					Faltan emisiones
				</div>
			);
		default:
			return (
				<div className="flex gap-2 text-gray-500 items-center whitespace-nowrap">
					<i className="ri-timer-line"></i>
					En borrador
				</div>
			);
	}
}

export function getNoveltyValueByPeriodFrequency(
	frequency: PeriodFrequency,
	value: number,
) {
	switch (frequency) {
		case 'Semanal':
			return value / 4;
		case 'Decadal':
			return value / 3;
		case 'Quincenal':
			return value / 2;
		case 'Mensual':
			return value;
	}
}

export function getNoveltyBaseByPeriodFrequency(
	frequency: PeriodFrequency,
	value: number,
) {
	switch (frequency) {
		case 'Semanal':
			return value * 4;
		case 'Decadal':
			return value * 3;
		case 'Quincenal':
			return value * 2;
		case 'Mensual':
			return value;
	}
}

export function getFrequencyByRange(
	startDate: Date,
	endDate: Date,
): PeriodFrequency {
	const diff = Math.abs(endDate.getTime() - startDate.getTime());
	const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

	if (days === 7) return 'Semanal';
	if (days === 10) return 'Decadal';
	if (days <= 16) return 'Quincenal';
	return 'Mensual';
}

export function getWorkedDaysByPeriodFrequency(frequency: PeriodFrequency) {
	switch (frequency) {
		case 'Semanal':
			return 7;
		case 'Decadal':
			return 10;
		case 'Quincenal':
			return 15;
		case 'Mensual':
			return 30;
	}
}

export function getEmissionErrors(
	employees: Array<{ employee: { name: string } }>,
	responses: Array<PromiseSettledResult<any>>,
) {
	return employees
		.map(({ employee }, i) => {
			const response = responses[i];

			const noErrorResponse = { name: employee.name, error: '' };

			const noError = !response || response.status !== 'rejected';
			if (noError) return noErrorResponse;

			if (!('referenceId' in response.reason)) {
				return { name: employee.name, error: 'Hubo un error' };
			}

			return {
				name: employee.name,
				error: response.reason.referenceId as string,
			};
		})
		.filter(e => e.error);
}

export function getEmployeeStatus(
	employee: Awaited<ReturnType<typeof getEmployee>>,
): EmployeeStatusType {
	if (!employee.payroll.paidAt || !employee.emission) {
		return 'draft';
	}

	const { legalJson, uuid } = employee.emission;

	if (!legalJson) return 'to-emit';
	if (legalJson && uuid) return 'emitted';
	if (legalJson && !uuid) return 'emitted-with-errors';
	return 'draft';
}

function getEmployee(db: PrismaClient) {
	return db.payrollEmployee.findUniqueOrThrow({
		where: { id: '1' },
		select: {
			payroll: { select: { paidAt: true } },
			emission: { select: { uuid: true, legalJson: true } },
		},
	});
}

type EmployeeStatusType =
	| 'draft'
	| 'to-emit'
	| 'emitted'
	| 'emitted-with-errors';
