import {
	type MetaFunction,
	type LoaderFunctionArgs,
	redirect,
	type ActionFunctionArgs,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import {
	CurrencyInput,
	IntentButton,
	Label,
	LinkButton,
	Textarea,
	Toast,
} from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import { TwoColumnsDiv } from '~/components/ui-library';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { errorsMessages } from '~/utils/errors';
import { invariant, parseFormData, toNumber } from '~/utils/misc';

export const meta: MetaFunction = () => [{ title: `Cerrar cajero - Villing` }];

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.cashier_id, 'cashier_id is required');

	const { db, orgId } = await getOrgDbClient(request);

	const cashier = await db.cashier.findUniqueOrThrow({
		where: { id: parseInt(params.cashier_id), organizationId: orgId },
		select: { id: true, subOrganization: true, closedAt: true },
	});

	if (cashier.closedAt) return redirect('/invoices/pos/new');

	return { cashier };
}

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.cashier_id, 'Branch id is required');

	const { db, userId } = await getOrgDbClient(request);

	const form = await parseFormData(request);
	const cashierId = parseInt(params.cashier_id);
	const totalByUserCash = toNumber(form.get('cash'));
	const totalByUserCard = toNumber(form.get('card'));
	const totalByUserTransfer = toNumber(form.get('transfer'));
	const totalByUserLoan = toNumber(form.get('loan'));
	const totalByUserExpenses = toNumber(form.get('expensesBalance'));
	const notes = form.get('notes');

	try {
		const id = await db.$transaction(async tx => {
			const cashier = await tx.cashier.findFirstOrThrow({
				where: { id: Number(cashierId) },
			});

			if (cashier.closedAt) throw errorsMessages.CASHIER_CLOSED;

			const closedAt = new Date();

			const legalPosInvoiceWhere = {
				canceledAt: null,
				subOrganizationId: cashier.subOrganizationId,
				createdAt: { gte: cashier.createdAt, lte: closedAt },
			};

			const [
				{
					_count: canceledInvoicesCount,
					_sum: { total: canceledInvoicesSum },
				},
				{ _sum: taxSum },
				{ _sum: expensesSum },
				paymentForms,
			] = await Promise.all([
				tx.legalPosInvoice.aggregate({
					where: {
						canceledAt: { not: null },
						subOrganizationId: cashier.subOrganizationId,
						createdAt: { gte: cashier.createdAt, lte: closedAt },
					},
					_sum: { total: true },
					_count: true,
				}),
				tx.legalPosInvoice.aggregate({
					where: legalPosInvoiceWhere,
					_sum: { totalTax: true },
				}),
				tx.expense.aggregate({
					where: { origin: 'cashier', cashierId: cashier.id },
					_sum: { amount: true },
				}),
				tx.legalPosInvoicePaymentForm.groupBy({
					by: ['type'],
					where: { legalPosInvoice: legalPosInvoiceWhere },
					_sum: { amount: true },
				}),
			]);

			const totalBySystemCash = toNumber(
				paymentForms.find(payment => payment.type === 'cash')?._sum?.amount,
			);
			const totalBySystemCard = toNumber(
				paymentForms.find(payment => payment.type === 'card')?._sum?.amount,
			);
			const totalBySystemTransfer = toNumber(
				paymentForms.find(payment => payment.type === 'transfer')?._sum?.amount,
			);
			const totalBySystemLoan = toNumber(
				paymentForms.find(payment => payment.type === 'loan')?._sum?.amount,
			);
			const total = paymentForms.reduce((acc, curr) => {
				return acc + toNumber(curr._sum?.amount);
			}, 0);

			const totalBySystemExpenses = toNumber(expensesSum.amount);

			if (totalBySystemExpenses !== totalByUserExpenses && !notes) {
				throw errorsMessages.CASHIER_MISMATCH_EXPENSES;
			}

			if (totalBySystemCash !== totalByUserCash && !notes) {
				throw errorsMessages.CASHIER_MISMATCH_CASH;
			}

			if (totalBySystemCard !== totalByUserCard && !notes) {
				throw errorsMessages.CASHIER_MISMATCH_CARD;
			}

			if (totalBySystemTransfer !== totalByUserTransfer && !notes) {
				throw errorsMessages.CASHIER_MISMATCH_TRANSFER;
			}

			if (totalBySystemLoan !== totalByUserLoan && !notes) {
				throw errorsMessages.CASHIER_MISMATCH_LOAN;
			}

			const finalBalance =
				totalByUserCash +
				totalByUserCard +
				totalByUserLoan +
				totalByUserTransfer -
				totalByUserExpenses;
			const shouldHave = total - totalBySystemExpenses;

			if (shouldHave !== finalBalance && !notes) {
				throw errorsMessages.CASHIER_MISMATCH;
			}

			const { id } = await tx.cashier.update({
				where: { id: cashierId },
				data: {
					notes,
					closedAt,
					closedById: userId,

					totalByUserCash,
					totalBySystemCash,

					totalByUserCard,
					totalBySystemCard,

					totalByUserTransfer,
					totalBySystemTransfer,

					totalByUserExpenses,
					totalBySystemExpenses,

					totalByUserLoan,
					totalBySystemLoan,

					totalCanceledIncome: toNumber(canceledInvoicesSum),
					canceledSalesCount: toNumber(canceledInvoicesCount),

					totalTax: toNumber(taxSum.totalTax),
				},
				select: { id: true },
			});

			return id;
		});

		return redirect(`/cashiers/${id}`);
	} catch (error) {
		if (typeof error === 'string') return { error };
		await logError({ error, request });
		return { error: 'Hubo un error al cerrar el cajero' };
	}
}

