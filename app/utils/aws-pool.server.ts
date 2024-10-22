import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { S3Client } from '@aws-sdk/client-s3';

export const awsPool = {
	clientId: process.env.COGNITO_CLIENT_ID,
	accessKeyId: process.env.AWS_ACCESS_KEY_ID,
	secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
	region: 'us-east-1',
	bucket: process.env.AWS_BUCKET_NAME,
	userPoolId: process.env.COGNITO_USER_POOL_ID,
};

export const cognitoClient = new CognitoIdentityProviderClient({
	region: awsPool.region,
	credentials: {
		accessKeyId: awsPool.accessKeyId,
		secretAccessKey: awsPool.secretAccessKey,
	},
});

export const s3Client = new S3Client({
	region: 'us-east-1',
	credentials: {
		accessKeyId: awsPool.accessKeyId,
		secretAccessKey: awsPool.secretAccessKey,
	},
});
