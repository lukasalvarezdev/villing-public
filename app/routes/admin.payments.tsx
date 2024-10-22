import { type LoaderFunctionArgs } from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import clsx from 'clsx';
import { ClientOnly } from '~/components/client-only';
import { DateRangeFilter, SearchInput } from '~/components/filters';
import { Toast } from '~/components/form-utils';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
	PageWrapper,
} from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import {
	formatCurrency,
	formatDate,
	getSearchParamsWithDefaultDateRange,
} from '~/utils/misc';
import { planTranslator } from '~/utils/plan-protection';
import { protectAdminRoute } from '~/utils/plan-protection.server';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await Promise.all([protectRoute(request), protectAdminRoute(request)]);
	const { db } = await getOrgDbClient(request);

	const searchParams = getSearchParamsWithDefaultDateRange(request);
	const { name, createdAt } = queryBuilder(searchParams, ['name', 'createdAt']);

	const payments = await db.paymentPlan.findMany({
		select: {
			id: true,
			createdAt: true,
			amount: true,
			nextPayment: true,
			description: true,
			organization: { select: { name: true, email: true } },
			type: true,
		},
		where: { organization: { name }, createdAt },
		orderBy: { createdAt: 'desc' },
	});

	const total = payments.reduce((acc, payment) => acc + payment.amount, 0);
	return { payments, sold: `$${formatCurrency(total)}` };
}

export default function Component() {
	const { payments, sold } = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<Outlet />

			<div className="flex gap-4 justify-between md:items-end mb-4 flex-col md:flex-row">
				<div className="flex-1">
					<h2 className="mb-1">Pagos</h2>
					<p className="text-gray-500 text-sm leading-none">
						Pagos de suscripción
					</p>
				</div>

				<Link
					className={clsx(
						'gap-2 items-center text-sm font-medium flex',
						'bg-gray-900 text-white rounded px-3 h-9 hover:bg-gray-800',
					)}
					to="new"
					prefetch="render"
				>
					<i className="ri-add-line"></i>
					Agregar pago
				</Link>
			</div>

			<Toast variant="info" className="mb-4">
				Total de pagos: <strong>{sold}</strong>
			</Toast>

			<div className="flex mb-4 gap-4">
				<div className="flex-1">
					<SearchInput placeholder="Busca por nombre" />
				</div>
				<div className="shrink-0">
					<DateRangeFilter />
				</div>
			</div>

			<div className="rounded border border-gray-200 shadow-sm mb-4">
				<Table>
					<TableHead>
						<TableHeadCell>Empresa</TableHeadCell>
						<TableHeadCell>Descripción</TableHeadCell>
						<TableHeadCell>Monto</TableHeadCell>
						<TableHeadCell>Plan</TableHeadCell>
						<TableHeadCell>Fecha</TableHeadCell>
						<TableHeadCell>Próximo pago</TableHeadCell>
					</TableHead>
					<TableBody>
						{payments.map(payment => (
							<TableRow key={payment.id}>
								<TableCell className="whitespace-nowrap text-sm">
									<Link to={`${payment.id}`}>
										<p>{payment.organization.name}</p>
										<span>{payment.organization.email}</span>
									</Link>
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									<Link to={`${payment.id}`}>{payment.description}</Link>
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									<Link to={`${payment.id}`}>
										${formatCurrency(payment.amount)}
									</Link>
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									<Link to={`${payment.id}`}>
										{planTranslator(payment.type)}
									</Link>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<Link to={`${payment.id}`}>
										<ClientOnly>
											{() => formatDate(payment.createdAt)}
										</ClientOnly>
									</Link>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<Link to={`${payment.id}`}>
										<ClientOnly>
											{() => formatDate(payment.nextPayment)}
										</ClientOnly>
									</Link>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</PageWrapper>
	);
}
