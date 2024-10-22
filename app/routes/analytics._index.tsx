import { Prisma } from '@prisma/client';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useSearchParams } from '@remix-run/react';
import clsx from 'clsx';
import {
	ResponsiveContainer,
	ComposedChart,
	XAxis,
	YAxis,
	Tooltip,
	Area,
	CartesianGrid,
} from 'recharts';
import * as z from 'zod';
import { RouteErrorBoundary } from '~/components/error-boundary';
import { Select } from '~/components/form-utils';
import { Box, ProfitArrow } from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import {
	getSearchParamsWithDefaultDateRange,
	toStartOfDay,
	getTodayInColombia,
	formatCurrency,
	toNumber,
	getColombiaDate,
	cn,
} from '~/utils/misc';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';
import { getSumByRange } from '~/utils/sql.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId, userId } = await getOrgDbClient(request);

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

	const searchParams = getSearchParamsWithDefaultDateRange(request);
	const month = searchParams.get('month') || `${new Date().getMonth() + 1}`;
	const start = searchParams.get('start');
	const end = searchParams.get('end');

	// in start and end we have the date in format YYYY-MM-DD, replace the month with the month selected
	const startWithMonth = start
		? replaceMonthInDate(start, parseInt(month), 'start')
		: null;
	const endWithMonth = end
		? replaceMonthInDate(end, parseInt(month), 'end')
		: null;

	if (startWithMonth && endWithMonth) {
		searchParams.set('start', startWithMonth);
		searchParams.set('end', endWithMonth);
	}
	const filters = queryBuilder(searchParams, ['createdAt']);
	const monthFilters = filters.createdAt;

	const startOfTodayInColombia = toStartOfDay(getTodayInColombia());
	const startOfYesterdayInColombia = new Date(startOfTodayInColombia);
	startOfYesterdayInColombia.setDate(startOfYesterdayInColombia.getDate() - 1);

	const [sumToday, sumYesterday, sumThisMonth, sumByPeriodResponse, branches] =
		await db.$transaction([
			getSumByDay(startOfTodayInColombia),
			getSumByRange(
				db,
				orgId,
				startOfYesterdayInColombia,
				startOfTodayInColombia,
				allowedBranches,
			),
			getSumThisMonth(),
			getSumByPeriod(),
			db.subOrganization.findMany({
				where: { organizationId: orgId, deletedAt: null },
				select: { id: true, name: true },
			}),
		]);

	return json({
		salesByBrach: parseSumByPeriod(sumByPeriodResponse),
		todayData: getTodayData(),
		thisMonthData: parseSumThisMonth(sumThisMonth, parseInt(month) - 1),
		selectedMonthName: months[parseInt(month) - 1] || '',
		selectedMonthNumber: month,
		branches,
	});

	function getTodayData() {
		const salesToday = parseSum(sumToday);
		const salesYesterday = parseSum(sumYesterday);

		const salesTodayChange =
			((salesToday - salesYesterday) / salesYesterday) * 100;
		const isPositiveSalesTodayChange = salesTodayChange > 0;

		return {
			salesToday,
			salesTodayPercent: salesTodayChange.toFixed(2),
			isPositiveSalesTodayChange,
		};
	}

	function getSumByDay(date: Date) {
		return db.$queryRaw`
			SELECT
				CAST(SUM(total) AS int) as total,
				CAST(SUM(subtotal) AS int) as subtotal,
				CAST(SUM("totalTax") AS int) as tax
			FROM (
					SELECT total, null as subtotal, null as "totalTax", id
					FROM public."LegalPosInvoice"
					WHERE "organizationId" = ${orgId}
							AND "createdAt" >= ${date}
							AND "canceledAt" IS NULL
							AND "subOrganizationId" IN (${Prisma.join(allowedBranches)})
					UNION ALL
					SELECT null as total, subtotal, "totalTax", id
					FROM public."LegalInvoice"
					WHERE "organizationId" = ${orgId}
							AND "createdAt" >= ${date}
							AND cufe IS NOT NULL
							AND "subOrganizationId" IN (${Prisma.join(allowedBranches)})
					UNION ALL
					SELECT null as total, subtotal, "totalTax", id
					FROM public."LegalInvoiceRemision"
					WHERE "organizationId" = ${orgId}
							AND "createdAt" >= ${date}
							AND "canceledAt" IS NULL
							AND "subOrganizationId" IN (${Prisma.join(allowedBranches)})
			) as combined_data;
		`;
	}

	function getSumThisMonth() {
		return db.$queryRaw`
			SELECT
				CAST(SUM(total) AS int) as total,
				CAST(SUM(subtotal) AS int) as subtotal,
				CAST(SUM("totalTax") AS int) as tax,
				"createdAt"
			FROM (
				SELECT 
					total,
					null as subtotal,
					null as "totalTax",
					"createdAt"
				FROM public."LegalPosInvoice"
				WHERE "organizationId" = ${orgId}
					AND "createdAt" >= ${monthFilters?.gte}
					AND "createdAt" < ${monthFilters?.lte}
					AND "canceledAt" IS NULL
					AND "subOrganizationId" IN (${Prisma.join(allowedBranches)})
				UNION ALL
				SELECT
					null as total,
					subtotal,
					"totalTax",
					"createdAt"
				FROM public."LegalInvoice"
				WHERE "organizationId" = ${orgId}
					AND "createdAt" >= ${monthFilters?.gte}
					AND "createdAt" < ${monthFilters?.lte}
					AND cufe IS NOT NULL
					AND "subOrganizationId" IN (${Prisma.join(allowedBranches)})
				UNION ALL
				SELECT
					null as total,
					subtotal,
					"totalTax",
					"createdAt"
				FROM public."LegalInvoiceRemision"
				WHERE "organizationId" = ${orgId}
					AND "createdAt" >= ${monthFilters?.gte}
					AND "createdAt" < ${monthFilters?.lte}
					AND "canceledAt" IS NULL
					AND "subOrganizationId" IN (${Prisma.join(allowedBranches)})
			) as combined_data
			GROUP BY "createdAt"
		`;
	}

	function getSumByPeriod() {
		return db.$queryRawUnsafe(
			`
				${getGroupedSalesByPeriod({
					orgId,
					monthFilters,
					column: 'subOrganizationId',
					branches: allowedBranches,
				})}
			`,
		);
	}
}

