import { useForm, conform } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	redirect,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	json,
} from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import * as z from 'zod';
import { ColorPicker } from '~/components/color-picker';
import {
	Input,
	ErrorText,
	Select,
	Label,
	IntentButton,
	Toast,
	addCustomErrorToSubmission,
} from '~/components/form-utils';
import { ImageUploader } from '~/components/image-uploader';
import { TwoColumnsDiv } from '~/components/ui-library';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';
import store from './store';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const { Store, PriceList } = await db.organization.findFirstOrThrow({
		where: { id: orgId },
		select: {
			Store: true,
			PriceList: {
				where: { deletedAt: null },
			},
		},
	});

	if (!Store) throw redirect('/store/new');

	return { priceLists: PriceList, storeId: Store.id };
}

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const formData = await request.formData();

	const submission = parse(formData, { schema });
	if (submission.intent !== 'submit' || !submission.value) {
		return json({ submission, error: null }, 400);
	}

	const store = submission.value;

	const { db, orgId, userId } = await getOrgDbClient(request);

	const { error } = await legalActions.validate(
		db,
		userId,
		'update_organization',
	);

	if (error) {
		return json(
			{ submission: addCustomErrorToSubmission(error, submission) },
			403,
		);
	}

	try {
		await db.store.update({
			where: { organizationId: orgId },
			data: store,
		});

		return redirect('/store');
	} catch (error) {
		if (typeof error === 'string') return json({ submission, error }, 400);

		await logError({ request, error });

		return json(
			{ submission, error: 'Hubo un error al actualizar la tienda' },
			500,
		);
	}
}

export default function Component() {
	const { priceLists, storeId } = useLoaderData<typeof loader>();
	const [form, fields] = useForm({
		id: 'store',
		constraint: getFieldsetConstraint(schema),
		shouldValidate: 'onBlur',
		onValidate: ({ formData }) => parse(formData, { schema }),
		defaultValue: store,
	});

	return (
		<div>
			<h3>Identidad de marca</h3>
			<p className="text-gray-500 mb-4">
				Escoge los colores de tu tienda y el título del banner.
			</p>

			<Form method="POST" {...form.props}>
				<TwoColumnsDiv className="mb-4">
					<div className="flex-1">
						<Label htmlFor={fields.bannerTitle.id}>Título del banner</Label>
						<Input
							placeholder='Ej. "La mejor tienda de la ciudad"'
							{...conform.input(fields.bannerTitle)}
						/>
						<ErrorText id={fields.bannerTitle.errorId}>
							{fields.bannerTitle.error}
						</ErrorText>
					</div>

					<div className="flex-1">
						<Label htmlFor={fields.bannerSubtitle.id}>
							Descipción del banner (opcional)
						</Label>
						<Input
							placeholder="Ej. 'Envíos gratis a todo el país'"
							{...conform.input(fields.bannerSubtitle)}
						/>
						<ErrorText id={fields.bannerSubtitle.errorId}>
							{fields.bannerSubtitle.error}
						</ErrorText>
					</div>
				</TwoColumnsDiv>

				<TwoColumnsDiv className="mb-4">
					<div className="flex-1">
						<Label htmlFor={fields.priceListId.id}>Lista de precios</Label>
						<Select
							options={priceLists.map(b => ({ label: b.name, value: b.id }))}
							{...conform.select(fields.priceListId)}
						/>
						<ErrorText id={fields.priceListId.errorId}>
							{fields.priceListId.error}
						</ErrorText>
					</div>

					<div className="flex-1">
						<Label htmlFor={fields.whatsapp.id}>Número de WhatsApp</Label>
						<Input
							placeholder='Ej. "123456789"'
							{...conform.input(fields.whatsapp)}
						/>
						<ErrorText id={fields.whatsapp.errorId}>
							{fields.whatsapp.error}
						</ErrorText>
					</div>
				</TwoColumnsDiv>

				<TwoColumnsDiv className="mb-4">
					<ImageUploader
						formAction={`/store/${storeId}/media?mediaType=logo`}
						url=""
						label="Logo"
					/>
					<ImageUploader
						formAction={`/store/${storeId}/media?mediaType=banner`}
						url=""
						label="Banner"
					/>
				</TwoColumnsDiv>

				<TwoColumnsDiv className="mb-4">
					<ColorPicker
						defaultColor="#000000"
						inputName="primaryColor"
						label="Color primario"
						className="max-w-full"
					/>

					<ColorPicker
						defaultColor="#000000"
						inputName="secondaryColor"
						label="Color secundario"
						className="max-w-full"
					/>
				</TwoColumnsDiv>

				<Toast variant="error" id={form.errorId}>
					{form.error}
				</Toast>

				<div className="flex justify-end">
					<IntentButton intent="submit">Ir a la tienda</IntentButton>
				</div>
			</Form>
		</div>
	);
}

const schema = z.object({
	primaryColor: z.string().optional(),
	secondaryColor: z.string().optional(),
	priceListId: z.number({ required_error: 'Selecciona una lista de precios' }),
	bannerTitle: z.string({ required_error: 'Ingresa el título del banner' }),
	bannerSubtitle: z.string().optional(),
	whatsapp: z.string().optional(),
});
