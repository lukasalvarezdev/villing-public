import { Prisma } from '@prisma/client';

import { type MetaFunction, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import * as React from 'react';
import { z } from 'zod';
import { RouteErrorBoundary } from '~/components/error-boundary';
import {
	NonPrintableContent,
	PrintableContent,
} from '~/components/printable-content';
import { Box, ButtonIcon, TwoColumnsDiv } from '~/components/ui-library';
import { useOrganization } from '~/root';
import { getOrgDbClient } from '~/utils/db.server';
import {
	cn,
	formatCurrency,
	formatDate,
	formatHours,
	getSearchParamsWithDefaultDateRange,
	toNumber,
} from '~/utils/misc';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: `Reporte contable - Villing` },
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId, userId } = await getOrgDbClient(request);
	const searchParams = getSearchParamsWithDefaultDateRange(request);
	const where = queryBuilder(searchParams, ['createdAt']);

	const user = await db.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			allowedSubOrgs: {
				where: { deletedAt: null },
				select: { id: true, name: true },
			},
		},
	});
	const branches = user.allowedSubOrgs.map(x => x.id);

	const [
		salesSum,
		taxSum,
		costSum,
		expensesSum,
		inventorySum,
		posCount,
		electronicCount,
		remisionCount,
		creditNoteCount,
		debitNoteCount,
	] = await db.$transaction([
		getSalesSum(where.createdAt.gte, where.createdAt.lte),
		getSalesWithTaxInfo(where.createdAt.gte, where.createdAt.lte),

		getTotalCostSum(where.createdAt.gte, where.createdAt.lte),
		getExpensesSum(),
		getInventoryValueSum(),
		getPosCount(),
		getElectricInvoicesCount(),
		getRemissionCount(),
		getCreditNotesCount(),
		getDebitNotesCount(),
	]);

	const sales = getSales(salesSum);
	const taxInfo = getSalesWithTax(taxSum);
	const inventoryValue = getInventoryValue(inventorySum, user.allowedSubOrgs);
	const profitsInfo = getProfitsInfo();
	const counts = getGroupedCounts();
	const dates = { start: where.createdAt.gte, end: where.createdAt.lte };

	return { sales, taxInfo, inventoryValue, profitsInfo, counts, dates };

	function getProfitsInfo() {
		const total = sales.total;
		const cost = getCost(costSum);
		const costPercentage = (cost / total) * 100;

		const expenses = toNumber(expensesSum._sum?.amount);
		const netProfit = total - cost;
		const netProfitPercentage = (netProfit / total) * 100;

		const grossProfit = netProfit - expenses;
		const grossProfitPercentage = (grossProfit / total) * 100;

		return {
			cost,
			costPercentage: costPercentage.toFixed(2),
			expenses,
			netProfit,
			netProfitPercentage: netProfitPercentage.toFixed(2),
			grossProfit,
			grossProfitPercentage: grossProfitPercentage.toFixed(2),
		};
	}

	function getSalesSum(date: Date, end: Date) {
		return db.$queryRaw`
			SELECT
				CAST(SUM(total) AS int) as total,
				table_name
			FROM (
					SELECT total, id, 'LegalPosInvoice' as table_name
					FROM public."LegalPosInvoice"
					WHERE "organizationId" = ${orgId}
							AND "createdAt" >= ${date}
							AND "createdAt" <= ${end}
							AND "canceledAt" IS NULL
							AND "subOrganizationId" IN (${Prisma.join(branches)})
					UNION ALL
					SELECT total, id, 'LegalInvoice' as table_name
					FROM public."LegalInvoice"
					WHERE "organizationId" = ${orgId}
							AND "createdAt" >= ${date}
							AND "createdAt" <= ${end}
							AND cufe IS NOT NULL
							AND "subOrganizationId" IN (${Prisma.join(branches)})
					UNION ALL
					SELECT total, id, 'LegalInvoiceRemision' as table_name
					FROM public."LegalInvoiceRemision"
					WHERE "organizationId" = ${orgId}
							AND "createdAt" >= ${date}
							AND "createdAt" <= ${end}
							AND "canceledAt" IS NULL
							AND "subOrganizationId" IN (${Prisma.join(branches)})
					UNION ALL
					SELECT total, id, 'CreditNote' as table_name
					FROM public."CreditNote"
					WHERE "organizationId" = ${orgId}
							AND "createdAt" >= ${date}
							AND "createdAt" <= ${end}
							AND "cude" IS NOT NULL
					UNION ALL
					SELECT total, id, 'DebitNote' as table_name
					FROM public."DebitNote"
					WHERE "organizationId" = ${orgId}
							AND "createdAt" >= ${date}
							AND "createdAt" <= ${end}
							AND "cude" IS NOT NULL
			) as combined_data
			GROUP BY table_name;
		`;
	}

	function getSalesWithTaxInfo(date: Date, end: Date) {
		return db.$queryRaw`
			SELECT
				CAST(SUM("totalTax") AS int) as "totalTax",
				CAST(SUM("subtotal") AS int) as "subtotal",
				CAST(SUM("discount") AS int) as "discount",
				table_name
			FROM (
				SELECT
					SUM(
						(price * quantity) - 
						(price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC))
					) AS "totalTax",
					SUM(
						(price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC))
						* (1 - discount / 100)
					) AS "subtotal",
					SUM(
						(price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC)) -
						(
							price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC)
							* (1 - discount / 100)
						)
					) AS "discount",
					'LegalPosInvoice' as table_name
				FROM 
					public."LegalInvoiceProduct" l
				JOIN 
					public."LegalPosInvoice" p ON l."legalPosInvoiceId" = p.id
				WHERE
					l."legalPosInvoiceId" IS NOT NULL
					AND l."tax" > 0
					AND p."organizationId" = ${orgId}
					AND p."createdAt" >= ${date}
					AND p."createdAt" <= ${end}
					AND p."canceledAt" IS NULL
					AND p."subOrganizationId" IN (${Prisma.join(branches)})
				UNION ALL
				SELECT
				SUM(
						(price * quantity) - 
						(price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC))
					) AS "totalTax",
					SUM(
						(price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC))
						* (1 - discount / 100)
					) AS "subtotal",
					SUM(
						(price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC)) -
						(
							price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC)
							* (1 - discount / 100)
						)
					) AS "discount",
						'LegalInvoiceRemision' as table_name
					FROM 
						public."LegalInvoiceProduct" l
					JOIN 
						public."LegalInvoiceRemision" p ON l."legalInvoiceRemisionId" = p.id
					WHERE
						l."legalInvoiceRemisionId" IS NOT NULL
						AND l."tax" > 0
						AND p."organizationId" = ${orgId}
						AND p."createdAt" >= ${date}
						AND p."createdAt" <= ${end}
						AND p."canceledAt" IS NULL
						AND p."subOrganizationId" IN (${Prisma.join(branches)})
				UNION ALL
				SELECT
				SUM(
						(price * quantity) - 
						(price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC))
					) AS "totalTax",
					SUM(
						(price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC))
						* (1 - discount / 100)
					) AS "subtotal",
					SUM(
						(price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC)) -
						(
							price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC)
							* (1 - discount / 100)
						)
					) AS "discount",
						'LegalInvoice' as table_name
					FROM 
						public."LegalInvoiceProduct" l
					JOIN 
						public."LegalInvoice" p ON l."legalInvoiceId" = p.id
					WHERE
						l."legalInvoiceId" IS NOT NULL
						AND l."tax" > 0
						AND p."organizationId" = ${orgId}
						AND p."createdAt" >= ${date}
						AND p."createdAt" <= ${end}
						AND p."cufe" IS NOT NULL
						AND p."subOrganizationId" IN (${Prisma.join(branches)})
				UNION ALL
				SELECT
				SUM(
						(price * quantity) - 
						(price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC))
					) AS "totalTax",
					SUM(
						(price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC))
						* (1 - discount / 100)
					) AS "subtotal",
					SUM(
						(price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC)) -
						(
							price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC)
							* (1 - discount / 100)
						)
					) AS "discount",
						'CreditNote' as table_name
					FROM 
						public."LegalInvoiceProduct" l
					JOIN 
						public."CreditNote" p ON l."creditNoteId" = p.id
					WHERE
						l."creditNoteId" IS NOT NULL
						AND l."tax" > 0
						AND p."organizationId" = ${orgId}
						AND p."createdAt" >= ${date}
						AND p."createdAt" <= ${end}
						AND p."cude" IS NOT NULL
				UNION ALL
				SELECT
				SUM(
						(price * quantity) - 
						(price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC))
					) AS "totalTax",
					SUM(
						(price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC))
						* (1 - discount / 100)
					) AS "subtotal",
					SUM(
						(price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC)) -
						(
							price * quantity / CAST('1.' || CAST(tax AS TEXT) AS NUMERIC)
							* (1 - discount / 100)
						)
					) AS "discount",
						'DebitNote' as table_name
					FROM 
						public."LegalInvoiceProduct" l
					JOIN 
						public."DebitNote" p ON l."debitNoteId" = p.id
					WHERE
						l."debitNoteId" IS NOT NULL
						AND l."tax" > 0
						AND p."organizationId" = ${orgId}
						AND p."createdAt" >= ${date}
						AND p."createdAt" <= ${end}
						AND p."cude" IS NOT NULL
			) as combined_data
			GROUP BY table_name;
		`;
	}

	function getTotalCostSum(date: Date, end: Date) {
		return db.$queryRaw`
			SELECT
				CAST(SUM(product.cost * product.quantity) AS bigint) AS total
			FROM 
				public."LegalInvoiceProduct" product
			LEFT JOIN public."LegalPosInvoice" pos
				ON product."legalPosInvoiceId" = pos.id
			LEFT JOIN public."LegalInvoice" invoice 
				ON product."legalInvoiceId" = invoice.id
			LEFT JOIN public."LegalInvoiceRemision" remision
				ON product."legalInvoiceRemisionId" = remision.id
			WHERE
				(
					product."legalPosInvoiceId" IS NOT NULL 
					AND pos."organizationId" = ${orgId} 
					AND pos."createdAt" >= ${date} 
					AND pos."createdAt" <= ${end} 
					AND pos."canceledAt" IS NULL 
					AND pos."subOrganizationId" IN (${Prisma.join(branches)})
				)
				OR 
					(
						product."legalInvoiceId" IS NOT NULL
						AND invoice."organizationId" = ${orgId}
						AND invoice."createdAt" >= ${date}
						AND invoice."createdAt" <= ${end}
						AND invoice."subOrganizationId" IN (${Prisma.join(branches)})
						AND invoice."cufe" IS NOT NULL
					)
				OR 
					(
						product."legalInvoiceRemisionId" IS NOT NULL
						AND remision."organizationId" = ${orgId} 
						AND remision."createdAt" >= ${date} 
						AND remision."createdAt" <= ${end} 
						AND remision."canceledAt" IS NULL 
						AND remision."subOrganizationId" IN (${Prisma.join(branches)})
					);
		`;
	}

	function getExpensesSum() {
		return db.expense.aggregate({
			where: {
				subOrg: { organizationId: orgId, id: { in: branches } },
				...where,
			},
			_sum: { amount: true },
		});
	}

	function getInventoryValueSum() {
		return db.$queryRaw`
			SELECT
				subOrg.id AS id,
				p.price AS price,
				SUM(sv.value) AS stock,
				SUM(sv.value * p.price) AS value
			FROM
				public."Product" p
			LEFT JOIN
				public."StockValue" sv ON p.id = sv."productId"
				LEFT JOIN
				public."SubOrganization" subOrg ON sv."subOrgId" = subOrg.id
			WHERE
				subOrg."deletedAt" IS NULL
				AND subOrg.id IN (${Prisma.join(branches)})
				AND p."organizationId" = ${orgId}
			GROUP BY
				p.id, subOrg.id
			HAVING SUM(sv.value) > 0
		`;
	}

	function getPosCount() {
		return db.legalPosInvoice.count({
			where: {
				...where,
				organizationId: orgId,
				canceledAt: null,
				subOrganizationId: { in: branches },
			},
			select: { _all: true },
		});
	}

	function getElectricInvoicesCount() {
		return db.legalInvoice.count({
			where: {
				...where,
				organizationId: orgId,
				cufe: { not: null },
				subOrganizationId: { in: branches },
			},
			select: { _all: true },
		});
	}

	function getRemissionCount() {
		return db.legalInvoiceRemision.count({
			where: {
				...where,
				organizationId: orgId,
				canceledAt: null,
				subOrganizationId: { in: branches },
			},
			select: { _all: true, id: true },
		});
	}

	function getCreditNotesCount() {
		return db.creditNote.count({
			where: { ...where, organizationId: orgId, cude: { not: null } },
			select: { _all: true },
		});
	}

	function getDebitNotesCount() {
		return db.debitNote.count({
			where: { ...where, organizationId: orgId, cude: { not: null } },
			select: { _all: true },
		});
	}

	function getGroupedCounts() {
		return {
			pos: posCount._all,
			invoices: electronicCount._all,
			remissions: remisionCount._all,
			creditNotes: creditNoteCount._all,
			debitNotes: debitNoteCount._all,
		};
	}
}

