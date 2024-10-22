import { conform, useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	type MetaFunction,
	json,
	redirect,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node';
import { Form, useActionData, useLoaderData } from '@remix-run/react';
import * as z from 'zod';
import { ColorPicker } from '~/components/color-picker';
import { RouteErrorBoundary } from '~/components/error-boundary';

import {
	ErrorText,
	Input,
	IntentButton,
	Label,
	Select,
	Toast,
	addCustomErrorToSubmission,
} from '~/components/form-utils';
import { ImageUploader } from '~/components/image-uploader';
import { TwoColumnsDiv } from '~/components/ui-library';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { getFilePresignedUrlByKey } from '~/utils/misc.server';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: 'Actualiza la tienda | Villing' },
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const store = await db.store.findFirst({
		where: { organizationId: orgId },
		include: {
			subOrganization: true,
			organization: {
				select: {
					SubOrganization: { where: { deletedAt: null } },
					PriceList: true,
				},
			},
		},
	});

	if (!store) throw redirect('/store/new');

	const [logoUrl, bannerUrl] = await Promise.all([
		getFilePresignedUrlByKey(store.logoObjectId),
		getFilePresignedUrlByKey(store.bannerObjectId),
	]);

	return json({ store, logoUrl, bannerUrl });
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
		await db.$transaction(async tx => {
			const [storeExists] = await tx.store.findMany({
				where: { id: store.id, organizationId: { not: orgId } },
				select: { id: true },
			});

			if (storeExists) throw `Una tienda con la url ${store.id} ya existe`;
			const { branchId, ...data } = store;

			await tx.store.update({
				where: { organizationId: orgId },
				data: { ...data, subOrganizationId: branchId },
			});
		});

		return json({ submission, error: null, success: true });
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
	const { store, bannerUrl, logoUrl } = useLoaderData<typeof loader>();

	const actionData = useActionData<typeof action>();
	const [form, fields] = useForm({
		id: 'store',
		constraint: getFieldsetConstraint(schema),
		shouldValidate: 'onBlur',
		onValidate: ({ formData }) => parse(formData, { schema }),
		lastSubmission: actionData?.submission,
		defaultValue: store,
	});
	const branches = store.organization.SubOrganization;
	const priceLists = store.organization.PriceList;

	return (
		<Form method="POST" {...form.props} className="max-w-3xl">
			<div className="pb-4 border-b border-gray-200 mb-4">
				<h3>Tienda</h3>
				<p className="text-gray-500 text-sm">
					Modifica los datos de la tienda.
				</p>
			</div>

			<a
				href={`https://tiendas.villing.io/${store.id}`}
				className="block text-primary-600 mb-4 hover:underline"
				target="_blank"
				rel="noopener noreferrer"
			>
				Ver la tienda en vivo
				<i className="ri-arrow-right-line ml-1" />
			</a>

			<div>
				<fieldset className="pb-4 border-b border-gray-200 mb-4 flex flex-col gap-4">
					<legend className="font-medium mb-4">
						Información de la empresa
					</legend>

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.name.id}>Nombre de la tienda</Label>
							<Input
								placeholder='Ej. "Villing"'
								{...conform.input(fields.name)}
							/>
							<ErrorText id={fields.name.errorId}>
								{fields.name.error}
							</ErrorText>
						</div>

						<div className="flex-1">
							<Label htmlFor={fields.id.id}>
								Url de la tienda (sin espacios)
							</Label>
							<Input
								placeholder="URL de la tienda"
								{...conform.input(fields.id)}
							/>
							<ErrorText id={fields.id.errorId}>{fields.id.error}</ErrorText>
						</div>
					</TwoColumnsDiv>

					<TwoColumnsDiv>
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

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.branchId.id}>Sucursal</Label>
							<Select
								options={branches.map(b => ({ label: b.name, value: b.id }))}
								{...conform.select(fields.branchId)}
							/>
							<ErrorText id={fields.branchId.errorId}>
								{fields.branchId.error}
							</ErrorText>
						</div>

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
					</TwoColumnsDiv>

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.stocksProductsBehavior.id}>
								Comportamiento del stock en cero
							</Label>

							<Select
								options={[
									{ label: 'Ocultar', value: 'hide' },
									{ label: 'Vender en negativo', value: 'allow' },
									{
										label: 'Mostrar como no disponible',
										value: 'showAsUnavailable',
									},
								]}
								{...conform.select(fields.stocksProductsBehavior)}
							/>
							<p className="text-sm text-gray-600 mt-1">
								Qué quieres que suceda cuando un producto se quede sin stock
							</p>
							<ErrorText id={fields.stocksProductsBehavior.errorId}>
								{fields.stocksProductsBehavior.error}
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
				</fieldset>

				<fieldset className="mb-6 flex flex-col gap-4">
					<legend className="font-medium mb-4">Identidad de la tienda</legend>

					<TwoColumnsDiv>
						<ImageUploader
							formAction={`/store/${store.id}/media?mediaType=logo`}
							url={logoUrl}
							label="Logo"
						/>
						<ImageUploader
							formAction={`/store/${store.id}/media?mediaType=banner`}
							url={bannerUrl}
							label="Banner"
						/>
					</TwoColumnsDiv>

					<TwoColumnsDiv>
						<ColorPicker
							defaultColor={store.primaryColor || ''}
							inputName="primaryColor"
							label="Color primario"
							className="max-w-full"
						/>

						<ColorPicker
							defaultColor={store.secondaryColor || ''}
							inputName="secondaryColor"
							label="Color secundario"
							className="max-w-full"
						/>
					</TwoColumnsDiv>
				</fieldset>

				<Toast variant="error" className="mb-4">
					{form.error}
				</Toast>

				<IntentButton intent="update">Guardar cambios</IntentButton>
			</div>
		</Form>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con los ajustes. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}

const schema = z.object({
	id: z.string({ required_error: 'Ingresa la url de la tienda' }),
	name: z.string({ required_error: 'Ingresa el nombre de la tienda' }),
	primaryColor: z.string().optional(),
	secondaryColor: z.string().optional(),
	priceListId: z.number({ required_error: 'Selecciona una lista de precios' }),
	branchId: z.number({ required_error: 'Selecciona una sucursal' }),
	bannerTitle: z.string({ required_error: 'Ingresa el título del banner' }),
	bannerSubtitle: z.string().optional(),
	stocksProductsBehavior: z
		.enum(['hide', 'allow', 'showAsUnavailable'])
		.optional(),
	whatsapp: z.string().optional(),
});
