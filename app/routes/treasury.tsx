import {
	json,
	type MetaFunction,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/node';
import {
	Link,
	Outlet,
	useFetchers,
	useLoaderData,
	useSearchParams,
} from '@remix-run/react';
import * as React from 'react';
import { SearchInput, DateRangeFilter } from '~/components/filters';
import { LinkButton, Toast } from '~/components/form-utils';
import { NonPrintableContent } from '~/components/printable-content';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
	PageWrapper,
} from '~/components/ui-library';
import { getOrgDbClient, logError } from '~/utils/db.server';
import {
	formatCurrency,
	formatDate,
	getRequestSearchParams,
} from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: `Tesorería y gastos - Villing` },
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const searchParams = getRequestSearchParams(request);
	const where = queryBuilder(searchParams, ['createdAt', 'name']);

	const { db, orgId } = await getOrgDbClient(request);
	const expenses = await db.expense.findMany({
		where: { subOrg: { organizationId: orgId }, ...where },
		include: { category: true, subOrg: true, user: true },
		orderBy: { createdAt: 'desc' },
	});

	return json({ expenses });
}

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	try {
		const { db, orgId, userId } = await getOrgDbClient(request);
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		const { error } = await legalActions.validate(
			db,
			userId,
			'update_expenses',
		);
		if (error) return json({ error }, 403);

		await db.expense.deleteMany({
			where: { id: parseInt(id!), subOrg: { organizationId: orgId } },
		});

		return json({ error: null });
	} catch (error) {
		await logError({ request, error });

		return json({ error: 'Hubo un error al eliminar el gasto' }, 500);
	}
}

export default function Component() {
	const { expenses } = useLoaderData<typeof loader>();
	const [searchParams, setSearchParams] = useSearchParams();
	const created = searchParams.get('created');
	const error = useFetchers().find(x => x.data?.error)?.data?.error;

	React.useEffect(() => {
		if (created) {
			setSearchParams(params => {
				params.delete('created');
				return params;
			});
		}
	}, [created, setSearchParams]);

	return (
		<PageWrapper>
			<Outlet />

			<NonPrintableContent>
				<div className="flex gap-4 flex-col md:flex-row justify-between md:items-end mb-4">
					<div className="flex-1">
						<h2 className="mb-1">Tesorería</h2>
						<p className="text-gray-500 text-sm leading-none">
							Todos los gastos de la empresa
						</p>
					</div>

					<div className="flex gap-4">
						<LinkButton to="new" className="flex">
							<i className="ri-add-line"></i>
							Agregar gasto
						</LinkButton>
						<LinkButton to="categories" variant="secondary">
							<i className="ri-list-settings-line"></i>
							Modificar categorías
						</LinkButton>
					</div>
				</div>

				<div className="mb-4">
					<div className="flex mb-4 gap-4">
						<div className="flex-1">
							<SearchInput placeholder="Busca por nombre de gasto" />
						</div>
						<div className="shrink-0">
							<DateRangeFilter />
						</div>
					</div>
				</div>

				<Toast variant="error" className="mb-4">
					{error}
				</Toast>

				<div className="rounded border border-gray-200 shadow-sm mb-4 text-sm bg-white">
					<Table>
						<TableHead>
							<TableHeadCell>Nombre</TableHeadCell>
							<TableHeadCell>Responsable</TableHeadCell>
							<TableHeadCell>Sucursal</TableHeadCell>
							<TableHeadCell>Origen</TableHeadCell>
							<TableHeadCell>Fecha</TableHeadCell>
							<TableHeadCell>Categoría</TableHeadCell>
							<TableHeadCell>Monto</TableHeadCell>
							<TableHeadCell></TableHeadCell>
						</TableHead>
						<TableBody>
							{expenses.map(expense => (
								<TableRow key={expense.id}>
									<TableCell className="whitespace-nowrap">
										{expense.name}
									</TableCell>
									<TableCell className="whitespace-nowrap">
										{expense.user.name}
									</TableCell>
									<TableCell className="whitespace-nowrap">
										{expense.subOrg.name}
									</TableCell>
									<TableCell>{originTranslations[expense.origin]}</TableCell>
									<TableCell className="whitespace-nowrap">
										{formatDate(expense.createdAt)}
									</TableCell>
									<TableCell className="whitespace-nowrap">
										{expense.category?.name || 'Sin categoría'}
									</TableCell>
									<TableCell>${formatCurrency(expense.amount)}</TableCell>
									<TableCell>
										<div className="flex">
											<Link
												to={`${expense.id}?print=true`}
												className="p-2 flex gap-2 text-sm hover:text-primary-700 group whitespace-nowrap"
												prefetch="intent"
											>
												<span className="group-hover:underline">Imprimir</span>
												<i className="ri-arrow-right-line"></i>
											</Link>
											<Link
												to={String(expense.id)}
												className="p-2 flex gap-2 text-sm hover:text-primary-700 group whitespace-nowrap"
												prefetch="intent"
											>
												<span className="group-hover:underline">Ver gasto</span>
												<i className="ri-arrow-right-line"></i>
											</Link>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</NonPrintableContent>
		</PageWrapper>
	);
}

const originTranslations = {
	cashier: 'Caja',
	bank: 'Banco',
};
