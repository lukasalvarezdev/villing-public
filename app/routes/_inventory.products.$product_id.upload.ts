import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import {
	type DataFunctionArgs,
	json,
	unstable_composeUploadHandlers,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
} from '@remix-run/node';
import { v4 as uuid } from 'uuid';
import { awsPool } from '~/utils/aws-pool.server';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { invariant } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export async function action({ params, request }: DataFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const s3Client = new S3Client({ region: 'us-east-1' });

	const uploadHandler = unstable_composeUploadHandlers(
		async ({ data, filename }) => {
			if (!filename) throw new Response('No file found', { status: 413 });

			const fileExtension = filename.split('.').pop();

			const fileId = `${orgId}/products/${
				params.productId
			}/${uuid()}.${fileExtension}`;

			await db.$transaction(async () => {
				invariant(params.product_id);

				await db.product.update({
					where: { id: parseInt(params.product_id) },
					data: { imagesUrl: { push: fileId } },
				});

				const parallelUploads3 = new Upload({
					client: s3Client,
					params: {
						Bucket: awsPool.bucket,
						Key: fileId,
						Body: new ReadableStream({
							async start(controller) {
								for await (const chunk of data) {
									controller.enqueue(chunk);
								}
								controller.close();
							},
						}),
					},
					queueSize: 4,
					partSize: 1024 * 1024 * 5, // 5MB
					leavePartsOnError: false,
				});

				await parallelUploads3.done();
			});

			return undefined;
		},
		unstable_createMemoryUploadHandler(),
	);

	try {
		await unstable_parseMultipartFormData(request, uploadHandler);
		return json({ success: true });
	} catch (error) {
		await logError({ error, request });
		return json({ error: "Couldn't upload this file" }, { status: 500 });
	}
}
