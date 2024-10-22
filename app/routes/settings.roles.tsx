import { type MetaFunction, Outlet } from '@remix-run/react';

export const meta: MetaFunction = () => [
	{ title: `Miembros y roles - Villing` },
];

export default function Component() {
	return (
		<div className="max-w-3xl">
			<div className="pb-4 border-b border-gray-200 mb-6">
				<h3>Roles y permisos</h3>
				<p className="text-gray-500 text-sm">
					Modifica o elimina los roles y permisos.
				</p>
			</div>

			<Outlet />
		</div>
	);
}