export default function Component() {
	const [, setSearchParams] = useSearchParams();
	const { todayData, thisMonthData, selectedMonthName, selectedMonthNumber } =
		useLoaderData<typeof loader>();
	const totalSales = thisMonthData.reduce((acc, item) => acc + item.total, 0);

	return (
		<div className="flex gap-6 flex-col lg:flex-row pb-6">
			<div className="h-[300px] md:h-[400px] lg:w-[70%]">
				<div className="h-full">
					<Box className="rounded-lg pr-8 h-full text-sm">
						<div className="flex justify-between items-center">
							<div>
								<p className="text-gray-500 text-sm">
									Ventas en {selectedMonthName.toLowerCase()}
								</p>
								<p className="mb-6 font-bold text-lg md:text-xl">
									${formatCurrency(totalSales)}
								</p>
							</div>

							<div>
								<label htmlFor="month" className="sr-only">
									Mes
								</label>
								<Select
									id="month"
									name="month"
									className="w-32"
									defaultValue={selectedMonthNumber}
									options={months.map((month, index) => ({
										label: month,
										value: index + 1,
									}))}
									onChange={e => setSearchParams({ month: e.target.value })}
								/>
							</div>
						</div>

						<MonthChart />
					</Box>
				</div>
			</div>
			<div className="flex-1 flex flex-col gap-6">
				<Box>
					<div className="flex justify-between gap-6">
						<div>
							<span className="text-xs text-gray-500">Ventas</span>
							<p className="text-lg md:text-xl font-bold">
								${formatCurrency(todayData.salesToday)}
							</p>
						</div>
						<div>
							<ProfitArrow positive={todayData.isPositiveSalesTodayChange} />
						</div>
					</div>
					<div className="flex gap-6 justify-between">
						<span className="text-xs text-gray-500">En el día de hoy</span>
						<span
							className={clsx(
								'text-xs',
								todayData.isPositiveSalesTodayChange
									? 'text-success-600'
									: 'text-error-600',
							)}
						>
							{todayData.isPositiveSalesTodayChange ? '+' : null}
							{todayData.salesTodayPercent}%
						</span>
					</div>
				</Box>

				<TotalSalesColumn />
			</div>
		</div>
	);
}

