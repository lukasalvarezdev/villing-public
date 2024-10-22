import {
	json,
	redirect,
	type LoaderFunctionArgs,
	type MetaFunction,
} from '@remix-run/node';
import {
	Link,
	useLoaderData,
	useLocation,
	useSearchParams,
} from '@remix-run/react';
import * as React from 'react';
import { ShorcutIcon } from '~/assets/jsx-icons';
import { ChartMockup } from '~/components/chart-mockup';

import {
	Button,
	Input,
	Label,
	LinkButton,
	Select,
} from '~/components/form-utils';
import { ImageWithFallback } from '~/components/image-with-fallback';
import {
	LandingFooter,
	LandingHeader,
	WPPURL,
} from '~/components/landing-header';
import {
	Box,
	Container,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeadCell,
	TableRow,
} from '~/components/ui-library';
import { getUserEmailByToken } from '~/utils/auth.server';
import { __prisma } from '~/utils/db.server';
import * as gtag from '~/utils/gtag.client';
import { cn, formatCurrency } from '~/utils/misc';

export const meta: MetaFunction = () => [
	{
		title: 'Villing - Software contable y de facturación para pymes',
		description:
			'Villing es un software contable y de facturación hecho por comerciantes para comerciantes. Es simple, humano y completo.',
	},
];

export async function loader({ request }: LoaderFunctionArgs) {
	const email = await getUserEmailByToken(request);

	if (email) {
		try {
			const user = await __prisma.user.findUnique({
				where: { email },
				select: {
					organizations: { select: { organizationId: true } },
				},
			});

			if (!user?.organizations) return redirect('/home');
			return redirect('/start');
		} catch (error) {
			return redirect('/home');
		}
	}

	return json({ gaTrackingId: process.env.GA_TRACKING_ID });
}

export default function Component() {
	const location = useLocation();
	const { gaTrackingId } = useLoaderData<typeof loader>();
	const [searchParams] = useSearchParams();
	const layout = searchParams.get('l');
	type Key = keyof typeof layoutTexts;
	const texts = layoutTexts[layout as Key] || layoutTexts['default'];

	React.useEffect(() => {
		if (gaTrackingId?.length) {
			gtag.pageview(location.pathname, gaTrackingId);
		}
	}, [location, gaTrackingId]);

	return (
		<main className="h-full overflow-x-hidden scroll-p-0 bg-[#fafafa]">
			<LandingHeader />
			<Container className="max-w-5xl mx-auto pt-44 md:border-x border-gray-200">
				<div className="mb-32">
					<h1
						className={cn(
							'text-3xl lg:text-4xl max-w-[1000px] mx-auto mb-4',
							'leading-none font-bold text-center',
						)}
					>
						<span>{texts.title}.</span>{' '}
						<span className="text-gray-500">{texts.grayTitle}</span>
					</h1>
					<p className="text-sm md:text-lg text-gray-500 text-center mb-6 max-w-2xl mx-auto">
						{texts.description}
					</p>

					<div className="flex flex-col md:flex-row gap-2 md:gap-4 justify-center mx-auto font-medium">
						<LinkButton to="/join" prefetch="intent" size="lg">
							Empieza gratis a usarlo
						</LinkButton>
						<LinkButton
							to={WPPURL}
							variant="secondary"
							size="lg"
							target="_blank"
							rel="noopener noreferrer"
						>
							<i className="ri-whatsapp-line"></i>
							Escríbenos por WhatsApp
						</LinkButton>
					</div>
				</div>

				<div className="relative">
					<div
						className="static w-[calc(100%+8rem)]"
						style={{
							transform: 'translateX(-4rem)',
						}}
					>
						<hr
							className="border-t border-gray-200 flex-1"
							style={{
								borderLeft: '100px solid transparent',
								borderRight: '100px solid transparent',
							}}
						/>
					</div>

					<Features />
				</div>
			</Container>

			<Store />
			<Reports />
			<Prices />

			<div
				className={cn(
					'bg-white p-8 border-t border-gray-200',
					'md:border-x border-gray-200 max-w-5xl mx-auto',
				)}
				id="contactanos"
			>
				<h5 className="font-bold mb-4 max-w-md">
					Listo para sistematizar?{' '}
					<span className="text-gray-500">
						Comienza a mejorar la gestión de tu negocio con una cuenta gratuita.
					</span>
				</h5>

				<div className="flex flex-col md:flex-row gap-4">
					<LinkButton
						variant="primary"
						to={WPPURL}
						target="_blank"
						rel="noopener noreferrer"
					>
						<i className="ri-whatsapp-line"></i>
						Escríbenos por WhatsApp
					</LinkButton>
					<LinkButton variant="secondary" to="/join" prefetch="intent">
						Empezar gratis
					</LinkButton>
				</div>
			</div>

			<LandingFooter />
		</main>
	);
}

