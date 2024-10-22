import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { Link, useLoaderData, useSearchParams } from '@remix-run/react';
import { ClientOnly } from '~/components/client-only';
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
import { formatDate, getRequestSearchParams } from '~/utils/misc';
import {
	getPlanStatus,
	planTranslator,
	planStatusTranslator,
} from '~/utils/plan-protection';
import { protectAdminRoute } from '~/utils/plan-protection.server';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await Promise.all([protectRoute(request), protectAdminRoute(request)]);
	const { db } = await getOrgDbClient(request);
	const searchParams = getRequestSearchParams(request);

	const showAll = searchParams.get('showAll') === 'true';
	const where = queryBuilder(searchParams, ['name']);

	const organizations = await db.organization.findMany({
		select: {
			id: true,
			name: true,
			email: true,
			planType: true,
			planExpiresAt: true,
		},
		orderBy: { id: 'desc' },
		where,
	});

	return json({
		organizations: organizations.filter(org => {
			if (showAll) return true;
			const status = getPlanStatus(org.planExpiresAt);
			return org.planType === 'free' ? status !== 'expired' : true;
		}),
	});
}

export default function Component() {
	const { organizations } = useLoaderData<typeof loader>();
	const [searchParams] = useSearchParams();
	const showAll = searchParams.get('showAll') === 'true';

	return (
		<PageWrapper>
			<h2 className="mb-1">Empresas registradas</h2>
			<p className="text-gray-500 text-sm leading-none mb-4">
				Todos nuestros clientes
			</p>

			<div className="flex justify-end mb-4">
				<LinkButton to={`?showAll=${!showAll}`} variant="ghost">
					{showAll ? 'Ocultar vencidos' : 'Mostrar vencidos'}
				</LinkButton>
			</div>
			<SearchInput className="mb-4" placeholder="Busca por nombre" />

			<div className="rounded border border-gray-200 shadow-sm mb-4">
				<Table>
					<TableHead>
						<TableHeadCell>Empresa</TableHeadCell>
						<TableHeadCell>Correo</TableHeadCell>
						<TableHeadCell>Plan</TableHeadCell>
						<TableHeadCell>Próximo pago</TableHeadCell>
						<TableHeadCell>Estado</TableHeadCell>
					</TableHead>
					<TableBody>
						{organizations.map(organization => (
							<TableRow key={organization.id}>
								<TableCell className="whitespace-nowrap text-sm">
									<Link to={`${organization.id}/company`}>
										{organization.name}
									</Link>
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									<Link to={`${organization.id}/company`}>
										{organization.email}
									</Link>
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									<Link to={`${organization.id}/company`}>
										{planTranslator(organization.planType)}
									</Link>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<Link to={`${organization.id}/company`}>
										<ClientOnly>
											{() =>
												organization.planExpiresAt
													? formatDate(organization.planExpiresAt)
													: null
											}
										</ClientOnly>
									</Link>
								</TableCell>
								<TableCell className="text-sm whitespace-nowrap">
									<Link to={`${organization.id}/company`}>
										{planStatusTranslator(organization.planExpiresAt)}
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
