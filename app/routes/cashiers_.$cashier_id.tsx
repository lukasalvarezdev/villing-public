import {
	json,
	type MetaFunction,
	type LoaderFunctionArgs,
} from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { RouteErrorBoundary } from '~/components/error-boundary';
import { Input, Label } from '~/components/form-utils';
import {
	NonPrintableContent,
	PrintableContent,
} from '~/components/printable-content';
import { Box, PageWrapper, TwoColumnsDiv } from '~/components/ui-library';
import {
	PageHeading,
	PrintInvoiceButton,
} from '~/modules/invoice/invoice-page-components';
import { getOrgDbClient } from '~/utils/db.server';
import {
	cn,
	formatCurrency,
	formatDate,
	formatHours,
	invariant,
} from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: 'Detalles del cajero - Villing' },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.cashier_id, 'Missing cashier_id param');

	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const cashier = await db.cashier.findFirstOrThrow({
		where: { id: parseInt(params.cashier_id), organizationId: orgId },
		include: {
			closedBy: { select: { name: true } },
			subOrganization: { select: { name: true } },
		},
	});

	const totalBySystem =
		cashier.totalBySystemCard +
		cashier.totalBySystemCash +
		cashier.totalBySystemTransfer +
		cashier.totalBySystemLoan;
	const totalByUser =
		cashier.totalByUserCard +
		cashier.totalByUserCash +
		cashier.totalByUserTransfer +
		cashier.totalByUserLoan;

	const totalDiff = totalByUser - totalBySystem;
	const totalDiffCash = cashier.totalByUserCash - cashier.totalBySystemCash;
	const totalDiffTransfers =
		cashier.totalByUserTransfer - cashier.totalBySystemTransfer;
	const totalDiffCard = cashier.totalByUserCard - cashier.totalBySystemCard;
	const totalDiffLoan = cashier.totalByUserLoan - cashier.totalBySystemLoan;
	const grandTotal = totalBySystem - cashier.totalBySystemExpenses;

	return json({
		cashier,
		totalDiff,
		totalDiffCash,
		totalDiffTransfers,
		totalDiffCard,
		grandTotal,
		totalDiffLoan,

		totalByUser,
		totalBySystem,
	});
}

export default function Component() {
	return (
		<div>
			<CashierReport />
			<NonPrintableContent>
				<PageWrapper className="max-w-screen-lg">
					<PageHeading
						backLink="/cashiers"
						backLinkText="Volver a todos los cajeros"
					>
						<PrintInvoiceButton text="Imprimir reporte" />
					</PageHeading>

					<h5 className="mb-4">Detalles de cajero</h5>
					<Cashier />
				</PageWrapper>
			</NonPrintableContent>
		</div>
	);
}

