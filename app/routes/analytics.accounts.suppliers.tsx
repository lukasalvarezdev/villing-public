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

	const [purchaseInvoices, purchaseRemisions] = await db.$transaction([
		db.purchaseInvoice.groupBy({
			by: ['supplierId'],
			where: {
				organizationId: orgId,
				type: 'loan',
				pending: { gt: 1 },
				supplier: filters,
				canceledAt: null,
			},
			orderBy: { supplierId: 'desc' },
			_sum: { pending: true },
		}),
		db.purchaseRemision.groupBy({
			by: ['supplierId'],
			where: {
				organizationId: orgId,
				type: 'loan',
				pending: { gt: 1 },
				supplier: filters,
				canceledAt: null,
			},
			orderBy: { supplierId: 'desc' },
			_sum: { pending: true },
		}),
	]);

	const purchases = purchaseRemisions
		.map(p => ({ supplierId: p.supplierId, _sum: p._sum }))
		.concat(
			purchaseInvoices.map(p => ({ supplierId: p.supplierId, _sum: p._sum })),
		);

	const suppliers = await db.supplier.findMany({
		where: { id: { in: purchases.map(p => p.supplierId) } },
		select: { id: true, name: true, tel: true, idNumber: true },
	});

	const toPay = purchases.reduce(
		(acc, curr) => acc + toNumber(curr._sum?.pending),
		0,
	);

	return {
		toPay,
		suppliers: suppliers
			.map(supplier => {
				const purchased = purchases
					.filter(p => p.supplierId === supplier.id)
					.reduce((acc, curr) => acc + toNumber(curr._sum?.pending), 0);

				return { ...supplier, debt: purchased };
			})
			.filter(supplier => supplier.debt > 0),
	};
}

export default function Component() {
	const { suppliers, toPay } = useLoaderData<typeof loader>();

	return (
		<div>
			<Toast variant="info" className="mb-4">
				Tu deuda total es de <strong>${formatCurrency(toPay)}</strong>
			</Toast>

			<div className="mb-4">
				<SearchInput placeholder="Buscar proveedor" name="name" />
			</div>

			<div className="rounded-lg border border-gray-200 shadow-sm mb-4 bg-white overflow-hidden">
				<Table className="min-w-sm w-full">
					<TableHead>
						<TableHeadCell className="bg-gray-50 pl-4">Proveedor</TableHeadCell>
						<TableHeadCell className="bg-gray-50">Teléfono</TableHeadCell>
						<TableHeadCell className="bg-gray-50">Deuda</TableHeadCell>
						<TableHeadCell className="bg-gray-50"></TableHeadCell>
					</TableHead>

					<TableBody>
						{suppliers.map(supplier => (
							<TableRow
								className={cn(
									'border-b border-gray-200 children:align-bottom text-sm',
									'children:whitespace-nowrap',
								)}
								key={supplier.id}
							>
								<TableCell className="w-full pl-4">
									<p>{supplier.name}</p>
									<span className="text-gray-500 text-xs">
										{supplier.idNumber}
									</span>
								</TableCell>
								<TableCell className="pr-8">{supplier.tel}</TableCell>
								<TableCell className="pr-8">
									${formatCurrency(supplier.debt)}
								</TableCell>
								<TableCell className="pr-8">
									<ContextMenu
										srLabel={`Opciones para ${supplier.name}`}
										items={[
											{
												label: 'Ver facturas',
												icon: 'ri-file-cloud-line',
												href: `/purchase-invoices?search=${supplier.name}&type=electronic`,
												target: '_blank',
											},
											{
												label: 'Ver remisiones',
												icon: 'ri-file-unknow-line',
												href: `/remisions?search=${supplier.name}`,
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
