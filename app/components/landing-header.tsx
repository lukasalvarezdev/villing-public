import { Link } from '@remix-run/react';
import { cn } from '~/utils/misc';
import { LinkButton } from './form-utils';
import { Container } from './ui-library';

export function LandingHeader() {
	return (
		<header className="fixed top-0 left-0 z-30 h-[60px] w-full bg-[#fafafa] border-b border-gray-200">
			<Container className="max-w-5xl flex h-full items-center justify-between">
				<div className="flex gap-6 items-center">
					<Link to="/" className="h-9 w-9 flex-1" prefetch="intent">
						<img
							src="/img/villing-logo.svg"
							alt="Logo de Villing"
							className="max-h-full max-w-full"
						/>
					</Link>

					<div className="gap-4 text-sm text-gray-600 items-center hidden md:flex">
						<Link
							to="#funcionalidades"
							prefetch="intent"
							className="hover:text-black"
						>
							Funcionalidades
						</Link>
						<Link to="#precios" prefetch="render" className="hover:text-black">
							Precios
						</Link>
						<a
							href={WPPURL}
							className="hover:text-black"
							target="_blank"
							rel="noopener noreferrer"
						>
							Contáctanos
						</a>
					</div>
				</div>

				<div className="flex gap-4">
					<LinkButton to="/login" prefetch="intent" variant="secondary">
						Entrar
					</LinkButton>
					<LinkButton
						to="/join"
						prefetch="intent"
						variant="black"
						className="whitespace-nowrap"
					>
						Comienza gratis
					</LinkButton>
				</div>
			</Container>
		</header>
	);
}

export function LandingFooter() {
	return (
		<footer className="bg-gray-50 border-t border-gray-100">
			<Container className="max-w-5xl mx-auto py-12 flex gap-6 md:gap-16 flex-col md:flex-row">
				<div>
					<div className="flex items-center gap-4 mb-6">
						<img
							src="/img/villing-logo.svg"
							alt="Logo de Villing"
							className="w-10 h-10"
						/>
						<p className="font-bold pl-4 border-l border-gray-300">Villing</p>
					</div>

					<div className="space-y-1">
						<a
							href="https://twitter.com/villingapp"
							className="flex gap-2 text-gray-600 items-center hover:text-black"
							target="_blank"
							rel="noopener noreferrer"
						>
							<i className="ri-twitter-fill text-xl"></i>
							<p className="text-sm">@villingapp</p>
						</a>

						<a
							href="https://www.instagram.com/villing.io"
							className="flex gap-2 text-gray-600 items-center hover:text-black"
							target="_blank"
							rel="noopener noreferrer"
						>
							<i className="ri-instagram-fill text-xl"></i>
							<p className="text-sm">@villing.io</p>
						</a>

						<a
							href="mailto:soporte@villing.io"
							className="flex gap-2 text-gray-600 items-center hover:text-black"
						>
							<i className="ri-mail-open-fill text-xl"></i>
							<p className="text-sm">contacto@villing.io</p>
						</a>
					</div>
				</div>

				<div className="mt-2">
					<p className="font-medium mb-4">Producto</p>

					<div className="flex flex-col gap-1 text-sm text-gray-600">
						<Link to="#funcionalidades">Funcionalidades</Link>
						<Link to="#funcionalidades">Facturación electrónica</Link>
						<Link to="#precios" prefetch="render">
							Precios
						</Link>
						<Link to="#store">Tienda virtual</Link>
					</div>
				</div>

				<div className="mt-2">
					<p className="font-medium mb-4">Empresa</p>

					<div className="space-y-1 text-sm text-gray-600">
						<Link to="/about-us" className="block hover:text-black">
							Sobre nosotros
						</Link>
						<a
							href={WPPURL}
							className="block hover:text-black"
							target="_blank"
							rel="noopener noreferrer"
						>
							Contáctanos
						</a>
						<p>Política de privacidad</p>
						<p>Términos y condiciones</p>
					</div>
				</div>
			</Container>

			<Container
				className={cn(
					'py-6 border-t border-gray-200 text-gray-600',
					'max-w-lg text-center text-sm',
				)}
			>
				<p>© {new Date().getFullYear()} Villing.</p>
			</Container>
		</footer>
	);
}

export const WPPURL =
	'https://wa.me/3123164029?text=%C2%A1Quiero%20saber%20m%C3%A1s%20sobre%20Villing!';
