import { Link, useNavigate } from '@remix-run/react';
import clsx from 'clsx';
import * as React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { ShorcutIcon } from '~/assets/jsx-icons';
import { useOrganization } from '~/root';
import { cn, getTodayInColombia } from '~/utils/misc';
import { useUpDownNavigation } from '~/utils/use-up-down-navigation';
import { Button, Input, Label } from './form-utils';
import { Modal } from './modal';
import { ButtonIcon } from './ui-library';

type CommandPaletteProps = {
	mobile?: boolean;
	className?: string;
	placeholder?: string;
};
export function CommandPalette({
	mobile,
	className,
	placeholder,
}: CommandPaletteProps) {
	const navigate = useNavigate();
	const [state, dispatch] = React.useReducer(reducer, initialState);
	const organization = useOrganization();

	const inputRef = React.useRef<HTMLInputElement>(null);

	const { isOpen, search, selectedCommand } = state;

	const filteredCommands = React.useMemo(
		() => getFilteredCommands(search),
		[search],
	);
	const {
		getListItemButtonProps,
		activeIndex,
		inputProps,
		onClose: navigationOnClose,
	} = useUpDownNavigation({
		listId: 'commands-list',
		inputId: 'client-search-input',
	});

	useHotkeys(['Meta+m', 'ctrl+m'], () => dispatch({ type: 'open' }), {
		enableOnFormTags: true,
		preventDefault: true,
	});
	useHotkeys(
		'/',
		() => {
			if (!isOpen) return;
			inputRef.current?.focus();
		},
		{ enableOnFormTags: true, preventDefault: true },
		[isOpen],
	);
	useHotkeys('esc', onClose, { enableOnFormTags: true });

	function onClose() {
		dispatch({ type: 'close' });
		navigationOnClose();
	}

	function onSelect(command: Command) {
		if (command.url) {
			onClose();

			const subId = organization?.branches?.[0]?.id as number;
			const url =
				typeof command.url === 'function' ? command.url(subId) : command.url;
			return navigate(url);
		}

		setTimeout(() => dispatch({ type: 'select', payload: command }), 1);
	}

	if (!isOpen) {
		if (mobile) {
			return (
				<ButtonIcon onClick={() => dispatch({ type: 'open' })}>
					<i className="ri-magic-line"></i>
				</ButtonIcon>
			);
		}

		return (
			<div
				className={clsx(
					'flex items-center gap-2 px-2 shadow-sm relative',
					'rounded-md bg-white hover:shadow-lg',
					className,
				)}
			>
				<i className="ri-search-line text-gray-400"></i>

				<Input
					placeholder={placeholder || '¿Qué quieres hacer hoy?'}
					className="w-full border-none !shadow-none pl-0"
					onFocus={() => dispatch({ type: 'open' })}
				/>

				<ShorcutIcon>Ctrl + M</ShorcutIcon>
			</div>
		);
	}

	const Component = selectedCommand
		? commandsComponents[selectedCommand.id]
		: null;
	if (Component) return <Component onClose={onClose} />;

	return (
		<div>
			<div
				className={clsx(
					'flex items-center gap-2 px-2 shadow-sm relative',
					'rounded-md bg-white',
					className,
				)}
			>
				<i className="ri-search-line text-gray-400"></i>

				<Input
					placeholder="¿Qué quieres hacer hoy?"
					className="w-full border-none shadow-none pl-0"
				/>

				<ShorcutIcon>Ctrl + M</ShorcutIcon>
			</div>

			<Modal className="max-w-md p-0 rounded-sm" onClose={onClose}>
				<div className="flex items-center gap-4 px-2 border-b border-gray-200">
					<i className="ri-search-line text-gray-400"></i>

					<label htmlFor="client-search-input" className="sr-only">
						Comando o búsqueda
					</label>
					<input
						type="text"
						id="client-search-input"
						name="text"
						className="block flex-1 h-10 focus:ring-0 focus:outline-none text-sm"
						placeholder="Escribe un comando o búsqueda"
						value={search}
						onChange={e =>
							dispatch({ type: 'search', payload: e.target.value })
						}
						autoComplete="off"
						autoFocus
						ref={inputRef}
						{...inputProps}
					/>

					<button
						className={clsx(
							'shrink-0 border border-transparent hover:border-gray-200 rounded w-6 h-6',
							'flex items-center justify-center',
						)}
						onClick={onClose}
					>
						<i className="ri-close-line text-gray-400"></i>
					</button>
				</div>

				<ul
					className="p-1 max-h-[300px] overflow-y-auto overscroll-y-contain"
					id="commands-list"
				>
					{filteredCommands.length ? (
						filteredCommands.map((command, index) => (
							<li key={command.id}>
								<button
									className={clsx(
										'text-sm px-3 py-2 hover:bg-gray-50 rounded',
										'w-full text-left flex items-center gap-4',
										activeIndex === index && 'bg-gray-100',
									)}
									onClick={() => onSelect(command)}
									type="button"
									{...getListItemButtonProps()}
								>
									<i
										className={clsx(
											command.icon
												? command.icon
												: command.type === 'action'
													? 'ri-add-line'
													: command.type === 'see'
														? 'ri-file-line'
														: command.type === 'go'
															? 'ri-arrow-right-line'
															: '',
											'text-gray-700',
										)}
									></i>
									{command.name}
								</button>
							</li>
						))
					) : (
						<li>
							<p className="text-gray-500 text-center py-4">
								No se encontraron resultados
							</p>
						</li>
					)}
				</ul>
			</Modal>
		</div>
	);
}

