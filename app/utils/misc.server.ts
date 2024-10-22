import crypto from 'crypto';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { json } from '@remix-run/node';
import { awsPool, s3Client } from './aws-pool.server';
import { logError } from './db.server';
import { errorLogger } from './logger';

export async function getFilePresignedUrlByKey(Key?: string | null) {
	try {
		if (Key) {
			const url = await getSignedUrl(
				s3Client,
				new GetObjectCommand({ Bucket: awsPool.bucket, Key }),
				{ expiresIn: 60 * 60 * 24 }, // 1 day,
			);
			return url;
		}
	} catch (error) {
		return '';
	}
}

export async function actionError({
	error,
	formData,
	request,
	message,
}: {
	request: Request;
	error: unknown;
	formData?: FormData | URLSearchParams;
	message: string;
}) {
	const referenceId = errorLogger({
		error,
		path: 'createTemplate',
		body: formData ? Object.fromEntries(formData) : undefined,
	});

	await logError({ error, request });

	return json(
		{
			error: `${message}. Por favor envía esta referencia: ${referenceId} a soporte para poder ayudarte`,
		},
		400,
	);
}

export function getCurrentDomain() {
	const villingEnv = process.env.VILLING_ENV;

	switch (villingEnv) {
		case 'production':
			return 'https://villing.io';
		case 'staging':
			return 'https://stage.villing.io';
		default:
			return 'http://localhost:3000';
	}
}

export function getHashedUserEmail(email: string): string {
	return crypto.createHash('sha256').update(email).digest('hex');
}
