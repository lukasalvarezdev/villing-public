import {
	json,
	type LoaderFunctionArgs,
	type MetaFunction,
} from '@remix-run/node';
import { Link, Outlet, useLocation } from '@remix-run/react';
import clsx from 'clsx';
import { RouteErrorBoundary } from '~/components/error-boundary';
import { DateRangeFilter } from '~/components/filters';
import { PageWrapper } from '~/components/ui-library';
import { PrintInvoiceButton } from '~/modules/invoice/invoice-page-components';
import { getOrgDbClient } from '~/utils/db.server';
import { getSearchParamsWithDefaultDateRange } from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [{ title: `Analíticas - Villing` }];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);
	const searchParams = getSearchParamsWithDefaultDateRange(request);

	const { userId, db } = await getOrgDbClient(request);
	await legalActions.validateAndThrow(db, userId, 'see_stats');

	return json({
		start: searchParams.get('start'),
		end: searchParams.get('end'),
	});
}

export default function Component() {
	const { pathname } = useLocation();
	const showDateRangePicker = pathname.split('/')[2] !== undefined;
	const showPrintButton = pathname.split('/')[2] === 'report';

	return (
		<PageWrapper>
			<div className="print:hidden">
				<h1 className="font-bold">Analíticas</h1>
				<p className="text-gray-500 mb-6">
					Aquí están tus datos más relevantes
				</p>

				<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6">
					<Navigation />
					<div className="flex flex-col md:flex-row lg:justify-end gap-4 md:items-center">
						{showPrintButton ? (
							<div className="max-w-max">
								<PrintInvoiceButton text="Imprimir reporte" />
							</div>
						) : null}

						{showDateRangePicker ? (
							<div className="max-w-max">
								<DateRangeFilter />
							</div>
						) : null}
					</div>
				</div>
			</div>

			<Outlet />
		</PageWrapper>
	);
}

function Navigation() {
	const { pathname } = useLocation();
	const activeLink = pathname.split('/')[2];

	return (
		<nav>
			<ul
				className={clsx(
					'flex p-1 rounded-lg bg-gray-100 text-sm font-medium h-9 max-w-max gap-1',
					'overflow-x-auto overflow-y-hidden',
				)}
			>
				<NavigationItem
					to="/analytics"
					icon="ri-dashboard-line"
					label="Resumen"
					isActive={!activeLink}
				/>
				<NavigationItem
					to="/analytics/general-report"
					icon="ri-file-chart-2-line"
					label="Reporte general"
					isActive={activeLink === 'general-report'}
				/>
				<NavigationItem
					to="/analytics/inventory-report"
					icon="ri-instance-line"
					label="Reporte de inventario"
					isActive={activeLink === 'inventory-report'}
				/>
				<NavigationItem
					to="/analytics/report"
					icon="ri-file-chart-line"
					label="Reporte contable"
					isActive={activeLink === 'report'}
				/>
				<NavigationItem
					to="/analytics/accounts/clients"
					icon="ri-wallet-line"
					label="CC/CP"
					isActive={activeLink === 'accounts'}
				/>
			</ul>
		</nav>
	);
}

type NavigationItemProps = {
	to: string;
	icon: string;
	label: string;
	isActive?: boolean;
};
function NavigationItem({ icon, label, to, isActive }: NavigationItemProps) {
	return (
		<li>
			<Link
				className={clsx(
					'px-2 flex items-center h-7 whitespace-nowrap',
					isActive
						? 'bg-black text-white rounded-md shadow-sm border border-black'
						: 'rounded text-gray-500 border border-transparent',
				)}
				to={to}
				prefetch="intent"
			>
				<i className={clsx(icon, 'mr-2')}></i>
				{label}
			</Link>
		</li>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con las analíticas. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}
