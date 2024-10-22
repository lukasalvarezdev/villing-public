import { type MetaFunction, type LoaderFunctionArgs , type ActionFunctionArgs, redirect } from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import {
	CurrencyInput,
	IntentButton,
	Label,
	LinkButton,
} from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import { useIsForeignCountry } from '~/root';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { parseFormData, toNumber, invariant } from '~/utils/misc';

export const meta: MetaFunction = () => [{ title: `Abrir cajero - Villing` }];

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.branch_id, 'Branch id is required');

	const { db, orgId } = await getOrgDbClient(request);

	const branch = await db.subOrganization.findUniqueOrThrow({
		where: { id: parseInt(params.branch_id), organizationId: orgId },
		select: { id: true, name: true },
	});

	return { branch };
}

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.branch_id, 'Branch id is required');

	const { db, orgId, userId } = await getOrgDbClient(request);
	const branchId = parseInt(params.branch_id);

	try {
		const { cashiersCount } = await db.counts.findUniqueOrThrow({
			where: { id: orgId },
			select: { cashiersCount: true },
		});

		const form = await parseFormData(request);
		const rateOfTheDay = toNumber(form.get('rateOfTheDay'));
		const initialBalance = toNumber(form.get('initialBalance'));

		await db.$transaction(async tx => {
			const [[lastCashier]] = await Promise.all([
				tx.cashier.findMany({
					where: { subOrganizationId: branchId },
					orderBy: { createdAt: 'asc' },
					take: -1,
				}),
				tx.cashier.create({
					data: {
						initialBalance,
						organization: { connect: { id: orgId } },
						subOrganization: { connect: { id: branchId } },
						internalId: cashiersCount + 1,
						openedBy: { connect: { id: userId } },
						rateOfTheDay,
					},
					select: { id: true },
				}),
				tx.counts.update({
					where: { id: orgId },
					data: { cashiersCount: { increment: 1 } },
					select: { id: true },
				}),
			]);

			if (lastCashier && !lastCashier.closedAt) {
				throw redirect(`/builder/pos/new/${branchId}`);
			}
		});

		return redirect(`/builder/pos/new/${branchId}`);
	} catch (error) {
		// This means that we want to redirect
		if (error instanceof Response) return error;

		await logError({ error, request });
		return { error: 'Hubo un error al abrir el cajero' };
	}
}

export default function Component() {
	const { branch } = useLoaderData<typeof loader>();
	const { isForeignCountry } = useIsForeignCountry();

	return (
		<Modal className="max-w-md">
			<ModalHeader href="/invoices/pos/new" className="mb-4">
				<h5>Abrir caja de: {branch.name}</h5>
			</ModalHeader>

			<Form method="POST" className="flex flex-col gap-4">
				<div>
					<Label htmlFor="initialBalance">Balance inicial</Label>
					<CurrencyInput id="initialBalance" name="initialBalance" />
				</div>

				{isForeignCountry ? (
					<div>
						<Label htmlFor="rateOfTheDay">Tasa del día (VED) x $1 USD</Label>
						<CurrencyInput id="rateOfTheDay" name="rateOfTheDay" />
					</div>
				) : null}

				<div className="flex justify-end gap-4">
					<LinkButton
						to="/invoices/pos/new"
						prefetch="intent"
						variant="secondary"
					>
						Cancelar
					</LinkButton>
					<IntentButton intent="open" variant="primary">
						Abrir cajero
					</IntentButton>
				</div>
			</Form>
		</Modal>
	);
}
