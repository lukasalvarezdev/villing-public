import { type MetaFunction, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { DateString } from '~/components/client-only';
import { RouteErrorBoundary } from '~/components/error-boundary';
import { DateRangeFilter, FiltersProvider } from '~/components/filters';
import { LinkButton } from '~/components/form-utils';
import { MultiSelect } from '~/components/multi-select';
import {
	Pagination,
	getLastPage,
	getQueryPositionData,
} from '~/components/pagination';
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
	DateWithTime,
	PageWrapper,
	LinkWithCurrentSearch,
} from '~/components/ui-library';
import { PrintInvoiceButton } from '~/modules/invoice/invoice-page-components';
import {
	OrganizationInfo,
	Separator,
	BillFooter,
} from '~/modules/printing/narrow-bill';
import { useIsForeignCountry } from '~/root';
import { getOrgDbClient } from '~/utils/db.server';
import {
	getSearchParamsWithDefaultDateRange,
	formatCurrency,
	formatDate,
} from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{
		title: 'Historial de cajeros - Villing',
		description: 'Historial de cajeros',
	},
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId, userId } = await getOrgDbClient(request);

	await legalActions.validateAndThrow(db, userId, 'see_invoices');

	const queryPositionData = getQueryPositionData(request);
	const searchParams = getSearchParamsWithDefaultDateRange(request);
	const { createdAt, ...where } = queryBuilder(searchParams, [
		'createdAt',
		'subOrganizationId',
	]);

	const [cashiers, count, subOrganizations] = await db.$transaction([
		db.cashier.findMany({
			where: {
				organizationId: orgId,
				...where,
				closedAt: { not: null, gte: createdAt?.gte, lte: createdAt?.lte },
			},
			orderBy: { closedAt: 'desc' },
			include: {
				subOrganization: { select: { name: true } },
				closedBy: { select: { name: true } },
				openedBy: { select: { name: true } },
			},
			...queryPositionData,
		}),
		db.cashier.count({
			where: { organizationId: orgId, ...where, closedAt: { not: null } },
		}),
		db.subOrganization.findMany({
			where: { organizationId: orgId, deletedAt: null },
			select: { id: true, name: true },
		}),
	]);

	const report = cashiers.map(cashier => {
		const totalBySystem =
			cashier.totalBySystemCard +
			cashier.totalBySystemCash +
			cashier.totalBySystemTransfer +
			cashier.totalBySystemLoan;

		return {
			id: cashier.id,
			name: cashier.subOrganization.name,
			totalBySystem,
			totalBySystemCard: cashier.totalBySystemCard,
			totalBySystemCash: cashier.totalBySystemCash,
			totalBySystemTransfer: cashier.totalBySystemTransfer,
			totalBySystemLoan: cashier.totalBySystemLoan,
		};
	});
	const totals = report.reduce(
		(acc, cashier) => {
			acc.totalBySystem += cashier.totalBySystem;
			acc.totalBySystemCard += cashier.totalBySystemCard;
			acc.totalBySystemCash += cashier.totalBySystemCash;
			acc.totalBySystemTransfer += cashier.totalBySystemTransfer;
			acc.totalBySystemLoan += cashier.totalBySystemLoan;
			return acc;
		},
		{
			totalBySystem: 0,
			totalBySystemCard: 0,
			totalBySystemCash: 0,
			totalBySystemTransfer: 0,
			totalBySystemLoan: 0,
		},
	);

	const rateOfTheDay = cashiers[0]?.rateOfTheDay || 0;

	return {
		cashiers,
		lastPage: getLastPage(queryPositionData, count),
		subOrganizations,
		startDate: searchParams.get('start'),
		endDate: searchParams.get('end'),
		report,
		totals,
		rateOfTheDay,
	};
}

export default function Component() {
	return (
		<div>
			<PrintableContent>
				<CashiersReport />
			</PrintableContent>

			<NonPrintableContent>
				<Cashiers />
			</NonPrintableContent>
		</div>
	);
}