export default function Component() {
	const { cashier } = useLoaderData<typeof loader>();
	const error = useActionData<typeof action>()?.error;

	return (
		<Modal className="max-w-md">
			<ModalHeader href="/invoices/pos/new" className="mb-4">
				<h5>Cerrar caja de: {cashier.subOrganization.name}</h5>
			</ModalHeader>

			<Toast variant="info" className="text-gray-600 text-sm mb-4">
				Finaliza el día contando el dinero y comparando con las ventas del día.{' '}
				<span className="font-bold">
					El balance final también incluye los gastos del día.
				</span>
			</Toast>

			<Form method="POST" className="flex flex-col gap-4">
				<TwoColumnsDiv>
					<div>
						<Label htmlFor="cash">Total en efectivo</Label>
						<CurrencyInput id="cash" name="cash" />
					</div>

					<div>
						<Label htmlFor="transfer">Total en transferencias</Label>
						<CurrencyInput id="transfer" name="transfer" />
					</div>
				</TwoColumnsDiv>

				<TwoColumnsDiv>
					<div>
						<Label htmlFor="card">Total en datáfono</Label>
						<CurrencyInput id="card" name="card" />
					</div>
					<div>
						<Label htmlFor="expensesBalance">Total de gastos</Label>
						<CurrencyInput id="expensesBalance" name="expensesBalance" />
					</div>
				</TwoColumnsDiv>

				<TwoColumnsDiv>
					<div>
						<Label htmlFor="loan">Total en entidad crediticia</Label>
						<CurrencyInput id="loan" name="loan" />
					</div>
					<div></div>
				</TwoColumnsDiv>

				<div>
					<Label htmlFor="notes">Observaciones</Label>
					<Textarea
						id="notes"
						name="notes"
						placeholder="Escribe alguna observación que quieras dejar"
					/>
				</div>

				<Toast variant="error" className="text-sm">
					{error}
				</Toast>

				<div className="flex justify-end gap-4">
					<LinkButton
						to="/invoices/pos/new"
						prefetch="intent"
						variant="secondary"
					>
						Cancelar
					</LinkButton>
					<IntentButton intent="close" variant="black">
						Cerrar cajero
					</IntentButton>
				</div>
			</Form>
		</Modal>
	);
}