function getFilteredCommands(search: string) {
	if (!search) return sortCommandsByType(commands);

	const searchWords = search.split(' ');
	return sortCommandsByType(
		commands.filter(command =>
			searchWords.every(word =>
				command.name.toLowerCase().includes(word.toLowerCase()),
			),
		),
	);
}

function sortCommandsByType(commands: Array<Command>) {
	return commands.sort((a, b) => {
		if (a.type !== b.type) {
			return a.type.localeCompare(b.type);
		}

		if (a.icon && !b.icon) {
			return 1; // Move a to the end
		}

		if (!a.icon && b.icon) {
			return -1; // Move b to the end
		}

		return 0;
	});
}

type Command = {
	id: string;
	name: string;
	url?: string | ((subId: number) => string);
	type: 'see' | 'action' | 'go';
	icon?: string;
};

const commandsComponents = {
	pos: NewPosSaleCommand,
	'new-purchase': NewPurchaseCommand,
	'new-purchase-remision': NewPurchaseRemisionCommand,
	'new-purchase-invoice': NewPurchaseInvoiceCommand,
	'inventory-setting': NewStockSettingCommand,
} as Record<string, React.ComponentType<{ onClose: () => void }>>;

const today = getTodayInColombia();

type State = {
	isOpen: boolean;
	search: string;
	selectedCommand: Command | null;
};
type Action =
	| { type: 'open' }
	| { type: 'close' }
	| { type: 'select'; payload: Command }
	| { type: 'search'; payload: string };

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case 'open':
			return { ...state, isOpen: true };
		case 'close':
			return { ...state, isOpen: false, search: '', selectedCommand: null };
		case 'select':
			return { ...state, selectedCommand: action.payload };
		case 'search':
			return { ...state, search: action.payload };
		default:
			return state;
	}
}

const initialState = { isOpen: false, search: '', selectedCommand: null };

