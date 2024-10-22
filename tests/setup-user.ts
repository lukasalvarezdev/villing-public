import {
	AdminDisableUserCommand,
	AdminDeleteUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { faker } from '@faker-js/faker';
import jwt from 'jsonwebtoken';
import * as setCookieParser from 'set-cookie-parser';
import { z } from 'zod';
import { type Builder } from '~/routes/builder.$type.new.$(sub_id)/builder/schemas';
import { emptyBranch, emptyClient } from '~/routes/start/empty-values';
import { getFreePlanExpiration } from '~/utils/admin.server';
import { awsPool, cognitoClient } from '~/utils/aws-pool.server';
import { __prisma } from '~/utils/db.server';
import { AllowedAction } from '~/utils/enums';
import { errorLogger, logInfo } from '~/utils/logger';
import { villingSession } from '~/utils/session.server';

/**
 * Set up everything for using the app as an authenticated user.
 * This includes creating a user and organization.
 */
export async function setupUser() {
	const { userId, email, orgId, ...data } = await __prisma.$transaction(
		async tx => {
			const user = await tx.user.create({
				data: {
					email: faker.internet.email(),
					name: faker.person.fullName(),
					confirmedAt: new Date(),
				},
			});

			const company = await createCompany();
			const { branchId, client, priceListId, resolutionId } = company;

			const [cashier] = await Promise.all([
				createCashier(),
				addUserOrganizationRole(),
				createCounts(),
				updateBranchConfig(),
			]);

			return {
				orgId: company.id,
				userId: user.id,
				email: user.email,
				cashier,
				...company,
			};

			function addUserOrganizationRole() {
				return tx.user.update({
					where: { id: user.id },
					data: {
						name: user.name,
						allowedSubOrgs: { connect: { id: branchId } },
						role: {
							create: {
								organizationId: company.id,
								allowedActions: Object.values(AllowedAction),
								name: 'Administrador',
							},
						},
					},
				});
			}

			async function createCompany() {
				const organization = await tx.organization.create({
					data: {
						name: 'company.name',
						ownerId: user.id,
						email: user.email,
						planType: 'free',
						planExpiresAt: getFreePlanExpiration(),

						// User: { connect: { id: user.id } },
						PriceList: {
							create: [
								{ name: 'Precio de venta' },
								{ name: 'Precio mayorista' },
							],
						},
						SubOrganization: { create: emptyBranch },
						Client: {
							create: [
								emptyClient,
								{ ...emptyClient, name: 'CLIENTE DE PRUEBA' },
							],
						},
						Supplier: { create: { ...emptyClient, internalId: 1 } },
						Resolution: { create: resolution },
					},
					select: {
						id: true,
						Client: true,
						Supplier: true,
						SubOrganization: true,
						PriceList: true,
						Resolution: true,
					},
				});

				return branchConfigSchema.parse({
					id: organization.id,
					branchId: organization.SubOrganization[0]?.id,
					client: organization.Client[0],
					supplier: organization.Supplier[0],
					priceListId: organization.PriceList[0]?.id,
					resolutionId: organization.Resolution[0]?.id,
				});
			}

			function createCounts() {
				return tx.counts.create({
					data: { id: company.id, organizationId: company.id },
				});
			}

			function createCashier() {
				return tx.cashier.create({
					data: {
						internalId: 1,
						organizationId: company.id,
						subOrganizationId: branchId,
						openedById: user.id,
					},
				});
			}

			function updateBranchConfig() {
				return tx.subOrganization.update({
					where: { id: branchId },
					data: {
						defaultClientId: client.id,
						defaultPriceListId: priceListId,
						defaultResolutionId: resolutionId,
					},
				});
			}
		},
	);

	const session = await villingSession.getSession();

	session.set('accessToken', createJwtToken());
	session.set('userId', userId);
	session.set('userEmail', email);
	session.set('organizationId', orgId);

	const setCookieHeader = await villingSession.commitSession(session);
	const cookieConfig = setCookieParser.parseString(setCookieHeader) as any;

	return {
		cookie: [{ ...cookieConfig, domain: 'localhost' }],
		user: { id: userId, email, organizationId: orgId },
		orgId,
		invoice: getDefaultInvoice(),
		...data,
	};

	function getDefaultInvoice(): Builder {
		return {
			products: [],
			paymentForms: [{ id: 1, amount: 0, type: 'cash' }],
			priceListId: data.priceListId,
			totalCollected: 0,
			client: data.client,
			supplier: data.supplier,
			resolutionId: data.resolutionId,
			shouldPrint: true,
			receivedAt: new Date().toISOString(),
			config: { taxIncluded: true, retention: 0 },
			subId: data.branchId,
		};
	}
}

export async function cleanupUserSetup(user?: {
	id: number;
	email: string;
	organizationId: number | null;
}) {
	if (!user) {
		errorLogger({ path: '/cleanup', error: 'No user found' });
		return;
	}

	logInfo({
		message: `Cleaning up user ${user?.id} and organization ${user?.organizationId}`,
		path: '/cleanup',
	});

	await disableUser();
	await deleteUser();

	if (user?.organizationId) {
		await __prisma.$transaction([
			__prisma.organization.delete({ where: { id: user.organizationId } }),
			__prisma.user.delete({ where: { id: user.id } }),
		]);

		logInfo({
			message: `User ${user.id} and organization ${user.organizationId} cleaned up`,
			path: '/cleanup',
		});
	}

	async function disableUser() {
		const command = new AdminDisableUserCommand({
			UserPoolId: awsPool.userPoolId,
			Username: user?.email,
		});

		logInfo({
			message: `Disabling user ${user?.email}`,
			path: '/disableUserInCognito',
		});

		try {
			await cognitoClient.send(command);
			logInfo({
				message: `User ${user?.email} disabled`,
				path: '/disableUserInCognito',
			});
		} catch (error) {
			errorLogger({
				error,
				path: '/disableUserInCognito',
				customMessage: `Error disabling user ${user?.email}`,
			});
		}
	}

	async function deleteUser() {
		const command = new AdminDeleteUserCommand({
			UserPoolId: awsPool.userPoolId,
			Username: user?.email,
		});

		logInfo({
			message: `Deleting user ${user?.email}`,
			path: '/deleteUserInCognito',
		});
		try {
			await cognitoClient.send(command);
			logInfo({
				message: `User ${user?.email} deleted`,
				path: '/deleteUserInCognito',
			});
		} catch (error) {
			errorLogger({
				error,
				path: '/deleteUserInCognito',
				customMessage: `Error deleting user ${user?.email}`,
			});
		}
	}
}

function createJwtToken() {
	const token = jwt.sign({}, process.env.SESSION_SECRET, {
		expiresIn: '1d',
	});

	return token;
}

const resolution = {
	name: 'POS',
	prefix: 'POS',
	from: 1,
	to: 100_000,
	fromDate: new Date(),
	toDate: new Date(
		new Date().getFullYear() + 5,
		new Date().getMonth(),
		new Date().getDate(),
	),
	type: 'posInvoice',
	resolutionNumber: '1',
	count: 0,
} as const;

const branchConfigSchema = z.object({
	id: z.number(),
	branchId: z.number(),
	client: z.object({ id: z.number(), name: z.string() }),
	supplier: z.object({ id: z.number(), name: z.string() }),
	priceListId: z.number(),
	resolutionId: z.number(),
});
