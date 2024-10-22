import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { getOrgDbClient } from '~/utils/db.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);
	const { db, orgId, userId } = await getOrgDbClient(request);

	const [{ PriceList, SubOrganization }, { allowedSubOrgs }] =
		await db.$transaction([
			db.organization.findFirstOrThrow({
				where: { id: orgId },
				select: {
					SubOrganization: { where: { deletedAt: null } },
					PriceList: true,
				},
			}),
			db.user.findFirstOrThrow({
				where: { id: userId },
				select: {
					allowedSubOrgs: { where: { deletedAt: null }, select: { id: true } },
				},
			}),
		]);

	const filteredSubOrgs = SubOrganization.filter(subOrg =>
		allowedSubOrgs.some(allowedSubOrg => allowedSubOrg.id === subOrg.id),
	);

	return json({ subOrganizations: filteredSubOrgs, priceLists: PriceList });
}
