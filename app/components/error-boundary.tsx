import { Link, useRouteError } from '@remix-run/react';
import { Toast } from './form-utils';
import { PageWrapper } from './ui-library';

export function RouteErrorBoundary({ message }: { message?: string }) {
	const error = useRouteError();

	console.error('CLIENT ERROR BOUNDARY:', error);

	if (typeof navigator !== 'undefined') {
		console.error('Navigator online status: ', navigator.onLine);
	}

	return (
		<PageWrapper>
			<Toast className="w-full max-w-full">
				<span className="block mb-2">
					{message ||
						'Lo sentimos, hubo un error inesperado. Por favor, vuelve a intentarlo o contacta con nosotros.'}
				</span>

				<div className="flex gap-4">
					<Link to="" className="font-medium">
						<span className="underline">Volver a intentar</span>
					</Link>

					<Link to="/" className="font-medium">
						<span className="underline">Ir al inicio</span>
					</Link>
				</div>
			</Toast>
		</PageWrapper>
	);
}
