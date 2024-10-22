import { type MetaFunction } from '@remix-run/node';
import { Outlet } from '@remix-run/react';
import { MobileNavItem, NavItem, PageWrapper } from '~/components/ui-library';

export const meta: MetaFunction = () => [
	{ title: 'Ajustes de empresa | Villing' },
];

export default function Component() {
	return (
		<PageWrapper>
			<div className="pb-4 border-b border-gray-300 mb-6">
				<h2>Ajustes</h2>
				<p className="text-gray-500">
					Configura los ajustes de la empresa y maneja los miembros.
				</p>
			</div>

			<div className="md:flex gap-6">
				<MobileNavigation />

				<nav className="w-1/5 -ml-4 hidden md:block">
					<ul className="flex flex-col gap-1">
						<NavItem to="/settings" text="Empresa" home="/settings" />
						<NavItem to="/settings/preferences" text="Preferencias" />
						<NavItem to="/settings/suborganizations" text="Sucursales" />
						<NavItem to="/settings/members" text="Miembros" />
						<NavItem to="/settings/roles" text="Roles y permisos" />
						<NavItem to="/settings/invitations" text="Invitaciones" />
						<NavItem to="/settings/affiliates" text="Referidos" />
						<NavItem to="/settings/payments" text="Pagos" />
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
				<MobileNavItem to="/settings" text="Empresa" home="/settings" />
				<MobileNavItem to="/settings/preferences" text="Preferencias" />
				<MobileNavItem to="/settings/suborganizations" text="Sucursales" />
				<MobileNavItem to="/settings/members" text="Miembros" />
				<MobileNavItem to="/settings/roles" text="Roles" home="/settings" />
				<MobileNavItem to="/settings/invitations" text="Invitaciones" />
				<MobileNavItem to="/settings/affiliates" text="Referidos" />
				<MobileNavItem to="/settings/affiliates" text="Pagos" />
			</ul>
		</nav>
	);
}
