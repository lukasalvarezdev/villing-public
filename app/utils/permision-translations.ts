const action = {
	see_stats: 'see_stats',
	see_invoices: 'see_invoices',
	create_eletronic_invoice: 'create_eletronic_invoice',
	create_pos_and_remision: 'create_pos_and_remision',
	cancel_pos_and_remision: 'cancel_pos_and_remision',
	see_purchases: 'see_purchases',
	create_purchase: 'create_purchase',
	cancel_purchase: 'cancel_purchase',
	update_organization: 'update_organization',
	update_members: 'update_members',
	delete_member: 'delete_member',
	update_clients: 'update_clients',
	update_suppliers: 'update_suppliers',
	update_expenses: 'update_expenses',
	update_products: 'update_products',
	remove_product: 'remove_product',
	update_price_in_invoice: 'update_price_in_invoice',
	update_price_list_in_invoice: 'update_price_list_in_invoice',
	see_stock_settings: 'see_stock_settings',
	create_stock_settings: 'create_stock_settings',
};
type ActionType = (typeof action)[keyof typeof action];

export const translations: Record<ActionType, string> = {
	see_stats: 'Ver estadísticas',
	see_invoices: 'Ver facturas',
	create_eletronic_invoice: 'Crear factura electrónica',
	create_pos_and_remision: 'Crear POS y remisión',
	cancel_pos_and_remision: 'Cancelar POS y remisión',
	see_purchases: 'Ver compras',
	create_purchase: 'Crear compras',
	cancel_purchase: 'Cancelar compras',
	update_organization: 'Actualizar empresa',
	update_members: 'Actualizar miembros',
	delete_member: 'Eliminar miembro',
	update_clients: 'Actualizar clientes',
	update_suppliers: 'Actualizar proveedores',
	update_expenses: 'Actualizar gastos',
	update_products: 'Actualizar productos',
	remove_product: 'Eliminar producto',
	update_price_in_invoice: 'Actualizar precio en factura',
	update_price_list_in_invoice: 'Actualizar lista de precios en factura',
	see_stock_settings: 'Ver ajustes de inventario',
	create_stock_settings: 'Crear ajustes de inventario',
};

export const translationsDescriptions: Record<ActionType, string> = {
	see_stats:
		'Ver analíticas, estado de cartera y ventas del día del cajero. El acceso está limitado a las sucursales del usuario.',
	see_invoices: 'Ver facturas y remisions de venta, ver notas crédito y débito',
	create_eletronic_invoice: 'Crear factura, nota crédito y débito electrónica',
	create_pos_and_remision: 'Crear venta pos y remisión de venta',
	cancel_pos_and_remision: 'Anular venta pos y remisión de venta',
	see_purchases: 'Ver órdenes, remisiones y facturas de compra',
	create_purchase: 'Crear orden, remisión y factura de compra',
	cancel_purchase: 'Anular orden, remisión y factura de compra',
	update_organization: 'Actualizar empresa y sucursales',
	update_members: 'Actualizar datos, roles y permisos de miembros',
	delete_member: 'Eliminar miebro de la empresa',
	update_clients: 'Crear y actualizar clientes',
	update_suppliers: 'Crear y actualizar proveedores',
	update_expenses: 'Crear y eliminar gastos en tesorería',
	update_products:
		'Crear y actualizar productos. Crear, actualizar y eliminar atributos de inventario (marcas, categorías y listas de precios)',
	remove_product: 'Eliminar productos',
	update_price_in_invoice: 'Actualizar manualmente precio de venta en factura',
	update_price_list_in_invoice: 'Escoger lista de precios en factura',
	see_stock_settings: 'Ver ajustes de inventario',
	create_stock_settings: 'Crear ajustes de inventario',
};

export const permissionsSections = {
	organization: [
		'update_organization',
		'update_members',
		'delete_member',
		'update_clients',
		'update_suppliers',
		'update_expenses',
	],
	stats: ['see_stats'],
	invoices: [
		'see_invoices',
		'create_eletronic_invoice',
		'create_pos_and_remision',
		'cancel_pos_and_remision',
	],
	purchases: ['see_purchases', 'create_purchase', 'cancel_purchase'],
	inventory: [
		'update_products',
		'remove_product',
		'update_price_in_invoice',
		'update_price_list_in_invoice',
		'see_stock_settings',
		'create_stock_settings',
	],
} as const;

export const sectionTranslations = {
	organization: 'Empresa',
	stats: 'Estadísticas y analíticas',
	invoices: 'Facturación',
	purchases: 'Compras',
	inventory: 'Inventario',
} as Record<string, string>;

export const sectionIcons = {
	organization: 'briefcase-line',
	stats: 'line-chart-line',
	invoices: 'file-text-line',
	purchases: 'shopping-cart-line',
	inventory: 'instance-line',
} as Record<string, string>;
