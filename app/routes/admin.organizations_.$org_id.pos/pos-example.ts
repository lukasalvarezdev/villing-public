export const pos_example = {
	number: 1,
	sync: true,
	software_manufacturer: {
		names_and_surnames: 'Test Test',
		business_name: 'Test SAS',
		software_name: 'TEST',
	},
	buyer_benefit: {
		code: '1234567890',
		names_and_surnames: 'Test Test Test Test',
		points: '0',
	},
	point_sale: {
		box_plate: 'TES001',
		location_box: 'No tiene',
		cashier: 'Test Test Test',
		type_box: 'Test',
		sale_code: '9876543210',
		subtotal: '119000.00',
	},
	resolution: {
		prefix: 'EPOS',
		resolution: 18760000001,
		resolution_date: '2019-01-19',
		from: 1,
		to: 1000,
		date_from: '2019-01-19',
		date_to: '2030-01-19',
	},
	customer: {
		type_document_identification_id: 38,
		identification_number: 1234567890,
		name: 'LAW GURTI REST',
		municipality_id: 1006,
		email: 'test@test.com',
	},
	type_document_id: 14,
	legal_monetary_totals: {
		line_extension_amount: '100000.00',
		tax_exclusive_amount: '100000.00',
		tax_inclusive_amount: '119000.00',
		payable_amount: '119000.00',
	},
	invoice_lines: [
		{
			unit_measure_id: 642,
			invoiced_quantity: '1.000000',
			line_extension_amount: '100000.00',
			tax_totals: [
				{
					tax_id: 1,
					tax_amount: '19000.00',
					taxable_amount: '100000.00',
					percent: '19.00',
				},
			],
			description: 'Base para TV',
			code: 'BTV',
			type_item_identification_id: 4,
			price_amount: '100000.00',
			base_quantity: '1.000000',
		},
	],
};