import { Link } from '@remix-run/react';

export function AuthLayout({
	children,
	showForgotPassword,
}: {
	children: React.ReactNode;
	showForgotPassword?: boolean;
}) {
	return (
		<div className="h-screen items-center justify-center grid lg:grid-cols-2">
			<div className="hidden h-full flex-col bg-gray-900 p-10 text-white lg:flex">
				<Link
					to="/"
					className="flex items-center text-xl font-bold gap-2"
					prefetch="render"
				>
					<div className="w-9 h-9">
						<img
							src="/img/villing-logo.svg"
							alt="Villing"
							className="h-9 w-9"
						/>
					</div>
					Villing
				</Link>

				<div className="mt-auto">
					<blockquote className="space-y-2">
						<p className="text-lg">
							&ldquo;El software hecho por comerciantes para
							comerciantes.&rdquo;
						</p>
						<footer className="text-sm">- Lukas y Miller</footer>
					</blockquote>
				</div>
			</div>

			<div className="p-8 md:-m-0">
				<div className="mx-auto flex w-full flex-col justify-center space-y-4 sm:w-[350px]">
					<div className="flex lg:hidden items-center text-xl font-bold gap-2 mx-auto">
						<div className="w-9 h-9">
							<img
								src="/img/villing-logo.svg"
								alt="Villing"
								className="h-9 w-9"
							/>
						</div>
						Villing
					</div>

					{children}

					<p className="px-8 text-center text-sm text-gray-500">
						Al continuar, aceptas nuestros{' '}
						<Link
							to="/"
							className="underline underline-offset-4 hover:text-gray-900"
						>
							Términos de servicio
						</Link>{' '}
						y{' '}
						<Link
							to="/"
							className="underline underline-offset-4 hover:text-gray-900"
						>
							Política de privacidad
						</Link>
					</p>

					{showForgotPassword ? (
						<Link
							to="/forgot-password"
							className="underline underline-offset-4 text-gray-500 text-center hover:text-gray-900"
						>
							Olvidé mi contraseña
						</Link>
					) : null}
				</div>
			</div>
		</div>
	);
}
