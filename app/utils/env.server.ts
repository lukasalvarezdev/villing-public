import * as z from 'zod';

const schema = z.object({
	NODE_ENV: z.enum(['production', 'development', 'test']),
	DATABASE_URL: z.string(),
	SESSION_SECRET: z.string(),
	COGNITO_CLIENT_ID: z.string(),
	COGNITO_USER_POOL_ID: z.string(),
	AWS_ACCESS_KEY_ID: z.string(),
	AWS_SECRET_ACCESS_KEY: z.string(),
	AWS_BUCKET_NAME: z.string(),
	SOENAC_TOKEN: z.string(),
	VILLING_ENV: z.string(),
});

declare global {
	namespace NodeJS {
		interface ProcessEnv extends z.infer<typeof schema> {}
	}
}

export function init() {
	const parsed = schema.safeParse(process.env);

	if (parsed.success === false) {
		console.error(
			'❌ Invalid environment variables:',
			parsed.error.flatten().fieldErrors,
		);

		throw new Error('Invalid envirmonment variables');
	}
}

export function getPrivateEnv() {
	return {
		MODE: process.env.NODE_ENV,
		DATABASE_URL: process.env.DATABASE_URL,
		SESSION_SECRET: process.env.SESSION_SECRET,
		COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
		COGNITO_USER_POOL_ID: process.env.COGNITO_USER_POOL_ID,
		AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
		AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
		AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
		SOENAC_TOKEN: process.env.SOENAC_TOKEN,
		VILLING_ENV: process.env.VILLING_ENV,
	};
}

/**
 * This is used in both `entry.server.ts` and `root.tsx` to ensure that
 * the environment variables are set and globally available before the app is
 * started.
 *
 * NOTE: Do *not* add any environment variables in here that you do not wish to
 * be included in the client.
 * @returns all public ENV variables
 */
export function getPublicEnv() {
	return { MODE: process.env.NODE_ENV };
}

type ENV = ReturnType<typeof getPublicEnv>;

declare global {
	var ENV: ENV;
	interface Window {
		ENV: ENV;
	}
}
