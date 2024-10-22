import { Upload } from '@aws-sdk/lib-storage';
import {
	json,
	unstable_composeUploadHandlers as composeUploadHandlers,
	unstable_createMemoryUploadHandler as createMemoryUploadHandler,
	unstable_parseMultipartFormData as parseMultipartFormData,
	type DataFunctionArgs,
} from '@remix-run/node';
import { scheduledEmail } from '~/utils/admin.server';
import { awsPool, s3Client } from '~/utils/aws-pool.server';
import { getOrgDbClient } from '~/utils/db.server';

export async function action({ request }: DataFunctionArgs) {
	const { orgId, db } = await getOrgDbClient(request);

	const uploadHandler = composeUploadHandlers(
		async ({ data, name, filename }) => {
			const fileType = filename?.split('.').pop();

			if (name !== 'soenacComprobante')
				throw 'Hubo un error al subir el archivo';
			if (fileType !== 'jpeg' && fileType !== 'png' && fileType !== 'jpg') {
				throw 'El archivo debe ser una imagen';
			}

			const fileId = `${orgId}/documents/${name}.${fileType}`;

			const fileBuffer = await asyncIterableToBuffer(data);

			const parallelUploads3 = new Upload({
				client: s3Client,
				params: {
					Bucket: awsPool.bucket,
					Key: fileId,
					Body: fileBuffer,
				},
				queueSize: 4,
				partSize: 1024 * 1024 * 5, // 5MB
				leavePartsOnError: false,
			});

			await parallelUploads3.done();

			await db.organizationDianData.update({
				where: { id: orgId },
				data: { soenacComprobanteFileKey: fileId },
			});

			return fileType;
		},
		createMemoryUploadHandler(),
	);

	try {
		const formData = await parseMultipartFormData(request, uploadHandler);
		const comprobanteFileType = formData.get('soenacComprobante')?.toString();

		await db.$transaction(async tx => {
			const dianData = await tx.organizationDianData.update({
				where: { id: orgId },
				select: { camaraFileKey: true },
				data: { certificateEmailSent: true },
			});

			await scheduledEmail({
				comprobanteKey: `${orgId}/documents/soenacComprobante.${comprobanteFileType}`,
				cedulaKey: `${orgId}/documents/cedula.pdf`,
				rutKey: `${orgId}/documents/rut.pdf`,
				camaraKey: dianData.camaraFileKey
					? `${orgId}/documents/camara.pdf`
					: undefined,
			});
		});

		return json({ success: true });
	} catch (error) {
		if (typeof error === 'string') return json({ error }, 400);
		return json({ error: 'Hubo un error al subir el archivo' }, 500);
	}
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
