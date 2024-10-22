import { type PrismaClient } from '@prisma/client';
import {
	getFindActiveResolutionArgs,
	resolutionsMapper,
} from '~/modules/invoice/filters.server';
import { type BuilderType } from './builder/schemas';
import { getValidIdOrNoRecords, mapBranch } from './misc';

type GetLoaderDataArgs = { db: PrismaClient; orgId: number; sub_id?: string };
export async function getLoaderData({ db, orgId, sub_id }: GetLoaderDataArgs) {
	const branch_id = getValidIdOrNoRecords(sub_id);

	const data = await db.organization.findUniqueOrThrow({
		where: { id: orgId },
		select: {
			country: true,
			imageUri: true,
			PriceList: {
				orderBy: { name: 'asc' },
				select: { id: true, name: true },
				where: { deletedAt: null },
			},
			SubOrganization: {
				select: {
					id: true,
					name: true,
					defaultClient: true,
					defaultPriceListId: true,
					defaultResolution: {
						where: {
							deletedAt: null,
							toDate: { gte: new Date() },
						},
					},
					address: true,
					nit: true,
					tel: true,
				},
				where: { deletedAt: null },
			},
			Resolution: getFindActiveResolutionArgs(orgId),
			Cashier: {
				where: { subOrganizationId: branch_id, closedAt: null },
				orderBy: { createdAt: 'asc' },
				take: -1,
				select: { id: true, rateOfTheDay: true },
			},
		},
	});

	return {
		branch: getBranch(),
		branches: getBranches(),
		priceLists: getPriceLists(),
		resolutions: getResolutions(),
		cashier: getCashier(),
		branch_id: branch_id || undefined,
		logoKey: data.imageUri || undefined,
	} as const;

	function getPriceLists() {
		return data.PriceList.map(item => ({ id: item.id, name: item.name }));
	}

	function getBranches() {
		return (
			data.SubOrganization.map(item => ({
				id: item.id,
				name: item.name,
				address: item.address,
				nit: item.nit || undefined,
				tel: item.tel || undefined,
			})) || []
		);
	}

	/**
	 * get current branch. Only active for pos module
	 */
	function getBranch() {
		const branch = data.SubOrganization.find(item => item.id === branch_id);
		return mapBranch(branch);
	}

	function getResolutions() {
		return {
			mapped: resolutionsMapper(data.Resolution) || [],
			raw: data.Resolution || [],
		};
	}

	function getCashier() {
		return data.Cashier[0];
	}
}

export function getValidationsByModule(type: BuilderType) {
	return {
		requiresResolution: type == 'pos' || type == 'electronic',
		requiresCashier: type == 'pos',
	};
}