function TotalSalesColumn() {
	const { salesByBrach, branches } = useLoaderData<typeof loader>();

	function findBranchName(id: number) {
		const subOrganization = branches.find(sub => sub.id === id);
		return subOrganization?.name ?? 'Sin sucursal';
	}

	return (
		<Box>
			<div>
				<p className="mb-6 font-bold text-lg md:text-xl">
					${formatCurrency(salesByBrach.total)} ventas
				</p>
			</div>

			<span className="h-2 flex items-center rounded-sm overflow-hidden mb-4">
				{salesByBrach.branches.map((branch, index) => (
					<span
						key={branch.id}
						className="h-2"
						style={{
							backgroundColor: colors[index],
							width: `${branch.percentage}%`,
						}}
					></span>
				))}
			</span>

			<div className="flex flex-col gap-2">
				{salesByBrach.branches.map((branch, index) => (
					<div
						className="flex gap-4 justify-between items-center"
						key={branch.id}
					>
						<div className="flex gap-2 items-center">
							<span
								className="h-3 w-3 rounded-full"
								style={{ backgroundColor: colors[index] }}
							></span>
							<p className="text-sm">{findBranchName(branch.id)}</p>
						</div>

						<p className="font-bold">${formatCurrency(branch.total)}</p>
					</div>
				))}
			</div>
		</Box>
	);
}

const colors = ['#1ABC9C', '#0B5345', '#F4D03F', '#9B59B6', '#E74C3C'];

