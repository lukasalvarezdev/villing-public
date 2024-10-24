export const payroll_example = {
	sync: true,
	xml_sequence_number: { prefix: 'TEST', number: 46 },
	general_information: { payroll_period_id: 5 },
	notes: [{ text: 'Test' }],
	employer: {
		identification_number: 901210113,
		municipality_id: 1006,
		address: 'Calle 71 28D3 29',
	},
	employee: {
		type_worker_id: 1,
		subtype_worker_id: 1,
		high_risk_pension: false,
		type_document_identification_id: 3,
		identification_number: 1094925335,
		surname: 'Aguirre',
		second_surname: 'NN',
		first_name: 'Frank',
		municipality_id: 1006,
		address: 'Calle 1 2 3 ',
		integral_salary: false,
		type_contract_id: 2,
		salary: 1200000,
	},
	period: {
		admission_date: '2021-05-01',
		settlement_start_date: '2021-05-01',
		settlement_end_date: '2021-05-31',
		amount_time: 30,
		date_issue: '2021-06-10',
	},
	payment: {
		payment_form_id: 1,
		payment_method_id: 42,
		bank: 'Bancolombia',
		account_type: 'Ahorros',
		account_number: '1234567890',
	},
	payment_dates: [{ date: '2021-05-30' }],
	earn: {
		basic: { worked_days: 30, worker_salary: 1200000 },
		transports: [{ transportation_assistance: 10 }],
	},
	deduction: {
		health: { percentage: 25, payment: 48000 },
		pension_fund: { percentage: 25, payment: 48000 },
		pension_security_fund: {
			percentage: 100,
			payment: 12000,
			percentage_subsistence: 0,
			payment_subsistence: 0,
		},
	},
	rounding: 0,
	accrued_total: 1200000,
	deductions_total: 108000,
	total: 1092000,
};

export const adjustement_payroll_example = {
	sync: true,
	type_payroll_note_id: 2,
	payroll_reference: {
		number: 'TEST37',
		uuid: 'bc2be432f8cf57d0569a2829b8e72a0e004239bf6c82ccb87dc95f49660260ed82d31a71f0a1ebdad810ff6c5f5985ee',
		issue_date: '2021-06-30 08:59:15',
	},
	xml_sequence_number: { prefix: 'CORR', number: 11 },
	general_information: { payroll_period_id: 5 },
	notes: [{ text: 'Test' }],
	employer: {
		identification_number: 901210113,
		municipality_id: 1006,
		address: 'Calle 71 28D3 29',
	},
};