function Cashier() {
	const {
		cashier,
		grandTotal,
		totalDiff,
		totalDiffCard,
		totalDiffCash,
		totalDiffTransfers,
		totalBySystem,
		totalByUser,
		totalDiffLoan,
	} = useLoaderData<typeof loader>();

	if (!cashier.closedAt) return null;

	return (
		<div className="flex flex-col-reverse md:flex-row gap-6">
			<div className="flex-1">
				<div className="rounded-md p-4 flex flex-col gap-2 border border-gray-200 shadow-sm mb-4">
					<div className="flex gap-4 items-center">
						<i className="ri-wallet-line text-xl"></i>
						<p className="font-bold">Gran total</p>
					</div>

					<TwoColumnsDiv>
						<div>
							<Label>Reportado por el usuario</Label>
							<Input value={`$${formatCurrency(totalByUser)}`} readOnly />
						</div>
						<div>
							<Label>Reportado por el sistema</Label>
							<Input value={`$${formatCurrency(totalBySystem)}`} readOnly />
						</div>
					</TwoColumnsDiv>

					<DiffRow diff={totalDiff} />
				</div>

				<div className="rounded-md p-4 flex flex-col gap-2 border border-gray-200 shadow-sm mb-4">
					<div className="flex gap-4 items-center">
						<i className="ri-wallet-line text-xl"></i>
						<p className="font-bold">Efectivo</p>
					</div>

					<TwoColumnsDiv>
						<div>
							<Label>Reportado por el usuario</Label>
							<Input
								value={`$${formatCurrency(cashier.totalByUserCash)}`}
								readOnly
							/>
						</div>
						<div>
							<Label>Reportado por el sistema</Label>
							<Input
								value={`$${formatCurrency(cashier.totalBySystemCash)}`}
								readOnly
							/>
						</div>
					</TwoColumnsDiv>

					<DiffRow diff={totalDiffCash} />
				</div>

				<div className="rounded-md p-4 flex flex-col gap-2 border border-gray-200 shadow-sm mb-4">
					<div className="flex gap-4 items-center">
						<i className="ri-bank-line text-xl"></i>
						<p className="font-bold">Transferencias</p>
					</div>

					<TwoColumnsDiv>
						<div>
							<Label>Reportado por el usuario</Label>
							<Input
								value={`$${formatCurrency(cashier.totalByUserTransfer)}`}
								readOnly
							/>
						</div>
						<div>
							<Label>Reportado por el sistema</Label>
							<Input
								value={`$${formatCurrency(cashier.totalBySystemTransfer)}`}
								readOnly
							/>
						</div>
					</TwoColumnsDiv>

					<DiffRow diff={totalDiffTransfers} />
				</div>

				<div className="rounded-md p-4 flex flex-col gap-2 border border-gray-200 shadow-sm mb-4">
					<div className="flex gap-4 items-center">
						<i className="ri-bank-card-line text-xl"></i>
						<p className="font-bold">Datáfono</p>
					</div>

					<TwoColumnsDiv>
						<div>
							<Label>Reportado por el usuario</Label>
							<Input
								value={`$${formatCurrency(cashier.totalByUserCard)}`}
								readOnly
							/>
						</div>
						<div>
							<Label>Reportado por el sistema</Label>
							<Input
								value={`$${formatCurrency(cashier.totalBySystemCard)}`}
								readOnly
							/>
						</div>
					</TwoColumnsDiv>

					<DiffRow diff={totalDiffCard} />
				</div>

				<div className="rounded-md p-4 flex flex-col gap-2 border border-gray-200 shadow-sm">
					<div className="flex gap-4 items-center">
						<i className="ri-bank-card-line text-xl"></i>
						<p className="font-bold">Entidad crediticia</p>
					</div>

					<TwoColumnsDiv>
						<div>
							<Label>Reportado por el usuario</Label>
							<Input
								value={`$${formatCurrency(cashier.totalByUserLoan)}`}
								readOnly
							/>
						</div>
						<div>
							<Label>Reportado por el sistema</Label>
							<Input
								value={`$${formatCurrency(cashier.totalBySystemLoan)}`}
								readOnly
							/>
						</div>
					</TwoColumnsDiv>

					<DiffRow diff={totalDiffLoan} />
				</div>
			</div>

			<div>
				<Box>
					<h5 className="mb-4">Información</h5>

					<TwoColumnsDiv className="mb-4">
						<div>
							<Label>Fecha de apertura</Label>
							<Input
								value={`${formatDate(cashier.createdAt)} ${formatHours(
									cashier.createdAt,
								)}`}
								readOnly
							/>
						</div>
						<div>
							<Label>Fecha de cierre</Label>
							<Input
								value={`${formatDate(cashier.closedAt)} ${formatHours(
									cashier.closedAt,
								)}`}
								readOnly
							/>
						</div>
					</TwoColumnsDiv>

					<Label>Sucursal del cajero</Label>
					<Input
						value={cashier.subOrganization.name}
						readOnly
						className="mb-4"
					/>

					<Label>Reponsable del cierre</Label>
					<Input
						value={cashier.closedBy?.name || 'No disponible'}
						readOnly
						className="mb-4"
					/>

					<div className="border-t border-gray-200 pt-4 text-sm flex flex-col gap-2">
						<h5>Totales reportados por el sistema</h5>

						<div className="flex justify-between gap-4">
							<p>Facturas anuladas ({cashier.canceledSalesCount})</p>
							<p className="font-medium">
								${formatCurrency(cashier.totalCanceledIncome)}
							</p>
						</div>

						<div className="flex justify-between gap-4">
							<p>Subtotal</p>
							<p className="font-medium">${formatCurrency(totalBySystem)}</p>
						</div>

						<div className="flex justify-between gap-4">
							<p>Gastos</p>
							<p className="font-medium">
								-${formatCurrency(cashier.totalBySystemExpenses)}
							</p>
						</div>

						<div className="flex justify-between gap-4 pt-4 mt-2 border-t border-gray-200">
							<p>Total</p>
							<p className="font-bold text-xl">${formatCurrency(grandTotal)}</p>
						</div>
					</div>
				</Box>
			</div>
		</div>
	);
}

