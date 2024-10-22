import { Link, useLocation } from '@remix-run/react';
import * as React from 'react';
import { useIsMobile, useUser } from '~/root';
import { cn, useOnClickOutside } from '~/utils/misc';
import { CommandPalette } from './command-palette';
import { Modal } from './modal';
import { NotificationButton } from './notifications';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from './primitives/dropdown';
import { ButtonIcon, Container } from './ui-library';

export function Header() {
	const menu = useMenu();
	const isMobile = useIsMobile();
	const { pathname } = useLocation();
	const isHomePage = pathname === '/home';
	const showCommandPalette = !isHomePage;

	return (
		<header className="fixed top-0 left-0 z-30 h-[60px] w-full bg-white shadow-sm print:hidden">
			<Container className="flex h-full items-center justify-between">
				<div className="flex gap-6 items-center">
					<Link to="/home" className="h-7 w-7 flex-1" prefetch="intent">
						<img
							src="/img/villing-logo.svg"
							alt="Logo de Villing"
							className="max-h-full max-w-full"
						/>
					</Link>

					{!isMobile ? (
						<nav>
							<ul className="hidden md:flex items-center gap-4 text-sm">
								{menu.map(item => (
									<MenuItem key={item.name} item={item} />
								))}
							</ul>
						</nav>
					) : null}
				</div>

				<div className="flex gap-4">
					{isMobile && showCommandPalette ? <CommandPalette mobile /> : null}
					<MobileNav />
					{isMobile || !showCommandPalette ? null : (
						<CommandPalette
							className="hidden lg:flex w-80 border border-gray-100"
							placeholder="Buscar en Villing"
						/>
					)}

					<NotificationButton />
					<UserSettingsMenu />
				</div>
			</Container>
		</header>
	);
}

function MobileNav() {
	const [isOpen, setIsOpen] = React.useState(false);
	const menu = useMenu();

	return (
		<div className="md:hidden">
			<ButtonIcon onClick={() => setIsOpen(!isOpen)}>
				<i className="ri-menu-line"></i>
			</ButtonIcon>

			{isOpen ? (
				<Modal>
					<div className="flex justify-end mb-2">
						<ButtonIcon onClick={() => setIsOpen(false)}>
							<i className="ri-close-line"></i>
						</ButtonIcon>
					</div>

					<ul className="flex flex-col gap-4">
						{menu.map(item => (
							<li key={item.name}>
								<h4 className="mb-2">{item.name}</h4>

								<ul className="flex flex-col gap-2 pl-2">
									{item.items.map(subItem => (
										<li key={subItem.name}>
											<Link
												to={subItem.to}
												className={cn(
													'w-full rounded px-2 py-1 hover:bg-gray-100',
													'flex gap-4 items-center text-left',
												)}
												onClick={() => setIsOpen(false)}
											>
												<i className={subItem.icon}></i>
												{subItem.name}
											</Link>
										</li>
									))}
								</ul>
							</li>
						))}
					</ul>
				</Modal>
			) : null}
		</div>
	);
}

function UserSettingsMenu() {
	const [isOpen, setIsOpen] = React.useState(false);
	const contRef = React.useRef<HTMLDivElement>(null);
	useOnClickOutside(contRef, () => setIsOpen(false));
	const user = useUser();

	return (
		<div className="relative" ref={contRef}>
			<button
				className="w-9 h-9 flex items-center justify-center bg-gray-200 rounded-full"
				onClick={() => setIsOpen(!isOpen)}
			>
				<img
					src="/img/notion-avatar.svg"
					alt="Notion user avatar"
					className="max-h-full max-w-full"
				/>
			</button>

			{isOpen ? (
				<div
					className={cn(
						'absolute top-full right-0 mt-1 rounded min-w-[200px] z-10',
						'border border-gray-200 bg-white shadow-md',
					)}
				>
					<div className="p-3 border-b border-gray-200">
						<p className="font-medium text-sm leading-none">{user.name}</p>
						<p className="text-xs text-gray-500 leading-none mt-1">
							{user.email}
						</p>
					</div>

					<ul className="p-1">
						<li>
							<button
								className="w-full text-left flex items-center gap-4 text-sm px-3 py-1.5 hover:bg-gray-100 rounded"
								type="button"
							>
								<i className="ri-logout-box-r-line"></i>
								Dejar empresa
							</button>
						</li>
					</ul>

					<div className="border-t border-gray-200 p-1">
						<Link
							to="/logout"
							className="w-full text-left flex items-center gap-4 text-sm px-3 py-1.5 hover:bg-gray-100 rounded"
						>
							<i className="ri-logout-circle-r-line"></i>
							Cerrar sesión
						</Link>
					</div>
				</div>
			) : null}
		</div>
	);
}