type ActiveFeature = 'pos' | 'catalog' | 'invoice' | 'reports';

function FeatureItem({
	active,
	onClick,
	title,
}: {
	active: boolean;
	onClick: () => void;
	title: string;
}) {
	return (
		<button
			className={cn(
				'font-bold rounded-full',
				'px-4 py-1 border border-gray-200 shadow-sm',
				'hover:bg-black hover:text-white transition-colors',
				active && 'bg-black text-white',
			)}
			onClick={onClick}
		>
			{title}
		</button>
	);
}

function Features() {
	const [active, setActive] = React.useState<ActiveFeature>('pos');

	return (
		<div className="flex flex-col lg:flex-row" id="funcionalidades">
			<div className="lg:w-1/4 py-6 md:p-6">
				<h3 className="mb-6 text-2xl">Los mejores en</h3>

				<div className="flex flex-wrap gap-4 text-gray-600 text-lg">
					<FeatureItem
						active={active === 'pos'}
						onClick={() => setActive('pos')}
						title="POS"
					/>
					<FeatureItem
						active={active === 'catalog'}
						onClick={() => setActive('catalog')}
						title="Catálogo"
					/>
					<div className="lg:hidden">
						<FeatureItem
							active={active === 'invoice'}
							onClick={() => setActive('invoice')}
							title="DIAN"
						/>
					</div>
					<div className="hidden lg:block">
						<FeatureItem
							active={active === 'invoice'}
							onClick={() => setActive('invoice')}
							title="Factura electrónica"
						/>
					</div>
					<FeatureItem
						active={active === 'reports'}
						onClick={() => setActive('reports')}
						title="Reportes"
					/>
				</div>
			</div>

			<div className="w-1 hidden lg:block">
				<hr
					className="border-l border-gray-200 h-[calc(100%+8rem)]"
					style={{
						borderTop: '100px solid transparent',
						borderBottom: '100px solid transparent',
						transform: 'translateY(-4rem)',
					}}
				/>
			</div>
			<div className="flex-1 md:p-6">
				{active === 'pos' ? <PosFeatures /> : null}
				{active === 'invoice' ? <InvoiceFeatures /> : null}
				{active === 'catalog' ? <CatalogFeatures /> : null}
				{active === 'reports' ? <ReportFeatures /> : null}
			</div>
		</div>
	);
}

function PosFeatures() {
	return (
		<div>
			<p className="text-sm text-gray-500 mb-1">
				<i className="ri-shopping-cart-line mr-2"></i>
				Agilidad y rapidez en tu punto de venta
			</p>
			<h4 className="mb-6">Un balance entre agradable y eficaz</h4>

			<div className="relative">
				<div className="max-w-md md:mx-auto mb-6 md:mb-0">
					<div className="flex justify-center w-full">
						<Search />
					</div>

					<div className="justify-between px-10 w-full hidden md:flex">
						<VerticalLines />
						<VerticalLines className="justify-end" />
					</div>
				</div>

				<div className="flex flex-col md:flex-row gap-6">
					<div className="flex-1 max-w-sm">
						<SaleSummary />
					</div>
					<InvoiceAcions />
				</div>
			</div>
		</div>
	);
}

