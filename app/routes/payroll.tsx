import { type MetaFunction, Outlet } from '@remix-run/react';
import { MobileNavItem, NavItem, PageWrapper } from '~/components/ui-library';

export const meta: MetaFunction = () => [
	{ title: `Nómina electrónica - Villing` },
];

export default function Component() {
	return (
		<PageWrapper>
			<div className="pb-4 border-b border-gray-300 mb-6">
				<h2>Nómina electrónica</h2>
				<p className="text-gray-500">
					Liquida y emite nóminas electrónicas a tus empleados.
				</p>
			</div>

			<div className="md:flex gap-6">
				<MobileNavigation />

				<nav className="w-1/5 -ml-4 hidden md:block">
					<ul className="flex flex-col gap-1">
						<NavItem to="/payroll/employees" text="Empleados" />
						<NavItem to="/payroll" text="Nóminas" home="/payroll" />
						<NavItem to="/payroll/templates" text="Plantillas" />
						<NavItem to="/payroll/social-security" text="Seguridad social" />
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
				<MobileNavItem to="/payroll/employees" text="Empleados" />
				<MobileNavItem to="/payroll" text="Nóminas" home="/payroll" />
				<MobileNavItem to="/payroll/templates" text="Plantillas" />
				<MobileNavItem to="/payroll/social-security" text="Seguridad social" />
			</ul>
		</nav>
	);
}
