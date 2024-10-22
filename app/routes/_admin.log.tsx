import { type LoaderFunctionArgs } from '@remix-run/node';
import { Link, Outlet, useLoaderData } from '@remix-run/react';
import { DateRangeFilter, SearchInput } from '~/components/filters';
import {
	Container,
	DateWithTime,
	PageWrapper,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeadCell,
	TableRow,
} from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import { cn } from '~/utils/misc';

export async function loader({ request }: LoaderFunctionArgs) {
	const { db, userId } = await getOrgDbClient(request);

	const user = await db.user.findUnique({ where: { id: userId } });

	if (user?.email !== process.env.ADMIN_EMAIL) {
		throw new Error("You don't have access to this resource");
	}

	const logs = await db.errorLog.findMany({
		include: {
			user: { select: { email: true } },
			organization: { select: { name: true } },
		},
		orderBy: { createdAt: 'desc' },
		take: 100,
	});

	return { logs };
}

export default function Component() {
	const { logs } = useLoaderData<typeof loader>();

	function getPathName(url: string) {
		try {
			const urlObj = new URL(url);
			return urlObj.pathname;
		} catch (error) {
			return url;
		}
	}

	return (
		<PageWrapper>
			<Container>
				<Outlet />

				<h2 className="mb-1">Logs</h2>
				<p className="text-gray-500 text-sm leading-none mb-4">
					Lista de logs de errores
				</p>

				<div className="flex flex-col md:flex-row mb-4 gap-4">
					<div className="flex-1">
						<SearchInput placeholder="Busca por nombre de empresa" />
					</div>
					<div className="shrink-0">
						<DateRangeFilter />
					</div>
				</div>

				<div className="rounded-lg border border-gray-200 shadow-sm mb-4 bg-white overflow-hidden">
					<Table className="min-w-sm w-full">
						<TableHead>
							<TableHeadCell className="bg-gray-50 pl-4">Hora</TableHeadCell>
							<TableHeadCell className="bg-gray-50">Empresa</TableHeadCell>
							<TableHeadCell className="bg-gray-50">Url</TableHeadCell>
							<TableHeadCell className="bg-gray-50">Código</TableHeadCell>
							<TableHeadCell className="bg-gray-50 pr-12">Estado</TableHeadCell>
							<TableHeadCell className="bg-gray-50 pr-12">
								Mensaje
							</TableHeadCell>
						</TableHead>

						<TableBody>
							{logs.map(log => (
								<TableRow
									className={cn(
										'border-b border-gray-200 children:align-bottom text-sm',
										'children:whitespace-nowrap',
									)}
									key={log.id}
								>
									<TableCell className="w-full pl-4">
										<DateWithTime date={log.createdAt} />
									</TableCell>
									<TableCell>
										{log.organization?.name || 'Sin empresa'}
									</TableCell>
									<TableCell>
										<p className="max-w-xs truncate overflow-hidden">
											{getPathName(log.url)}
										</p>
									</TableCell>
									<TableCell>{log.status}</TableCell>
									<TableCell>
										<p className="max-w-xs truncate overflow-hidden">
											{log.error}
										</p>
									</TableCell>
									<TableCell className="pr-8">
										<Link to={String(log.id)}>
											Ver más
											<i className="ri-arrow-right-line"></i>
										</Link>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</Container>
		</PageWrapper>
	);
}
