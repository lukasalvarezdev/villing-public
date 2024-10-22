import { type LoaderFunctionArgs } from '@remix-run/node';
import { utils, write } from 'xlsx';
import { getOrgDbClient } from '~/utils/db.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const suppliers = await db.supplier.findMany({
		where: { organizationId: orgId },
	});

	const ws = utils.json_to_sheet(clientMapper(suppliers));
	const wb = utils.book_new();
	utils.book_append_sheet(wb, ws, 'Sheet1');

	// * export SheetJS workbook object to XLSX file bytes */
	const data = write(wb, { bookType: 'xlsx', type: 'array' });

	/* build FormData with the generated file */
	const fdata = new FormData();
	fdata.append('file', new File([data], 'sheetjs.xlsx'));

	return new Response(fdata.get('file'), {
		headers: {
			'Content-Type':
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': 'attachment; filename="proveedores.xlsx"',
		},
	});

	function clientMapper(items: typeof suppliers) {
		return items.map(client => ({
			Nombre: client.name,
			Cedula: client.idNumber,
			Direccion: client.simpleAddress,
			Correo: client.email,
			Telefono: client.tel,
			Departamento: '',
			Ciudad: '',
			Regimen: '',
		}));
	}
}