function NewPosSaleCommand({ onClose }: { onClose: () => void }) {
	const { branches } = useBranches();

	return (
		<Modal className="max-w-md" onClose={onClose}>
			<div className="flex justify-between items-start gap-4">
				<div>
					<h4 className="font-bold">Atajo de venta pos</h4>
					<p className="text-gray-500 mb-4 text-sm">
						Selecciona la sucursal en la cual quieres crear la venta
					</p>
				</div>

				<button
					className={clsx(
						'border border-transparent hover:border-gray-200',
						'flex items-center justify-center',
						'shrink-0 rounded w-8 h-8 text-xl',
					)}
					onClick={onClose}
				>
					<i className="ri-close-line text-gray-400"></i>
				</button>
			</div>

			<Label htmlFor="subId">Selecciona una sucursal</Label>

			<ul className="w-full">
				{branches.map(sub => (
					<li key={sub.id}>
						<Link
							className={cn(
								'w-full text-left px-3 py-2 hover:bg-gray-100',
								'flex items-center gap-4 text-sm border-b border-gray-200',
							)}
							onClick={onClose}
							to={`/builder/pos/new/${sub.id}?force=true`}
							prefetch="render"
						>
							<i className="ri-store-2-line"></i>
							<div>
								<p className="font-medium">{sub.name}</p>
								<span className="text-gray-500">{sub.address}</span>
							</div>
						</Link>
					</li>
				))}
			</ul>

			<div className="flex justify-end mt-4">
				<Button variant="secondary" onClick={onClose}>
					Cancelar
				</Button>
			</div>
		</Modal>
	);
}

function NewPurchaseCommand({ onClose }: { onClose: () => void }) {
	const { branches } = useBranches();

	return (
		<Modal className="max-w-md" onClose={onClose}>
			<div className="flex justify-between items-start gap-4">
				<div>
					<h4 className="font-bold">Atajo de órden de compra</h4>
					<p className="text-gray-500 mb-4 text-sm">
						Selecciona la sucursal en la cual quieres crear la compra
					</p>
				</div>

				<button
					className={clsx(
						'border border-transparent hover:border-gray-200',
						'flex items-center justify-center',
						'shrink-0 rounded w-8 h-8 text-xl',
					)}
					onClick={onClose}
				>
					<i className="ri-close-line text-gray-400"></i>
				</button>
			</div>

			<Label htmlFor="subId">Selecciona una sucursal</Label>

			<ul className="w-full">
				{branches.map(sub => (
					<li key={sub.id}>
						<Link
							className={cn(
								'w-full text-left px-3 py-2 hover:bg-gray-100',
								'flex items-center gap-4 text-sm border-b border-gray-200',
							)}
							onClick={onClose}
							to={`/builder/purchase/new/${sub.id}?force=true`}
							prefetch="render"
						>
							<i className="ri-store-2-line"></i>
							<div>
								<p className="font-medium">{sub.name}</p>
								<span className="text-gray-500">{sub.address}</span>
							</div>
						</Link>
					</li>
				))}
			</ul>

			<div className="flex justify-end mt-4">
				<Button variant="secondary" onClick={onClose}>
					Cancelar
				</Button>
			</div>
		</Modal>
	);
}

function NewPurchaseRemisionCommand({ onClose }: { onClose: () => void }) {
	const { branches } = useBranches();

	return (
		<Modal className="max-w-md" onClose={onClose}>
			<div className="flex justify-between items-start gap-4">
				<div>
					<h4 className="font-bold">Atajo de remisión de compra</h4>
					<p className="text-gray-500 mb-4 text-sm">
						Selecciona la sucursal en la cual quieres crear la compra
					</p>
				</div>

				<button
					className={clsx(
						'border border-transparent hover:border-gray-200',
						'flex items-center justify-center',
						'shrink-0 rounded w-8 h-8 text-xl',
					)}
					onClick={onClose}
				>
					<i className="ri-close-line text-gray-400"></i>
				</button>
			</div>

			<Label htmlFor="subId">Selecciona una sucursal</Label>

			<ul className="w-full">
				{branches.map(sub => (
					<li key={sub.id}>
						<Link
							className={cn(
								'w-full text-left px-3 py-2 hover:bg-gray-100',
								'flex items-center gap-4 text-sm border-b border-gray-200',
							)}
							onClick={onClose}
							to={`/builder/purchaseRemision/new/${sub.id}?force=true`}
							prefetch="render"
						>
							<i className="ri-store-2-line"></i>
							<div>
								<p className="font-medium">{sub.name}</p>
								<span className="text-gray-500">{sub.address}</span>
							</div>
						</Link>
					</li>
				))}
			</ul>

			<div className="flex justify-end mt-4">
				<Button variant="secondary" onClick={onClose}>
					Cancelar
				</Button>
			</div>
		</Modal>
	);
}