export default function Component() {
	return (
		<div>
			<PrintableContent>
				<PrintableReport />
			</PrintableContent>

			<NonPrintableContent>
				<Report />
			</NonPrintableContent>
		</div>
	);
}

function Report() {
	return (
		<div>
			<h3>Reporte contable</h3>
			<p className="text-gray-500 mb-6">
				Información detallada de las ventas y gastos de tu organización.
			</p>

			<div className="grid lg:flex-row lg:grid-cols-75/25 gap-6">
				<div className="flex flex-col gap-6">
					<TwoColumnsDiv className="gap-6">
						<div>
							<SalesBox />
						</div>
						<div>
							<TaxesBox />
						</div>
					</TwoColumnsDiv>

					<ProfitsInfo />
				</div>

				<InventoryValueBox />
			</div>
		</div>
	);
}

function SalesBox() {
	const { sales, counts } = useLoaderData<typeof loader>();

	return (
		<Box className="p-6">
			<p className="text-gray-500 text-sm">
				Ventas totales (sin nota crédito/débito)
			</p>
			<p className="font-bold text-3xl mb-6">${formatCurrency(sales.total)}</p>

			<div className="flex justify-between items-center mb-4">
				<div className="flex gap-2 items-center">
					<span className="flex items-center justify-center h-10 w-10 rounded-md bg-[#E7E7FD]">
						<i className="ri-shopping-bag-line text-[#6A6CF6]"></i>
					</span>
					<div>
						<p className="font-medium">Venta POS ({counts.pos})</p>
						<p className="text-gray-500 text-xs">Total vendido en venta POS</p>
					</div>
				</div>

				<p className="font-bold text-lg">${formatCurrency(sales.pos)}</p>
			</div>

			<div className="flex justify-between items-center mb-4">
				<div className="flex gap-2 items-center">
					<span className="flex items-center justify-center h-10 w-10 rounded-md bg-[#ECFAE1]">
						<i className="ri-file-text-line text-[#8EDB59]"></i>
					</span>
					<div>
						<p className="font-medium">
							Factura electrónica ({counts.invoices})
						</p>
						<p className="text-gray-500 text-xs">
							Total vendido en facturas electrónicas
						</p>
					</div>
				</div>

				<p className="font-bold text-lg">${formatCurrency(sales.invoices)}</p>
			</div>

			<div className="flex justify-between items-center mb-4">
				<div className="flex gap-2 items-center">
					<span className="flex items-center justify-center h-10 w-10 rounded-md bg-[#DDF4FB]">
						<i className="ri-file-3-line text-[#5BC0E8]"></i>
					</span>
					<div>
						<p className="font-medium">
							Remisión de venta ({counts.remissions})
						</p>
						<p className="text-gray-500 text-xs">
							Total vendido en remisiones de venta
						</p>
					</div>
				</div>

				<p className="font-bold text-lg">${formatCurrency(sales.remissions)}</p>
			</div>

			<div className="flex justify-between items-center mb-4">
				<div className="flex gap-2 items-center">
					<span className="flex items-center justify-center h-10 w-10 rounded-md bg-[#E7E7FD]">
						<i className="ri-file-edit-line text-[#6A6CF6]"></i>
					</span>
					<div>
						<p className="font-medium">Notas crédito ({counts.creditNotes})</p>
						<p className="text-gray-500 text-xs">
							Total vendido en notas crédito
						</p>
					</div>
				</div>

				<p className="font-bold text-lg">
					${formatCurrency(sales.creditNotes)}
				</p>
			</div>

			<div className="flex justify-between items-center">
				<div className="flex gap-2 items-center">
					<span className="flex items-center justify-center h-10 w-10 rounded-md bg-[#ECFAE1]">
						<i className="ri-file-check-line text-[#8EDB59]"></i>
					</span>
					<div>
						<p className="font-medium">Notas débito ({counts.debitNotes})</p>
						<p className="text-gray-500 text-xs">
							Total vendido en notas débito
						</p>
					</div>
				</div>

				<p className="font-bold text-lg">${formatCurrency(sales.debitNotes)}</p>
			</div>
		</Box>
	);
}