function MenuItem({ item }: { item: MenuItemType }) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="flex items-center gap-2 font-medium">
				{item.name}
				<i className="ri-arrow-down-s-line text-base" />
			</DropdownMenuTrigger>

			<DropdownMenuContent align="start" className="bg-white min-w-40">
				{item.items.map((subItem, index) => (
					<DropdownMenuItem
						key={index}
						className="flex gap-2 items-center py-1"
						asChild
					>
						<Link
							to={subItem.to}
							prefetch="intent"
							className="flex gap-2 items-center"
						>
							<i className={cn(subItem.icon, 'text-base')} />
							{subItem.name}
						</Link>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function useMenu() {
	const user = useUser();
	const isAdmin = user.role === 'superadmin' || user.role === 'admin';

	return completeMenu
		.filter(item => {
			if (item.isAdminRoute) return isAdmin;
			return true;
		})
		.map(item => {
			return {
				...item,
				items: item.items.filter(subItem => {
					if (subItem.isAdminRoute) return isAdmin;
					return true;
				}),
			};
		});
}

type MenuItemType = {
	name: string;
	items: Array<{
		name: string;
		icon: string;
		to: string;
		withDot?: boolean;
		isAdminRoute?: boolean;
	}>;
	isAdminRoute?: boolean;
};

const completeMenu: Array<MenuItemType> = [
	{
		name: 'Empresa',
		items: [
			{
				name: 'Ajustes de empresa',
				icon: 'ri-equalizer-line',
				to: '/settings',
			},
			{
				name: 'Referidos',
				icon: 'ri-group-line',
				to: '/settings/affiliates',
				withDot: true,
			},
			{ name: 'Ver clientes', icon: 'ri-user-line', to: '/clients' },
			{
				name: 'Ver proveedores',
				icon: 'ri-folder-user-line',
				to: '/suppliers',
			},
			{ name: 'Ver tesorería', icon: 'ri-treasure-map-line', to: '/treasury' },
			{
				name: 'Catálogo virtual y pedidos',
				icon: 'ri-shopping-cart-line',
				to: '/store',
			},
			{
				name: 'Nómina electrónica',
				icon: 'ri-profile-line',
				to: '/payroll',
				isAdminRoute: true,
			},
		],
	},
	{
		name: 'Inventario',
		items: [
			{
				name: 'Productos',
				icon: 'ri-instance-line',
				to: '/products',
			},
			{
				name: 'Ingresos y salidas',
				icon: 'ri-arrow-left-right-line',
				to: '/stock-settings',
			},
			{
				name: 'Atributos de inventario',
				icon: 'ri-barcode-box-line',
				to: '/inventory-attributes',
			},
		],
	},
	{
		name: 'Facturación',
		items: [
			{
				name: 'Venta POS',
				icon: 'ri-shopping-cart-line',
				to: '/invoices/pos/new',
			},
			{
				name: 'Facturas de venta',
				icon: 'ri-file-cloud-line',
				to: '/invoices',
			},
			{
				name: 'Remisiones de venta',
				icon: 'ri-file-unknow-line',
				to: '/invoice-remisions',
			},
			{ name: 'Cotizaciones de venta', icon: 'ri-draft-line', to: '/quotes' },
			{
				name: 'Recepciones de factura',
				icon: 'ri-inbox-archive-fill',
				to: '/invoices/receipts',
			},
			{
				name: 'Notas crédito',
				icon: 'ri-file-upload-line',
				to: '/credit-notes',
			},
			{
				name: 'Notas débito',
				icon: 'ri-file-download-line',
				to: '/debit-notes',
			},
			{ name: 'Historial de cajeros', icon: 'ri-wallet-line', to: '/cashiers' },
			{ name: 'Resoluciones', icon: 'ri-auction-line', to: '/resolutions' },
		],
	},
	{
		name: 'Compras',
		items: [
			{
				name: 'Órdenes de compra',
				icon: 'ri-file-edit-line',
				to: '/purchases',
			},
			{
				name: 'Remisiones de compra',
				icon: 'ri-file-unknow-line',
				to: '/remisions',
			},
			{
				name: 'Facturas de compra',
				icon: 'ri-file-cloud-line',
				to: '/purchase-invoices',
			},
		],
	},
	{
		name: 'Analíticas',
		items: [
			{
				name: 'Analíticas',
				icon: 'ri-line-chart-line',
				to: '/analytics',
			},
			{
				name: 'Estado de cartera',
				icon: 'ri-bank-card-line',
				to: '/analytics/general-report',
			},
			{
				name: 'Reporte contable',
				icon: 'ri-money-dollar-circle-line',
				to: '/analytics/report',
			},
		],
	},
	{
		name: 'Admin',
		isAdminRoute: true,
		items: [
			{
				name: 'Empresas',
				icon: 'ri-user-follow-line',
				to: '/admin/organizations',
			},
			{
				name: 'Pagos',
				icon: 'ri-bank-card-line',
				to: '/admin/payments',
			},
			{
				name: 'Log',
				icon: 'ri-file-list-3-line',
				to: '/log',
			},
		],
	},
];
