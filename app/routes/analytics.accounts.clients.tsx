import { type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { ContextMenu } from '~/components/dropdown-menu';
import { SearchInput } from '~/components/filters';
import { Toast } from '~/components/form-utils';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
} from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import {
	cn,
	formatCurrency,
	getRequestSearchParams,
	toNumber,
} from '~/utils/misc';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const searchParams = getRequestSearchParams(request);
	const filters = queryBuilder(searchParams, ['name']);
	const { db, orgId } = await getOrgDbClient(request);

	const [invoices, remisions] = await db.$transaction([
		db.legalInvoice.groupBy({
			by: ['clientId'],
			where: {
				organizationId: orgId,
				type: 'loan',
				pending: { gt: 1 },
				client: filters,
				cufe: { not: null },
			},
			orderBy: { clientId: 'desc' },
			_sum: { pending: true },
		}),
		db.legalInvoiceRemision.groupBy({
			by: ['clientId'],
			where: {
				organizationId: orgId,
				type: 'loan',
				pending: { gt: 1 },
				client: filters,
				canceledAt: null,
			},
			orderBy: { clientId: 'desc' },
			_sum: { pending: true },
		}),
	]);

	const clientsIds = [
		...new Set([
			...invoices.map(i => i.clientId),
			...remisions.map(r => r.clientId),
		]),
	];

	const clients = await db.client.findMany({
		where: { id: { in: clientsIds } },
		select: { id: true, name: true, tel: true, idNumber: true },
	});

	const totalInvoices = invoices.reduce(
		(acc, curr) => acc + toNumber(curr._sum?.pending),
		0,
	);
	const totalRemisions = remisions.reduce(
		(acc, curr) => acc + toNumber(curr._sum?.pending),
		0,
	);

	return {
		owed: totalInvoices + totalRemisions,
		clients: clients
			.map(supplier => {
				const invoice = invoices
					.filter(p => p.clientId === supplier.id)
					.reduce((acc, curr) => acc + toNumber(curr._sum?.pending), 0);
				const remision = remisions
					.filter(p => p.clientId === supplier.id)
					.reduce((acc, curr) => acc + toNumber(curr._sum?.pending), 0);

				return { ...supplier, debt: invoice + remision };
			})
			.filter(supplier => supplier.debt > 0),
	};
}

export default function Component() {
	const { clients, owed } = useLoaderData<typeof loader>();

	return (
		<div>
			<Toast variant="info" className="mb-4">
				Te deben un total de <strong>${formatCurrency(owed)}</strong>
			</Toast>

			<div className="mb-4">
				<SearchInput placeholder="Buscar cliente" name="name" />
			</div>

			<div className="rounded-lg border border-gray-200 shadow-sm mb-4 bg-white overflow-hidden">
				<Table className="min-w-sm w-full">
					<TableHead>
						<TableHeadCell className="bg-gray-50 pl-4">Cliente</TableHeadCell>
						<TableHeadCell className="bg-gray-50">Teléfono</TableHeadCell>
						<TableHeadCell className="bg-gray-50">Deuda</TableHeadCell>
						<TableHeadCell className="bg-gray-50"></TableHeadCell>
					</TableHead>

					<TableBody>
						{clients.map(client => (
							<TableRow
								className={cn(
									'border-b border-gray-200 children:align-bottom text-sm',
									'children:whitespace-nowrap',
								)}
								key={client.id}
							>
								<TableCell className="w-full pl-4">
									<p>{client.name}</p>
									<span className="text-gray-500 text-xs">
										{client.idNumber}
									</span>
								</TableCell>
								<TableCell className="pr-8">{client.tel}</TableCell>
								<TableCell className="pr-8">
									${formatCurrency(client.debt)}
								</TableCell>
								<TableCell className="pr-8">
									<ContextMenu
										srLabel={`Opciones para ${client.name}`}
										items={[
											{
												label: 'Ver facturas',
												icon: 'ri-file-cloud-line',
												href: `/invoices?search=${client.name}&type=electronic`,
												target: '_blank',
											},
											{
												label: 'Ver remisiones',
												icon: 'ri-file-unknow-line',
												href: `/invoice-remisions?search=${client.name}`,
												target: '_blank',
											},
										]}
									/>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
