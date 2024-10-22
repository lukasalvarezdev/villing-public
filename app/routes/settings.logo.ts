import { Upload } from '@aws-sdk/lib-storage';
import { parse } from '@conform-to/zod';
import {
	type DataFunctionArgs,
	unstable_createMemoryUploadHandler as createMemoryUploadHandler,
	unstable_parseMultipartFormData as parseMultipartFormData,
	json,
} from '@remix-run/node';
import * as z from 'zod';
import { awsPool, s3Client } from '~/utils/aws-pool.server';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { MAX_FILE_SIZE } from '~/utils/misc';

export async function action({ request }: DataFunctionArgs) {
	const { orgId, db } = await getOrgDbClient(request);

	const formData = await parseMultipartFormData(
		request,
		createMemoryUploadHandler({ maxPartSize: MAX_FILE_SIZE }),
	);

	const submission = parse(formData, { schema: fileSchema });
	if (!submission.value) return json(submission, 400);

	try {
		const file = submission.value.file;

		if (!(file instanceof File)) return json({ success: false }, 400);

		await db.$transaction(async tx => {
			const extension = file.name.split('.').pop();
			const fileId = `/${orgId}/logo.${extension}`;

			await tx.organization.update({
				where: { id: orgId },
				data: { imageUri: fileId },
			});

			const parallelUploads3 = new Upload({
				client: s3Client,
				params: { Bucket: awsPool.bucket, Key: fileId, Body: file },
				queueSize: 4,
				partSize: MAX_FILE_SIZE * 5, // 5MB
				leavePartsOnError: false,
			});

			await parallelUploads3.done();
		});

		return json({ success: true });
	} catch (error) {
		await logError({ error, request });

		return json({ success: false, error: 'Hubo un error' }, 500);
	}
}

const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'svg'];
const fileSchema = z.object({
	file: z
		.any()
		.refine(f => f.size < MAX_FILE_SIZE, 'El archivo es demasiado grande')
		.refine(
			f =>
				f.name.split('.').pop() &&
				allowedExtensions.includes(f.name.split('.').pop()!.toLowerCase()),
			'El archivo no es una imagen',
		),
});
