import { conform, useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	json,
	type DataFunctionArgs,
	type MetaFunction,
} from '@remix-run/node';
import {
	Form,
	useActionData,
	useFetcher,
	useLoaderData,
} from '@remix-run/react';
import * as React from 'react';
import * as z from 'zod';
import {
	Button,
	ErrorText,
	Input,
	IntentButton,
	Label,
} from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { useIsSubmitting } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: `Categorías de gasto - Villing` },
];

export async function loader({ request }: DataFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);
	const categories = await db.expenseCategory.findMany({
		where: { organizationId: orgId },
		orderBy: { name: 'asc' },
	});

	return json({ categories });
}

export async function action({ request }: DataFunctionArgs) {
	await protectRoute(request);

	const formData = await request.formData();
	const intent = formData.get('intent')?.toString();

	try {
		const { db, orgId } = await getOrgDbClient(request);

		switch (intent) {
			case 'create':
				{
					const submission = parse(formData, { schema });
					if (submission.intent !== 'submit' || !submission.value) {
						return json({ submission, error: null }, 400);
					}

					const expense = submission.value;

					await db.expenseCategory.create({
						data: { ...expense, organizationId: orgId },
						select: { id: true },
					});
				}
				break;
			case 'update':
				{
					const submission = parse(formData, { schema });
					if (submission.intent !== 'submit' || !submission.value) {
						return json({ submission, error: null }, 400);
					}

					const expense = submission.value;
					const id = formData.get('id')?.toString();

					await db.expenseCategory.update({
						where: { id: Number(id), organizationId: orgId },
						data: expense,
						select: { id: true },
					});
				}
				break;
			case 'delete':
				{
					const id = formData.get('id')?.toString();
					await db.expenseCategory.deleteMany({
						where: { id: Number(id), organizationId: orgId },
					});
				}
				break;
			default:
				break;
		}

		return json({ submission: null, error: null });
	} catch (error) {
		if (typeof error === 'string') {
			return json({ submission: null, error }, 400);
		}

		await logError({ request, error });

		return json(
			{ submission: null, error: 'Hubo un error con las categorías' },
			500,
		);
	}
}

export default function Component() {
	const { categories } = useLoaderData<typeof loader>();

	return (
		<Modal className="max-w-lg">
			<ModalHeader className="mb-4" href="/treasury">
				<h5>Categorías</h5>
			</ModalHeader>

			{categories.length ? (
				<ul className="mb-4 list-none text-sm">
					{categories.map(category => (
						<CategoryItem
							key={category.id}
							name={category.name}
							id={category.id}
						/>
					))}
				</ul>
			) : (
				<p className="mb-4 text-sm">No tienes ninguna categoría</p>
			)}

			<CreateCategory />
		</Modal>
	);
}

function CategoryItem({ name, id }: { name: string; id: number }) {
	const [isEditing, setIsEditing] = React.useState(false);
	const fetcher = useFetcher<typeof action>();
	const deleteFetcher = useFetcher();
	const formId = React.useId();
	const [form, fields] = useForm({
		id: formId,
		constraint: getFieldsetConstraint(schema),
		onValidate: ({ formData }) => parse(formData, { schema }),
		lastSubmission: fetcher.data?.submission || undefined,
		defaultValue: { name },
	});
	const error = fetcher.data?.error;
	const isPending = fetcher.state !== 'idle';
	const optimisticName = fetcher.formData?.get('name')?.toString();

	React.useEffect(() => {
		if (fetcher.state === 'loading') setIsEditing(false);
	}, [fetcher.state]);

	if (deleteFetcher.state !== 'idle') return null;

	if (isEditing) {
		return (
			<li className="flex first-of-type:pt-0 gap-4 justify-between py-2 items-center border-b border-gray-200">
				<fetcher.Form method="POST" className="w-full" {...form.props}>
					<input type="hidden" name="id" value={id} />

					<Label htmlFor={fields.name.id}>Nombre</Label>
					<Input
						placeholder="Escribe el nombre aquí"
						autoFocus
						{...conform.input(fields.name)}
					/>
					<ErrorText id={fields.name.errorId}>{fields.name.error}</ErrorText>

					<ErrorText id={form.errorId}>{error}</ErrorText>

					<div className="flex gap-4 mt-2">
						<IntentButton
							variant="black"
							intent="update"
							state={isPending ? 'pending' : 'idle'}
						>
							Actualizar
						</IntentButton>
						<Button
							type="button"
							onClick={() => setIsEditing(false)}
							variant="secondary"
						>
							Cancelar
						</Button>
					</div>
				</fetcher.Form>
			</li>
		);
	}

	return (
		<li className="flex gap-4 first-of-type:pt-0 justify-between py-2 items-center border-b border-gray-200">
			<p className="flex-1">{optimisticName || name}</p>
			<div className="flex gap-2">
				<button type="button" onClick={() => setIsEditing(true)}>
					<i className="ri-edit-line text-base"></i>
				</button>

				<deleteFetcher.Form method="POST">
					<input type="hidden" name="id" value={id} />
					<button
						type="submit"
						className="text-error-600"
						name="intent"
						value="delete"
					>
						<i className="ri-delete-bin-line text-base"></i>
					</button>
				</deleteFetcher.Form>
			</div>
		</li>
	);
}

function CreateCategory() {
	const actionData = useActionData<typeof action>();
	const isPending = useIsSubmitting('create');
	const [form, fields] = useForm({
		constraint: getFieldsetConstraint(schema),
		onValidate: ({ formData }) => parse(formData, { schema }),
		id: 'create-category',
		lastSubmission: actionData?.submission || undefined,
	});
	const error = actionData?.error;

	React.useEffect(() => {
		if (isPending) form.ref.current?.reset();
	}, [form.ref, isPending]);

	return (
		<Form method="POST" {...form.props}>
			<Label htmlFor={fields.name.id}>Nombre</Label>
			<Input
				placeholder="Escribe el nombre aquí"
				{...conform.input(fields.name)}
			/>
			<ErrorText id={fields.name.errorId}>{fields.name.error}</ErrorText>

			<ErrorText id={form.errorId}>{error}</ErrorText>

			<IntentButton className="mt-2" intent="create" variant="black">
				<i className="ri-add-circle-line"></i>
				Crear categoría
			</IntentButton>
		</Form>
	);
}

const schema = z.object({
	name: z.string({ required_error: 'El nombre es requerido' }),
});
