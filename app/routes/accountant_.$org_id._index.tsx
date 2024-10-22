import { type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import {
	ResponsiveContainer,
	ComposedChart,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
	Area,
} from 'recharts';
import { z } from 'zod';
import { DateRangeFilter } from '~/components/filters';
import {
	Box,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeadCell,
	TableRow,
} from '~/components/ui-library';
import { months } from '~/utils/dates-misc';
import { getOrgDbClient } from '~/utils/db.server';
import {
	cn,
	formatCurrency,
	getColombiaDate,
	getSearchParamsWithDefaultDateRange,
	invariant,
	toNumber,
} from '~/utils/misc';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';
import { useAccountantCompany } from './accountant_.$org_id';

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.org_id, 'Organization id is required');
	await protectRoute(request);
	const orgId = toNumber(params.org_id);

	const { db, userId } = await getOrgDbClient(request);
	const searchParams = getSearchParamsWithDefaultDateRange(request);
	const where = queryBuilder(searchParams, ['createdAt']);
	const yearFilters = getThisYearFilters();

	const [
		salesSum,
		taxSum,
		posCount,
		electronicCount,
		remisionCount,
		creditNoteCount,
		debitNoteCount,
		purchasesThisMonth,
		purchasesThisYear,
		salesThisYear,
	] = await db.$transaction([
		getSalesSum(where.createdAt.gte, where.createdAt.lte),
		getSalesWithTaxInfo(where.createdAt.gte, where.createdAt.lte),

		getPosCount(),
		getElectricInvoicesCount(),
		getRemissionCount(),
		getCreditNotesCount(),
		getDebitNotesCount(),

		getPurchasesThisMonth(),

		getPurchasesThisYear(),
		getSalesThisYear(),

		db.organization.findFirstOrThrow({
			where: {
				id: Number(params.org_id),
				members: { some: { user: { id: userId, type: 'accountant' } } },
			},
			select: { id: true },
		}),
	]);

	const sales = getSales(salesSum);
	const taxInfo = getSalesWithTax(taxSum);
	const counts = getGroupedCounts();
	const dates = { start: where.createdAt.gte, end: where.createdAt.lte };

	const mappedPurchases = purchasesThisYear.map(purchase => ({
		total: toNumber(purchase._sum.total),
		createdAt: purchase.createdAt,
	}));
	const thisYearData = parseSumThisYear(salesThisYear, mappedPurchases);
	const totalSalesThisYear = thisYearData.reduce(
		(acc, item) => acc + item.sales,
		0,
	);
	const totalPurchasesThisYear = thisYearData.reduce(
		(acc, item) => acc + item.purchases,
		0,
	);
	const purchases = toNumber(purchasesThisMonth._sum.total);
	const purchasesTax = toNumber(purchasesThisMonth._sum.totalTax);

	return {
		sales,
		taxInfo,
		counts,
		thisYearData,
		dates,
		purchases,
		purchasesTax,
		totalSalesThisYear,
		totalPurchasesThisYear,
	};

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
					UNION ALL
					SELECT total, id, 'LegalInvoice' as table_name
					FROM public."LegalInvoice"
					WHERE "organizationId" = ${orgId}
							AND "createdAt" >= ${date}
							AND "createdAt" <= ${end}
							AND cufe IS NOT NULL
					UNION ALL
					SELECT total, id, 'LegalInvoiceRemision' as table_name
					FROM public."LegalInvoiceRemision"
					WHERE "organizationId" = ${orgId}
							AND "createdAt" >= ${date}
							AND "createdAt" <= ${end}
							AND "canceledAt" IS NULL
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

	function getPosCount() {
		return db.legalPosInvoice.count({
			where: {
				...where,
				organizationId: orgId,
				canceledAt: null,
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

	function getPurchasesThisMonth() {
		return db.purchaseInvoice.aggregate({
			_sum: { total: true, totalTax: true },
			where: {
				organizationId: orgId,
				createdAt: { gte: where.createdAt.gte, lte: where.createdAt.lte },
			},
		});
	}

	function getPurchasesThisYear() {
		return db.purchaseInvoice.groupBy({
			by: ['createdAt'],
			_sum: { total: true },
			orderBy: { createdAt: 'asc' },
			where: {
				organizationId: orgId,
				createdAt: { gte: yearFilters.gte, lte: yearFilters.lte },
			},
		});
	}

	function getSalesThisYear() {
		return db.$queryRaw`
			SELECT
				CAST(SUM(total) AS int) as total,
				"createdAt"
			FROM (
				SELECT total, "createdAt"
				FROM public."LegalPosInvoice"
				WHERE "organizationId" = ${orgId}
					AND "createdAt" >= ${yearFilters.gte}
					AND "createdAt" < ${yearFilters.lte}
					AND "canceledAt" IS NULL
				UNION ALL
				SELECT total, "createdAt"
				FROM public."LegalInvoice"
				WHERE "organizationId" = ${orgId}
					AND "createdAt" >= ${yearFilters.gte}
					AND "createdAt" < ${yearFilters.lte}
					AND cufe IS NOT NULL
				UNION ALL
				SELECT total, "createdAt"
				FROM public."LegalInvoiceRemision"
				WHERE "organizationId" = ${orgId}
					AND "createdAt" >= ${yearFilters.gte}
					AND "createdAt" < ${yearFilters.lte}
					AND "canceledAt" IS NULL
			) as combined_data
			GROUP BY "createdAt"
		`;
	}
}

export default function Component() {
	const company = useAccountantCompany();

	return (
		<div>
			<h3>{company.name}</h3>
			<p className="text-gray-500 mb-4">Reporte contable y de cartera.</p>

			<div className="flex justify-end mb-4">
				<div className="max-w-max">
					<DateRangeFilter />
				</div>
			</div>

			<TotalsGrid />
			<ThisYearChart />
		</div>
	);
}

function TotalsGrid() {
	const { sales, taxInfo, purchases, purchasesTax } =
		useLoaderData<typeof loader>();
	const tax =
		taxInfo.pos.taxes + taxInfo.invoices.taxes + taxInfo.remissions.taxes;

	return (
		<div className="grid grid-cols-fit-56 gap-6 mb-6">
			<Box>
				<p className="text-sm text-gray-500">Total ventas</p>
				<p className="text-xl font-bold">${formatCurrency(sales.total)}</p>
				<p className={cn('text-xs text-gray-400')}>En el rango seleccionado</p>
			</Box>
			<Box>
				<p className="text-sm text-gray-500">Total IVA en ventas</p>
				<p className="text-xl font-bold">${formatCurrency(tax)}</p>
				<p className={cn('text-xs text-gray-400')}>En el rango seleccionado</p>
			</Box>
			<Box>
				<p className="text-sm text-gray-500">Total compras</p>
				<p className="text-xl font-bold">${formatCurrency(purchases)}</p>
				<p className={cn('text-xs text-gray-400')}>En el rango seleccionado</p>
			</Box>
			<Box>
				<p className="text-sm text-gray-500">Total IVA en compras</p>
				<p className="text-xl font-bold">${formatCurrency(purchasesTax)}</p>
				<p className={cn('text-xs text-gray-400')}>En el rango seleccionado</p>
			</Box>
		</div>
	);
}

function ThisYearChart() {
	const { totalPurchasesThisYear, totalSalesThisYear } =
		useLoaderData<typeof loader>();

	return (
		<div className="grid grid-cols-fit-56 gap-6 h-full w-full">
			<Box className="rounded-lg h-full text-sm">
				<h5 className="mb-4">Compras vs Ventas</h5>
				<div className="flex gap-8 mb-6">
					<div className="flex gap-2">
						<span className="block w-2.5 h-2.5 rounded-sm bg-[#50ADFD] mt-0.5 rotate-45"></span>
						<div>
							<p className="text-xs text-gray-400">Ventas totales</p>
							<p className="text-sm font-bold">
								${formatCurrency(totalSalesThisYear)}
							</p>
						</div>
					</div>

					<div className="flex gap-2">
						<span className="block w-2.5 h-2.5 rounded-sm bg-[#00E3C4] mt-0.5 rotate-45"></span>
						<div>
							<p className="text-xs text-gray-400">Compras totales</p>
							<p className="text-sm font-bold">
								${formatCurrency(totalPurchasesThisYear)}
							</p>
						</div>
					</div>
				</div>

				<div className="h-[250px] md:h-[300px] pl-3">
					<Chart />
				</div>
			</Box>
			<TaxDetailTable />
		</div>
	);
}

function TaxDetailTable() {
	const { taxInfo } = useLoaderData<typeof loader>();
	const concepts = [
		{ name: 'POS', ...taxInfo.pos },
		{ name: 'Facturas electrónicas', ...taxInfo.invoices },
		{ name: 'Remisiones', ...taxInfo.remissions },
		{ name: 'Notas crédito', ...taxInfo.creditNotes },
		{ name: 'Notas débito', ...taxInfo.debitNotes },
	];

	return (
		<Box className="p-0">
			<div className="p-4">
				<h5>Detalle de IVA</h5>
			</div>

			<Table className="text-sm border-y border-gray-200">
				<TableHead>
					<TableHeadCell className="pl-4">Concepto</TableHeadCell>
					<TableHeadCell>IVA</TableHeadCell>
					<TableHeadCell>Subtotal</TableHeadCell>
					<TableHeadCell className="whitespace-nowrap">Total</TableHeadCell>
					<TableHeadCell></TableHeadCell>
				</TableHead>
				<TableBody>
					{concepts.map(concept => (
						<TableRow key={concept.name}>
							<TableCell className="whitespace-nowrap pl-4">
								{concept.name}
							</TableCell>
							<TableCell className="whitespace-nowrap">
								${formatCurrency(concept.taxes)}
							</TableCell>
							<TableCell className="whitespace-nowrap">
								${formatCurrency(concept.subtotal)}
							</TableCell>
							<TableCell className="whitespace-nowrap">
								${formatCurrency(concept.total)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</Box>
	);
}

function Chart() {
	const { thisYearData } = useLoaderData<typeof loader>();

	return (
		<ResponsiveContainer height="100%" className="!w-[calc(100%+2rem)]">
			<ComposedChart
				width={500}
				height={300}
				data={thisYearData}
				className="-ml-4"
				margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
			>
				<XAxis
					dataKey="monthString"
					className="text-xs text-gray-700"
					tickMargin={10}
					tickLine={false}
					// max width for the month string
					tickFormatter={value => value.slice(0, 3)}
				/>
				<YAxis
					tickFormatter={value => formatNumber(value)}
					className="text-xs text-gray-700"
					axisLine={false}
					tickLine={false}
					orientation="right"
					tickMargin={10}
				/>
				<Tooltip
					content={({ payload }) => {
						const data = Array.isArray(payload) ? payload[0] : null;
						if (!data) return null;
						const item = data?.payload as {
							sales: number;
							purchases: number;
							monthString: string;
						};

						return (
							<div
								className={cn(
									'bg-white leading-5 rounded-md py-2 px-3 font-sans',
									'shadow-sm border border-gray-200',
								)}
							>
								<p className="mb-2 font-medium">{item.monthString}</p>

								<div className="flex justify-between gap-6">
									<p className="text-gray-400 text-xs">Ventas</p>
									<p className="font-medium text-sm">
										${formatCurrency(item.sales)}
									</p>
								</div>
								<div className="flex justify-between gap-6">
									<p className="text-gray-400 text-xs">Compras</p>
									<p className="font-medium text-sm">
										${formatCurrency(item.purchases)}
									</p>
								</div>
							</div>
						);
					}}
					formatter={value => `$${formatCurrency(value as number)}`}
				/>

				<CartesianGrid vertical={false} stroke="#edeff2" />
				<Area
					type="linear"
					dataKey="sales"
					strokeWidth={2}
					stroke="#50ADFD"
					fill="#fff"
					fillOpacity={0}
					activeDot={props => <ActiveDot {...props} fill="#50ADFD" />}
				/>
				<Area
					type="linear"
					dataKey="purchases"
					strokeWidth={2}
					stroke="#00E3C4"
					fill="#fff"
					fillOpacity={0}
					activeDot={props => <ActiveDot {...props} fill="#00E3C4" />}
				/>
			</ComposedChart>
		</ResponsiveContainer>
	);
}
function ActiveDot({ cx, cy, fill }: { cx: number; cy: number; fill: string }) {
	return (
		<g>
			<circle
				cx={cx}
				cy={cy}
				fill="#fff"
				r="7"
				stroke="#e5e7eb"
				vector-effect="non-scaling-size"
				opacity="1"
				strokeWidth={1}
			></circle>
			<circle
				cx={cx}
				cy={cy}
				fill={fill}
				r="4"
				vector-effect="non-scaling-size"
				opacity="1"
			></circle>
		</g>
	);
}

export function formatNumber(number: number) {
	const suffixes = ['', 'K', 'M', 'B', 'T'];
	const suffixNum = Math.floor(('' + number).length / 3);
	let shortValue: string | number = parseFloat(
		(suffixNum !== 0 ? number / Math.pow(1000, suffixNum) : number).toPrecision(
			2,
		),
	);
	if (shortValue % 1 !== 0) {
		shortValue = shortValue.toFixed(1);
	}
	return `${shortValue}${suffixes[suffixNum]}`;
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

function getThisYearFilters() {
	const firstDayOfYear = new Date(new Date().getFullYear(), 0, 1);

	// add 5 hours (Colombia offset) to the date
	const firstDayOfYearWithOffset = new Date(
		firstDayOfYear.getTime() + 5 * 60 * 60 * 1000,
	);

	const lastDayOfYear = new Date(new Date().getFullYear(), 11, 31);
	// add 5 hours (Colombia offset) to the date
	const lastDayOfYearWithOffset = new Date(
		lastDayOfYear.getTime() + 5 * 60 * 60 * 1000,
	);

	return {
		gte: firstDayOfYearWithOffset,
		lte: lastDayOfYearWithOffset,
	};
}

const SumThisYearSchema = z.array(
	z.object({ total: z.number(), createdAt: z.date() }),
);
function parseSumThisYear(
	data: any,
	purchases: Array<{ total: number; createdAt: Date }>,
) {
	const sumData = data.map((item: any) => ({
		...item,
		total: toNumber(item.total),
	}));

	const sum = SumThisYearSchema.parse(sumData);

	const groupedData = new Map<number, { sales: number; purchases: number }>();

	for (let month = 1; month <= 12; month++) {
		groupedData.set(month, { sales: 0, purchases: 0 });
	}

	sum.forEach(item => {
		const colombiaDate = getColombiaDate(new Date(item.createdAt));
		const month = colombiaDate.getMonth() + 1; // Months are 0-indexed

		if (!groupedData.has(month)) {
			groupedData.set(month, { sales: 0, purchases: 0 });
		}

		const d = groupedData.get(month);
		const sales = toNumber(d?.sales) + item.total;
		const purchases = toNumber(d?.purchases);
		groupedData.set(month, { sales, purchases });
	});

	purchases.forEach(purchase => {
		const colombiaDate = getColombiaDate(purchase.createdAt);
		const month = colombiaDate.getMonth() + 1; // Months are 0-indexed

		const d = groupedData.get(month);
		const sales = toNumber(d?.sales);
		const purchases = toNumber(d?.purchases) + purchase.total;
		groupedData.set(month, { sales, purchases });
	});

	return Array.from(groupedData.entries()).map(([month, total]) => ({
		monthString: months[month - 1],
		...total,
	}));
}