function InvoiceFeatures() {
	return (
		<div>
			<p className="text-sm text-gray-500 mb-1">
				<i className="ri-file-text-line mr-2"></i>
				Facturación electrónica sencilla y rápida
			</p>
			<h4 className="mb-6">Deja atrás el tabú de facturar electrónicamente</h4>

			<div className="relative">
				<div className="max-w-md mx-auto">
					<ResolutionSelect />
					<div className="flex justify-center w-full">
						<VerticalLines className="max-w-max" />
					</div>

					<DianSummary />
				</div>
			</div>
		</div>
	);
}

function CatalogFeatures() {
	return (
		<div className="h-full flex flex-col">
			<div className="mb-6">
				<p className="text-sm text-gray-500 mb-1">
					<i className="ri-store-2-line mr-2"></i>
					Sincroniza tu inventario automáticamente
				</p>
				<h4>Una tienda virtual sin pasos extras</h4>
			</div>

			<div className="relative flex-1 flex flex-col lg:flex-row gap-6 lg:gap-0">
				<div className="flex lg:flex-col flex-wrap lg:justify-around h-full flex-1 gap-4">
					<div className="relative">
						<Button
							variant="secondary"
							className="rounded-full font-medium max-w-max relative z-10"
						>
							<i className="ri-instance-line mr-2"></i>
							Tu inventario
						</Button>

						<HorizontalLines className="hidden lg:flex" />
					</div>

					<div className="relative">
						<Button
							variant="secondary"
							className="rounded-full font-medium max-w-max relative z-10"
						>
							<i className="ri-cloud-line mr-2"></i>
							La nube
						</Button>

						<HorizontalLines className="hidden lg:flex" />
					</div>

					<div className="relative">
						<Button
							variant="secondary"
							className="rounded-full font-medium max-w-max relative z-10"
						>
							<i className="ri-pen-nib-line mr-2"></i>
							Personalización
						</Button>

						<HorizontalLines className="hidden lg:flex" />
					</div>
				</div>

				<div className="h-full w-2 border-x border-gray-200 bg-white relative hidden lg:block">
					<div
						className={cn(
							'absolute bg-white h-12 w-12 border border-gray-200 rounded-md',
							'flex items-center justify-center z-10',
						)}
						style={{
							transform: 'translate(-50%, -50%)',
							top: '50%',
							left: '50%',
						}}
					>
						<img
							src="/img/villing-logo.svg"
							alt="Logo de Villing"
							className="h-8 w-8"
						/>
					</div>
				</div>
				<div className="flex-1 h-[400px] flex justify-center relative">
					<img
						src="/img/phone.png"
						alt="Catálogo virtual"
						height="400"
						className="object-contain max-h-full max-w-full relative z-10"
					/>
					<HorizontalLines className="w-1/2 left-0 top-[50%] -translate-y-[50%]" />
				</div>
			</div>
		</div>
	);
}

function ReportFeatures() {
	return (
		<div>
			<p className="text-sm text-gray-500 mb-1">
				<i className="ri-line-chart-line mr-2"></i>
				Análisis de datos y reportes
			</p>
			<h4 className="mb-6">Datos relevantes y en tiempo real</h4>

			<div className="h-[300px]">
				<ChartMockup />
			</div>
		</div>
	);
}

function HorizontalLines({ className }: { className?: string }) {
	return (
		<div
			className={cn('flex flex-col gap-1 absolute w-full top-3.5', className)}
		>
			<hr className="border-t border-gray-200 border-dashed w-full" />
			<hr className="border-t border-gray-200 border-dashed w-full" />
			<hr className="border-t border-gray-200 border-dashed w-full" />
		</div>
	);
}

