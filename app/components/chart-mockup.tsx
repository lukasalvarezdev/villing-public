import {
	ResponsiveContainer,
	ComposedChart,
	XAxis,
	YAxis,
	Tooltip,
	CartesianGrid,
	Area,
} from 'recharts';
import { toNumber, cn, formatCurrency } from '~/utils/misc';

export function ChartMockup() {
	return (
		<ResponsiveContainer height="100%" className="!w-[calc(100%+2rem)]">
			<ComposedChart
				width={500}
				height={300}
				data={chartData}
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
						const dayIndex = chartData.findIndex(
							({ dateString }) => dateString.split(' ')[0] === day,
						);

						const previousDayTotal = toNumber(chartData[dayIndex - 1]?.total);
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
												'bg-[#EAF4FF] text-[#0568D7]',
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
	return `${formatCurrency(number)}`;
}

const chartData = [
	{ dateString: '1 de febrero', total: 500 },
	{ dateString: '2 de febrero', total: 500 },
	{ dateString: '3 de febrero', total: 1000 },
	{ dateString: '4 de febrero', total: 1000 },
	{ dateString: '5 de febrero', total: 1300 },
	{ dateString: '6 de febrero', total: 1300 },
	{ dateString: '7 de febrero', total: 1300 },
	{ dateString: '8 de febrero', total: 1600 },
	{ dateString: '9 de febrero', total: 1600 },
	{ dateString: '10 de febrero', total: 2000 },
	{ dateString: '11 de febrero', total: 2000 },
	{ dateString: '12 de febrero', total: 2500 },
	{ dateString: '13 de febrero', total: 2500 },
	{ dateString: '14 de febrero', total: 2900 },
	{ dateString: '15 de febrero', total: 2900 },
	{ dateString: '16 de febrero', total: 2900 },
	{ dateString: '17 de febrero', total: 3400 },
	{ dateString: '18 de febrero', total: 3400 },
	{ dateString: '19 de febrero', total: 4000 },
	{ dateString: '20 de febrero', total: 4000 },
	{ dateString: '21 de febrero', total: 4000 },
];
