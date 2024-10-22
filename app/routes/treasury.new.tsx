import { conform, useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	json,
	type ActionFunctionArgs,
	redirect,
	type MetaFunction,
	type LoaderFunctionArgs,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import * as z from 'zod';
import {
	CurrencyInput,
	ErrorText,
	Input,
	IntentButton,
	Label,
	LinkButton,
	Select,
	addCustomErrorToSubmission,
	currencyTransformer,
} from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import { TwoColumnsDiv } from '~/components/ui-library';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [{ title: `Crear gasto - Villing` }];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);
	const organization = await db.organization.findUniqueOrThrow({
		where: { id: orgId },
		select: {
			expensesCagegories: { orderBy: { name: 'asc' } },
			SubOrganization: { where: { deletedAt: null }, orderBy: { name: 'asc' } },
			members: {
				include: { user: true },
				orderBy: { user: { name: 'asc' } },
			},
		},
	});

	return json({
		categories: organization.expensesCagegories.map(x => ({
			label: x.name,
			value: x.id,
		})),
		subOrgs: organization.SubOrganization.map(x => ({
			label: x.name,
			value: x.id,
		})),
		members: organization.members.map(x => ({
			label: x.user.name,
			value: x.userId,
		})),
	});
}

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const formData = await request.formData();

	const { db, userId } = await getOrgDbClient(request);

	const submission = parse(formData, { schema });
	if (submission.intent !== 'submit' || !submission.value) {
		return json({ submission, error: null }, 400);
	}

	const expense = submission.value;

	const { error } = await legalActions.validate(db, userId, 'update_expenses');

	if (error) {
		return json(
			{ submission: addCustomErrorToSubmission(error, submission), error },
			403,
		);
	}

	try {
		const { id: expenseId } = await db.$transaction(async tx => {
			const {
				name: branchName,
				Cashier: [cashier],
			} = await tx.subOrganization.findUniqueOrThrow({
				where: { id: expense.subId },
				select: {
					name: true,
					Cashier: {
						orderBy: { createdAt: 'asc' },
						take: -1,
						select: { id: true, createdAt: true, closedAt: true },
					},
				},
			});

			if (expense.origin === 'cashier') {
				if (!cashier) throw `La sucursal ${branchName} no tiene caja abierta`;
				if (cashier?.closedAt) throw `La caja de ${branchName} está cerrada`;
			}

			return tx.expense.create({
				data: { ...expense, cashierId: cashier?.id },
				select: { id: true },
			});
		});

		return redirect(`/treasury/${expenseId}?print=true`);
	} catch (error) {
		if (typeof error === 'string') {
			return json(
				{ submission: addCustomErrorToSubmission(error, submission), error },
				500,
			);
		}

		await logError({ request, error });

		return json(
			{ submission: null, error: 'Hubo un error al crear el gasto' },
			500,
		);
	}
}

export default function Component() {
	const { categories, members, subOrgs } = useLoaderData<typeof loader>();
	const actionData = useActionData<typeof action>();
	const [form, fields] = useForm({
		constraint: getFieldsetConstraint(schema),
		onValidate: ({ formData }) => parse(formData, { schema }),
		id: 'create',
		lastSubmission: actionData?.submission || undefined,
	});
	const error = actionData?.error || form.error;

	return (
		<Modal className="max-w-xl">
			<ModalHeader className="mb-4" href="/treasury">
				<h5>Nuevo gasto</h5>
			</ModalHeader>

			<Form method="POST" {...form.props} className="flex flex-col gap-2">
				<TwoColumnsDiv>
					<div className="flex-1">
						<Label htmlFor={fields.name.id}>Nombre del gasto</Label>
						<Input
							placeholder="Escribe el nombre aquí"
							{...conform.input(fields.name)}
						/>
						<ErrorText id={fields.name.errorId}>{fields.name.error}</ErrorText>
					</div>

					<div className="flex-1">
						<Label htmlFor={fields.amount.id}>Monto</Label>
						<CurrencyInput
							placeholder="$ 10,000"
							{...conform.input(fields.amount)}
						/>
						<ErrorText id={fields.amount.errorId}>
							{fields.amount.error}
						</ErrorText>
					</div>
				</TwoColumnsDiv>

				<TwoColumnsDiv>
					<div className="flex-1">
						<Label htmlFor={fields.subId.id}>Sucursal</Label>
						<Select options={subOrgs} {...conform.input(fields.subId)} />
						<ErrorText id={fields.subId.errorId}>
							{fields.subId.error}
						</ErrorText>
					</div>

					<div className="flex-1">
						<Label htmlFor={fields.userId.id}>Persona responsable</Label>
						<Select options={members} {...conform.input(fields.userId)} />
						<ErrorText id={fields.userId.errorId}>
							{fields.userId.error}
						</ErrorText>
					</div>
				</TwoColumnsDiv>

				<TwoColumnsDiv>
					<div className="flex-1">
						<Label htmlFor={fields.categoryId.id}>Categoría (opcional)</Label>
						<Select
							options={[{ value: '', label: 'Sin categoría' }, ...categories]}
							{...conform.input(fields.categoryId)}
						/>
						<ErrorText id={fields.categoryId.errorId}>
							{fields.categoryId.error}
						</ErrorText>
					</div>

					<div className="flex-1">
						<Label htmlFor={fields.origin.id}>Origen del gasto</Label>
						<Select
							options={[
								{ value: 'cashier', label: 'Caja' },
								{ value: 'bank', label: 'Banco' },
							]}
							{...conform.input(fields.origin)}
						/>
						<ErrorText id={fields.origin.errorId}>
							{fields.origin.error}
						</ErrorText>
					</div>
				</TwoColumnsDiv>

				<div className="flex-1">
					<Label htmlFor={fields.description.id}>
						Descripción del gasto (opcional)
					</Label>
					<Input
						placeholder="Descripción del gasto"
						{...conform.input(fields.description)}
					/>
					<ErrorText id={fields.description.errorId}>
						{fields.description.error}
					</ErrorText>
				</div>

				<ErrorText id={form.errorId}>{error}</ErrorText>

				<div className="flex gap-4">
					<IntentButton className="mt-2" intent="create" variant="black">
						<i className="ri-add-circle-line"></i>
						Agregar gasto
					</IntentButton>
					<LinkButton className="mt-2" to="/treasury" variant="secondary">
						Cancelar
					</LinkButton>
				</div>
			</Form>
		</Modal>
	);
}

const schema = z.object({
	name: z.string({ required_error: 'El nombre es requerido' }),
	amount: z
		.string({ required_error: 'El monto es requerido' })
		.transform(currencyTransformer),
	userId: z.number({ required_error: 'El usuario es requerido' }),
	subId: z.number({ required_error: 'La sucursal es requerida' }),
	categoryId: z.number().optional(),
	origin: z.enum(['cashier', 'bank']),
	description: z.string().optional(),
});