function VerticalLines({ className }: { className?: string }) {
	return (
		<div className={cn('flex gap-3 h-20 w-full', className)}>
			<hr className="border-l border-gray-200 border-dashed h-full" />
			<hr className="border-l border-gray-200 border-dashed h-full" />
			<hr className="border-l border-gray-200 border-dashed h-full" />
			<hr className="border-l border-gray-200 border-dashed h-full" />
		</div>
	);
}

function FeatureMockupContainer({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				'border border-gray-200 rounded-lg p-4 flex-1 max-w-md bg-white',
				className,
			)}
		>
			<BrowserButtons />
			{children}
		</div>
	);
}

function BrowserButtons() {
	return (
		<div className="flex gap-2 mb-4">
			<span className={cn('w-2.5 h-2.5 rounded-full bg-[#E5484D]')} />
			<span className={cn('w-2.5 h-2.5 rounded-full bg-[#51AEFE]')} />
			<span className={cn('w-2.5 h-2.5 rounded-full bg-[#44DEC4]')} />
		</div>
	);
}

function SaleSummary() {
	return (
		<FeatureMockupContainer className="max-w-sm">
			<div className="flex justify-between items-center">
				<p className="font-medium text-sm">Total:</p>
				<p className="font-bold text-xl">${formatCurrency(150000)}</p>
			</div>
			<Button className="w-full mt-2 font-medium">Terminar venta</Button>
		</FeatureMockupContainer>
	);
}

function InvoiceAcions() {
	return (
		<div
			className={cn(
				'border border-gray-200 rounded-lg bg-white',
				'max-w-60 p-0 flex-1 overflow-hidden',
			)}
		>
			<div className="p-4 pb-0">
				<BrowserButtons />
			</div>
			<ul className="text-sm">
				<li
					className={cn(
						'border-y border-gray-200 flex justify-between',
						'px-4 py-2 hover:bg-gray-50 cursor-pointer',
					)}
				>
					<p>Vender sin imprimir</p>
					<p className="text-gray-400">Ctrl + U</p>
				</li>
				<li
					className={cn(
						'border-b border-gray-200 flex justify-between',
						'px-4 py-2 hover:bg-gray-50 cursor-pointer',
					)}
				>
					<p>Cotización de venta</p>
					<p className="text-gray-400">Ctrl + K</p>
				</li>
				<li
					className={cn(
						'border-b border-gray-200 flex justify-between',
						'px-4 py-2 hover:bg-gray-50 cursor-pointer',
					)}
				>
					<p>Factura electrónica</p>
					<p className="text-gray-400">Ctrl + I</p>
				</li>
				<li
					className={cn(
						'flex justify-between cursor-pointer',
						'px-4 py-2 hover:bg-gray-50',
					)}
				>
					<p>Remisión de venta</p>
					<p className="text-gray-400">Ctrl + J</p>
				</li>
			</ul>
		</div>
	);
}

function Search() {
	return (
		<FeatureMockupContainer>
			<Label htmlFor="search">Agrega un nuevo artículo</Label>
			<div className="relative">
				<Input
					id="search"
					placeholder="Búsqueda avanzada con atajos de teclado"
					readOnly
				/>
				<ShorcutIcon>/</ShorcutIcon>
			</div>
		</FeatureMockupContainer>
	);
}

function ResolutionSelect() {
	return (
		<FeatureMockupContainer>
			<Label htmlFor="resolution">Resolución de transacción</Label>
			<Select
				id="resolution"
				readOnly
				options={[{ label: 'FE (02/02/2024 - 02/02/2025)', value: 'invoice' }]}
			/>
		</FeatureMockupContainer>
	);
}

