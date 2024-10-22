import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
} from '@remix-run/node';
import { Link, useFetcher, useLoaderData, useParams } from '@remix-run/react';
import clsx from 'clsx';
import * as React from 'react';
import Dropzone from 'react-dropzone-esm';
import { Button, Toast } from '~/components/form-utils';
import { ButtonIcon, TwoColumnsDiv } from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import { parseFormData, invariant } from '~/utils/misc';
import { getFilePresignedUrlByKey } from '~/utils/misc.server';
import { protectSuperAdminRoute } from '~/utils/plan-protection.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.org_id, 'Missing org_id param');

	await Promise.all([protectRoute(request), protectSuperAdminRoute(request)]);
	const { db } = await getOrgDbClient(request);

	const dianData = await db.organizationDianData.findUnique({
		where: { id: parseInt(params.org_id) },
		select: {
			certificateEmailSent: true,
			camaraFileKey: true,
			cedulaFileKey: true,
			comprobanteFileKey: true,
			rutFileKey: true,
			soenacComprobanteFileKey: true,
		},
	});
	const comprobanteFileType = dianData?.comprobanteFileKey?.split('.').pop();

	return json({
		canSendEmail: Boolean(!dianData?.certificateEmailSent),
		hasAllFiles: Boolean(
			dianData?.cedulaFileKey &&
				dianData?.rutFileKey &&
				dianData?.comprobanteFileKey,
		),
		comprobanteFileType,
		soenacComprobanteFileKey: dianData?.soenacComprobanteFileKey,
	});
}

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.org_id, 'Missing org_id param');

	await Promise.all([protectRoute(request), protectSuperAdminRoute(request)]);
	const { db } = await getOrgDbClient(request);

	const form = await parseFormData(request);
	const name = form.get('name');

	invariant(name, 'Missing name param');

	const dianData = await db.organizationDianData.findUnique({
		where: { id: parseInt(params.org_id) },
		select: {
			camaraFileKey: true,
			cedulaFileKey: true,
			comprobanteFileKey: true,
			rutFileKey: true,
		},
	});

	// @ts-ignore We don't care if the file doesn't exist
	const fileKey = dianData?.[`${name}FileKey`];
	const fileUrl = await getFilePresignedUrlByKey(fileKey);

	return json({ fileUrl });
}

export default function Component() {
	const { soenacComprobanteFileKey } = useLoaderData<typeof loader>();
	const { org_id } = useParams();

	return (
		<div>
			<div className="pb-4 border-b border-gray-200 mb-4 flex gap-4">
				<ButtonIcon className="shrink-0">
					<Link to={`/admin/organizations/${org_id}/dian`} prefetch="intent">
						<i className="ri-arrow-left-line"></i>
					</Link>
				</ButtonIcon>

				<div>
					<h3 className="font-medium">
						Documentos para certificado de firma digital
					</h3>
					<p className="text-gray-500 text-sm">
						Consulta los documentos que se necesitan para el certificado de
						firma digital.
					</p>
				</div>
			</div>

			<div className="flex flex-col gap-4 mb-4">
				<DocumentZone
					title="Cédula:"
					description="Cédula del representante legal"
					name="cedula"
					type="pdf"
				/>

				<DocumentZone
					title="RUT:"
					description="RUT actualizado no mayor a 30 días"
					name="rut"
					type="pdf"
				/>

				<DocumentZone
					title="Cámara de comercio:"
					description="Cámara de comercio actualizada no mayor a 30 días"
					name="camara"
					type="pdf"
				/>

				<DocumentZone
					title="Comprobante de pago:"
					description="El comprobante debe tener un valor de $ 160,000 COP."
					name="certificado"
					type="img"
				/>

				{soenacComprobanteFileKey ? (
					<DocumentZone
						title="Comprobante de pago a Soenac:"
						description="El comprobante debe tener un valor de $ 140,000 COP."
						name="soenacCertificado"
						type="img"
					/>
				) : null}

				<UploadComprobanteDropzone />
			</div>
		</div>
	);
}

type DocumentZoneProps = {
	title: string;
	description: string;
	name: string;
	type?: 'img' | 'pdf';
};

