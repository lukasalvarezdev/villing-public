import {
	json,
	unstable_composeUploadHandlers as composeUploadHandlers,
	unstable_createMemoryUploadHandler as createMemoryUploadHandler,
	unstable_parseMultipartFormData as parseMultipartFormData,
	redirect,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/node';
import { Link, useFetcher, useLoaderData, useParams } from '@remix-run/react';
import clsx from 'clsx';
import * as React from 'react';
import Dropzone from 'react-dropzone-esm';
import { ClientOnly } from '~/components/client-only';
import {
	Input,
	IntentButton,
	Label,
	LinkButton,
	Toast,
} from '~/components/form-utils';
import { uploadCertificate } from '~/utils/admin.server';
import { getOrgDbClient } from '~/utils/db.server';
import { errorLogger } from '~/utils/logger';

import { invariant } from '~/utils/misc';
import { protectAdminRoute } from '~/utils/plan-protection.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.org_id, 'Missing org_id param');
	const orgId = parseInt(params.org_id);

	await Promise.all([protectRoute(request), protectAdminRoute(request)]);

	const { db } = await getOrgDbClient(request);

	const organizationDianData = await db.organizationDianData.findUnique({
		where: { id: orgId },
	});
	if (organizationDianData?.certificateInBase64)
		return json({ isComplete: true });

	return json({ isComplete: false });
}

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.org_id, 'Missing org_id param');
	const orgId = parseInt(params.org_id);

	await Promise.all([protectRoute(request), protectAdminRoute(request)]);

	const { db } = await getOrgDbClient(request);

	const uploadHandler = composeUploadHandlers(
		async ({ data, name, filename }) => {
			const fileType = filename?.split('.').pop();

			if (name !== 'certificate') throw 'Hubo un error al subir el archivo';
			if (fileType !== 'p12') throw 'El archivo debe ser .p12';

			const fileId = `${orgId}/documents/certificate.p12`;
			const fileBuffer = await asyncIterableToBuffer(data);

			await uploadCertificate(fileId, fileBuffer);

			const searchParams = new URL(request.url).searchParams;
			const password = searchParams.get('p');

			if (!password) throw 'No se ha enviado la contraseña del certificado';

			await db.organization.update({
				where: { id: orgId },
				data: {
					certificateInBase64: fileBuffer.toString('base64'),
					certificatePassword: password,
				},
			});

			return fileType;
		},
		createMemoryUploadHandler(),
	);

	try {
		await parseMultipartFormData(request, uploadHandler);

		return redirect(`/admin/organizations/${orgId}/dian`);
	} catch (error) {
		errorLogger({
			error,
			customMessage: 'Error al subir el certificado de firma digital',
			path: 'uploadCertificate',
		});

		if (typeof error === 'string') return json({ error }, 400);
		return json({ error: 'Hubo un error al subir el archivo' }, 500);
	}
}

export default function Component() {
	const { isComplete } = useLoaderData<typeof loader>();
	const { org_id } = useParams();
	const fetcher = useFetcher();
	const [file, setFile] = React.useState<File | null>(null);

	return (
		<div>
			<div className="pb-4 border-b border-gray-200 mb-4">
				<h3 className="font-medium">Certificado de firma digital</h3>
				<p className="text-gray-500 text-sm">
					Sube el certificado de firma digital del cliente. Recuerda que debe
					ser un archivo .p12 y no debe superar los 1MB de tamaño.
				</p>
			</div>

			{isComplete ? (
				<Toast className="mb-4 py-2 text-sm">
					El cliente ya cuenta con un certificado, puedes continuar con el
					siguiente paso o cambiar el certificado y la contraseña.{' '}
					<Link
						to={`/admin/organizations/${org_id}/dian`}
						className="underline font-medium"
						prefetch="intent"
					>
						Continuar
					</Link>
				</Toast>
			) : null}

			<fetcher.Form
				method="POST"
				encType="multipart/form-data"
				onSubmit={e => {
					e.preventDefault();
					const formData = new FormData(e.currentTarget);
					const formData2 = new FormData();

					formData2.append('certificate', file!);
					fetcher.submit(formData2, {
						method: 'POST',
						encType: 'multipart/form-data',
						action: `/admin/organizations/${org_id}/dian/certificate?p=${formData.get('password')}`,
					});
				}}
			>
				<ClientOnly>
					{() => (
						<Dropzone
							accept={{ 'application/x-pkcs12': ['.p12'] }}
							maxSize={1024 * 1024 * 1}
							maxFiles={1}
							multiple={false}
							onDropAccepted={files => setFile(files[0] || null)}
						>
							{({
								getInputProps,
								getRootProps,
								isDragActive,
								acceptedFiles,
							}) => (
								<div
									{...getRootProps({
										className: clsx(
											'mb-4 flex flex-col items-center justify-center p-4 h-32',
											'rounded-sm border border-dashed border-gray-400',
											isDragActive && 'border-gray-400 bg-gray-100',
										),
									})}
								>
									<input {...getInputProps()} />

									{acceptedFiles[0] ? (
										<div className="mt-2 text-center">
											<strong>{acceptedFiles[0].name}</strong>
											<p>
												Arrastra y suelta tu certificado aquí para cambiarlo o
											</p>
											<button
												type="button"
												className="text-primary-600 underline"
											>
												busca en tu dispositivo
											</button>
										</div>
									) : (
										<div className="mt-2 text-center">
											<p>Arrastra y suelta tu certificado aquí o</p>
											<button
												className="text-primary-600 underline"
												type="button"
											>
												busca en tu dispositivo
											</button>
										</div>
									)}
								</div>
							)}
						</Dropzone>
					)}
				</ClientOnly>

				<Label>Contraseña del certificado</Label>
				<Input placeholder="Contraseña" className="mb-4" name="password" />

				<div className="flex gap-4 mt-2 justify-end">
					<LinkButton
						variant="secondary"
						to={`/admin/organizations/${org_id}/dian`}
						prefetch="intent"
					>
						Volver al paso anterior
					</LinkButton>
					<IntentButton variant="primary" intent="certificate">
						Subir certificado y continuar
						<i className="ri-arrow-right-line ml-2" />
					</IntentButton>
				</div>
			</fetcher.Form>
		</div>
	);
}

async function asyncIterableToBuffer(
	asyncIterable: AsyncIterable<Uint8Array>,
): Promise<Buffer> {
	const chunks: Array<Uint8Array> = [];
	for await (const chunk of asyncIterable) {
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
}
