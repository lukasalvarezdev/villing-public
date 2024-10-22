import { type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Input, Label } from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import { TwoColumnsDiv } from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import {
	cn,
	formatDate,
	formatHours,
	getRequestSearchParams,
	invariant,
} from '~/utils/misc';
import { queryBuilder } from '~/utils/query-builder.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.log_id, 'Missing log_id');

	const { db, userId } = await getOrgDbClient(request);

	const user = await db.user.findUnique({ where: { id: userId } });

	if (user?.email !== process.env.ADMIN_EMAIL) {
		throw new Error("You don't have access to this resource");
	}

	const searchParams = getRequestSearchParams(request);
	const query = queryBuilder(searchParams, ['createdAt']);

	const log = await db.errorLog.findFirstOrThrow({
		where: { id: Number(params.log_id), ...query },
		include: {
			user: { select: { email: true } },
			organization: { select: { name: true } },
		},
	});

	return { log };
}

export default function Component() {
	const { log } = useLoaderData<typeof loader>();

	function getLogInvoice(errorString: string) {
		try {
			const error = JSON.parse(errorString);
			return JSON.stringify(error.invoice, null, 2);
		} catch (error) {
			return '';
		}
	}

	return (
		<Modal className="max-w-xl">
			<ModalHeader href="/log">
				<h4>Detalles del log</h4>
			</ModalHeader>

			<div>
				<TwoColumnsDiv className="mb-4">
					<div>
						<Label>Fecha</Label>
						<Input
							readOnly
							value={`${formatDate(log.createdAt)} - ${formatHours(log.createdAt)}`}
						/>
					</div>
					<div>
						<Label>URL</Label>
						<Input value={log.url} />
					</div>
				</TwoColumnsDiv>

				<TwoColumnsDiv className="mb-4">
					<div>
						<Label>Usuario</Label>
						<Input readOnly value={log.user?.email || 'Sin usuario'} />
					</div>
					<div>
						<Label>Empresa</Label>
						<Input readOnly value={log.organization?.name || 'Sin empresa'} />
					</div>
				</TwoColumnsDiv>
			</div>

			<Label>Detalle</Label>
			<div
				className={cn(
					'bg-gray-50 border border-gray-200 rounded-md p-4 font-mono text-xs',
					'overflow-auto max-h-96',
				)}
			>
				<pre>{log.error}</pre>
			</div>

			{getLogInvoice(log.error) ? (
				<div className="mt-4">
					<Label>Factura</Label>
					<div
						className={cn(
							'bg-gray-50 border border-gray-200 rounded-md p-4 font-mono text-xs',
							'overflow-auto max-h-96',
						)}
					>
						<pre>{getLogInvoice(log.error)}</pre>
					</div>
				</div>
			) : null}
		</Modal>
	);
}
