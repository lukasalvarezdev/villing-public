import { type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { SearchInput } from '~/components/filters';
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
	getDaysLeft,
	getRequestSearchParams,
} from '~/utils/misc';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const searchParams = getRequestSearchParams(request);
	const filters = queryBuilder(searchParams, ['name']);
	const { db, orgId } = await getOrgDbClient(request);

	const baseWhere = {
		organizationId: orgId,
		type: 'loan',
		pending: { gt: 1 },
		client: filters,
		expiresAt: { not: null },
	} as const;
	const select = {
		id: true,
		internalId: true,
		clientId: true,
		pending: true,
		subtotal: true,
		totalTax: true,
		totalDiscount: true,
		expiresAt: true,
	} as const;

	const [allInvoices, allRemisions] = await db.$transaction([
		db.legalInvoice.findMany({
			where: { ...baseWhere, cufe: { not: null } },
			select: select,
			orderBy: { createdAt: 'desc' },
		}),
		db.legalInvoiceRemision.findMany({
			where: { ...baseWhere, canceledAt: null },
			select: select,
			orderBy: { createdAt: 'desc' },
		}),
	]);

	const clientsIds = [
		...new Set([
			...allInvoices.map(i => i.clientId),
			...allRemisions.map(i => i.clientId),
		]),
	];

	const clients = await db.client.findMany({
		where: { id: { in: clientsIds } },
		select: { id: true, name: true, tel: true },
	});

	const remisions = allRemisions.map(r => ({ ...r, type: 'remision' }));
	const invoices = allInvoices.map(i => ({ ...i, type: 'invoice' }));

	const sales = remisions.concat(invoices).map(sale => {
		const client = clients.find(c => c.id === sale.clientId) || defaultClient;
		const total = sale.subtotal + sale.totalTax - sale.totalDiscount;
		const daysLeft = getDaysLeft(sale.expiresAt || new Date());

		return {
			id: sale.id,
			internalId: sale.internalId,

			total,
			client,
			daysLeft,
			pending: sale.pending,
			to:
				sale.type === 'invoice'
					? `/invoices/${sale.id}`
					: `/invoice-remisions/${sale.id}`,
		};
	});

	return { sales };
}

export default function Component() {
	const { sales } = useLoaderData<typeof loader>();

	return (
		<div>
			<div className="mb-4">
				<SearchInput placeholder="Buscar cliente" name="name" />
			</div>

			<div className="rounded-lg border border-gray-200 shadow-sm mb-4 bg-white overflow-hidden">
				<Table className="min-w-sm w-full">
					<TableHead>
						<TableHeadCell className="bg-gray-50 pl-4">Cliente</TableHeadCell>
						<TableHeadCell className="bg-gray-50">Teléfono</TableHeadCell>
						<TableHeadCell className="bg-gray-50 whitespace-nowrap">
							Días restantes
						</TableHeadCell>
						<TableHeadCell className="bg-gray-50">Deuda</TableHeadCell>
						<TableHeadCell className="bg-gray-50">Total</TableHeadCell>
						<TableHeadCell className="bg-gray-50">Abonar</TableHeadCell>
					</TableHead>

					<TableBody>
						{sales.map(sale => (
							<TableRow
								className={cn(
									'border-b border-gray-200 children:align-bottom text-sm',
									'children:whitespace-nowrap',
								)}
								key={sale.id}
							>
								<TableCell className="w-full pl-4">
									{sale.client.name}
								</TableCell>
								<TableCell className="pr-8">{sale.client.tel}</TableCell>
								<TableCell className="pr-8 whitespace-nowrap">
									{sale.daysLeft} días
								</TableCell>
								<TableCell className="pr-8 font-medium">
									${formatCurrency(sale.pending)}
								</TableCell>
								<TableCell className="pr-8">
									${formatCurrency(sale.total)}
								</TableCell>
								<TableCell className="pr-8">
									<Link
										to={sale.to}
										prefetch="intent"
										className="block hover:scale-125 text-lg transition-all"
									>
										<i className="ri-refund-line"></i>
									</Link>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

const defaultClient = {
	id: '',
	name: 'Cliente no encontrado',
	tel: 'No disponible',
};
