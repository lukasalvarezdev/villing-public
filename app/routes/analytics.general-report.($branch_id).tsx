import { Prisma } from '@prisma/client';
import { type LoaderFunctionArgs } from '@remix-run/node';
import {
	type MetaFunction,
	redirect,
	useLoaderData,
	useParams,
	useNavigate,
} from '@remix-run/react';
import * as z from 'zod';
import { Label, LinkButton, Select, Toast } from '~/components/form-utils';
import {
	Box,
	SidebarContainer,
	WithSidebarUIContainer,
} from '~/components/ui-library';
import { type PrismaClient, getOrgDbClient } from '~/utils/db.server';
import {
	cn,
	formatCurrency,
	getSearchParamsWithDefaultDateRange,
	toNumber,
} from '~/utils/misc';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: `Reporte detallado - Villing` },
];

export async function loader({ params, request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const branch_id = params.branch_id ? toNumber(params.branch_id) : undefined;
	const searchParams = getSearchParamsWithDefaultDateRange(request);
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

	const branches = await db.subOrganization.findMany({
		where: {
			organizationId: orgId,
			deletedAt: null,
			id: { in: user.allowedSubOrgs.map(x => x.id) },
		},
		select: { id: true, name: true },
	});

	if (branch_id && !branches.some(branch => branch.id === branch_id)) {
		return redirect('/analytics/detailed-report');
	}

	const allowedBranchesArray = branch_id
		? [branch_id]
		: user.allowedSubOrgs.map(x => x.id);

	const args = {
		db,
		orgId,
		searchParams,
		allowedSubOrgs: allowedBranchesArray,
	};
	const filters = queryBuilder(searchParams, ['createdAt']);

	const [
		expenses,
		posPaymentForms,
		remisionPaymentForms,
		electronicInvoicePaymentForms,
		purchaseInvoicedebtSum,
		purchaseRemisionDebtSum,
		legalClientsDebtSum,
		remisionClientsDebtSum,
		...values
	] = await db.$transaction([
		db.expense.aggregate({
			where: {
				subOrg: {
					id: branch_id ? branch_id : { in: allowedBranchesArray },
					organizationId: orgId,
				},
				createdAt: { gte: filters.createdAt.gte, lte: filters.createdAt.lte },
			},
			_sum: { amount: true },
		}),
		getPosPaymentForms(),
		getRemisionPaymentForms(),
		getElectronicInvoicePaymentForms(),
		db.purchaseInvoice.aggregate({
			where: {
				organizationId: orgId,
				type: 'loan',
				pending: { gt: 1 },
				subOrganizationId: { in: allowedBranchesArray },
				canceledAt: null,
			},
			_sum: { pending: true },
		}),
		db.purchaseRemision.aggregate({
			where: {
				organizationId: orgId,
				type: 'loan',
				pending: { gt: 1 },
				subOrganizationId: { in: allowedBranchesArray },
				canceledAt: null,
			},
			_sum: { pending: true },
		}),
		db.legalInvoice.aggregate({
			where: {
				organizationId: orgId,
				type: 'loan',
				pending: { gt: 1 },
				subOrganizationId: { in: allowedBranchesArray },
				cufe: { not: null },
			},
			_sum: { pending: true },
		}),
		db.legalInvoiceRemision.aggregate({
			where: {
				organizationId: orgId,
				type: 'loan',
				pending: { gt: 1 },
				subOrganizationId: { in: allowedBranchesArray },
				canceledAt: null,
			},
			_sum: { pending: true },
		}),
		getSalesSumThisMonth(args),
		getPurchasesSumThisMonth(args),
	]);

	const data = parseQueriesResults();

	const paymentForms = getPaymentForms();
	const salesInCard = paymentForms
		.filter(payment => payment.type === 'card')
		.reduce((acc, curr) => acc + curr.amount, 0);
	const salesInLoan = paymentForms
		.filter(payment => payment.type === 'loan')
		.reduce((acc, curr) => acc + curr.amount, 0);
	const salesInTransfer = paymentForms
		.filter(payment => payment.type === 'transfer')
		.reduce((acc, curr) => acc + curr.amount, 0);

	const salesInCash = data.sales - salesInCard - salesInTransfer - salesInLoan;

	return {
		branches,
		data: {
			...data,
			expenses: toNumber(expenses._sum.amount),
			salesInCash,
			salesInCard,
			salesInTransfer,
			salesInLoan,
		},
	};

	function parseQueriesResults() {
		const [sales, purchases] = values;
		const result = schema.parse({ purchases, sales });

		return {
			debt:
				toNumber(legalClientsDebtSum._sum.pending) +
				toNumber(remisionClientsDebtSum._sum.pending),
			owedDebt:
				toNumber(purchaseInvoicedebtSum._sum.pending) +
				toNumber(purchaseRemisionDebtSum._sum.pending),
			sales: result.sales.reduce(
				(acc, curr) =>
					acc +
					toNumber(curr.total) +
					toNumber(curr.subtotal) +
					toNumber(curr.tax),
				0,
			),
			purchases: result.purchases.reduce(
				(acc, curr) => acc + toNumber(curr.total),
				0,
			),
		};
	}

	function getPaymentForms() {
		return [
			...posPaymentForms,
			...remisionPaymentForms,
			...electronicInvoicePaymentForms,
		].map(payment => ({
			type: payment.type,
			amount: toNumber(payment._sum.amount),
		}));
	}

	function getPosPaymentForms() {
		return db.legalPosInvoicePaymentForm.groupBy({
			orderBy: { type: 'asc' },
			by: ['type'],
			where: {
				legalPosInvoice: {
					createdAt: { gte: filters.createdAt.gte, lte: filters.createdAt.lte },
					subOrganizationId: { in: allowedBranchesArray },
					canceledAt: null,
				},
				type: { not: 'cash' },
			},
			_sum: { amount: true },
		});
	}

	function getRemisionPaymentForms() {
		return db.legalInvoiceRemisionPaymentForm.groupBy({
			orderBy: { type: 'asc' },
			by: ['type'],
			where: {
				legalInvoiceRemision: {
					createdAt: { gte: filters.createdAt.gte, lte: filters.createdAt.lte },
					subOrganizationId: { in: allowedBranchesArray },
					canceledAt: null,
				},
				type: { not: 'cash' },
			},
			_sum: { amount: true },
		});
	}

	function getElectronicInvoicePaymentForms() {
		return db.legalInvoicePaymentForm.groupBy({
			orderBy: { type: 'asc' },
			by: ['type'],
			where: {
				legalInvoice: {
					createdAt: { gte: filters.createdAt.gte, lte: filters.createdAt.lte },
					subOrganizationId: { in: allowedBranchesArray },
					cufe: { not: null },
				},
				type: { not: 'cash' },
			},
			_sum: { amount: true },
		});
	}
}

const schema = z.object({
	sales: z.array(
		z.object({
			total: z.number().nullable(),
			subtotal: z.number().nullable(),
			tax: z.number().nullable(),
		}),
	),
	purchases: z.array(z.object({ total: z.number().nullable() })),
});

export default function Component() {
	const { branch_id } = useParams();
	const { branches } = useLoaderData<typeof loader>();
	const activeBranch = branches.find(
		branch => branch.id === toNumber(branch_id),
	);

	return (
		<WithSidebarUIContainer className="flex flex-col lg:flex-row">
			<Sidebar />

			<div className="flex-1">
				<h3>{activeBranch?.name || 'Todas las sucursales'}</h3>
				<p className="text-gray-500 mb-6">
					Reporte detallado de ventas de{' '}
					{activeBranch
						? `la sucursal ${activeBranch.name}`
						: 'todas las sucursales'}
				</p>

				<Sales />
				<Purchases />
			</div>
		</WithSidebarUIContainer>
	);
}

function Sales() {
	const {
		data: { sales, debt },
	} = useLoaderData<typeof loader>();

	return (
		<Box className="p-6 border-gray-100 shadow-sm flex flex-col lg:flex-row gap-4 lg:gap-6 mb-6">
			<div className="flex-1 lg:border-r border-b pb-4 lg:pb-0 lg:border-b-0 border-gray-200">
				<h4>Ventas</h4>
				<p className="text-gray-500 text-sm mb-4">
					Detalle de tus ventas realizadas en el periodo seleccionado.
				</p>

				<div className="flex flex-col md:flex-row gap-4 md:gap-0 children:flex-1">
					<div
						className={cn(
							'md:pr-4 md:border-r border-gray-200',
							'pb-4 border-b md:border-b-0 md:pb-0',
						)}
					>
						<span
							className={cn(
								'mb-4 grid place-items-center w-7 h-7 bg-gray-50 border border-gray-100 rounded-full',
								'text-sm text-gray-500',
							)}
						>
							<i className="ri-arrow-up-down-line"></i>
						</span>
						<p className="text-xs text-gray-400">Ventas totales</p>
						<p className="text-2xl font-bold mb-2">${formatCurrency(sales)}</p>
						<Toast
							variant="info"
							className="px-2 py-1 text-xs text-gray-500 max-w-max"
						>
							En el periodo seleccionado
						</Toast>
					</div>

					<div className="md:pl-4 md:border-l border-transparent">
						<span
							className={cn(
								'mb-4 grid place-items-center w-7 h-7 bg-gray-50 border border-gray-100 rounded-full',
								'text-sm text-gray-500',
							)}
						>
							<i className="ri-wallet-line"></i>
						</span>
						<p className="text-xs text-gray-400">Cuentas por cobrar</p>
						<p className="text-2xl font-bold mb-2">${formatCurrency(debt)}</p>
						<Toast
							variant="info"
							className="px-2 py-1 text-xs text-gray-500 max-w-max"
						>
							Desde el inicio de operaciones
						</Toast>
					</div>
				</div>
			</div>

			<div className="lg:w-1/3">
				<h4>Ventas por categoría</h4>
				<p className="text-gray-500 text-sm mb-4">
					Detalle de los métodos de pago.
				</p>
				<SalesByCategory />
			</div>
		</Box>
	);
}

function Purchases() {
	const {
		data: { purchases, owedDebt, expenses },
	} = useLoaderData<typeof loader>();

	return (
		<Box className="p-6 border-gray-100 shadow-sm">
			<h4>Compras y gastos</h4>
			<p className="text-gray-500 text-sm mb-4">
				Detalle de tus compras y gastos realizadas en el periodo seleccionado.
			</p>

			<div className="flex flex-col lg:flex-row children:flex-1 gap-4">
				<div
					className={cn(
						'lg:pr-4 lg:border-r border-gray-200',
						'pb-4 border-b lg:pb-0 lg:border-b-0',
					)}
				>
					<span
						className={cn(
							'mb-4 grid place-items-center w-7 h-7 bg-gray-50 border border-gray-100 rounded-full',
							'text-sm text-gray-500',
						)}
					>
						<i className="ri-arrow-up-down-line"></i>
					</span>
					<p className="text-xs text-gray-400">Compras totales</p>
					<p className="text-2xl font-bold mb-2">
						${formatCurrency(purchases)}
					</p>
					<Toast
						variant="info"
						className="px-2 py-1 text-xs text-gray-500 max-w-max"
					>
						En el periodo seleccionado
					</Toast>
				</div>

				<div
					className={cn(
						'md:pr-4 lg:border-r border-gray-200',
						'pb-4 border-b lg:pb-0 lg:border-b-0',
					)}
				>
					<span
						className={cn(
							'mb-4 grid place-items-center w-7 h-7 bg-gray-50 border border-gray-100 rounded-full',
							'text-sm text-gray-500',
						)}
					>
						<i className="ri-wallet-line"></i>
					</span>
					<p className="text-xs text-gray-400">Cuentas por pagar</p>
					<p className="text-2xl font-bold mb-2">${formatCurrency(owedDebt)}</p>
					<Toast
						variant="info"
						className="px-2 py-1 text-xs text-gray-500 max-w-max"
					>
						Desde el inicio de operaciones
					</Toast>
				</div>

				<div>
					<span
						className={cn(
							'mb-4 grid place-items-center w-7 h-7 bg-gray-50 border border-gray-100 rounded-full',
							'text-sm text-gray-500',
						)}
					>
						<i className="ri-treasure-map-line"></i>
					</span>
					<p className="text-xs text-gray-400">Gastos totales</p>
					<p className="text-2xl font-bold mb-2">${formatCurrency(expenses)}</p>
					<Toast
						variant="info"
						className="px-2 py-1 text-xs text-gray-500 max-w-max"
					>
						En el periodo seleccionado
					</Toast>
				</div>
			</div>
		</Box>
	);
}

function Sidebar() {
	const { branch_id } = useParams();
	const { branches } = useLoaderData<typeof loader>();
	const activeBranch = branches.find(
		branch => branch.id === toNumber(branch_id),
	);
	const navigate = useNavigate();

	return (
		<SidebarContainer>
			<nav className="flex-col gap-1 hidden lg:flex">
				<LinkButton
					to="/analytics/general-report"
					className={cn(
						'justify-start font-medium',
						!activeBranch && 'bg-gray-100',
					)}
					variant="ghost"
					prefetch="intent"
				>
					Todas las sucursales
				</LinkButton>
				{branches.map(branch => (
					<LinkButton
						to={`/analytics/general-report/${branch.id}`}
						className={cn(
							'justify-start font-medium',
							branch.id === activeBranch?.id && 'bg-gray-100',
						)}
						variant="ghost"
						key={branch.id}
						prefetch="intent"
					>
						{branch.name}
					</LinkButton>
				))}
			</nav>

			<div className="lg:hidden w-full flex-1">
				<Label htmlFor="branch_id">Sucursal</Label>
				<Select
					id="branch_id"
					className="w-1/2"
					value={branch_id}
					onChange={e => {
						navigate(`/analytics/general-report/${e.target.value}`);
					}}
					options={[
						{ label: 'Todas las sucursales', value: '' },
						...branches.map(branch => ({
							label: `Reporte de ${branch.name}`,
							value: branch.id,
						})),
					]}
				/>
			</div>
		</SidebarContainer>
	);
}

const colors = ['#1ABC9C', '#0B5345', '#9B59B6', '#8E44AD'];

function SalesByCategory() {
	const {
		data: { salesInCard, salesInCash, salesInTransfer, salesInLoan },
	} = useLoaderData<typeof loader>();

	function getPercentage(value: number) {
		return (
			(value / (salesInCard + salesInTransfer + salesInCash + salesInLoan)) *
			100
		);
	}

	const cashPercentage = getPercentage(salesInCash);
	const cardPercentage = getPercentage(salesInCard);
	const transferPercentage = getPercentage(salesInTransfer);
	const loanPercentage = getPercentage(salesInLoan);

	const categories = [
		{ id: 1, name: 'Efectivo', percentage: cashPercentage, total: salesInCash },
		{
			id: 2,
			name: 'Transferencias',
			percentage: transferPercentage,
			total: salesInTransfer,
		},
		{ id: 3, name: 'Datáfono', percentage: cardPercentage, total: salesInCard },
		{
			id: 4,
			name: 'Entidad crediticia',
			percentage: loanPercentage,
			total: salesInLoan,
		},
	];

	return (
		<div>
			<span className="h-2 flex items-center rounded overflow-hidden mb-4 gap-0.5">
				{categories.map((category, index) => (
					<span
						key={category.id}
						className="h-2"
						style={{
							backgroundColor: colors[index],
							width: `${category.percentage}%`,
						}}
					></span>
				))}
			</span>

			<div className="flex flex-col gap-2">
				{categories.map((category, index) => (
					<div
						className="flex gap-4 justify-between items-center"
						key={category.id}
					>
						<div className="flex gap-2 items-center">
							<span
								className="h-3 w-3 rounded-full"
								style={{ backgroundColor: colors[index] }}
							></span>
							<p className="text-sm">{category.name}</p>
						</div>

						<p className="font-bold">${formatCurrency(category.total)}</p>
					</div>
				))}
			</div>
		</div>
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
			CAST(SUM(total) AS int) as total,
			CAST(SUM(subtotal) AS int) as subtotal,
			CAST(SUM("totalTax") AS int) as tax
		FROM (
				SELECT total, 0 as subtotal, 0 as "totalTax"
				FROM public."LegalPosInvoice"
				WHERE "organizationId" = ${orgId}
						AND "createdAt" >= ${filters.createdAt.gte}
						AND "createdAt" < ${filters.createdAt.lte}
						AND "canceledAt" IS NULL
						AND "subOrganizationId" IN (${Prisma.join(allowedSubOrgs)})
				UNION ALL
				SELECT 0 as total, subtotal, "totalTax"
				FROM public."LegalInvoice"
				WHERE "organizationId" = ${orgId}
						AND "createdAt" >= ${filters.createdAt.gte}
						AND "createdAt" < ${filters.createdAt.lte}
						AND cufe IS NOT NULL
						AND "subOrganizationId" IN (${Prisma.join(allowedSubOrgs)})
				UNION ALL
				SELECT 0 as total, subtotal, "totalTax"
				FROM public."LegalInvoiceRemision"
				WHERE "organizationId" = ${orgId}
						AND "createdAt" >= ${filters.createdAt.gte}
						AND "createdAt" < ${filters.createdAt.lte}
						AND "subOrganizationId" IN (${Prisma.join(allowedSubOrgs)})
						AND "canceledAt" IS NULL
		) as combined_data;
	`;
}

function getPurchasesSumThisMonth({
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
			CAST(SUM(total) AS int) as total
		FROM (
				SELECT total
				FROM public."Purchase"
				WHERE "organizationId" = ${orgId}
						AND "createdAt" >= ${filters.createdAt.gte}
						AND "createdAt" < ${filters.createdAt.lte}
						AND "canceledAt" IS NULL
						AND "subOrganizationId" IN (${Prisma.join(allowedSubOrgs)})
				UNION ALL
				SELECT total
				FROM public."PurchaseRemision"
				WHERE "organizationId" = ${orgId}
						AND "createdAt" >= ${filters.createdAt.gte}
						AND "createdAt" < ${filters.createdAt.lte}
						AND "subOrganizationId" IN (${Prisma.join(allowedSubOrgs)})
						AND "canceledAt" IS NULL
				UNION ALL
				SELECT total
				FROM public."PurchaseInvoice"
				WHERE "organizationId" = ${orgId}
						AND "createdAt" >= ${filters.createdAt.gte}
						AND "createdAt" < ${filters.createdAt.lte}
						AND "subOrganizationId" IN (${Prisma.join(allowedSubOrgs)})
						AND "canceledAt" IS NULL
		) as combined_data;
	`;
}
