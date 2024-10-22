import {
	json,
	type MetaFunction,
	type ActionFunctionArgs,
	type SerializeFrom,
} from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import {
	Box,
	GoBackLinkButton,
	PageWrapper,
	StatusBadge,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeadCell,
	TableRow,
} from '~/components/ui-library';
import {
	DatesInfo,
	DuplicateInvoiceButton,
} from '~/modules/invoice/invoice-page-components';
import { getOrgDbClient } from '~/utils/db.server';
import { formatCurrency, invariant } from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction<typeof loader> = ({ data }) => [
	{ title: `Ajuste de inventario No. ${data?.setting.count} - Villing` },
];

export async function loader({ request, params }: ActionFunctionArgs) {
	await protectRoute(request);

	invariant(params.setting_id, 'params.setting_id is required');

	const { db, orgId, userId } = await getOrgDbClient(request);

	await legalActions.validateAndThrow(db, userId, 'see_stock_settings');

	const setting = await db.inventorySetting.findUniqueOrThrow({
		where: { id: parseInt(params.setting_id), organizationId: orgId },
		include: {
			products: { include: { product: { select: { reference: true } } } },
			transferTo: { select: { name: true } },
			subOrganization: { select: { name: true } },
		},
	});

	const inventoryValue =
		setting.settingType === 'total'
			? setting.products.reduce(
					(acc, product) => acc + product.quantity * product.cost,
					0,
				)
			: null;

	return json({ setting, branch: setting.subOrganization, inventoryValue });
}

export default function Component() {
	const { setting, branch, inventoryValue } = useLoaderData<typeof loader>();
	const isTotal = setting.settingType === 'total';
	const isExit = setting.incomeOrExit === 'exit';

	return (
		<PageWrapper>
			<div className="flex justify-between gap-4 flex-wrap mb-6 items-center">
				<GoBackLinkButton to="/stock-settings" className="mb-0">
					Volver a ajustes de inventario
				</GoBackLinkButton>

				<DuplicateInvoiceButton
					moduleType="stockSetting"
					id={setting.id}
					text="Duplicar ajuste"
				/>
			</div>

			<section className="flex flex-col-reverse gap-6 lg:flex-row">
				<div className="flex-1">
					<Box className="p-0">
						<div className="flex justify-between gap-4 flex-wrap items-center p-4">
							<h4>Ajuste de inventario #{setting.count}</h4>

							<div className="flex gap-4">
								{setting.transferTo ? (
									<StatusBadge withBackground variant="info">
										Transferencia de inventario
									</StatusBadge>
								) : (
									<div className="flex gap-4">
										<StatusBadge
											withBackground
											variant={isExit ? 'warning' : 'info'}
										>
											{isExit
												? 'Egreso de inventario'
												: 'Ingreso de inventario'}
										</StatusBadge>
										<StatusBadge withBackground variant="info">
											{isTotal ? 'Inventario total' : 'Inventario parcial'}
										</StatusBadge>
									</div>
								)}
							</div>
						</div>

						<DatesInfo
							createdAt={setting.createdAt}
							expiresAt={null}
							className="border-t border-gray-200 p-4"
						>
							{setting.transferTo ? (
								<StatusBadge variant="info">
									<p>
										El stock fue transferido desde la sucursal{' '}
										<strong>{branch.name}</strong> a la sucursal{' '}
										<strong>{setting.transferTo.name}</strong>
									</p>
								</StatusBadge>
							) : (
								<StatusBadge variant="info">
									<p>
										El stock fue transferido a la sucursal{' '}
										<strong>{branch.name}</strong>
									</p>
								</StatusBadge>
							)}
						</DatesInfo>

						<h5 className="mb-4 pl-4">Artículos ajustados</h5>

						<div className="border-t border-gray-200">
							<Table className="min-w-sm w-full">
								<TableHead>
									<TableHeadCell className="pl-4">Artículo</TableHeadCell>
									<TableHeadCell>Stock ant.</TableHeadCell>
									<TableHeadCell>Stock nuevo</TableHeadCell>
									<TableHeadCell>Costo</TableHeadCell>
								</TableHead>

								<TableBody>
									{setting.products.map(product => (
										<ProductRow product={product} key={product.id} />
									))}
								</TableBody>
							</Table>
						</div>
					</Box>
				</div>

				<div className="flex-1 lg:max-w-sm">
					<Box>
						<h5 className="mb-4">Totales discriminados</h5>

						<div className="flex flex-col gap-2 text-sm">
							<div className="flex justify-between gap-4">
								<p>Cantidad de productos</p>
								<p className="font-medium">{setting.products.length}</p>
							</div>

							<div className="flex justify-between gap-4">
								<p>Stock total</p>
								<p className="font-medium">
									{setting.products.reduce(
										(acc, product) => acc + product.quantity,
										0,
									)}
								</p>
							</div>

							{inventoryValue ? (
								<div className="flex justify-between items-center gap-4 pt-4 border-t border-gray-200">
									<p>Valor del inventario</p>
									<p className="font-bold text-xl">
										${formatCurrency(inventoryValue)}
									</p>
								</div>
							) : null}
						</div>
					</Box>
				</div>
			</section>
		</PageWrapper>
	);
}

type ProductType = SerializeFrom<typeof loader>['setting']['products'][0];
function ProductRow({ product }: { product: ProductType }) {
	const { setting } = useLoaderData<typeof loader>();

	return (
		<TableRow className="border-b border-gray-200 children:align-bottom text-sm">
			<TableCell className="pl-4">
				<p className="leading-5 mb-2">{product.name}</p>
				<p className="text-xs text-gray-600">{product.product?.reference}</p>
			</TableCell>
			<StockColumn
				stock={product.lastStock}
				targetStock={setting.transferTo ? product.lastStockInTarget : undefined}
			/>
			<StockColumn
				stock={product.newStock}
				targetStock={setting.transferTo ? product.newStockInTarget : undefined}
			/>
			<TableCell>${formatCurrency(product.cost)}</TableCell>
		</TableRow>
	);
}

type StockColumnProps = {
	stock: number;
	targetStock?: number;
};
function StockColumn({ stock, targetStock }: StockColumnProps) {
	return (
		<TableCell>
			{typeof targetStock === 'number' ? (
				<div>
					<p>
						<strong className="font-medium">Origen:</strong> {stock}
					</p>
					<p>
						<strong className="font-medium">Destino:</strong> {targetStock}
					</p>
				</div>
			) : (
				<p>{stock}</p>
			)}
		</TableCell>
	);
}