function Cashiers() {
	const { cashiers, lastPage, subOrganizations } =
		useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<div className="flex flex-col md:flex-row gap-4 justify-between md:items-end mb-4">
				<div className="flex-1">
					<h2 className="mb-1">Cajeros</h2>
					<p className="text-gray-500 text-sm leading-none">
						Historial de todos los cajeros
					</p>
				</div>

				<div className="flex gap-4 flex-wrap">
					<LinkButton to="/invoices/pos/new" variant="black">
						<i className="ri-add-line"></i>
						Abrir cajero
					</LinkButton>

					<PrintInvoiceButton text="Imprimir reporte" />
				</div>
			</div>

			<div className="mb-4">
				<div className="mb-4 flex justify-end">
					<div className="max-w-max">
						<DateRangeFilter />
					</div>
				</div>

				<FiltersProvider>
					<div className="flex gap-4 flex-wrap">
						<MultiSelect
							label="Sucursal"
							name="subOrganizationId"
							items={subOrganizations}
						/>
					</div>
				</FiltersProvider>
			</div>

			<div className="rounded border border-gray-200 shadow-sm mb-4 text-sm">
				<Table>
					<TableHead>
						<TableHeadCell>No.</TableHeadCell>
						<TableHeadCell>Sucursal</TableHeadCell>
						<TableHeadCell className="whitespace-nowrap">
							Fecha apertura
						</TableHeadCell>
						<TableHeadCell className="whitespace-nowrap">
							Fecha cierre
						</TableHeadCell>
						<TableHeadCell>Vendido</TableHeadCell>
						<TableHeadCell className="whitespace-nowrap">
							Ingresado por usuario
						</TableHeadCell>
						<TableHeadCell></TableHeadCell>
					</TableHead>
					<TableBody>
						{cashiers.map(cashier => (
							<TableRow key={cashier.id}>
								<TableCell className="text-sm">
									<LinkWithCurrentSearch to={`${cashier.id}`}>
										{cashier.internalId}
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="whitespace-nowrap">
									<LinkWithCurrentSearch to={`${cashier.id}`}>
										{cashier.subOrganization.name}
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${cashier.id}`}>
										<DateWithTime date={cashier.createdAt!} />
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${cashier.id}`}>
										{cashier.closedAt ? (
											<DateWithTime date={cashier.closedAt} />
										) : null}
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${cashier.id}`}>
										$
										{formatCurrency(
											cashier.totalBySystemCard +
												cashier.totalBySystemCash +
												cashier.totalBySystemTransfer +
												cashier.totalBySystemLoan,
										)}
									</LinkWithCurrentSearch>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<LinkWithCurrentSearch to={`${cashier.id}`}>
										$
										{formatCurrency(
											cashier.totalByUserCard +
												cashier.totalByUserCash +
												cashier.totalByUserTransfer +
												cashier.totalByUserLoan,
										)}
									</LinkWithCurrentSearch>
								</TableCell>
								<td>
									<LinkWithCurrentSearch
										to={`${cashier.id}`}
										className="p-2 flex gap-2 text-sm hover:text-primary-700 group whitespace-nowrap"
									>
										<span className="group-hover:underline">Ver cajero</span>
										<i className="ri-arrow-right-line"></i>
									</LinkWithCurrentSearch>
								</td>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<Pagination lastPage={lastPage} />
		</PageWrapper>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con los cajeros. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}

function CashiersReport() {
	let { report, startDate, endDate, totals, rateOfTheDay } =
		useLoaderData<typeof loader>();
	const { isForeignCountry } = useIsForeignCountry();

	const rate = rateOfTheDay || 1;

	const newReport = report.map(cashier => {
		const totalInTransferInUsd = isForeignCountry
			? cashier.totalBySystemTransfer / rate
			: cashier.totalBySystemTransfer;
		const totalInCardInUsd = isForeignCountry
			? cashier.totalBySystemCard / rate
			: cashier.totalBySystemCard;

		return {
			...cashier,
			totalInCardInUsd,
			totalInTransferInUsd,
			totalBySystem:
				totalInCardInUsd + cashier.totalBySystemCash + totalInTransferInUsd,
		};
	});

	const totalInTransferInUsd = isForeignCountry
		? totals.totalBySystemTransfer / rate
		: totals.totalBySystemTransfer;
	const totalInCardInUsd = isForeignCountry
		? totals.totalBySystemCard / rate
		: totals.totalBySystemCard;

	totals.totalBySystem =
		totalInCardInUsd + totals.totalBySystemCash + totalInTransferInUsd;

	return (
		<div className="bg-white">
			<OrganizationInfo text="Reporte de cajeros" />

			<Separator />

			<div className="text-xs children:leading-4">
				<DateString>
					<p>Desde: {formatDate(startDate!)}</p>
					<p>Hasta: {formatDate(endDate!)}</p>
				</DateString>

				{isForeignCountry ? (
					<p>Tasa del día: ${rateOfTheDay}bs = $1 USD</p>
				) : null}
			</div>

			<Separator />

			<section className="text-sm leading-4">
				<div className="pl-2 flex flex-col gap-2 mb-2">
					{newReport.map(cashier => (
						<div key={cashier.id} className="pb-2 border-b border-black">
							<p className="mb-1 font-bold text-base underline">
								{cashier.name}
							</p>
							<ul className="pl-2 list-disc text-sm">
								<li className="flex gap-2">
									<strong className="font-medium">Efectivo:</strong>
									<Price value={cashier.totalBySystemCash} />
								</li>
								<li className="flex gap-2">
									<strong className="font-medium">Transferencias:</strong>
									<Price
										value={cashier.totalBySystemTransfer}
										altValue={cashier.totalInTransferInUsd}
									/>
								</li>
								<li className="flex gap-2">
									<strong className="font-medium">Datáfono:</strong>
									<Price
										value={cashier.totalBySystemCard}
										altValue={cashier.totalInCardInUsd}
									/>
								</li>

								<li className="flex gap-2 text-base">
									<strong className="font-medium">Total:</strong>

									<Price value={cashier.totalBySystem} className="font-bold" />
								</li>
							</ul>
						</div>
					))}
				</div>

				<div className="text-base">
					<div className="flex items-center gap-2">
						<span className="font-bold">Total efectivo:</span>
						<Price value={totals.totalBySystemCash} />
					</div>

					<div className="flex items-center gap-2">
						<span className="font-bold">Total transferencias :</span>
						<Price
							value={totals.totalBySystemTransfer}
							altValue={totalInTransferInUsd}
						/>
					</div>

					<div className="flex items-center gap-2">
						<span className="font-bold">Total datáfono:</span>
						<Price
							value={totals.totalBySystemCard}
							altValue={totalInCardInUsd}
						/>
					</div>

					<div className="flex items-center gap-2 text-lg">
						<span className="font-bold">TOTAL:</span>
						<Price value={totals.totalBySystem} className="font-bold" />
					</div>
				</div>
			</section>

			<BillFooter text="Reporte generado por Villing" />
		</div>
	);
}

function Price({
	className,
	value,
	altValue,
}: {
	className?: string;
	value: number;
	altValue?: number;
}) {
	const { isForeignCountry } = useIsForeignCountry();

	return (
		<p className={className}>
			${formatCurrency(value)}
			{isForeignCountry && altValue
				? ` Bs ($${formatCurrency(altValue)} USD)`
				: null}
			{isForeignCountry && !altValue ? ' USD' : null}
		</p>
	);
}
