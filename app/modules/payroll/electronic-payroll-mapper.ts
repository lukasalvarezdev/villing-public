import { type PayrollConcept } from '@prisma/client';
import { compareStrings, toNumber } from '~/utils/misc';

export function getIncomeMapper(
	incomes: Array<PayrollConcept>,
	workedDays: number,
) {
	return {
		basic: getSalary(),
		transports: getTransport(),
		daily_overtime: getExtraHours('Horas diurnas extras (25%)'),
		overtime_night_hours: getExtraHours('Horas nocturnas extras (75%)'),
		hours_night_surcharge: getExtraHours('Horas recargos nocturnos (35%)'),
		sunday_and_holiday_daily_overtime: getExtraHours(
			'Horas extras dominicales y festivas (100%)',
		),
		daily_surcharge_hours_on_sundays_and_holidays: getExtraHours(
			'Horas de recargo dominicales y festivas (75%)',
		),
		sunday_night_overtime_and_holidays: getExtraHours(
			'Horas extras nocturnas dominicales y festivas (150%)',
		),
		sunday_and_holidays_night_surcharge_hours: getExtraHours(
			'Horas de recargo nocturno dominicales y festivas (110%)',
		),
		vacation: getVacation(),
		primas: getPrimas(),
		layoffs: getLayoffs(),
		incapacities: getIncapacities(),
		licensings: getLicencings(),
		bonuses: getBonuses(),
		assistances: getAssistances(),
		legal_strikes: getLegalStrikes(),
		other_concepts: getOtherConcepts(),
		compensations: getCompensations(),
		vouchers: getVouchers(),
		comissions: getComissions(),
		third_party_payments: getThirdPartyPayments(),
		advances: getAdvances(),
		endowment: getOptionalValue(toNumber(getIncome('Dotación')?.amount)),
		sustainment_support: getOptionalValue(
			toNumber(getIncome('Apoyo de sostenimiento')?.amount),
		),
		telecommuting: getOptionalValue(toNumber(getIncome('Teletrabajo')?.amount)),
		company_withdrawal_bonus: getOptionalValue(
			toNumber(getIncome('Bonificación por retiro')?.amount),
		),
		compensation: getOptionalValue(
			toNumber(getIncome('Indemnización por despido')?.amount),
		),
		refund: getOptionalValue(toNumber(getIncome('Reintegro')?.amount)),
	};

	function getSalary() {
		const salary = getIncome('Salario')?.amount;
		if (!salary) throw new Error('El salario no puede ser nulo');
		return { worked_days: workedDays, worker_salary: salary };
	}

	function getTransport() {
		const transportation_assistance =
			toNumber(getIncome('Auxilio de transporte')?.amount) || undefined;
		const viatic =
			toNumber(getIncome('Viaticos salariales')?.amount) || undefined;
		const non_salary_viatic =
			toNumber(getIncome('Viaticos no salariales')?.amount) || undefined;

		return [{ transportation_assistance, viatic, non_salary_viatic }];
	}

	function getExtraHours(name: string) {
		const income = getIncome(name);
		const payment = toNumber(income?.amount);
		const quantity = toNumber(income?.quantity);

		if (!payment || !quantity) return undefined;

		return [{ quantity, payment }];
	}

	function getVacation() {
		const vacation = getIncome('Vacaciones regulares');

		const commonDays = toNumber(vacation?.quantity);
		const commonPayment = toNumber(vacation?.amount);

		const compensated = getIncome('Vacaciones no tomadas');
		const compensatedDays = toNumber(compensated?.quantity);
		const compensatedPayment = toNumber(compensated?.amount);

		return {
			common: [{ quantity: commonDays, payment: commonPayment }],
			compensated: [{ quantity: compensatedDays, payment: compensatedPayment }],
		};
	}

	function getPrimas() {
		const concept = getIncome('Prima');
		const quantity = toNumber(concept?.quantity);
		const payment = toNumber(concept?.amount) || undefined;
		const non_salary_payment =
			toNumber(getIncome('Prima no salarial')?.amount) || undefined;

		if (!payment && !non_salary_payment) return undefined;

		return { quantity, payment, non_salary_payment };
	}

	function getLayoffs() {
		const payment = toNumber(getIncome('Cesantías')?.amount);
		const interest_payment = toNumber(
			getIncome('Intereses a las cesantías')?.amount,
		);

		return { payment, percentage: 12, interest_payment };
	}

	function getIncapacities() {
		const incapacity = getIncome('Incapacidad');
		const payment = toNumber(incapacity?.amount);
		const quantity = toNumber(incapacity?.quantity);

		return [{ quantity, payment, type_incapacity_id: 1 }];
	}

	function getLicencings() {
		const maternity = getIncome('Licencia de maternidad o paternidad');
		const maternity_payment = toNumber(maternity?.amount);
		const maternity_quantity = toNumber(maternity?.quantity);

		const paid_license = getIncome('Licencia remunerada');
		const paid_license_payment = toNumber(paid_license?.amount);
		const paid_license_quantity = toNumber(paid_license?.quantity);

		const unpaid_license = getIncome('Licencia no remunerada');
		const unpaid_license_quantity = toNumber(unpaid_license?.quantity);

		return {
			maternity_or_paternity_leaves: [
				{ quantity: maternity_quantity, payment: maternity_payment },
			],
			permit_or_paid_licenses: [
				{ quantity: paid_license_quantity, payment: paid_license_payment },
			],
			suspension_or_unpaid_leaves: [{ quantity: unpaid_license_quantity }],
		};
	}

	function getBonuses() {
		const payment = toNumber(getIncome('Bonificación salarial')?.amount);
		const non_salary_payment = toNumber(
			getIncome('Bonificación no salarial')?.amount,
		);

		if (!payment && !non_salary_payment) return undefined;

		return [{ payment, non_salary_payment }];
	}

	function getAssistances() {
		const payment = toNumber(getIncome('Auxilio salarial')?.amount);
		const non_salary_payment = toNumber(
			getIncome('Auxilio no salarial')?.amount,
		);

		if (!payment && !non_salary_payment) return undefined;

		return [{ payment, non_salary_payment }];
	}

	function getLegalStrikes() {
		return [];
	}

	function getOtherConcepts() {
		const payment = toNumber(getIncome('Otros conceptos')?.amount);
		const non_salary_payment = toNumber(
			getIncome('Otros conceptos no salariales')?.amount,
		);

		if (!payment && !non_salary_payment) return undefined;

		return [{ payment, non_salary_payment }];
	}

	function getCompensations() {
		const ordinary = toNumber(getIncome('Compensación ordinaria')?.amount);
		const extraordinary = toNumber(
			getIncome('Compensación extraordinaria')?.amount,
		);

		if (!ordinary && !extraordinary) return undefined;

		return [{ ordinary, extraordinary }];
	}

	function getVouchers() {
		const payment = toNumber(getIncome('Otros bonos')?.amount) || undefined;
		const non_salary_payment =
			toNumber(getIncome('Otros bonos no salariales')?.amount) || undefined;
		const salary_food_Payment =
			toNumber(getIncome('Bono de alimentación')?.amount) || undefined;
		const non_salary_food_payment =
			toNumber(getIncome('Bono de alimentación no salarial')?.amount) ||
			undefined;

		if (
			!payment &&
			!non_salary_payment &&
			!salary_food_Payment &&
			!non_salary_food_payment
		) {
			return undefined;
		}

		return [
			{
				payment,
				non_salary_payment,
				salary_food_Payment,
				non_salary_food_payment,
			},
		];
	}

	function getComissions() {
		const payment = toNumber(getIncome('Comisiones')?.amount);

		return [{ payment }];
	}

	function getThirdPartyPayments() {
		const payment = toNumber(getIncome('Pago a terceros')?.amount);

		if (!payment) return undefined;

		return [{ payment }];
	}

	function getAdvances() {
		const payment = toNumber(getIncome('Avances')?.amount);

		if (!payment) return undefined;

		return [{ payment }];
	}

	function getIncome(name: string) {
		const values = incomes.filter(income =>
			compareStrings(income.keyName, name),
		);

		const income = values[0];

		if (!income) return undefined;

		return { ...income };
	}
}