function TaxesBox() {
	const { taxInfo } = useLoaderData<typeof loader>();
	const total =
		taxInfo.pos.taxes + taxInfo.invoices.taxes + taxInfo.remissions.taxes;

	return (
		<Box className="p-6">
			<p className="text-gray-500 text-sm">
				IVA vendido (sin nota crédito/débito)
			</p>
			<p className="font-bold text-3xl mb-6">${formatCurrency(total)}</p>

			<TaxBoxItem
				info={taxInfo.pos}
				title="Venta POS"
				description="IVA total en venta POS"
			>
				<span className="flex items-center justify-center h-10 w-10 rounded-md bg-[#E7E7FD]">
					<i className="ri-shopping-bag-line text-[#6A6CF6]"></i>
				</span>
			</TaxBoxItem>

			<TaxBoxItem
				info={taxInfo.invoices}
				title="Factura electrónica"
				description="IVA total en facturas electrónicas"
			>
				<span className="flex items-center justify-center h-10 w-10 rounded-md bg-[#ECFAE1]">
					<i className="ri-file-text-line text-[#8EDB59]"></i>
				</span>
			</TaxBoxItem>

			<TaxBoxItem
				info={taxInfo.remissions}
				title="Remisión de venta"
				description="IVA total en remisiones de venta"
			>
				<span className="flex items-center justify-center h-10 w-10 rounded-md bg-[#DDF4FB]">
					<i className="ri-file-3-line text-[#5BC0E8]"></i>
				</span>
			</TaxBoxItem>

			<TaxBoxItem
				info={taxInfo.creditNotes}
				title="Nota crédito"
				description="IVA total en notas crédito"
			>
				<span className="flex items-center justify-center h-10 w-10 rounded-md bg-[#E7E7FD]">
					<i className="ri-file-edit-line text-[#6A6CF6]"></i>
				</span>
			</TaxBoxItem>

			<TaxBoxItem
				info={taxInfo.debitNotes}
				title="Nota débito"
				description="IVA total en notas débito"
			>
				<span className="flex items-center justify-center h-10 w-10 rounded-md bg-[#ECFAE1]">
					<i className="ri-file-check-line text-[#8EDB59]"></i>
				</span>
			</TaxBoxItem>
		</Box>
	);
}

