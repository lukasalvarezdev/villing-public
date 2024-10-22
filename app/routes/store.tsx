import { type MetaFunction , type LoaderFunctionArgs } from '@remix-run/node';
import { NavLink, Outlet, useLocation } from '@remix-run/react';
import { PageWrapper } from '~/components/ui-library';
import { cn } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: 'Ajustes de empresa | Villing' },
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);
	return {};
}

export default function Component() {
	return (
		<PageWrapper>
			<div className="pb-4 border-b border-gray-300 mb-6">
				<h2>Catálogo virtual</h2>
				<p className="text-gray-500">
					Administra tu catálogo virtual, pedidos y productos.
				</p>
			</div>

			<div className="md:flex gap-6">
				<MobileNavigation />

				<nav className="w-1/5 -ml-4 hidden md:block">
					<ul className="flex flex-col gap-1">
						<NavItem to="/store" text="Tienda" />
						<NavItem to="/store/orders" text="Pedidos" />
						<NavItem to="/store/products" text="Productos" />
					</ul>
				</nav>

				<div className="flex-1">
					<Outlet />
				</div>
			</div>
		</PageWrapper>
	);
}

function MobileNavigation() {
	return (
		<nav className="md:hidden bg-gray-100 rounded p-1 text-sm font-medium max-w-max mb-4">
			<ul className="flex gap-2 overflow-x-auto">
				<MobileNavItem to="/store" text="Tienda" />
				<MobileNavItem to="/store/orders" text="Pedidos" />
				<MobileNavItem to="/store/products" text="Productos" />
			</ul>
		</nav>
	);
}

type NavItemProps = { to: string; text: string };
function MobileNavItem({ to, text }: NavItemProps) {
	const { pathname } = useLocation();
	const isHome = pathname === '/store';
	const isHomeItem = to === '/store';

	return (
		<li>
			<NavLink
				to={to}
				className={({ isActive }) =>
					cn(
						'block px-3 py-1',
						(isHomeItem && isHome) || (isActive && !isHome && !isHomeItem)
							? 'bg-white rounded-sm shadow-sm border border-gray-200'
							: ' rounded text-gray-500 border border-transparent',
					)
				}
				prefetch="intent"
			>
				{text}
			</NavLink>
		</li>
	);
}

function NavItem({ to, text }: NavItemProps) {
	const { pathname } = useLocation();
	const isHome = pathname === '/store';
	const isHomeItem = to === '/store';

	return (
		<li>
			<NavLink
				to={to}
				className={({ isActive }) =>
					cn(
						'block py-1 px-4 font-medium text-gray-700',
						(isHomeItem && isHome) || (isActive && !isHome && !isHomeItem)
							? 'bg-gray-100 rounded-sm'
							: 'hover:underline',
					)
				}
				prefetch="intent"
			>
				{text}
			</NavLink>
		</li>
	);
}
