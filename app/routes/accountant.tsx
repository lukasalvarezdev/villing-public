import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, type MetaFunction, useLoaderData } from '@remix-run/react';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
	PageWrapper,
} from '~/components/ui-library';
import { getUser } from '~/utils/auth.server';
import { __prisma } from '~/utils/db.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [{ title: 'Empresas - Villing' }];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const user = await getUser(request);

	if (user?.type !== 'accountant') throw new Error('Unauthorized');

	const { organizations } = await __prisma.user.findUniqueOrThrow({
		where: { id: user.id },
		select: {
			organizations: {
				select: {
					organization: {
						select: { id: true, name: true, idNumber: true, email: true },
					},
				},
			},
		},
	});

	return json({ companies: organizations.map(o => o.organization) });
}

export default function Component() {
	const { companies } = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<h2 className="mb-1">Empresas</h2>
			<p className="text-gray-500 text-sm leading-none mb-4">
				Lista de todas las empresas que administras
			</p>

			<div className="rounded border border-gray-200 shadow-sm mb-4 text-sm bg-white">
				<Table>
					<TableHead>
						<TableHeadCell>Nombre</TableHeadCell>
						<TableHeadCell>NIT</TableHeadCell>
						<TableHeadCell className="whitespace-nowrap">
							Correo electrónico
						</TableHeadCell>
						<TableHeadCell></TableHeadCell>
					</TableHead>
					<TableBody>
						{companies.map(client => (
							<TableRow key={client.id}>
								<TableCell className="whitespace-nowrap">
									<Link to={`${client.id}`} prefetch="intent">
										{client.name}
									</Link>
								</TableCell>
								<TableCell>
									<Link to={`${client.id}`} prefetch="intent">
										{client.idNumber}
									</Link>
								</TableCell>
								<TableCell>
									<Link to={`${client.id}`} prefetch="intent">
										{client.email}
									</Link>
								</TableCell>
								<td>
									<Link
										to={`${client.id}`}
										prefetch="intent"
										className="p-2 flex gap-2 text-sm hover:text-primary-700 group whitespace-nowrap"
									>
										<span className="group-hover:underline">Ver empresa</span>
										<i className="ri-arrow-right-line"></i>
									</Link>
								</td>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</PageWrapper>
	);
}
