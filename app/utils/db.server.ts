/* eslint-disable no-console */

import { PrismaClient } from '@prisma/client';
import { redirect } from '@remix-run/node';
import { getUser } from './auth.server';
import { invariantResponse, stringifyError } from './misc';
import { getIsInvalidPath } from './plan-protection';
import { getSession } from './session.server';

let prisma: PrismaClient;

declare global {
	var __db__: PrismaClient;
}

// this is needed because in development we don't want to restart
// the server with every change, but we want to make sure we don't
// create a new connection to the DB with every change either.
// in production we'll have a single connection to the DB.
if (process.env.NODE_ENV === 'production') {
	prisma = new PrismaClient({
		log: [{ emit: 'event', level: 'query' }],
	});
} else {
	if (!global.__db__) {
		global.__db__ = new PrismaClient({
			log: [{ emit: 'event', level: 'query' }],
		});
	}
	prisma = global.__db__;
}

try {
	// @ts-expect-error
	prisma.$on('query', async e => {
		// @ts-expect-error
		console.info(`${e.query} ${e.params}`);
	});
} catch (error) {}

type LogArgs = {
	request: Request;
	error: unknown;
	status?: number;
};

export async function logError(args: LogArgs) {
	const { request, status, error } = args;
	const session = await getSession(request);
	const userId = session.get('userId');
	const orgId = session.get('organizationId');

	try {
		const errorMessage =
			error instanceof Error ? stringifyError(error) : JSON.stringify(error);
		const url = request.url;

		await prisma.errorLog
			.create({
				data: {
					userId,
					organizationId: orgId,
					error: errorMessage,
					status,
					url,
				},
			})
			.catch(() => null);
	} catch (error) {
		console.error(error);
	}
}

/**
 * Get the database client that is authorized to access the
 * organization that the user is currently logged in to. It's the only way to get
 * access to the database.
 */
export async function getOrgDbClient(request: Request) {
	// In a test env we don't use cognito
	if (process.env.NODE_ENV === 'test') {
		const session = await getSession(request);
		const userId = session.get('userId');
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: {
				organizations: true,
				email: true,
				id: true,
			},
		});
		const organizationId = user?.organizations[0]?.organizationId;

		invariantResponse(
			organizationId,
			`User ${user?.email} has no organization`,
		);
		return { orgId: organizationId, db: prisma, userId: user.id };
	}

	const user = await getUser(request);
	const organizationId = user?.organizations[0]?.organizationId;
	const isLoginPath = new URL(request.url).pathname.includes('/login');

	if (!user || !organizationId) {
		if (isLoginPath) {
			invariantResponse(
				organizationId,
				`User ${user?.email} has no organization`,
			);
		} else {
			throw redirect(`/login?redirectTo=${new URL(request.url).pathname}`);
		}
	}

	const pathname = new URL(request.url).pathname;
	const isInvalidPath = getIsInvalidPath(pathname);

	if (isInvalidPath && !user.confirmedAt) {
		throw redirect('/home?msg=confirm_email');
	}

	return { orgId: organizationId, db: prisma, userId: user.id };
}

/**
 * a `getOrgDbClient` that doesn't throw an error if the user doesn't have an organization
 */
export async function getOrgDbClientSafe(request: Request) {
	try {
		return await getOrgDbClient(request);
	} catch (error) {
		return null;
	}
}

export async function logDianError(error: any, body: any, action: string) {
	try {
		await prisma.dianErrorLog.create({
			data: {
				body: JSON.stringify(body),
				error: JSON.stringify(error),
				action,
			},
		});
	} catch (error) {}
}

export { prisma as __prisma };
export type { PrismaClient };