function DianSummary() {
	const [confirmed, setConfirmed] = React.useState(false);

	return (
		<FeatureMockupContainer className="max-w-md">
			<div className="flex mb-4 items-center gap-2">
				<input
					type="checkbox"
					checked={confirmed}
					onChange={e => setConfirmed(e.target.checked)}
					className="checkbox"
					id="confirmed"
				/>
				<label className="text-gray-700" htmlFor="confirmed">
					Confirmo que esta factura se envie a la DIAN
				</label>
			</div>
			<Button
				className="w-full mt-2 font-medium transition-colors duration-500"
				disabled={!confirmed}
			>
				Crear factura electrónica
			</Button>
		</FeatureMockupContainer>
	);
}

function Store() {
	return (
		<div
			id="store"
			className={cn(
				'pt-6 md:border-x border-gray-200',
				'md:w-[95%] mx-auto md:max-w-5xl',
			)}
		>
			<div
				className="static w-[calc(100%+8rem)]"
				style={{
					transform: 'translateX(-4rem)',
				}}
			>
				<hr
					className="border-t border-gray-200 flex-1"
					style={{
						borderLeft: '100px solid transparent',
						borderRight: '100px solid transparent',
					}}
				/>
			</div>

			<div className="py-12">
				<H2 className="text-center">
					<span className="block">
						Crea tu página web sin pasos extras{' '}
						<i className="ri-arrow-left-right-line ml-2"></i>
					</span>
					<span className="block">
						ni costos adicionales <i className="ri-wallet-line ml-2"></i>
					</span>
				</H2>
			</div>

			<div className="border-t border-gray-200 flex flex-col md:flex-row">
				<div className="flex-1 p-6 md:border-r border-gray-200">
					<p className="text-sm text-gray-500 mb-1">
						<i className="ri-loop-right-line mr-2"></i>
						Sincronización instantánea
					</p>
					<h4 className="mb-6">Selecciona tus mejores productos</h4>

					<ProductsTable />
				</div>

				<div className="flex-1 p-6 md:border-l border-transparent">
					<p className="text-sm text-gray-500 mb-1">
						<i className="ri-line-chart-line mr-2"></i>
						Todo en tiempo real
					</p>
					<h4 className="mb-6">Tu inventario se refleja en tu tienda</h4>

					<div className="p-6 border border-gray-200 rounded-lg bg-white flex gap-4 max-w-max">
						<ProductCard
							product={{ name: 'SHAMPOO LISO MÁGICO', price: 10000 }}
							image="/img/cebolla.jpeg"
						/>
						<ProductCard
							product={{ name: 'KIT MARIANA ZAPATA', price: 14000 }}
							image="/img/shampoo-rosado.jpeg"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}

function PercentageToast({ percentage }: { percentage: number }) {
	return (
		<span
			className={cn(
				'px-2 text-xs',
				'flex items-center rounded-full',
				'bg-[#EAF4FF] text-[#0568D7]',
			)}
		>
			+{percentage}%
		</span>
	);
}

function ProductsTable() {
	return (
		<div className="rounded-lg border border-gray-200 shadow-sm mb-4 bg-white">
			<Table>
				<TableHead>
					<TableHeadCell>
						<input type="checkbox" readOnly disabled />
					</TableHeadCell>
					<TableHeadCell>No.</TableHeadCell>
					<TableHeadCell>Precio</TableHeadCell>
				</TableHead>
				<TableBody>
					<ProductItem
						product={{ name: 'SHAMPOO LISO MÁGICO', price: 10000 }}
						readOnly
					/>
					<ProductItem product={{ name: 'KIT MARIANA ZAPATA', price: 14000 }} />
				</TableBody>
			</Table>
		</div>
	);
}

function ProductItem({
	product,
	readOnly,
}: {
	product: { name: string; price: number };
	readOnly?: boolean;
}) {
	return (
		<TableRow>
			<TableCell>
				<input type="checkbox" readOnly defaultChecked={readOnly} disabled />
			</TableCell>
			<TableCell className="text-sm">
				<p>{product.name}</p>
			</TableCell>
			<TableCell className="text-sm">
				${formatCurrency(product.price)}
			</TableCell>
		</TableRow>
	);
}

function ProductCard({
	product,
	image,
}: {
	product: { name: string; price: number };
	image?: string;
}) {
	return (
		<div className="group flex-1">
			<div
				className={cn(
					'aspect-w-1 aspect-h-1 aspect-square mb-4 relative overflow-hidden rounded-md',
					'w-30 h-30 md:w-32 md:h-32 lg:w-40 lg:h-40',
				)}
			>
				<ImageWithFallback src={image || ''} alt={product.name} />

				<div className="absolute bottom-4 right-4">
					<button
						className={cn(
							'w-10 h-10 bg-white shadow text-black rounded-full',
							'flex items-center justify-center text-xl',
							'md:translate-x-16 relative',
							'md:group-hover:translate-x-2 transition-all duration-300 ease-in-out',
							'hover:bg-black hover:text-white',
						)}
						type="button"
					>
						<i className="ri-shopping-bag-line"></i>
					</button>
				</div>
			</div>
			<div className="flex flex-col md:gap-4 justify-between">
				<h4
					className={cn(
						'font-medium text-sm text-gray-700',
						'md:group-hover:underline',
					)}
				>
					{product.name}
				</h4>
				<p className="font-bold">${formatCurrency(product.price)}</p>
			</div>
		</div>
	);
}

function Reports() {
	return (
		<div
			className={cn(
				'md:border-x border-gray-200',
				'md:w-[95%] mx-auto md:max-w-5xl',
			)}
		>
			<div className="bg-white border-t border-gray-200 p-6 pr-10">
				<p className="text-sm text-gray-500 mb-1">
					<i className="ri-line-chart-line mr-2"></i>
					Observabilidad y agilidad
				</p>
				<h4 className="mb-6">Mantente al tanto de los datos más importantes</h4>

				<div className="h-[300px]">
					<ChartMockup />
				</div>
			</div>

			<div className="border-t border-gray-200 flex flex-col md:flex-row">
				<div className="flex-1 p-6 md:border-r border-gray-200">
					<p className="text-sm text-gray-500 mb-1">
						<i className="ri-loop-right-line mr-2"></i>
						Capacidad multi sucursal
					</p>
					<h4 className="mb-6">Maneja varios negocios en uno</h4>

					<BranchesSales />
				</div>

				<div className="flex-1 p-6 border-l border-transparent">
					<p className="text-sm text-gray-500 mb-1">
						<i className="ri-line-chart-line mr-2"></i>
						Reportes contables
					</p>
					<h4 className="mb-6">Toma decisiones con datos</h4>

					<div
						className={cn(
							'rounded-lg border border-gray-200 shadow-sm bg-white flex mb-6',
							'flex-col md:flex-row',
						)}
					>
						<div className="flex-1 border-b lg:border-b-0 lg:border-r border-gray-200 p-6">
							<p className="text-xs text-gray-400 mb-1">Ventas totales</p>
							<div className="flex gap-2">
								<p className="font-bold text-xl">${formatCurrency(5900000)}</p>
								<PercentageToast percentage={55} />
							</div>
						</div>
						<div className="flex-1 p-6 border-l border-transparent">
							<p className="text-xs text-gray-400 mb-1">Costos totales</p>
							<p className="font-bold text-xl">${formatCurrency(3900000)}</p>
						</div>
					</div>

					<div
						className={cn(
							'rounded-lg border border-gray-200 shadow-sm bg-white flex mb-6',
							'flex-col md:flex-row',
						)}
					>
						<div className="flex-1 border-b lg:border-b-0 lg:border-r border-gray-200 p-6">
							<p className="text-xs text-gray-400 mb-1">Impuestos totales</p>
							<p className="font-bold text-xl">${formatCurrency(900000)}</p>
						</div>
						<div className="flex-1 p-6 border-l border-transparent">
							<p className="text-xs text-gray-400 mb-1">Utilidades</p>
							<div className="flex gap-2">
								<p className="font-bold text-xl">${formatCurrency(2000000)}</p>
								<PercentageToast percentage={33.9} />
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function BranchesSales() {
	const colors = ['#1ABC9C', '#0B5345', '#F4D03F', '#9B59B6', '#E74C3C'];
	const branches = [
		{ id: 1, name: 'Sucursal Envigado', total: 2000000, percentage: 40 },
		{ id: 3, name: 'Sucursal Medellín', total: 1500000, percentage: 30 },
		{ id: 2, name: 'Sucursal Sabaneta', total: 1000000, percentage: 20 },
		{ id: 4, name: 'Sucursal La Estrella', total: 400000, percentage: 10 },
	];

	return (
		<div className="rounded-lg p-6 border border-gray-200 bg-white">
			<div>
				<p className="mb-4 font-bold text-xl md:text-xl">
					${formatCurrency(4900000)} ventas
				</p>
			</div>

			<span className="h-2 flex items-center rounded-sm overflow-hidden mb-4">
				{branches.map((branch, index) => (
					<span
						key={branch.id}
						className="h-2"
						style={{
							backgroundColor: colors[index],
							width: `${branch.percentage}%`,
						}}
					></span>
				))}
			</span>

			<div className="flex flex-col gap-2">
				{branches.map((branch, index) => (
					<div
						className="flex gap-4 justify-between items-center"
						key={branch.id}
					>
						<div className="flex gap-2 items-center">
							<span
								className="h-3 w-3 rounded-full"
								style={{ backgroundColor: colors[index] }}
							></span>
							<p className="text-sm">{branch.name}</p>
						</div>

						<p className="font-bold">${formatCurrency(branch.total)}</p>
					</div>
				))}
			</div>
		</div>
	);
}

function Prices() {
	return (
		<Container
			className={cn(
				'pt-6 border-t border-gray-200 pb-6',
				'md:border-x border-gray-200 max-w-5xl',
			)}
			id="precios"
		>
			<H2 className="text-center mb-6">Precios simples, para todos</H2>

			<div className="flex flex-col md:flex-row children:flex-1 gap-6 justify-center max-w-4xl mx-auto">
				<PricingCard
					name="Emprendedor"
					description="Todo lo necesario para tu pyme"
					features={[
						'100 facturas electrónicas',
						'Ventas y compras infinitas',
						'3 usuarios',
						'1 sucursal',
						'Soporte gratis',
						'Analíticas',
					]}
					price={`${formatCurrency(69900)}`}
					featured
				/>
				<PricingCard
					name="Pro"
					description="Plan Emprendedor, además de límites más altos"
					features={[
						'500 facturas electrónicas',
						'Hasta 10 usuarios',
						'Hasta 3 sucursales',
					]}
					price={`${formatCurrency(129900)}`}
				/>
				<PricingCard
					name="Enterprise"
					description="Para empresas grandes y con necesidades especiales"
					features={[
						'Facturas electrónicas ilimitadas',
						'Usuarios ilimitados',
						'Sucursales ilimitadas',
					]}
					price="Personalizado"
				/>
			</div>

			<p className="text-sm text-gray-500 text-center my-6 max-w-md mx-auto">
				Prueba Villing gratis por 10 días, sin datos de pago. Sin contratos ni
				compromisos. Cancela cuando quieras.
			</p>

			<h3 className="text-center mb-4">Lo que dicen los comerciantes</h3>

			<Container
				className={cn(
					'justify-center flex mx-auto text-sm',
					'max-w-4xl gap-6 flex-col md:flex-row',
				)}
			>
				<Testimonial
					name="Arbey Zuluaga"
					role="Comerciante de cueros"
					starsType="half"
					text="Nunca había encontrado una forma más facil de hacer las facturas diarias."
				/>
				<Testimonial
					name="Yeni Sea"
					role="Comerciante"
					starsType="full"
					text="Nunca esperé encontrar un programa que se adapte tanto a mis necesidades."
				/>
				<Testimonial
					name="Anderson Alzate"
					role="Comerciante de ropa"
					starsType="full"
					text="Villing me permitió llevar un inventario más riguroso y controlar mis ventas."
				/>
			</Container>
		</Container>
	);
}

function PricingCard({
	description,
	features,
	name,
	price,
	featured,
}: {
	name: string;
	price: string;
	description: string;
	features: Array<string>;
	featured?: boolean;
}) {
	return (
		<Box className="p-6 rounded-lg border-gray-200 flex flex-col justify-between">
			<div className="mb-6">
				<p className="font-bold text-sm">{name}</p>
				<p className="font-bold text-3xl">
					{price}
					{price !== 'Personalizado' ? (
						<span className="text-sm">/mes</span>
					) : null}
				</p>
				<p className="text-sm mb-6">{description}</p>

				<div className="space-y-1">
					{features.map((feature, index) => (
						<PricingFeatureItem key={index} title={feature} />
					))}
				</div>
			</div>

			<Link to="/join" prefetch="intent">
				<Button
					className="text-sm flex justify-between w-full items-center"
					variant={featured ? 'primary' : 'secondary'}
				>
					Obtener 10 días gratis
					<i className="ri-arrow-right-line"></i>
				</Button>
			</Link>
		</Box>
	);
}

function PricingFeatureItem({ title }: { title: string }) {
	return (
		<div className="flex gap-2 items-center">
			<span
				className={cn(
					'h-4 w-4 bg-black rounded-full text-white justify-center flex items-center',
					'shrink-0',
				)}
			>
				<i className="ri-check-line text-xs"></i>
			</span>
			<p className="text-sm text-gray-600">{title}</p>
		</div>
	);
}

type TestimonialType = {
	starsType?: 'full' | 'half';
	text: string;
	name: string;
	role: string;
};
function Testimonial({ starsType, name, role, text }: TestimonialType) {
	return (
		<div className="flex flex-col items-center flex-1 p-4 border border-gray-200 bg-white rounded-lg">
			<span className="text-[#fbbf24] flex gap-1 justify-center text-xl mb-1">
				<i className="ri-star-fill"></i>
				<i className="ri-star-fill"></i>
				<i className="ri-star-fill"></i>
				<i className="ri-star-fill"></i>
				{starsType === 'half' ? (
					<i className="ri-star-half-fill"></i>
				) : (
					<i className="ri-star-fill"></i>
				)}
			</span>
			<p className="mb-2 text-center">
				<span className="text-xl text-gray-400 font-medium">“</span> {text}.{' '}
				<span className="text-xl text-gray-400 font-medium">“</span>
			</p>

			<div className="text-center">
				<p className="font-medium leading-3">{name}</p>
				<p className="text-sm text-gray-600">{role}</p>
			</div>
		</div>
	);
}

function H2({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<h2 className={cn('text-2xl lg:text-3xl font-bold mb-4', className)}>
			{children}
		</h2>
	);
}

const layoutTexts = {
	default: {
		title: 'Villing es el software contable de la nube',
		grayTitle: 'Factura, analiza y construye un negocio eficiente.',
		description:
			'Vende, administra y conoce el estado de tu negocio en tiempo real con Villing software contable y de facturación.',
	},
	'factura-en-minutos': {
		title: 'De cero a facturando en 2 minutos',
		grayTitle: 'Factura electrónicamente sin complicaciones',
		description:
			'Evita los pasos innecesarios y contactar a soporte para empezar a facturar. Experimenta la agilidad de Villing software contable y mantén tu negocio al día sin complicaciones',
	},
	'comienza-sin-capacitarte': {
		title: 'Factura electrónicamente sin tener que capacitar a tu equipo',
		grayTitle: 'Villing se preocupa por tu experiencia como usuario',
		description:
			'Navega por la aplicación como un experto desde el primer día. Villing software contable es intuitivo y fácil de usar, sin necesidad de capacitaciones.',
	},
};