function DocumentZone({
	title,
	description,
	name,
	type = 'img',
}: DocumentZoneProps) {
	const { comprobanteFileType } = useLoaderData<typeof loader>();
	const fetcher = useFetcher<typeof action>();
	const downloadRef = React.useRef<HTMLAnchorElement>(null);
	const fileUrl = fetcher.data?.fileUrl;
	const fileName = `${name}.${
		type === 'img' ? comprobanteFileType || 'png' : type
	}`;

	React.useEffect(() => {
		if (fileUrl) {
			fetch(fileUrl)
				.then(async res => {
					if (!downloadRef.current) return;

					const blob = await res.blob();
					const newBlob = new Blob([blob]);
					const blobUrl = window.URL.createObjectURL(newBlob);
					downloadRef.current.href = blobUrl;
					downloadRef.current.click();
				})
				.catch(() => {});
		}
	}, [fileUrl]);

	return (
		<TwoColumnsDiv>
			<div>
				<p className="font-medium">{title}</p>
				<p className="text-sm text-gray-500">{description}</p>
			</div>

			<div>
				<fetcher.Form
					method="POST"
					className="p-4 border border-gray-100 rounded-sm flex gap-2 items-center"
				>
					<a
						className="sr-only"
						href={fileUrl}
						download={fileName}
						ref={downloadRef}
					>
						Descargar {name}
					</a>

					<input type="hidden" name="name" defaultValue={name} />
					<Button variant="secondary">Descargar archivo</Button>
					<p className="text-sm text-gray-500">{fileName}</p>
				</fetcher.Form>
			</div>
		</TwoColumnsDiv>
	);
}

function UploadComprobanteDropzone() {
	const { org_id } = useParams();
	const { soenacComprobanteFileKey, canSendEmail, hasAllFiles } =
		useLoaderData<typeof loader>();
	const fetcher = useFetcher();
	const [file, setFile] = React.useState<File | null>(null);

	if (!canSendEmail) {
		return (
			<Toast variant="success" className="text-sm py-2 mb-4">
				<i className="ri-check-line mr-2"></i>
				El correo ha sido enviado exitosamente.
			</Toast>
		);
	}

	return (
		<fetcher.Form
			className="pt-4 border-t border-gray-300"
			onSubmit={e => {
				e.preventDefault();
				const formData = new FormData(e.currentTarget);
				formData.append('soenacComprobante', file || '');
				fetcher.submit(formData, {
					method: 'POST',
					encType: 'multipart/form-data',
					action: `/admin/organizations/${org_id}/dian/upload-comprobante`,
				});
			}}
		>
			<TwoColumnsDiv className="mb-4">
				<div>
					<p className="font-medium">
						{soenacComprobanteFileKey ? 'Cambiar' : 'Subir'} comprobante de pago
						a Soenac
					</p>
					<p className="text-sm text-gray-500">
						El certificado de firma digital tiene un costo de $ 140,000 COP.
						Consignar a la cuenta de ahorros Bancolombia No. 80800006698
					</p>
				</div>

				<div>
					<Dropzone
						accept={{ 'image/png': ['.png'], 'image/jpeg': ['.jpeg', '.jpg'] }}
						maxSize={1024 * 1024 * 1}
						maxFiles={1}
						multiple={false}
						onDropAccepted={files => setFile(files[0] || null)}
					>
						{({ getInputProps, getRootProps, isDragActive }) => (
							<div
								className={clsx(
									'border border-gray-100 rounded-sm',
									isDragActive && 'border-gray-300 bg-gray-50',
								)}
							>
								<div {...getRootProps()}>
									<input {...getInputProps()} />

									<div className="p-4">
										<Button variant="secondary" type="button">
											{file ? 'Cambiar archivo' : 'Seleccionar archivo'}
										</Button>
									</div>
								</div>

								{file ? (
									<div className="flex gap-2 justify-between p-4 border-t border-gray-100">
										<div className="flex gap-4">
											<i className="ri-file-pdf-2-line"></i>
											<p className="text-sm text-gray-600">{file.name}</p>
										</div>
										<button
											className="hover:scale-110 transition-transform"
											type="button"
											onClick={() => setFile(null)}
										>
											<i className="ri-close-line"></i>
										</button>
									</div>
								) : null}
							</div>
						)}
					</Dropzone>
				</div>
			</TwoColumnsDiv>

			{!hasAllFiles ? (
				<Toast className="text-sm py-2 mb-4">
					<i className="ri-information-line mr-2"></i>
					El cliente debe tener todos los archivos antes de enviar el correo
				</Toast>
			) : null}

			<Toast variant="info" className="text-sm py-2 mb-4">
				<i className="ri-information-line mr-2"></i>
				Asegúrate de que los archivos sean válidos antes de enviar el correo
			</Toast>

			<Button disabled={!canSendEmail}>
				<i className="ri-mail-line mr-2"></i>
				Enviar correo para comprar certificado
			</Button>
		</fetcher.Form>
	);
}