type TaxBoxItemProps = {
	info: { total: number; taxes: number; subtotal: number };
	title: string;
	description: string;
	children: React.ReactNode;
};
function TaxBoxItem({ info, description, title, children }: TaxBoxItemProps) {
	const [isOpen, setIsOpen] = React.useState(false);

	return (
		<div className="mb-4 last-of-type:mb-0">
			<div className="flex justify-between items-center">
				<div className="flex gap-2 items-center">
					{children}
					<div>
						<p className="font-medium">{title}</p>
						<p className="text-gray-500 text-xs">{description}</p>
					</div>
				</div>

				<p className="flex gap-4 items-center">
					<span className="font-bold text-lg flex gap-2 items-center">
						${formatCurrency(info.taxes)}
					</span>
					<ButtonIcon className="w-6 h-6" onClick={() => setIsOpen(!isOpen)}>
						<i
							className={cn(
								'ri-arrow-right-s-line transition-all',
								isOpen ? 'transform rotate-90' : '',
							)}
						></i>
					</ButtonIcon>
				</p>
			</div>
			{isOpen ? (
				<TwoColumnsDiv className="mt-4 p-4 bg-gray-50 rounded-md text-sm">
					<div className="border-r border-gray-200">
						<p className="text-gray-500 text-xs">Subtotal vendido con IVA</p>
						<p className="font-bold">
							${formatCurrency(info.total - info.taxes)}
						</p>
					</div>
					<div>
						<p className="text-gray-500 text-xs">Total vendido con IVA</p>
						<p className="font-bold">${formatCurrency(info.total)}</p>
					</div>
				</TwoColumnsDiv>
			) : null}
		</div>
	);
}

