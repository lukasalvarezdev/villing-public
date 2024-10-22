import { Outlet, useLocation, useNavigate } from '@remix-run/react';
import { Label, LinkButton, Select } from '~/components/form-utils';
import {
	SidebarContainer,
	WithSidebarUIContainer,
} from '~/components/ui-library';
import { cn } from '~/utils/misc';

export default function Component() {
	const location = useLocation();
	const activeLink = location.pathname.split('/')[3];
	const text = activeLink ? texts[activeLink] : texts['clients'];

	return (
		<WithSidebarUIContainer className="flex flex-col lg:flex-row">
			<Sidebar />

			<div className="flex-1">
				<h3>{text?.title}</h3>
				<p className="text-gray-500 mb-6">{text?.description}</p>

				<Outlet />
			</div>
		</WithSidebarUIContainer>
	);
}

const texts = {
	clients: {
		title: 'Cuentas por cobrar',
		description: 'Una lista detallada de los clientes que te deben',
	},
	suppliers: {
		title: 'Cuentas por pagar',
		description: 'Una lista detallada de los proveedores a los que le debes',
	},
	'clients-detail': {
		title: 'Cuentas por cobrar (detallada)',
		description: 'Lista detallada de las cuentas por cobrar',
	},
	'suppliers-detail': {
		title: 'Cuente por pagar (detallada)',
		description: 'Lista detallada de las cuentas por pagar',
	},
} as Record<string, { title: string; description: string }>;

function Sidebar() {
	const location = useLocation();
	const navigate = useNavigate();
	const activeLink = location.pathname.split('/')[3];

	return (
		<SidebarContainer>
			<nav className="flex-col gap-1 hidden lg:flex">
				<LinkButton
					to="/analytics/accounts/clients"
					className={cn(
						'justify-start font-medium',
						activeLink === 'clients' && 'bg-gray-100',
					)}
					variant="ghost"
					prefetch="intent"
				>
					Cuentas por cobrar
				</LinkButton>
				<LinkButton
					to="/analytics/accounts/clients-detail"
					className={cn(
						'justify-start font-medium',
						activeLink === 'clients-detail' && 'bg-gray-100',
					)}
					variant="ghost"
					prefetch="intent"
				>
					Cuentas por cobrar (detallada)
				</LinkButton>
				<LinkButton
					to="/analytics/accounts/suppliers"
					className={cn(
						'justify-start font-medium',
						activeLink === 'suppliers' && 'bg-gray-100',
					)}
					variant="ghost"
					prefetch="intent"
				>
					Cuentas por pagar
				</LinkButton>
				<LinkButton
					to="/analytics/accounts/suppliers-detail"
					className={cn(
						'justify-start font-medium',
						activeLink === 'suppliers-detail' && 'bg-gray-100',
					)}
					variant="ghost"
					prefetch="intent"
				>
					Cuentas por pagar (detallada)
				</LinkButton>
			</nav>

			<div className="lg:hidden w-full flex-1">
				<Label htmlFor="account">Tipo de cuenta</Label>
				<Select
					id="account"
					className="w-full"
					defaultValue={activeLink}
					onChange={e => navigate(`/analytics/accounts/${e.target.value}`)}
					options={[
						{ label: 'Cuentas por cobrar', value: 'clients' },
						{
							label: 'Cuentas por cobrar (detallada)',
							value: 'clients-detail',
						},

						{ label: 'Cuentas por pagar', value: 'suppliers' },
						{
							label: 'Cuentas por pagar (detallada)',
							value: 'suppliers-detail',
						},
					]}
				/>
			</div>
		</SidebarContainer>
	);
}
