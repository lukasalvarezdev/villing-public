import { type PrismaClient } from '@prisma/client';
import { json } from '@remix-run/node';
import { z } from 'zod';
import { calculateConceptsTotals } from '~/modules/payroll/concepts-context';
import {
	getIncomeMapper,
	getDeductionMapper,
} from '~/modules/payroll/electronic-payroll-mapper';
import { payrollDianClient } from '~/modules/payroll/payroll-dian-client';
import {
	getEmissionErrors,
	getFrequencyByRange,
	getWorkedDaysByPeriodFrequency,
} from '~/modules/payroll/payroll-misc';
import {
	mapIdType,
	periodsMapper,
	typeWorkersMapper,
	typeContractsMapper,
	paymentMethodsMapper,
} from '~/utils/legal-values';
import { errorLogger } from '~/utils/logger';
import { invariant, parseDateToYYYYMMDD, toNumber } from '~/utils/misc';

type IntentArgs = {
	db: PrismaClient;
	orgId: number;
	payroll_id: string;
	formData: URLSearchParams;
	request: Request;
};

export async function updateEmployeeIntent(args: IntentArgs) {
	const { db, orgId, payroll_id, formData } = args;

	const isSelected = formData.get('isSelected') === 'true';
	const payroll_employee_id = formData.get('payroll_employee_id');

	if (!payroll_employee_id) {
		throw new Error(`Invalid payroll_employee_id: ${payroll_employee_id}`);
	}

	await db.$transaction(async tx => {
		const [payroll, employee] = await Promise.all([
			tx.payroll.findUnique({
				where: { id: payroll_id, organizationId: orgId },
				select: { id: true, paidAt: true },
			}),
			tx.payrollEmployee.findUniqueOrThrow({
				where: { id: payroll_employee_id, organizationId: orgId },
				select: {
					employee: { select: { name: true } },
				},
			}),
		]);

		if (payroll?.paidAt) {
			throw `No se puede modificar la nómina de ${employee.employee.name} porque ya fue pagada.`;
		}

		await tx.payrollEmployee.update({
			where: { id: payroll_employee_id, organizationId: orgId },
			data: { isSelected },
		});
	});

	return json<ActionData>({ success: true });
}

export async function createEmissions(args: IntentArgs) {
	const { db, orgId, payroll_id } = args;

	const { status } = await db.payroll.findUniqueOrThrow({
		where: { id: payroll_id, organizationId: orgId },
		select: { status: true },
	});

	if (status === 'missing_emissions') {
		return await createEmissionsInDian(args);
	}

	await db.$transaction(async tx => {
		const { paidAt, month, year, daysWorked } =
			await tx.payroll.findUniqueOrThrow({
				where: { id: payroll_id, organizationId: orgId },
				select: { paidAt: true, month: true, year: true, daysWorked: true },
			});

		if (paidAt) {
			throw 'No se puede modificar una nómina ya pagada';
		}

		const [
			{ employees, ...payroll },
			{ payrollEmisionCount: currentInternalId },
		] = await Promise.all([
			tx.payroll.update({
				where: { id: payroll_id, organizationId: orgId },
				data: {
					paidAt: new Date(),
					employees: { deleteMany: { isSelected: false } },
					status: 'missing_emissions',
				},
				include: {
					employees: {
						where: { emission: null },
						include: { payrollConcepts: true },
					},
				},
			}),
			tx.counts.findFirstOrThrow({
				where: { organizationId: orgId },
				select: { payrollEmisionCount: true },
			}),
		]);

		const emissions = employees.map((employee, index) => {
			const internalId = currentInternalId + index + 1;

			return {
				internalId,
				payrollId: payroll.id,
				organizationId: orgId,
				endDate: payroll.endDate,
				startDate: payroll.startDate,
				payrollEmployeeId: employee.id,
				employeeId: employee.employeeId,
				month,
				year,
				daysWorked,
			};
		});

		await Promise.all([
			tx.payrollEmission.createMany({ data: emissions }),
			tx.counts.updateMany({
				where: { organizationId: orgId },
				data: {
					payrollEmisionCount: currentInternalId + emissions.length,
				},
			}),
		]);
	});

	return await createEmissionsInDian(args);
}

