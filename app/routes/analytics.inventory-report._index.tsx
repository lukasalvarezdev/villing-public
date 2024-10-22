import { Prisma } from '@prisma/client';
import { type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import * as z from 'zod';
import { DateString } from '~/components/client-only';
import {
	NonPrintableContent,
	PrintableContent,
} from '~/components/printable-content';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
} from '~/components/ui-library';
import { PrintInvoiceButton } from '~/modules/invoice/invoice-page-components';
import {
	BillFooter,
	OrganizationInfo,
	Separator,
} from '~/modules/printing/narrow-bill';
import { type PrismaClient, getOrgDbClient } from '~/utils/db.server';
import {
	cn,
	formatCurrency,
	formatDate,
	getSearchParamsWithDefaultDateRange,
	toNumber,
} from '~/utils/misc';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId, userId } = await getOrgDbClient(request);
	const searchParams = getSearchParamsWithDefaultDateRange(request);

	const user = await db.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			allowedSubOrgs: {
				where: { deletedAt: null },
				select: { id: true, name: true },
			},
		},
	});
	const allowedBranches = user.allowedSubOrgs.map(x => x.id);

	const args = {
		db,
		orgId,
		searchParams,
		allowedSubOrgs: allowedBranches,
	};

	const [sales, counts] = await db.$transaction([
		getSalesSumThisMonth(args),
		getCounts(args),
	]);
	const data = sumSchema.parse(sales);
	const countsData = countSchema.parse(counts);

	const branches = user.allowedSubOrgs.map(branch => {
		const branchData = data.find(y => y.subOrgId === branch.id);
		const countData = countsData.find(y => y.subOrganizationId === branch.id);

		return {
			id: branch.id,
			name: branch.name,
			sold:
				toNumber(branchData?.total) +
				toNumber(branchData?.tax) +
				toNumber(branchData?.subtotal),
			quantity: toNumber(countData?.sum),
		};
	});

	return {
		branches,
		startDate: searchParams.get('start'),
		endDate: searchParams.get('end'),
	};
}

export default function Component() {
	return (
		<div>
			<NarrowBillToPrint />
			<NonPrintableContent>
				<Report />
			</NonPrintableContent>
		</div>
	);
}

