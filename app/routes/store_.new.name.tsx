import { conform, useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	type ActionFunctionArgs,
	redirect,
	json,
	type LoaderFunctionArgs,
} from '@remix-run/node';
import { Form, Link, useActionData, useLoaderData } from '@remix-run/react';
import slugify from 'slugify';
import * as z from 'zod';
import {
	ErrorText,
	Input,
	IntentButton,
	Label,
	LinkButton,
	Select,
	Toast,
	addCustomErrorToSubmission,
} from '~/components/form-utils';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const subOrganizations = await db.subOrganization.findMany({
		where: { organizationId: orgId, deletedAt: null },
		select: { id: true, name: true, Store: true },
	});

	// if (subOrganizations.some(x => x.Store.length > 0)) {
	// 	return redirect('/store');
	// }

	return json({
		subOrganizations: subOrganizations.map(x => ({
			value: x.id,
			label: x.name,
		})),
	});
}

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const formData = await request.formData();
	const submission = parse(formData, { schema });
	if (submission.intent !== 'submit' || !submission.value) {
		return json(submission, 400);
	}

	try {
		const { db, orgId } = await getOrgDbClient(request);
		const store = submission.value;

		await db.$transaction(async tx => {
			const id = slugify(store.name, { lower: true });

			const existingStore = await tx.store.findFirst({
				where: { id },
			});

			if (existingStore) {
				throw `Ya existe una tienda con el nombre "${store.name}"`;
			}

			await tx.store.create({
				data: {
					id,
					name: store.name,
					organizationId: orgId,
					subOrganizationId: store.subId,
				},
			});
		});

		return redirect(`/store/new/identity`);
	} catch (error) {
		await logError({ error, request });

		return json(
			addCustomErrorToSubmission(
				typeof error === 'string'
					? error
					: 'Hubo un error al crear la tienda, por favor intenta de nuevo',
				submission,
			),
			500,
		);
	}
}

export default function Component() {
	const lastSubmission = useActionData<typeof action>();
	const { subOrganizations } = useLoaderData<typeof loader>();
	const [form, fields] = useForm({
		id: 'name-form',
		constraint: getFieldsetConstraint(schema),
		shouldValidate: 'onBlur',
		onValidate: ({ formData }) => parse(formData, { schema }),
		lastSubmission,
	});

	return (
		<div>
			<h3>Comienza a vender online</h3>
			<p className="text-gray-500 mb-4">
				Crea tu tienda online y empieza a vender tus productos en minutos.
			</p>

			<Form method="POST" {...form.props} className="flex flex-col gap-4">
				<div>
					<Label htmlFor={fields.name.id}>Nombre de la tienda</Label>
					<Input
						{...conform.input(fields.name)}
						placeholder="Nombre de la tienda"
					/>
					<ErrorText id={fields.name.errorId}>{fields.name.error}</ErrorText>
				</div>

				<Toast variant="info" className="flex gap-2">
					<i className="ri-information-line"></i>
					<p>
						El stock de tus productos se maneja por sucursal, por lo que debes
						seleccionar la sucursal de la que quieres que se tome el stock de
						tus productos. Si no ves la sucursal que buscas, puedes crearla en
						la sección de{' '}
						<Link
							to="/settings/suborganizations/new"
							className="font-medium underline"
							target="_blank"
						>
							Organización
						</Link>
						.
					</p>
				</Toast>

				<div>
					<Label htmlFor={fields.subId.id}>Sucursal origen del stock</Label>
					<Select
						{...conform.select(fields.subId)}
						options={subOrganizations}
					/>
					<ErrorText id={fields.subId.errorId}>{fields.subId.error}</ErrorText>
				</div>

				<Toast variant="error" id={form.errorId}>
					{form.error}
				</Toast>

				<div className="flex gap-4 justify-end">
					<LinkButton to="/home" variant="secondary">
						Cancelar proceso
					</LinkButton>
					<IntentButton intent="submit">Crear tienda</IntentButton>
				</div>
			</Form>
		</div>
	);
}

const schema = z.object({
	name: z.string({ required_error: 'El nombre es requerido' }),
	subId: z.number({ required_error: 'La sucursal es requerida' }),
});