function MonthChart() {
	const { thisMonthData } = useLoaderData<typeof loader>();

	return (
		<ResponsiveContainer height="80%" className="!w-[calc(100%+2rem)]">
			<ComposedChart
				width={500}
				height={300}
				data={thisMonthData}
				className="-ml-4"
			>
				<XAxis
					dataKey="dateString"
					stroke="#e5e7eb"
					tick={false}
					axisLine={false}
				/>
				<YAxis
					tickFormatter={value => formatNumber(value)}
					className="text-xs text-gray-700"
					axisLine={false}
					tickLine={false}
				/>
				<Tooltip
					content={({ payload }) => {
						const data = Array.isArray(payload) ? payload[0] : null;
						if (!data) return null;
						const item = data?.payload as any;

						const day = item.dateString.split(' ')[0];
						const dayIndex = thisMonthData.findIndex(
							({ dateString }) => dateString.split(' ')[0] === day,
						);

						const previousDayTotal = toNumber(
							thisMonthData[dayIndex - 1]?.total,
						);
						const percentageChange =
							((item.total - previousDayTotal) / (previousDayTotal || 1)) * 100;
						const isPositiveChange = percentageChange > 0;

						return (
							<div
								className={cn(
									'bg-white leading-5 rounded-md py-2 px-3 font-sans',
									'shadow-sm border border-gray-200',
								)}
							>
								<div className="flex gap-2">
									<p className="font-medium text-sm">
										${formatCurrency(item.total)}
									</p>
									{previousDayTotal ? (
										<span
											className={cn(
												' px-1 text-xs',
												'flex items-center rounded-full',
												isPositiveChange
													? 'bg-[#EAF4FF] text-[#0568D7]'
													: 'bg-error-50 text-error-600',
											)}
										>
											{isPositiveChange ? '+' : null}
											{percentageChange.toFixed(0)}%
										</span>
									) : null}
								</div>
								<p className="text-xs text-gray-500">{item.dateString}</p>
							</div>
						);
					}}
					formatter={value => `$${formatCurrency(value as number)}`}
				/>

				<CartesianGrid vertical={false} stroke="#edeff2" />
				<Area
					type="linear"
					dataKey="total"
					strokeWidth={2}
					stroke="#50ADFD"
					fill="#fff"
					fillOpacity={0}
					activeDot={({ cx, cy }) => (
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
								fill="#50ADFD"
								r="4"
								vector-effect="non-scaling-size"
								opacity="1"
							></circle>
						</g>
					)}
				/>
			</ComposedChart>
		</ResponsiveContainer>
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

const SumSchema = z.object({
	total: z.number().nullable(),
	subtotal: z.number().nullable(),
	tax: z.number().nullable(),
});

function parseSum(sum: any): number {
	const parsedSum = SumSchema.parse(sum[0]);
	return (
		(parsedSum.total ?? 0) + (parsedSum.subtotal ?? 0) + (parsedSum.tax ?? 0)
	);
}

const SumThisMonthSchema = z.array(
	z.object({
		total: z.number(),
		createdAt: z.date(),
	}),
);

function parseSumThisMonth(data: any, month: number) {
	const sumData = data.map((item: any) => ({
		...item,
		total: (item.total ?? 0) + (item.subtotal ?? 0) + (item.tax ?? 0),
	}));

	const sum = SumThisMonthSchema.parse(sumData);
	const days = Array.from(Array(daysInMonth()).keys()).map(day => day + 1);

	const groupedData = new Map<number, number>();

	days.forEach(day => {
		groupedData.set(day, 0);
	});

	sum.forEach(item => {
		const dayOfMonth = getColombiaDate(item.createdAt).getDate();

		if (groupedData.has(dayOfMonth)) {
			groupedData.set(
				dayOfMonth,
				(groupedData.get(dayOfMonth) || 0) + item.total,
			);
		}
	});

	return Array.from(groupedData.entries()).map(([day, total]) => ({
		dateString: `${day} de ${months[month]}`,
		total,
	}));
}

function daysInMonth() {
	const month = new Date().getMonth() + 1;
	const year = new Date().getFullYear();
	return new Date(year, month, 0).getDate();
}

const months = [
	'Enero',
	'Febrero',
	'Marzo',
	'Abril',
	'Mayo',
	'Junio',
	'Julio',
	'Agosto',
	'Septiembre',
	'Octubre',
	'Noviembre',
	'Diciembre',
];

function replaceMonthInDate(
	dateString: string,
	newMonth: number,
	type: 'start' | 'end',
): string {
	const dayOfMonth = toNumber(dateString.split('-')[2] || '01');
	const date = new Date(dateString);

	const daysInMonth = new Date(date.getFullYear(), newMonth, 0).getDate();
	const newDate = new Date(
		date.getFullYear(),
		newMonth - 1,
		type === 'start' ? 1 : Math.min(dayOfMonth, daysInMonth),
	);

	return getTodayInColombia(newDate);
}

const columns = ['subOrganizationId', 'clientId', 'userId'] as const;
type Column = (typeof columns)[number];
type GroupedSalesByPeriodProps = {
	orgId: number;
	monthFilters: { gte?: Date; lte?: Date } | undefined;
	column: Column;
	branches: Array<number>;
};
function getGroupedSalesByPeriod(props: GroupedSalesByPeriodProps) {
	const { orgId, monthFilters, column, branches } = props;

	function getSelectClause() {
		return columns.map(c => {
			if (c === column) return `"${c}"`;
			return `null as "${c}"`;
		});
	}

	const monthFiltersQuery = `
		AND "createdAt" >= '${monthFilters?.gte?.toISOString()}'
		AND "createdAt" < '${monthFilters?.lte?.toISOString()}'
		AND "subOrganizationId" IN (${branches.join(', ')})
	`;

	const query = `
		SELECT
			CAST("subOrganizationId" AS int) as "subOrganizationId",
			CAST("clientId" AS int) as "clientId",
			CAST("userId" AS int) as "userId",
			CAST(SUM(CAST(total AS numeric)) AS int) as total,
			CAST(SUM(CAST(subtotal AS numeric)) AS int) as subtotal,
			CAST(SUM(CAST("totalTax" AS numeric)) AS int) as tax
		FROM (
			SELECT 
				${getSelectClause().join(', ')},
				null as subtotal, 
				null as "totalTax",
				total
			FROM public."LegalPosInvoice"
			WHERE "organizationId" = ${orgId}
				${monthFiltersQuery}
				AND "canceledAt" IS NULL
				
			UNION ALL
			SELECT 
				${getSelectClause().join(', ')},
				null as total,
				subtotal, 
				"totalTax"
				FROM public."LegalInvoice"
				WHERE "organizationId" = ${orgId}
						${monthFiltersQuery}
						AND cufe IS NOT NULL
			UNION ALL
			SELECT 
				${getSelectClause().join(', ')},
				null as total,
				subtotal, 
				"totalTax"
				FROM public."LegalInvoiceRemision"
				WHERE "organizationId" = ${orgId}
						${monthFiltersQuery}
						AND "canceledAt" IS NULL
		) as combined_data
		GROUP BY "subOrganizationId", "clientId", "userId"
	`;

	return query;
}

const SumsSchema = z.array(
	z.object({
		total: z.number().nullable(),
		tax: z.number().nullable(),
		subtotal: z.number().nullable(),
		subOrganizationId: z.number().nullable(),
	}),
);

function parseSumByPeriod(sum: any) {
	const sumsData = SumsSchema.parse(sum);
	const total = sumsData.reduce(
		(acc, sum) => acc + (sum.total ?? 0) + (sum.subtotal ?? 0) + (sum.tax ?? 0),
		0,
	);

	return { branches: mapData(), total };

	function mapData() {
		return sumsData
			.filter(sum => sum.subOrganizationId !== null)
			.map(sum => {
				const totalSold =
					(sum.total ?? 0) + (sum.subtotal ?? 0) + (sum.tax ?? 0);

				return {
					id: sum.subOrganizationId ?? 0,
					total: totalSold,
					percentage: ((totalSold / total) * 100).toFixed(2),
				};
			});
	}
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con las analíticas. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}