function DiffRow({ diff }: { diff: number }) {
	if (diff === 0) return null;

	return (
		<div className="flex justify-end items-center gap-2">
			<p className="text-sm font-medium">Diferencia:</p>
			<p
				className={cn(
					'font-bold',
					diff > 0 ? 'text-success-600' : 'text-error-600',
				)}
			>
				${formatCurrency(diff)}
			</p>
		</div>
	);
}

function CashierReport() {
	const { cashier, grandTotal, totalDiff, totalBySystem, totalByUser } =
		useLoaderData<typeof loader>();

	return (
		<PrintableContent>
			<p className="font-bold text-xs mb-3">Reporte del día</p>
			<div className="leading-4 pb-2 border-b border-black border-dotted mb-2">
				<p>
					<strong>Apertura </strong>
					<span>
						{formatDate(cashier.createdAt)} {formatHours(cashier.createdAt)}
					</span>
				</p>
				<p>
					<strong>Cierre </strong>
					<span>
						{formatDate(cashier.closedAt!)} {formatHours(cashier.closedAt!)}
					</span>
				</p>
			</div>

			<div className="leading-4 pb-2 border-b border-black mb-4">
				<p>
					<strong>Sucursal </strong>
					<span>{cashier.subOrganization.name}</span>
				</p>
				<p>
					<strong>Cerró </strong>
					<span>{cashier.closedBy?.name || 'No disponible'}</span>
				</p>
			</div>

			<table className="mx-auto w-full table-auto border-b border-black border-dotted">
				<thead>
					<tr className="text-left children:pb-1 children:font-normal border-b border-black">
						<th>ITEM</th>
						<th className="pl-1">USUARIO</th>
						<th className="pl-1">SISTEMA</th>
					</tr>
				</thead>

				<tbody className="text-[9px]">
					<TableRow
						concept="Efectivo"
						user={cashier.totalByUserCash}
						system={cashier.totalBySystemCash}
					/>
					<TableRow
						concept="Transf."
						user={cashier.totalByUserTransfer}
						system={cashier.totalBySystemTransfer}
					/>
					<TableRow
						concept="Datáfono"
						user={cashier.totalByUserCard}
						system={cashier.totalBySystemCard}
					/>
					<TableRow
						concept="Entidad crediticia"
						user={cashier.totalByUserLoan}
						system={cashier.totalBySystemLoan}
					/>
					<TableRow concept="Total" user={totalByUser} system={totalBySystem} />
				</tbody>
			</table>

			<div className="flex justify-end pt-2 gap-6">
				<div className="flex flex-col">
					<div
						className={cn(
							'border-b border-dotted border-gray-400 pr-2',
							'flex justify-between items-center gap-4',
						)}
					>
						<p>Facturas anuladas ({cashier.canceledSalesCount})</p>
						<p>${formatCurrency(cashier.totalCanceledIncome)}</p>
					</div>

					<div
						className={cn(
							'border-b border-dotted border-gray-400 pr-2',
							'flex justify-between items-center gap-4',
						)}
					>
						<p>Subtotal</p>
						<p>${formatCurrency(totalBySystem)}</p>
					</div>

					<div
						className={cn(
							'border-b border-dotted border-gray-400 pr-2',
							'flex justify-between items-center gap-4',
						)}
					>
						<p>Gastos</p>
						<p>${formatCurrency(cashier.totalBySystemExpenses)}</p>
					</div>

					<div className="flex justify-between items-center pr-2">
						<p>Diferencia</p>
						<p>${formatCurrency(totalDiff)}</p>
					</div>

					<div className="flex justify-between items-center h-full border-y border-black">
						<p className="font-bold">TOTAL</p>

						<p
							className={cn(
								'font-bold text-xs bg-black text-white h-full',
								'flex items-center pr-2 pl-6',
							)}
						>
							${formatCurrency(grandTotal)}
						</p>
					</div>
				</div>
			</div>
		</PrintableContent>
	);
}

function TableRow({
	concept,
	user,
	system,
}: {
	concept: string;
	user: number;
	system: number;
}) {
	return (
		<tr
			className={cn(
				'text-left align-center border-b border-gray-400 border-dotted',
				'last:border-b-0 last:border-dotted-0 even:bg-gray-50',
			)}
		>
			<td className="leading-4">{concept}</td>
			<td className="pl-1">${formatCurrency(user)}</td>
			<td className="pl-1">${formatCurrency(system)}</td>
		</tr>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con el cajero. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}