async function createEmissionsInDian(args: IntentArgs) {
	const { db, orgId, payroll_id, request } = args;

	const [organization, { employees, ...payroll }] = await db.$transaction([
		db.organization.findUniqueOrThrow({ where: { id: orgId } }),
		db.payroll.findUniqueOrThrow({
			where: { id: payroll_id, organizationId: orgId },
			include: {
				employees: {
					where: { emission: { uuid: null } },
					include: {
						payrollConcepts: true,
						employee: true,
						emission: true,
					},
				},
			},
		}),
	]);
	const token = organization.soenacToken;

	if (!token) {
		throw 'No se puede emitir la nómina electrónica sin un token de SOENAC';
	}

	const zipKeys = [] as Array<{ id: string; zip_key: string }>;

	try {
		const transactions = employees.map(employee => {
			invariant(
				employee.emission,
				'No se puede emitir la nómina electrónica sin una emisión asociada',
			);

			const dianEmission = getEmission(employee, {
				number: employee.emission.internalId,
			});

			const { emission } = employee;

			return db.$transaction(async tx => {
				await tryToUpdate();
				validateExistingUuid();

				const result = await payrollDianClient.createPayroll(
					token,
					dianEmission,
				);

				if (!result.success) {
					throw { referenceId: result.referenceId };
				}

				const legalResult = parseLegalPayroll(result.data);

				if (!legalResult.success) {
					zipKeys.push({ id: emission.id, zip_key: legalResult.zip_key });

					throw { referenceId: legalResult.referenceId };
				}

				const { legal_json, payroll } = legalResult;

				await db.payrollEmission.update({
					where: { id: emission.id },
					data: {
						dian_id: payroll.number,
						qr_code: payroll.qr_code,
						uuid: payroll.uuid,
						legalJson: legal_json,
					},
				});

				return true;

				async function tryToUpdate() {
					// This is to make sure the employee will be updated successfully
					// before sending the request to the DIAN
					await tx.payrollEmployee.update({
						where: { id: employee.id },
						data: {},
					});
				}

				function validateExistingUuid() {
					if (emission.uuid) {
						const referenceId = errorLogger({
							error: null,
							path: request.url,
							body: { emission },
							customMessage: `Emission with id ${emission?.id} already has uuid`,
						});

						throw { referenceId };
					}
				}
			});
		});

		const responses = await Promise.allSettled(transactions);

		const errors = getEmissionErrors(employees, responses);

		await updatePayrollStatus();

		if (errors.length > 0) {
			return json<ActionData>(
				{ errors, error: 'Hubo un error con algunos empleados' },
				400,
			);
		}

		return json<ActionData>({ success: true });

		async function updatePayrollStatus() {
			await db.$transaction(async tx => {
				const employees = await tx.payrollEmployee.findMany({
					where: { payrollId: payroll_id },
					include: { emission: true },
				});

				const areAllEmissionsSent = employees.every(
					employee => employee.emission?.legalJson,
				);

				const areAllSuccess = employees.every(e => e.emission?.uuid);

				if (!areAllEmissionsSent) return;

				const status = areAllSuccess ? 'emitted' : 'emitted_with_errors';

				await tx.payroll.update({
					where: { id: payroll_id },
					data: { status },
				});
			});
		}

		type Employee = (typeof employees)[0];
		function getEmission(
			payrollEmployee: Employee,
			config: { number: number },
		) {
			const { employee, payrollConcepts, salary } = payrollEmployee;
			const { number } = config;

			const type_document_identification_id = mapIdType(employee.idType);

			const { total, totalIncomes, totalDeductions } =
				calculateConceptsTotals(payrollConcepts);

			const frequency = getFrequencyByRange(payroll.startDate, payroll.endDate);
			const workedDays = getWorkedDaysByPeriodFrequency(frequency);
			const payroll_period_id =
				periodsMapper[frequency === 'Decadal' ? 'Decenal' : frequency];

			return {
				sync: true,
				xml_sequence_number: { prefix: 'NE', number },
				general_information: { payroll_period_id },
				environment: {
					type_environment_id: 1,
					id: organization.payrollSoftwareId,
					pin: organization.payrollSoftwarePin,
				},
				employer: {
					identification_number: organization.idNumber,
					municipality_id: organization.municipalityId,
					address: organization.address || 'Sin dirección',
					name: organization.name,
				},
				employee: {
					type_worker_id: typeWorkersMapper[employee.typeEmployee],
					subtype_worker_id: employee.hasPension ? 2 : 1,
					high_risk_pension: employee.isHighRisk,
					type_document_identification_id,
					identification_number: employee.idNumber,
					surname: employee.surname,
					first_name: employee.name,
					municipality_id: toNumber(employee.city),
					address: employee.address,
					integral_salary: employee.isIntegralSalary,
					type_contract_id: typeContractsMapper[employee.typeContract],
					salary,
				},
				period: {
					admission_date: parseDateToYYYYMMDD(employee.startDate),
					settlement_start_date: parseDateToYYYYMMDD(payroll.startDate),
					settlement_end_date: parseDateToYYYYMMDD(payroll.endDate),
					date_issue: parseDateToYYYYMMDD(new Date()),
					amount_time: workedDays,
				},
				payment: {
					payment_form_id: 1,
					payment_method_id: paymentMethodsMapper[employee.paymentMethod],
					bank: employee.bank,
					account_type: employee.accountType,
					account_number: employee.accountNumber,
				},
				payment_dates: [{ date: parseDateToYYYYMMDD(new Date()) }],
				rounding: 0,
				accrued_total: totalIncomes,
				deductions_total: totalDeductions,
				total: total,
				earn: getIncomeMapper(payrollConcepts, workedDays),
				deduction: getDeductionMapper(payrollConcepts),
			};
		}
	} catch (error) {
		throw error;
	} finally {
		await db.$transaction(
			zipKeys.map(({ id, zip_key }) => {
				return db.payrollEmission.update({
					where: { id },
					data: { zipKey: zip_key },
				});
			}),
		);
	}
}

export type ActionData = {
	success?: boolean;
	error?: string;
	errors?: Array<{ name: string; error: string }>;
};

function parseLegalPayroll(data: Record<string, any>) {
	const result = legalPayrollSchema.safeParse(data);

	if (!result.success) {
		const zip_key = data?.zip_key;

		const referenceId = errorLogger({
			body: result.error.flatten(),
			error: data,
			path: 'parseLegalPayroll',
			customMessage: 'Error parsing response from DIAN',
		});

		if (typeof zip_key == 'string') {
			return { success: false, zip_key, referenceId } as const;
		}

		throw { referenceId };
	}

	return {
		payroll: legalPayrollSchema.parse(data),
		legal_json: data,
		success: true,
	} as const;
}

const legalPayrollSchema = z.object({
	is_valid: z.boolean(),
	qr_code: z.string().nullable(),
	uuid: z.string().nullable(),
	number: z.string().nullable(),
	zip_key: z.string().nullable(),
});