function Report() {
	const { branches } = useLoaderData<typeof loader>();

	return (
		<div className="flex-1">
			<div
				className={cn(
					'flex justify-between flex-col gap-2 md:flex-row',
					'md:items-center mb-4 flex-1',
				)}
			>
				<div>
					<h3>Reporte de inventario</h3>
					<p className="text-gray-500">
						Reporte detallado de ventas e inventario por sucursal
					</p>
				</div>
				<PrintInvoiceButton text="Imprimir reporte" />
			</div>

			<div className="rounded border border-gray-200 shadow-sm">
				<Table>
					<TableHead>
						<TableHeadCell>Sucursal</TableHeadCell>
						<TableHeadCell className="whitespace-nowrap">
							Cant. artículos
						</TableHeadCell>
						<TableHeadCell className="whitespace-nowrap">
							Ventas totales
						</TableHeadCell>
					</TableHead>
					<TableBody>
						{branches.map(branch => (
							<TableRow key={branch.id}>
								<TableCell className="whitespace-nowrap text-sm">
									{branch.name}
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									{branch.quantity}
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									${formatCurrency(branch.sold)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

function NarrowBillToPrint() {
	const { branches, startDate, endDate } = useLoaderData<typeof loader>();

	return (
		<PrintableContent>
			<div className="bg-white">
				<OrganizationInfo text="Reporte de inventario" />

				<Separator />

				<div className="text-xs children:leading-4">
					<DateString>
						<p>Desde: {formatDate(startDate!)}</p>
						<p>Hasta: {formatDate(endDate!)}</p>
					</DateString>
				</div>

				<Separator />

				<section className="text-sm leading-4">
					<table className="mx-auto w-full table-auto">
						<thead>
							<tr className="text-left children:pb-1">
								<th className="pl-1">Sucursal</th>
								<th className="pl-1 whitespace-nowrap">Cant. artículos</th>
								<th className="pl-1 whitespace-nowrap">Total vendido</th>
							</tr>
						</thead>

						<tbody>
							{branches.map((branch, index) => (
								<tr className="text-left align-top" key={index}>
									<td className="pl-1">{branch.name}</td>
									<td className="pl-1">{branch.quantity}</td>
									<td className="pl-1">${formatCurrency(branch.sold)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>

				<BillFooter text="Reporte generado por Villing" />
			</div>
		</PrintableContent>
	);
}

function getSalesSumThisMonth({
	db,
	orgId,
	searchParams,
	allowedSubOrgs,
}: {
	db: PrismaClient;
	orgId: number;
	searchParams: URLSearchParams;
	allowedSubOrgs: Array<number>;
}) {
	const filters = queryBuilder(searchParams, ['createdAt']);

	return db.$queryRaw`
		SELECT
			cd."subOrganizationId" as "subOrgId",
			CAST(SUM(CAST(cd.total AS decimal)) AS int) as total,
			CAST(SUM(CAST(cd.subtotal AS decimal)) AS int) as subtotal,
			CAST(SUM(CAST(cd."totalTax" AS decimal)) AS int) as tax
		FROM (
			SELECT
				"subOrganizationId",
				total,
				0 as subtotal,
				0 as "totalTax",
				id as "invoiceId",
				0 as "legalInvoiceId",
				0 as "legalInvoiceRemisionId"
			FROM public."LegalPosInvoice"
			WHERE "organizationId" = ${orgId}
				AND "createdAt" >= ${filters.createdAt.gte}
				AND "createdAt" < ${filters.createdAt.lte}
				AND "canceledAt" IS NULL
				AND "subOrganizationId" IN (${Prisma.join(allowedSubOrgs)})
			UNION ALL
			SELECT
				"subOrganizationId",
				0 as total,
				subtotal,
				"totalTax",
				id as "legalInvoiceId",
				0 as "invoiceId",
				0 as "legalInvoiceRemisionId"
			FROM public."LegalInvoice"
			WHERE "organizationId" = ${orgId}
				AND "createdAt" >= ${filters.createdAt.gte}
				AND "createdAt" < ${filters.createdAt.lte}
				AND cufe IS NOT NULL
				AND "subOrganizationId" IN (${Prisma.join(allowedSubOrgs)})
			UNION ALL
			SELECT
				"subOrganizationId",
				0 as total,
				subtotal,
				"totalTax",
				id as "legalInvoiceRemisionId",
				0 as "invoiceId",
				0 as "legalInvoiceId"
			FROM public."LegalInvoiceRemision"
			WHERE "organizationId" = ${orgId}
				AND "createdAt" >= ${filters.createdAt.gte}
				AND "createdAt" < ${filters.createdAt.lte}
				AND "canceledAt" IS NULL
				AND "subOrganizationId" IN (${Prisma.join(allowedSubOrgs)})
		) as cd
		GROUP BY cd."subOrganizationId"
	`;
}

function getCounts({
	db,
	orgId,
	searchParams,
	allowedSubOrgs,
}: {
	db: PrismaClient;
	orgId: number;
	searchParams: URLSearchParams;
	allowedSubOrgs: Array<number>;
}) {
	const filters = queryBuilder(searchParams, ['createdAt']);

	return db.$queryRaw`
		WITH UnifiedInvoices AS (
    SELECT
						lip."quantity",
						CASE
								WHEN lpi."id" IS NOT NULL THEN lpi."subOrganizationId"
								WHEN li."id" IS NOT NULL THEN li."subOrganizationId"
								WHEN lir."id" IS NOT NULL THEN lir."subOrganizationId"
						END AS "subOrganizationId"
				FROM public."LegalInvoiceProduct" lip
				LEFT JOIN public."LegalPosInvoice" lpi ON lip."legalPosInvoiceId" = lpi."id"
				LEFT JOIN public."LegalInvoice" li ON lip."legalInvoiceId" = li."id"
				LEFT JOIN public."LegalInvoiceRemision" lir ON lip."legalInvoiceRemisionId" = lir."id"
				WHERE 
						(
							lpi."createdAt" >= ${filters.createdAt.gte} 
							AND lpi."createdAt" <= ${filters.createdAt.lte}
							AND lpi."subOrganizationId" IN (${Prisma.join(allowedSubOrgs)})
							AND lpi."organizationId" = ${orgId}
							AND lpi."canceledAt" IS NULL
						)
						OR (
							li."createdAt" >= ${filters.createdAt.gte} 
							AND li."createdAt" <= ${filters.createdAt.lte}
							AND li."subOrganizationId" IN (${Prisma.join(allowedSubOrgs)})
							AND li."organizationId" = ${orgId}
							AND li."cufe" IS NOT NULL
						)
						OR (
							lir."createdAt" >= ${filters.createdAt.gte} 
							AND lir."createdAt" <= ${filters.createdAt.lte}
							AND lir."subOrganizationId" IN (${Prisma.join(allowedSubOrgs)})
							AND lir."organizationId" = ${orgId}
							AND lir."canceledAt" IS NULL
						)
		)
		SELECT "subOrganizationId", SUM("quantity")
		FROM UnifiedInvoices
		GROUP BY "subOrganizationId";
	`;
}

const sumSchema = z.array(
	z.object({
		total: z.number(),
		subtotal: z.number(),
		tax: z.number(),
		subOrgId: z.number(),
	}),
);

const countSchema = z.array(
	z.object({ subOrganizationId: z.number(), sum: z.coerce.number() }),
);
