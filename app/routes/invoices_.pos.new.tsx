import {
	type MetaFunction,
	type LoaderFunctionArgs,
	type SerializeFrom,
} from '@remix-run/node';
import { Outlet, useLoaderData, useSearchParams } from '@remix-run/react';
import React from 'react';
import { LinkButton, Toast } from '~/components/form-utils';
import {
	DateWithTime,
	PageWrapper,
	StatusBadge,
} from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import { formatCurrency, toNumber } from '~/utils/misc';

export const meta: MetaFunction = () => [
	{ title: `Selecciona una sucursal - Villing` },
];

export async function loader({ request }: LoaderFunctionArgs) {
	const { db, orgId, userId } = await getOrgDbClient(request);

	const user = await db.user.findUniqueOrThrow({
		where: { id: userId },
		select: {
			allowedSubOrgs: { where: { deletedAt: null }, select: { id: true } },
		},
	});

	const branches = await db.subOrganization.findMany({
		where: {
			organizationId: orgId,
			id: { in: user.allowedSubOrgs.map(a => a.id) },
		},
		select: {
			id: true,
			name: true,
			Cashier: {
				orderBy: { createdAt: 'asc' },
				take: -1,
				select: { id: true, createdAt: true, closedAt: true },
			},
		},
	});

	const cashiersIds = branches
		.map(b => b.Cashier[0]?.id)
		.filter(Boolean) as Array<number>;

	const invoices = await db.legalPosInvoice.groupBy({
		by: ['cashierId', 'subOrganizationId'],
		where: { cashierId: { in: cashiersIds }, canceledAt: null },
		_sum: { total: true },
	});

	return {
		branches: branches.map(b => {
			const cashier = b.Cashier[0];
			const income = invoices.find(i => i.cashierId === cashier?.id)?._sum
				.total;

			return {
				id: b.id,
				name: b.name,
				cashier: cashier?.closedAt ? undefined : cashier,
				income: toNumber(income),
			};
		}),
	};
}

export default function Component() {
	const { branches } = useLoaderData<typeof loader>();
	const [searchParams, setSearchParams] = useSearchParams();
	const message =
		searchParams.get('message') === 'open_cashier'
			? 'Debes abrir el cajero para poder vender'
			: null;

	React.useEffect(() => {
		if (message) {
			setTimeout(() => {
				setSearchParams({});
			}, 10_000);
		}
	}, [message, setSearchParams]);

	return (
		<PageWrapper>
			<Outlet />

			<div className="mb-6 pb-6 border-b border-gray-200">
				<h3>Selecciona una sucursal</h3>
				<p className="text-gray-600">
					Escoge en que cajero y sucursal deseas empezar a vender
				</p>
			</div>

			{message ? (
				<Toast className="mb-6" variant="error">
					{message}
				</Toast>
			) : null}

			<ul className="flex flex-col lg:grid grid-cols-fill-96 gap-6">
				{branches.map((branch, index) => {
					const Comp = layouts[branch.cashier ? 'open' : 'closed'];

					return (
						<li key={branch.id}>
							<Comp branch={branch as any} index={index} />
						</li>
					);
				})}
			</ul>
		</PageWrapper>
	);
}

type BranchType = SerializeFrom<typeof loader>['branches'][number];

function OpenedLayout({
	branch,
	index,
}: {
	branch: Required<BranchType>;
	index: number;
}) {
	return (
		<div className="bg-white border border-gray-200 shadow-sm rounded-md">
			<div className="p-4 flex justify-between gap-4 border-b border-gray-200">
				<p className="font-bold text-lg">
					{index + 1}. {branch.name}
				</p>

				<StatusBadge variant="success">Abierto</StatusBadge>
			</div>

			<div className="p-4">
				<p className="text-sm text-gray-600">Ingresos totales</p>
				<p className="font-bold text-xl mb-4">
					${formatCurrency(branch.income)}
				</p>

				<p className="text-sm text-gray-600">Fecha de apertura</p>
				<DateWithTime date={branch.cashier.createdAt} />
			</div>

			<div className="p-4 flex justify-end bg-gray-100 gap-4 border-t border-gray-200">
				<LinkButton to={`close/${branch.cashier.id}`} variant="secondary">
					Cerrar cajero
				</LinkButton>
				<LinkButton
					to={`/builder/pos/new/${branch.id}`}
					variant="primary"
					prefetch="render"
				>
					Ir a la venta pos
				</LinkButton>
			</div>
		</div>
	);
}

function ClosedLayout({
	branch,
	index,
}: {
	branch: BranchType;
	index: number;
}) {
	return (
		<div className="bg-white border border-gray-200 shadow-sm rounded-md">
			<div className="p-4 flex justify-between gap-4 border-b border-gray-200">
				<p className="font-bold text-lg">
					{index + 1}. {branch.name}
				</p>

				<StatusBadge variant="warning">Cerrado</StatusBadge>
			</div>

			<div className="p-4">
				El cajero no ha sido abierto aún, puedes abrirlo para empezar a vender.
			</div>

			<div className="p-4 flex justify-end bg-gray-100 gap-4 border-t border-gray-200">
				<LinkButton to={`open/${branch.id}`} variant="primary">
					Abrir cajero
				</LinkButton>
			</div>
		</div>
	);
}

const layouts = { open: OpenedLayout, closed: ClosedLayout };
