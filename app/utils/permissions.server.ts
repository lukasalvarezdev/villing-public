import { type AllowedAction } from '@prisma/client';
import { redirect } from '@remix-run/node';
import { type PrismaClient } from './db.server';
import { translations } from './permision-translations';

/**
 * Check if the user has the permission to perform the action.
 */
async function validate(
	db: PrismaClient,
	userId: number,
	action: AllowedAction,
) {
	const user = await db.user.findUnique({
		where: { id: userId },
		select: { role: true, OwnedOrganization: { select: { id: true } } },
	});

	const isAllowed =
		user?.role?.allowedActions.includes(action) || user?.OwnedOrganization;
	const permissionTranslation = translations[action] || 'ejecutar esta acción';
	const errorMessage = `No tienes permisos para ${permissionTranslation.toLowerCase()}`;

	return { error: isAllowed ? null : errorMessage, action };
}

/**
 * Throw if the user has the permission to perform the action.
 */
async function validateAndThrow(...args: Parameters<typeof validate>) {
	const { error, action } = await validate(...args);
	if (error) throw redirect(`/home?action=${action}`);
}

export const legalActions = { validate, validateAndThrow };
