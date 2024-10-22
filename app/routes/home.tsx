import { Prisma } from '@prisma/client';
import { redirect, defer, type LoaderFunctionArgs } from '@remix-run/node';
import {
	type MetaFunction,
	useLoaderData,
	Await,
	Link,
	useSearchParams,
} from '@remix-run/react';
import * as React from 'react';
import * as z from 'zod';
import { CommandPalette } from '~/components/command-palette';
import { Toast } from '~/components/form-utils';
import {
	TwoColumnsDiv,
	Box,
	PageWrapper,
	Container,
} from '~/components/ui-library';
import { getUser } from '~/utils/auth.server';
import { getOrgDbClientSafe } from '~/utils/db.server';
import {
	cn,
	formatCurrency,
	formatDate,
	getSearchParamsWithDefaultDateRange,
	getTodayInColombia,
	toStartOfDay,
} from '~/utils/misc';
import { translations } from '~/utils/permision-translations';
import { legalActions } from '~/utils/permissions.server';
import { getPlanStatus } from '~/utils/plan-protection';
import { queryBuilder } from '~/utils/query-builder.server';
import {
	getSession,
	protectRoute,
	villingSession,
} from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: 'Panel de control | Villing' },
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const result = await getOrgDbClientSafe(request);

	if (!result) {
		const session = await getSession(request);
		const user = await getUser(request);

		if (user) return redirect('/start');

		throw redirect('/login?redirectTo=/home', {
			headers: {
				'Set-Cookie': await villingSession.destroySession(session),
			},
		});
	}

	const { db, userId, orgId } = result;
	const [user, organization, allBranchesLength] = await db.$transaction([
		db.user.findUniqueOrThrow({
			where: { id: userId },
			select: {
				type: true,
				allowedSubOrgs: {
					where: { deletedAt: null },
					select: { id: true, name: true },
				},
			},
		}),
		db.organization.findUniqueOrThrow({
			where: { id: orgId },
			select: { planExpiresAt: true },
		}),
		db.subOrganization.count({
			where: { organizationId: orgId, deletedAt: null },
		}),
	]);

	if (user.type === 'accountant') return redirect('/accountant');

	const expirationStatus = getPlanStatus(organization.planExpiresAt);
	const { error } = await legalActions.validate(db, userId, 'see_stats');
	if (error || !user.allowedSubOrgs.length) {
		return defer({
			dataPromise: null,
			error,
			allowedSubOrgs: user.allowedSubOrgs,
			allBranchesLength,
			expirationStatus,
			planExpiresAt: organization.planExpiresAt,
		});
	}

	const startOfTodayInColombia = toStartOfDay(getTodayInColombia());
	const searchParams = getSearchParamsWithDefaultDateRange(
		new Request('http://localhost:3000/'),
	);
	const filters = queryBuilder(searchParams, ['createdAt']);

	return defer({
		allowedSubOrgs: user.allowedSubOrgs,
		allBranchesLength,
		dataPromise: getDashboardData(),
		expirationStatus,
		planExpiresAt: organization.planExpiresAt,
	});

	async function getDashboardData() {
		const allowedSubOrgs = user.allowedSubOrgs.map(s => s.id);

		const [allTodayResponse, sumThisMonthResponse] = await db.$transaction([
			getSumToday(),
			getSumThisMonth(),
		]);

		const sumThisMonth = SumSchema.parse((sumThisMonthResponse as any)[0]);
		const sumToday = SumSchema.parse((allTodayResponse as any)[0]);

		const totalThisMonth =
			(sumThisMonth.total || 0) +
			(sumThisMonth.subtotal || 0) +
			(sumThisMonth.tax || 0);
		const totalToday =
			(sumToday.total || 0) + (sumToday.subtotal || 0) + (sumToday.tax || 0);

		return { totalThisMonth, totalToday };

		function getSumToday() {
			return db.$queryRaw`
			SELECT
				CAST(SUM(total) AS int) as total,
				CAST(SUM(subtotal) AS int) as subtotal,
				CAST(SUM("totalTax") AS int) as tax
			FROM (
					SELECT total, null as subtotal, null as "totalTax", id
					FROM public."LegalPosInvoice"
					WHERE "organizationId" = ${orgId}
							AND "createdAt" >= ${startOfTodayInColombia}
							AND "canceledAt" IS NULL
							AND "subOrganizationId" IN (${Prisma.join(allowedSubOrgs)})
					UNION ALL
					SELECT null as total, subtotal, "totalTax", id
					FROM public."LegalInvoice"
					WHERE "organizationId" = ${orgId}
							AND "createdAt" >= ${startOfTodayInColombia}
							AND cufe IS NOT NULL
							AND "subOrganizationId" IN (${Prisma.join(allowedSubOrgs)})
					UNION ALL
					SELECT null as total, subtotal, "totalTax", id
					FROM public."LegalInvoiceRemision"
					WHERE "organizationId" = ${orgId}
							AND "createdAt" >= ${startOfTodayInColombia}
							AND "subOrganizationId" IN (${Prisma.join(allowedSubOrgs)})
							AND "canceledAt" IS NULL
			) as combined_data;
		`;
		}

		function getSumThisMonth() {
			return db.$queryRaw`
				SELECT
					CAST(SUM(total) AS int) as total,
					CAST(SUM(subtotal) AS int) as subtotal,
					CAST(SUM("totalTax") AS int) as tax
				FROM (
						SELECT total, null as subtotal, null as "totalTax"
						FROM public."LegalPosInvoice"
						WHERE "organizationId" = ${orgId}
								AND "createdAt" >= ${filters.createdAt.gte}
								AND "createdAt" < ${filters.createdAt.lte}
								AND "canceledAt" IS NULL
								AND "subOrganizationId" IN (${Prisma.join(allowedSubOrgs)})
						UNION ALL
						SELECT null as total, subtotal, "totalTax"
						FROM public."LegalInvoice"
						WHERE "organizationId" = ${orgId}
								AND "createdAt" >= ${filters.createdAt.gte}
								AND "createdAt" < ${filters.createdAt.lte}
								AND cufe IS NOT NULL
								AND "subOrganizationId" IN (${Prisma.join(allowedSubOrgs)})
						UNION ALL
						SELECT null as total, subtotal, "totalTax"
						FROM public."LegalInvoiceRemision"
						WHERE "organizationId" = ${orgId}
								AND "createdAt" >= ${filters.createdAt.gte}
								AND "createdAt" < ${filters.createdAt.lte}
								AND "subOrganizationId" IN (${Prisma.join(allowedSubOrgs)})
								AND "canceledAt" IS NULL
				) as combined_data;
			`;
		}
	}
}

