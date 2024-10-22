import {
	json,
	redirect,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import {
	Input,
	IntentButton,
	Label,
	LinkButton,
} from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import {
	NonPrintableContent,
	PrintableContent,
} from '~/components/printable-content';
import { TwoColumnsDiv } from '~/components/ui-library';
import { PrintInvoiceButton } from '~/modules/invoice/invoice-page-components';
import {
	DateMetadataInfo,
	OrganizationInfo,
	Separator,
} from '~/modules/printing/narrow-bill';
import { getOrgDbClient, logError } from '~/utils/db.server';
import {
	formatCurrency,
	formatDate,
	formatHours,
	invariant,
} from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.expense_id, 'expense_id is required');

	await protectRoute(request);
	const { db } = await getOrgDbClient(request);

	const expense = await db.expense.findFirstOrThrow({
		where: { id: parseInt(params.expense_id) },
		include: {
			user: { select: { name: true } },
			subOrg: { select: { name: true, nit: true, tel: true, address: true } },
			category: { select: { name: true } },
		},
	});

	return json({ expense });
}

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.expense_id, 'expense_id is required');
	await protectRoute(request);

	try {
		const { db, orgId, userId } = await getOrgDbClient(request);
		const id = parseInt(params.expense_id);

		const { error } = await legalActions.validate(
			db,
			userId,
			'update_expenses',
		);
		if (error) return json({ error }, 403);

		await db.expense.deleteMany({
			where: { id, subOrg: { organizationId: orgId } },
		});

		return redirect('/treasury');
	} catch (error) {
		await logError({ request, error });
		return json({ error: 'Hubo un error al eliminar el gasto' }, 500);
	}
}

export default function Component() {
	return (
		<div>
			<PrintableContent>
				<PrintableExpense />
			</PrintableContent>

			<NonPrintableContent>
				<Expense />
			</NonPrintableContent>
		</div>
	);
}

function Expense() {
	const { expense } = useLoaderData<typeof loader>();

	return (
		<Modal className="max-w-lg">
			<ModalHeader href="/treasury" className="mb-4">
				<h4>Detalles del gasto</h4>
			</ModalHeader>

			<div className="mb-4">
				<PrintInvoiceButton text="Imprimir gasto" />
			</div>

			<TwoColumnsDiv className="mb-4">
				<div>
					<Label>Nombre del gasto</Label>
					<Input readOnly defaultValue={expense.name} />
				</div>
				<div>
					<Label>Persona responsable</Label>
					<Input readOnly defaultValue={expense.user.name} />
				</div>
			</TwoColumnsDiv>

			<TwoColumnsDiv className="mb-4">
				<div>
					<Label>Monto</Label>
					<Input
						readOnly
						defaultValue={`$ ${formatCurrency(expense.amount)}`}
					/>
				</div>
				<div>
					<Label>Sucursal</Label>
					<Input readOnly defaultValue={expense.subOrg.name} />
				</div>
			</TwoColumnsDiv>

			<TwoColumnsDiv className="mb-4">
				<div>
					<Label>Fecha del creación</Label>
					<Input
						readOnly
						defaultValue={`${formatDate(expense.createdAt)} ${formatHours(
							expense.createdAt,
						)}`}
					/>
				</div>
				<div>
					<Label>Origen</Label>
					<Input
						readOnly
						defaultValue={expense.origin === 'bank' ? 'Banco' : 'Caja'}
					/>
				</div>
			</TwoColumnsDiv>

			<TwoColumnsDiv className="md:mb-4">
				<div>
					<Label>Categoría</Label>
					<Input
						readOnly
						defaultValue={expense.category?.name || 'Sin categoría'}
					/>
				</div>
				<div></div>
			</TwoColumnsDiv>

			<Label>Detalles</Label>
			<Input
				readOnly
				defaultValue={expense.description || 'Sin categoría'}
				className="mb-4"
			/>

			<Form method="POST" className="flex justify-end gap-4">
				<LinkButton to="/treasury" variant="secondary" prefetch="intent">
					Volver a los gastos
				</LinkButton>
				<IntentButton intent="delete" variant="destructive">
					Eliminar gasto
				</IntentButton>
			</Form>
		</Modal>
	);
}

function PrintableExpense() {
	const { expense } = useLoaderData<typeof loader>();
	const { subOrg: branch } = expense;

	return (
		<div>
			<OrganizationInfo
				name={branch.name}
				address={branch.address}
				tel={branch.tel ?? undefined}
				nit={branch.nit ?? undefined}
				text="Gasto"
			/>

			<Separator />

			<DateMetadataInfo createdAt={expense.createdAt} />

			<Separator />

			<div className="leading-4">
				<p className="text-xs font-bold">Gasto</p>
				<p className="text-xs">{expense.name}</p>

				<p className="text-xs font-bold">Descripción</p>
				<p className="text-xs">{expense.description || 'Sin descripción'}</p>

				<p className="text-xs font-bold">Responsable</p>
				<p className="text-xs">{expense.user.name}</p>
				<p className="text-xs font-bold">Sucursal</p>
				<p className="text-xs">{branch.name}</p>

				<p className="text-xs font-bold">Categoría</p>
				<p className="text-xs">{expense.category?.name || 'Sin categoría'}</p>

				<p className="text-xs font-bold">Origen</p>
				<p className="text-xs">
					{expense.origin === 'bank' ? 'Banco' : 'Caja'}
				</p>
			</div>

			<p className="text-xs font-bold">Monto</p>
			<p className="text-sm font-bold">${formatCurrency(expense.amount)}</p>
		</div>
	);
}
