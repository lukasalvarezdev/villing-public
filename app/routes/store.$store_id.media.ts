import { Upload } from '@aws-sdk/lib-storage';
import {
	json,
	unstable_composeUploadHandlers,
	unstable_createMemoryUploadHandler,
	unstable_parseMultipartFormData,
	type LoaderFunctionArgs,
} from '@remix-run/node';
import { s3Client } from '~/utils/aws-pool.server';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { invariant } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export async function action({ params, request }: LoaderFunctionArgs) {
	invariant(params.store_id, 'Missing store_id');

	await protectRoute(request);

	const searchParams = new URL(request.url).searchParams;
	const mediaType = searchParams.get('mediaType');
	const storeId = params.store_id;

	if (mediaType !== 'logo' && mediaType !== 'banner') {
		return json({ error: 'Hubo un error' });
	}

	const { db, orgId } = await getOrgDbClient(request);

	const uploadHandler = unstable_composeUploadHandlers(
		async ({ data, filename }) => {
			if (!filename) throw new Response('No file found', { status: 413 });

			const fileExtension = filename.split('.').pop();

			const fileId = `${orgId}/store/${storeId}/${mediaType}.${fileExtension}`;

			await db.$transaction(async tx => {
				await tx.store.update({
					where: { id: storeId },
					data:
						mediaType === 'logo'
							? { logoObjectId: fileId }
							: { bannerObjectId: fileId },
				});

				const parallelUploads3 = new Upload({
					client: s3Client,
					params: {
						Bucket: process.env.AWS_BUCKET_NAME,
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
