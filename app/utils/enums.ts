export const typeRegime = {
	iva: 'iva',
	noIva: 'noIva',
} as const;

export const taxDetail = {
	iva: 'iva',
	inc: 'inc',
	ivaAndInc: 'ivaAndInc',
	noTax: 'noTax',
} as const;

export const typeLiability = {
	noLiability: 'noLiability',
	bigTaxPayer: 'bigTaxPayer',
	selfRetainer: 'selfRetainer',
	ivaRetentionAgent: 'ivaRetentionAgent',
	simpleRegime: 'simpleRegime',
} as const;

export const typeOrganization = {
	natural: 'natural',
	juridical: 'juridical',
} as const;

export const typeDocumentIdentification = {
	rc: 'rc',
	ti: 'ti',
	cc: 'cc',
	te: 'te',
	ce: 'ce',
	nit: 'nit',
	ps: 'ps',
	die: 'die',
	nit_ext: 'nit_ext',
	nuip: 'nuip',
} as const;

export const creditNoteCorrectionsType = {
	return: 'return',
	cancel: 'cancel',
	discount: 'discount',
	priceAdjustment: 'priceAdjustment',
	other: 'other',
} as const;

export const debitNoteCorrectionsType = {
	interest: 'interest',
	expenses: 'expenses',
	valueChange: 'valueChange',
	other: 'other',
} as const;

export const ExpenseOrigin = {
	bank: 'bank',
	cashier: 'cashier',
} as const;

export const AllowedAction = {
	// stats: "// stats",
	see_stats: 'see_stats',

	// invoices
	see_invoices: 'see_invoices',
	create_eletronic_invoice: 'create_eletronic_invoice',
	create_pos_and_remision: 'create_pos_and_remision',
	cancel_pos_and_remision: 'cancel_pos_and_remision',

	// purchases
	see_purchases: 'see_purchases',
	create_purchase: 'create_purchase',
	cancel_purchase: 'cancel_purchase',

	// company
	update_organization: 'update_organization',
	update_members: 'update_members',
	delete_member: 'delete_member',
	update_clients: 'update_clients',
	update_suppliers: 'update_suppliers',
	update_expenses: 'update_expenses',

	// inventory
	update_products: 'update_products',
	remove_product: 'remove_product',
	update_price_in_invoice: 'update_price_in_invoice',
	update_price_list_in_invoice: 'update_price_list_in_invoice',
	see_stock_settings: 'see_stock_settings',
	create_stock_settings: 'create_stock_settings',
} as const;

export const VillingOrganizationType = {
	normal: 'normal',
	pharmacy: 'pharmacy',
} as const;

export const PosCreditNoteCorrection = {
	refund: 'refund',
	cancel: 'cancel',
	discount: 'discount',
	price_adjustment: 'price_adjustment',
	others: 'others',
} as const;
export type PosCreditNoteCorrectionType = keyof typeof PosCreditNoteCorrection;