function InventoryValueBox() {
	const {
		inventoryValue: { total, branches },
	} = useLoaderData<typeof loader>();

	return (
		<div className="shrink-0">
			<Box className="p-0">
				<div className="p-4 border-b border-gray-200">
					<h5>Valor del inventario</h5>
					<p className="text-sm text-gray-500">
						Valor total de los productos en inventario de la organización
					</p>
				</div>

				<div className="p-4">
					<p className="text-gray-500 text-sm">Total agregado</p>
					<p className="font-bold text-xl">${formatCurrency(total)}</p>
				</div>

				{branches.map(branch => (
					<div key={branch.name} className="p-4 border-t border-gray-200">
						<p className="text-gray-500 text-sm">{branch.name}</p>
						<p className="font-bold text-xl">${formatCurrency(branch.value)}</p>
					</div>
				))}
			</Box>
		</div>
	);
}

function ProfitsInfo() {
	const {
		profitsInfo: {
			cost,
			expenses,
			netProfit,
			grossProfit,
			costPercentage,
			grossProfitPercentage,
			netProfitPercentage,
		},
	} = useLoaderData<typeof loader>();

	function getColorsClass(value: number, errorIfMoreThanAHundred = false) {
		if (errorIfMoreThanAHundred && value > 100) {
			return 'bg-error-50 text-error-600';
		}
		if (value === 0) return 'bg-gray-100 text-gray-600';
		if (value > 0) return 'bg-success-100 text-success-600';
		return 'bg-error-50 text-error-600';
	}

	return (
		<TwoColumnsDiv className="gap-6">
			<TwoColumnsDiv className="gap-6">
				<Box>
					<p className="text-xl font-bold">${formatCurrency(cost)}</p>
					<p className="text-sm text-gray-500 mb-2">Costo total</p>
					<p
						className={cn(
							'px-2 py-1 rounded-md flex gap-1 max-w-max text-xs',
							getColorsClass(toNumber(costPercentage), true),
						)}
					>
						{costPercentage}% del total de ventas
					</p>
				</Box>
				<Box>
					<p className="text-xl font-bold">${formatCurrency(expenses)}</p>
					<p className="text-sm text-gray-500 mb-2">Gastos totales</p>
					<p
						className={cn(
							'px-2 py-1 rounded-md flex gap-1 max-w-max text-xs',
							'bg-gray-100 text-gray-600',
						)}
					>
						--%
					</p>
				</Box>
			</TwoColumnsDiv>

			<TwoColumnsDiv className="gap-6">
				<Box>
					<p className="text-xl font-bold">${formatCurrency(netProfit)}</p>
					<p className="text-sm text-gray-500 mb-2">
						Utilidad neta (antes de gastos)
					</p>
					<p
						className={cn(
							'px-2 py-1 rounded-md flex gap-1 max-w-max text-xs',
							getColorsClass(toNumber(netProfitPercentage)),
						)}
					>
						{netProfitPercentage}%
					</p>
				</Box>
				<Box>
					<p className="text-xl font-bold">${formatCurrency(grossProfit)}</p>
					<p className="text-sm text-gray-500 mb-2">Utilidad bruta</p>
					<p
						className={cn(
							'px-2 py-1 rounded-md flex gap-1 max-w-max text-xs',
							getColorsClass(toNumber(grossProfitPercentage)),
						)}
					>
						{grossProfitPercentage}%
					</p>
				</Box>
			</TwoColumnsDiv>
		</TwoColumnsDiv>
	);
}