function NewPurchaseInvoiceCommand({ onClose }: { onClose: () => void }) {
	const { branches } = useBranches();

	return (
		<Modal className="max-w-md" onClose={onClose}>
			<div className="flex justify-between items-start gap-4">
				<div>
					<h4 className="font-bold">Atajo de factura de compra</h4>
					<p className="text-gray-500 mb-4 text-sm">
						Selecciona la sucursal en la cual quieres crear la compra
					</p>
				</div>

				<button
					className={clsx(
						'border border-transparent hover:border-gray-200',
						'flex items-center justify-center',
						'shrink-0 rounded w-8 h-8 text-xl',
					)}
					onClick={onClose}
				>
					<i className="ri-close-line text-gray-400"></i>
				</button>
			</div>

			<Label htmlFor="subId">Selecciona una sucursal</Label>

			<ul className="w-full">
				{branches.map(sub => (
					<li key={sub.id}>
						<Link
							className={cn(
								'w-full text-left px-3 py-2 hover:bg-gray-100',
								'flex items-center gap-4 text-sm border-b border-gray-200',
							)}
							onClick={onClose}
							to={`/builder/purchaseInvoice/new/${sub.id}?force=true`}
							prefetch="render"
						>
							<i className="ri-store-2-line"></i>
							<div>
								<p className="font-medium">{sub.name}</p>
								<span className="text-gray-500">{sub.address}</span>
							</div>
						</Link>
					</li>
				))}
			</ul>

			<div className="flex justify-end mt-4">
				<Button variant="secondary" onClick={onClose}>
					Cancelar
				</Button>
			</div>
		</Modal>
	);
}

function NewStockSettingCommand({ onClose }: { onClose: () => void }) {
	const { branches } = useBranches();

	return (
		<Modal className="max-w-md" onClose={onClose}>
			<div className="flex justify-between items-start gap-4">
				<div>
					<h4 className="font-bold">Atajo de ajuste de inventario</h4>
					<p className="text-gray-500 mb-4 text-sm">
						Selecciona la sucursal en la cual quieres hacer el ajuste
					</p>
				</div>

				<button
					className={clsx(
						'border border-transparent hover:border-gray-200',
						'flex items-center justify-center',
						'shrink-0 rounded w-8 h-8 text-xl',
					)}
					onClick={onClose}
				>
					<i className="ri-close-line text-gray-400"></i>
				</button>
			</div>

			<Label htmlFor="subId">Selecciona una sucursal</Label>

			<ul className="w-full">
				{branches.map(sub => (
					<li key={sub.id}>
						<Link
							className={cn(
								'w-full text-left px-3 py-2 hover:bg-gray-100',
								'flex items-center gap-4 text-sm border-b border-gray-200',
							)}
							onClick={onClose}
							to={`/builder/stockSetting/new/${sub.id}?force=true`}
							prefetch="render"
						>
							<i className="ri-store-2-line"></i>
							<div>
								<p className="font-medium">{sub.name}</p>
								<span className="text-gray-500">{sub.address}</span>
							</div>
						</Link>
					</li>
				))}
			</ul>

			<div className="flex justify-end mt-4">
				<Button variant="secondary" onClick={onClose}>
					Cancelar
				</Button>
			</div>
		</Modal>
	);
}

function useBranches() {
	const { branches } = useOrganization();
	return { branches };
}

