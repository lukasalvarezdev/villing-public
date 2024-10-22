import {
	json,
	type LoaderFunctionArgs,
	type MetaFunction,
} from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { SearchInput } from '~/components/filters';
import { LinkButton } from '~/components/form-utils';
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
import { getRequestSearchParams } from '~/utils/misc';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [{ title: `Proveedores - Villing` }];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const searchParams = getRequestSearchParams(request);
	const query = queryBuilder(searchParams, ['name', 'email', 'idNumber']);

	const { db, orgId } = await getOrgDbClient(request);
	const suppliers = await db.supplier.findMany({
		where: { organizationId: orgId, deletedAt: null, ...query },
		orderBy: { name: 'asc' },
	});

	return json({ suppliers });
}

export default function Component() {
	const { suppliers } = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<div className="flex gap-4 flex-col md:flex-row justify-between md:items-end mb-4">
				<div className="flex-1">
					<h2 className="mb-1">Proveedores</h2>
					<p className="text-gray-500 text-sm leading-none">
						Lista de todos los proveedores
					</p>
				</div>
				<LinkButton to="new" className="hidden md:flex">
					<i className="ri-add-line"></i>
					Crear proveedor
				</LinkButton>
				<LinkButton to="new" className="md:hidden">
					<i className="ri-add-line"></i>
					Crear
				</LinkButton>
			</div>

			<div className="mb-4">
				<SearchInput placeholder="Busca por nombre, email o NIT" />
			</div>

			<div className="rounded border border-gray-200 shadow-sm mb-4 text-sm bg-white">
				<Table>
					<TableHead>
						<TableHeadCell>Nombre</TableHeadCell>
						<TableHeadCell>NIT</TableHeadCell>
						<TableHeadCell className="whitespace-nowrap">
							Correo electrónico
						</TableHeadCell>
						<TableHeadCell>Teléfono</TableHeadCell>
						<TableHeadCell></TableHeadCell>
					</TableHead>
					<TableBody>
						{suppliers.length ? (
							suppliers.map(supplier => (
								<TableRow key={supplier.id}>
									<TableCell className="whitespace-nowrap">
										<Link to={`${supplier.id}`} prefetch="intent">
											{supplier.name}
										</Link>
									</TableCell>
									<TableCell>
										<Link to={`${supplier.id}`} prefetch="intent">
											{supplier.idNumber}
										</Link>
									</TableCell>
									<TableCell>
										<Link to={`${supplier.id}`} prefetch="intent">
											{supplier.email}
										</Link>
									</TableCell>
									<TableCell>
										<Link to={`${supplier.id}`} prefetch="intent">
											{supplier.tel}
										</Link>
									</TableCell>
									<td>
										<Link
											to={`${supplier.id}`}
											prefetch="intent"
											className="p-2 flex gap-2 text-sm hover:text-primary-700 group whitespace-nowrap"
										>
											<span className="group-hover:underline">
												Ver proveedor
											</span>
											<i className="ri-arrow-right-line"></i>
										</Link>
									</td>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell className="whitespace-nowrap">
									No hay proveedores
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</PageWrapper>
	);
}