function PrintableReport() {
	const {
		sales,
		taxInfo,
		counts,
		profitsInfo: { cost, expenses, netProfit, grossProfit },
		dates,
	} = useLoaderData<typeof loader>();
	const organization = useOrganization();
	const total = sales.total - sales.remissions;
	const taxTotal = taxInfo.pos.taxes + taxInfo.invoices.taxes;

	return (
		<div>
			<h4 className="mb-2">Reporte contable</h4>
			<div className="mb-4 leading-4">
				<p className="font-bold">{organization.name}</p>
				<p>
					<strong>Fecha de impresión:</strong> {formatDate(new Date())}{' '}
					{formatHours(new Date())}
				</p>
				<p>
					<strong>Rango:</strong> Desde el {formatDate(dates.start)} hasta el{' '}
					{formatDate(dates.end)}
				</p>
			</div>

			<div className="flex children:flex-1 gap-4 mb-4">
				<Box>
					<p className="text-gray-500 text-xs">
						Ventas totales (sin nota crédito/débito)
					</p>
					<p className="font-bold text-base mb-6">${formatCurrency(total)}</p>

					<div className="flex justify-between items-center">
						<p>Venta pos ({counts.pos})</p>
						<p className="font-bold">${formatCurrency(sales.pos)}</p>
					</div>
					<div className="flex justify-between items-center">
						<p>Factura electrónica ({counts.invoices})</p>
						<p className="font-bold">${formatCurrency(sales.invoices)}</p>
					</div>
					<div className="flex justify-between items-center">
						<p>Nota crédito ({counts.creditNotes})</p>
						<p className="font-bold">${formatCurrency(sales.creditNotes)}</p>
					</div>
					<div className="flex justify-between items-center">
						<p>Nota débito ({counts.debitNotes})</p>
						<p className="font-bold">${formatCurrency(sales.debitNotes)}</p>
					</div>
				</Box>
				<Box>
					<p className="text-gray-500 text-xs">
						IVA vendido (sin nota crédito/débito)
					</p>
					<p className="font-bold text-base mb-6">
						${formatCurrency(taxTotal)}
					</p>

					<div className="flex justify-between">
						<p>Venta pos</p>
						<p className="font-bold">${formatCurrency(taxInfo.pos.taxes)}</p>
					</div>
					<div className="flex justify-between pb-2 border-b border-gray-200 mb-2">
						<p>Subtotal venta pos</p>
						<p className="font-bold">${formatCurrency(taxInfo.pos.subtotal)}</p>
					</div>

					<div className="flex justify-between">
						<p>Factura electrónica</p>
						<p className="font-bold">
							${formatCurrency(taxInfo.invoices.taxes)}
						</p>
					</div>
					<div className="flex justify-between pb-2 border-b border-gray-200 mb-2">
						<p>Subtotal factura electrónica</p>
						<p className="font-bold">
							${formatCurrency(taxInfo.invoices.subtotal)}
						</p>
					</div>

					<div className="flex justify-between">
						<p>Nota crédito</p>
						<p className="font-bold">
							${formatCurrency(taxInfo.creditNotes.taxes)}
						</p>
					</div>
					<div className="flex justify-between pb-2 border-b border-gray-200 mb-2">
						<p>Subtotal nota crédito</p>
						<p className="font-bold">
							${formatCurrency(taxInfo.creditNotes.subtotal)}
						</p>
					</div>

					<div className="flex justify-between">
						<p>Nota débito</p>
						<p className="font-bold">
							${formatCurrency(taxInfo.debitNotes.taxes)}
						</p>
					</div>
					<div className="flex justify-between">
						<p>Subtotal nota débito</p>
						<p className="font-bold">
							${formatCurrency(taxInfo.debitNotes.subtotal)}
						</p>
					</div>
				</Box>
			</div>

			<div className="grid grid-cols-4 gap-4">
				<Box>
					<p className="text-gray-500 text-[9px]">Costo total</p>
					<p className="font-bold text-base">${formatCurrency(cost)}</p>
				</Box>
				<Box>
					<p className="text-gray-500 text-[9px]">Gastos totales</p>
					<p className="font-bold text-base">${formatCurrency(expenses)}</p>
				</Box>
				<Box>
					<p className="text-gray-500 text-[9px]">Utilidad neta</p>
					<p className="font-bold text-base">${formatCurrency(netProfit)}</p>
				</Box>
				<Box>
					<p className="text-gray-500 text-[9px]">Utilidad bruta</p>
					<p className="font-bold text-base">${formatCurrency(grossProfit)}</p>
				</Box>
			</div>
		</div>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con el reporte. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}

const rangeSchema = z.array(
	z.object({
		total: z.number(),
		table_name: z.enum([
			'LegalPosInvoice',
			'LegalInvoice',
			'LegalInvoiceRemision',
			'CreditNote',
			'DebitNote',
		]),
	}),
);
function getSales(sum: unknown) {
	const data = rangeSchema.parse(sum);

	const total = data
		.filter(x => x.table_name !== 'CreditNote' && x.table_name !== 'DebitNote')
		.reduce((acc, item) => {
			return acc + item.total;
		}, 0);

	return {
		total,
		pos: toNumber(data.find(x => x.table_name === 'LegalPosInvoice')?.total),
		invoices: toNumber(data.find(x => x.table_name === 'LegalInvoice')?.total),
		remissions: toNumber(
			data.find(x => x.table_name === 'LegalInvoiceRemision')?.total,
		),
		creditNotes: toNumber(data.find(x => x.table_name === 'CreditNote')?.total),
		debitNotes: toNumber(data.find(x => x.table_name === 'DebitNote')?.total),
	};
}

const taxInfoSchema = z.array(
	z.object({
		subtotal: z.number().nullable(),
		totalTax: z.number().nullable(),
		discount: z.number().nullable(),
		table_name: z
			.enum([
				'LegalPosInvoice',
				'LegalInvoice',
				'LegalInvoiceRemision',
				'CreditNote',
				'DebitNote',
			])
			.default('LegalPosInvoice'),
	}),
);
function getSalesWithTax(sum: unknown) {
	const tables = taxInfoSchema.parse(sum);

	return {
		pos: findTable('LegalPosInvoice'),
		invoices: findTable('LegalInvoice'),
		remissions: findTable('LegalInvoiceRemision'),
		creditNotes: findTable('CreditNote'),
		debitNotes: findTable('DebitNote'),
	};

	function findTable(table: string) {
		return tables
			.filter(x => x.table_name === table)
			.reduce(
				(acc, curr) => {
					const subtotal = toNumber(curr.subtotal);
					const taxes = toNumber(curr.totalTax);
					const total = subtotal + taxes;

					return {
						total: acc.total + total,
						taxes: acc.taxes + taxes,
						subtotal: acc.subtotal + subtotal,
					};
				},
				{ total: 0, taxes: 0, subtotal: 0 },
			);
	}
}

const costSchema = z.array(z.object({ total: z.coerce.number().nullable() }));
function getCost(sum: unknown) {
	const data = costSchema.parse(sum);
	return toNumber(data[0]?.total);
}

const inventoryValueSchema = z.array(
	z.object({ id: z.number(), stock: z.number(), value: z.number() }),
);
function getInventoryValue(
	sum: unknown,
	allowedBranches: Array<{ id: number; name: string }>,
) {
	const data = inventoryValueSchema.parse(sum);
	const branches = allowedBranches.map(b => ({ ...b, value: 0 }));
	let total = 0;

	for (const item of data) {
		const branch = branches.find(x => x.id === item.id);
		if (branch) {
			branch.value += item.value;
			total += item.value;
		}
	}

	return { branches, total };
}
