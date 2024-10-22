import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { type DataFunctionArgs, json } from '@remix-run/node';
import { awsPool, s3Client } from '~/utils/aws-pool.server';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { invariant } from '~/utils/misc';

export async function action({ request, params }: DataFunctionArgs) {
	const { db } = await getOrgDbClient(request);

	const searchParams = new URL(request.url).searchParams;
	const objectId = searchParams.get('objectId');

	try {
		if (typeof objectId !== 'string')
			throw new Error('No se pudo eliminar la imagen');

		await db.$transaction(async tx => {
			invariant(params.product_id);
			const { imagesUrl } = await tx.product.findUniqueOrThrow({
				where: { id: parseInt(params.product_id) },
				select: { imagesUrl: true },
			});

			await tx.product.update({
				where: { id: parseInt(params.product_id) },
				data: { imagesUrl: { set: imagesUrl.filter(url => url !== objectId) } },
			});

			const command = new DeleteObjectCommand({
				Bucket: awsPool.bucket,
				Key: objectId,
			});
			await s3Client.send(command);
		});

		return json({ ok: true });
	} catch (error) {
		await logError({ error, request });

		return json({ error: 'No se pudo eliminar la imagen' }, 400);
	}
}