export default function Component() {
	const [searchParams] = useSearchParams();
	const action = searchParams.get('action');
	const permissionTranslation =
		translations[action as keyof typeof translations];

	return (
		<PageWrapper className="h-screen w-full">
			<Container className="h-full">
				<div
					className={cn(
						'flex h-full items-center justify-center flex-col gap-8 -mt-20',
					)}
				>
					<div className="w-full max-w-xl mx-auto flex flex-col gap-8">
						<img
							src="img/logo-with-text.svg"
							alt="Villing"
							className="h-12 md:h-16"
						/>

						<div className="w-full">
							<label className="sr-only">Comandos inteligentes</label>
							<CommandPalette className="mb-4 h-11 w-full border border-gray-200 shadow-md" />
							<div>
								<p className="text-center text-gray-600 hidden md:block">
									Presiona <strong>Ctrl + M</strong> y escribe lo que quieras
									hacer. Por ejemplo: "Venta POS"
								</p>
								<p className="text-center text-gray-600 md:hidden">
									Presiona la barra de arriba y escribe lo que quieras hacer.
									Por ejemplo: "Venta POS"
								</p>
							</div>
						</div>
					</div>

					<Stats />

					<div className="max-w-xl mx-auto">
						{permissionTranslation ? (
							<Toast variant="error" className="w-full">
								No tienes permisos para <strong>{permissionTranslation}</strong>
							</Toast>
						) : null}
						<Message />

						<PlanStatusToast />
					</div>
				</div>
			</Container>
		</PageWrapper>
	);
}

function Message() {
	const [searchParams] = useSearchParams();
	const msg = searchParams.get('msg');

	if (!msg) return null;
	const message = messages[msg];

	if (!message) return null;

	return (
		<Toast variant={message.type} className="w-full">
			{message.message}
		</Toast>
	);
}

function Stats() {
	const loaderData = useLoaderData<typeof loader>();
	const { dataPromise, allowedSubOrgs, allBranchesLength } = loaderData;

	if (!dataPromise) return null;

	return (
		<React.Suspense>
			<Await resolve={dataPromise}>
				{({ totalThisMonth, totalToday }) => (
					<div className="w-full text-gray-600 max-w-xl mx-auto">
						<TwoColumnsDiv className="gap-6 w-full mb-2">
							<Box className="shadow-sm flex-1">
								<p className="text-xs">Ventas del mes</p>
								<p className="text-lg font-bold">
									${formatCurrency(totalThisMonth)}
								</p>
							</Box>
							<Box className="shadow-sm flex-1">
								<p className="text-xs">Ventas del día</p>
								<p className="text-lg font-bold">
									${formatCurrency(totalToday)}
								</p>
							</Box>
						</TwoColumnsDiv>

						<Link
							to="/analytics"
							className="text-sm underline"
							prefetch="intent"
						>
							Ver más estadísticas
						</Link>

						{allBranchesLength !== allowedSubOrgs.length ? (
							<Toast variant="info" className="mt-4">
								Estás viendo las estadísticas de las sucursales:{' '}
								<strong>{allowedSubOrgs.map(s => s.name).join(', ')}</strong>
							</Toast>
						) : null}
					</div>
				)}
			</Await>
		</React.Suspense>
	);
}

function PlanStatusToast() {
	const { expirationStatus, planExpiresAt } = useLoaderData<typeof loader>();

	if (expirationStatus === 'active' || !planExpiresAt) return null;

	if (expirationStatus === 'expiring' && planExpiresAt) {
		return (
			<Toast variant="warning" className="w-full">
				Tu plan está a punto de expirar. Expira el {formatDate(planExpiresAt)}{' '}
				<Link to="/settings/payments" className="underline font-medium">
					Renueva tu plan
				</Link>
			</Toast>
		);
	}

	return (
		<Toast variant="error" className="w-full">
			Tu plan ha expirado el {formatDate(planExpiresAt)}. Por favor, renueva tu
			plan para seguir disfrutando de Villing.{' '}
			<Link to="/settings/payments" className="underline font-medium">
				Renueva tu plan
			</Link>
		</Toast>
	);
}

const SumSchema = z.object({
	total: z.number().nullable(),
	subtotal: z.number().nullable(),
	tax: z.number().nullable(),
});

const messages = {
	confirm_email: {
		type: 'error',
		message:
			'Para acceder a el resto de la plataforma, debes confirmar tu cuenta. Revisa tu correo para confirmar tu cuenta',
	},
} as Record<string, { type: 'error' | 'success'; message: string }>;
