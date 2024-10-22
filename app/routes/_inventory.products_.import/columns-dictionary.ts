export function getDefaultColumns(
	headers: Array<string>,
): Record<string, string> {
	return headers.reduce(
		(acc, header) => {
			const common_column = common_columns[header.toLowerCase()];
			acc[header] = common_column || header;
			return acc;
		},
		{} as Record<string, string>,
	);
}

export const common_columns = {
	nombre: 'name',
	producto: 'name',
	artículo: 'name',
	articulo: 'name',
	'nom articulo': 'name',
	'nom artículo': 'name',
	descripcion: 'description',
	descripción: 'description',
	impuesto: 'tax',
	iva: 'tax',
	costo: 'price',
	'precio compra': 'price',
	'precio de compra': 'price',
	'costo unitario': 'price',
	precio: 'price',
	'cod articulo': 'reference',
	'cod artículo': 'reference',
	referencia: 'reference',
	codigo: 'reference',
	cod: 'reference',
	código: 'reference',
	línea: 'category',
	linea: 'category',
	categoria: 'category',
	categoría: 'category',
	'código de barras': 'barCodes',
	'codigo de barras': 'barCodes',
	'códigos de barras': 'barCodes',
	'codigos de barras': 'barCodes',
	'código de barra': 'barCodes',
	'codigo de barra': 'barCodes',
	'código barras': 'barCodes',
	'codigo barras': 'barCodes',
	'código barra': 'barCodes',
	'codigo barra': 'barCodes',
} as Record<string, string>;