export function getDeductionMapper(deductions: Array<PayrollConcept>) {
	return {
		health: getHealth(),
		pension_fund: getPensionFund(),
		pension_security_fund: getSecurityPensionFund(),
		trade_unions: getTradeUnions(),
		sanctions: getSanctions(),
		libranzas: getLibranzas(),
		third_party_payments: getThirdPartyPayments(),
		advances: getAdvances(),
		other_deductions: getOtherDeductions(),
		voluntary_pension: getOptionalValue(
			toNumber(getDeduction('Pensión voluntaria')?.amount),
		),
		withholding_source: getOptionalValue(
			toNumber(getDeduction('Retención en la fuente')?.amount),
		),
		afc: getOptionalValue(toNumber(getDeduction('AFC')?.amount)),
		cooperative: getOptionalValue(
			toNumber(getDeduction('Cooperativa')?.amount),
		),
		tax_lien: getOptionalValue(
			toNumber(getDeduction('Embargo fiscal')?.amount),
		),
		complementary_plans: getOptionalValue(
			toNumber(getDeduction('Plan complementario')?.amount),
		),
		education: getOptionalValue(toNumber(getDeduction('Educación')?.amount)),
		refund: getOptionalValue(toNumber(getDeduction('Reintegro')?.amount)),
		debt: getOptionalValue(toNumber(getDeduction('Pago de deudas')?.amount)),
	};

	function getHealth() {
		const payment = toNumber(getDeduction('Salud')?.amount);
		return { percentage: 25, payment };
	}

	function getPensionFund() {
		const payment = toNumber(getDeduction('Pensión')?.amount);
		return { percentage: 25, payment };
	}

	function getSecurityPensionFund() {
		const payment = toNumber(
			getDeduction('Fondo de seguridad pensional')?.amount,
		);

		return {
			payment,
			percentage: 1,
			percentage_subsistence: 0,
			payment_subsistence: 0,
		};
	}

	function getTradeUnions() {
		const deduction = getDeduction('Sindicato');
		const payment = toNumber(deduction?.amount);
		const percentage = toNumber(deduction?.quantity);

		return [{ percentage, payment }];
	}

	function getSanctions() {
		const payment_public = toNumber(getDeduction('Sanción pública')?.amount);
		const payment_private = toNumber(getDeduction('Sanción privada')?.amount);
		return [{ payment_public, payment_private }];
	}

	function getLibranzas() {
		const payment = toNumber(getDeduction('Libranza')?.amount);

		if (!payment) return undefined;

		return [{ payment, description: 'Libranza' }];
	}

	function getThirdPartyPayments() {
		const payment = toNumber(getDeduction('Pago a terceros')?.amount);

		if (!payment) return undefined;

		return [{ payment }];
	}

	function getAdvances() {
		const payment = toNumber(getDeduction('Anticipos')?.amount);
		if (!payment) return undefined;
		return [{ payment }];
	}

	function getOtherDeductions() {
		const payment = toNumber(getDeduction('Otras deducciones')?.amount);
		if (!payment) return undefined;
		return [{ payment }];
	}

	function getDeduction(name: string) {
		const values = deductions.filter(d => compareStrings(d.keyName, name));

		if (values.length > 1) {
			throw new Error(`Solo puede haber 1 ${name}`);
		}

		const deduction = values[0];

		if (!deduction) return undefined;

		return { ...deduction };
	}
}

function getOptionalValue(number: number) {
	return number || undefined;
}