const commands = [
	{
		id: 'pos',
		name: 'Crear venta pos',
		type: 'action',
	},
	{
		id: 'electronic',
		name: 'Crear factura electrónica',
		url: '/builder/electronic/new',
		type: 'go',
	},
	{
		id: 'electronic-receipt',
		name: 'Recibir factura electrónica',
		url: '/invoices/receipts/new',
		type: 'action',
	},
	{
		id: 'electronic-receipt-see',
		name: 'Ver recepciones de factura',
		type: 'see',
		url: '/invoices/receipts',
	},
	{
		id: 'see-electronic-invoices',
		name: 'Ver lista de facturas electrónicas',
		type: 'see',
		url: '/invoices?type=electronic',
	},
	{
		id: 'product',
		name: 'Crear producto',
		url: '/products/new',
		type: 'action',
	},
	{
		id: 'product-without-stock',
		name: 'Ver productos sin stock',
		url: '/products?stock=outOfStock',
		type: 'see',
	},
	{
		id: 'product-min-stock',
		name: 'Ver productos con stock bajo el mínimo',
		url: '/products?stock=minStock',
		type: 'see',
	},
	{
		id: 'product-max-stock',
		name: 'Ver productos con stock arriba del máximo',
		url: '/products?stock=maxStock',
		type: 'see',
	},
	{
		id: 'product-expired',
		name: 'Ver productos vencidos',
		url: '/products?expiry=expired',
		type: 'see',
	},
	{
		id: 'product-close-to-expire',
		name: 'Ver productos por vencer',
		url: '/products?expiry=closeToExpire',
		type: 'see',
	},
	{
		id: 'cashier-report',
		name: 'Ver reporte de cajeros del día',
		url: `/cashiers?print=true&start=${today}&end=${today}`,
		type: 'see',
	},
	{
		id: 'profits',
		name: 'Ver ganancias del mes',
		url: '/analytics/report',
		type: 'see',
	},
	{
		id: 'wallet-status',
		name: 'Ver estado de cartera',
		url: '/analytics/general-report',
		type: 'see',
	},
	{
		id: 'clients-in-debt',
		name: 'Ver clientes con deudas',
		url: '/debt/clients',
		type: 'see',
	},
	{
		id: 'suppliers-in-debt',
		name: 'Ver mi deuda con proveedores',
		url: '/debt/suppliers',
		type: 'see',
	},
	{
		id: 'home',
		name: 'Ir al inicio',
		url: '/home',
		type: 'go',
	},
	{
		id: 'inventory-setting',
		name: 'Crear ajuste de inventario',
		type: 'action',
	},
	{
		id: 'all-products',
		name: 'Ver lista de productos',
		url: '/products',
		type: 'see',
	},
	{
		id: 'all-invoices',
		name: 'Ver lista de facturas',
		url: '/invoices',
		type: 'see',
	},
	{
		id: 'logout',
		name: 'Cerrar sesión',
		icon: 'ri-logout-circle-r-line',
		url: '/logout',
		type: 'action',
	},
	{
		id: 'all-settings',
		name: 'Ver lista de ajustes de inventario',
		url: '/stock-settings',
		type: 'see',
	},
	{
		id: 'all-purchases',
		name: 'Ver lista de órdenes de compra',
		url: '/purchases',
		type: 'see',
	},
	{
		id: 'new-purchase',
		name: 'Crear órden de compra',
		type: 'action',
	},
	{
		id: 'all-purchase-remisions',
		name: 'Ver lista de remisiones de compra',
		url: '/remisions',
		type: 'see',
	},
	{
		id: 'new-purchase-remision',
		name: 'Crear remisión de compra',
		type: 'action',
	},
	{
		id: 'all-purchase-invoices',
		name: 'Ver lista de facturas de compra',
		url: '/purchase-invoices',
		type: 'see',
	},
	{
		id: 'new-purchase-invoice',
		name: 'Crear factura de compra',
		type: 'action',
	},
	{
		id: 'all-sale-remisions',
		name: 'Ver lista de remisiones de venta',
		url: '/invoice-remisions',
		type: 'see',
	},
	{
		id: 'new-sale-remision',
		name: 'Crear remisión de venta',
		url: '/builder/remision/new',
		type: 'action',
	},
	{
		id: 'all-quotes',
		name: 'Ver lista de cotizaciones de venta',
		url: '/quotes',
		type: 'see',
	},
	{
		id: 'settings',
		name: 'Ajustes de empresa',
		url: '/settings',
		type: 'see',
	},
	{
		id: 'members',
		name: 'Ver miembros de la empresa',
		url: '/settings/members',
		type: 'see',
	},
	{
		id: 'suborgs',
		name: 'Ver sucursales',
		url: '/settings/branches',
		type: 'see',
	},
	{
		id: 'treasury',
		name: 'Ver gastos y tesorería',
		url: '/treasury',
		type: 'see',
	},
	{
		id: 'treasury-new',
		name: 'Crear gasto',
		url: '/treasury/new',
		type: 'go',
	},
	{
		id: 'store',
		name: 'Ver pedidos del catálogo',
		url: '/store/orders',
		type: 'see',
	},
	{
		id: 'store-settings',
		name: 'Ajustes del catálogo',
		url: '/store/settings',
		type: 'see',
	},
	{
		id: 'all-clients',
		name: 'Ver lista de clientes',
		url: '/clients',
		type: 'see',
	},
	{
		id: 'new-client',
		name: 'Crear cliente',
		url: '/clients/new',
		type: 'action',
	},
	{
		id: 'all-suppliers',
		name: 'Ver lista de proveedores',
		url: '/suppliers',
		type: 'see',
	},
	{
		id: 'new-supplier',
		name: 'Crear proveedor',
		url: '/suppliers/new',
		type: 'action',
	},
	{
		id: 'to-pay',
		name: 'Ver cuentas por pagar',
		url: '/analytics/accounts/suppliers',
		type: 'go',
	},
	{
		id: 'to-invoice',
		name: 'Ver cuentas por cobrar',
		url: '/analytics/accounts/clients',
		type: 'go',
	},
	{
		id: 'create-payroll',
		name: 'Crear nómina',
		url: '/payroll?new=true',
		type: 'go',
	},
	{
		id: 'see-payroll',
		name: 'Ver nóminas electrónicas',
		url: '/payroll',
		type: 'go',
	},
	{
		id: 'create-employee',
		name: 'Crear empleado',
		url: '/payroll/employees/new',
		type: 'go',
	},
	{
		id: 'create-template',
		name: 'Crear plantilla de nómina',
		url: '/payroll/templates/new',
		type: 'go',
	},
	{
		id: 'import-products',
		name: 'Importar productos masivamente',
		url: '/products/import',
		type: 'go',
	},
	{
		id: 'pay-social-security',
		name: 'Pagar seguridad social de abril',
		url: '/payroll/social-security/Abril',
		type: 'go',
	},
	{
		id: 'add-user',
		name: 'Agregar o invitar usuario',
		url: '/settings/invitations',
		type: 'go',
	},
	{
		id: 'preferences',
		name: 'Mostrar información de la empresa en remisiones',
		url: '/settings/preferences',
		type: 'go',
	},
	{
		id: 'owed-detail',
		name: 'Ver detalle de cuentas por cobrar',
		url: '/analytics/accounts/clients-detail',
		type: 'go',
	},
	{
		id: 'to-pay-detail',
		name: 'Ver detalle de cuentas por pagar',
		url: '/analytics/accounts/suppliers-detail',
		type: 'go',
	},
	{
		id: 'see-best-sellers',
		name: 'Ver productos más vendidos',
		url: (subId: number) => `/analytics/inventory-report/${subId}`,
		type: 'go',
	},
] satisfies Array<Command>;
