import { conform, useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	type MetaFunction,
	json,
	redirect,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node';
import {
	Form,
	useActionData,
	useFetcher,
	useLoaderData,
} from '@remix-run/react';
import * as React from 'react';
import { EmptyUserIcon } from '~/assets/jsx-icons';
import { ClientOnly } from '~/components/client-only';
import { RouteErrorBoundary } from '~/components/error-boundary';

import {
	Button,
	ErrorText,
	Input,
	IntentButton,
	Label,
	Select,
	Toast,
	addCustomErrorToSubmission,
} from '~/components/form-utils';
import { TwoColumnsDiv } from '~/components/ui-library';
import { useOrganization } from '~/root';
import { getOrgDbClient, logError } from '~/utils/db.server';
import {
	identifications,
	municipalities,
	taxDetails,
	typeCompanies,
	typeLiabilities,
	typeOrganizations,
	typeRegimes,
} from '~/utils/legal-values';
import { MAX_FILE_SIZE, cn } from '~/utils/misc';
import { getFilePresignedUrlByKey } from '~/utils/misc.server';
import { legalActions } from '~/utils/permissions.server';
import { organizationSchema as schema } from '~/utils/schemas';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: 'Actualiza la empresa | Villing' },
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const { imageUri } = await db.organization.findUniqueOrThrow({
		where: { id: orgId },
		select: { imageUri: true },
	});

	const signedLogoUrl = await getFilePresignedUrlByKey(imageUri);

	return json({ signedLogoUrl });
}

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const formData = await request.formData();

	const submission = parse(formData, { schema });
	if (submission.intent !== 'submit' || !submission.value) {
		return json({ submission, error: null }, 400);
	}

	const organization = submission.value;

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
		await db.organization.update({
			where: { id: orgId },
			data: organization,
			select: { id: true },
		});

		return redirect('/home?saved=true');
	} catch (error) {
		await logError({ request, error });

		return json(
			{ submission, error: 'Hubo un error al actualizar la empresa' },
			500,
		);
	}
}

export default function Component() {
	const organization = useOrganization();
	const actionData = useActionData<typeof action>();
	const [form, fields] = useForm({
		id: 'login',
		constraint: getFieldsetConstraint(schema),
		shouldValidate: 'onBlur',
		onValidate: ({ formData }) => parse(formData, { schema }),
		lastSubmission: actionData?.submission,
		defaultValue: organization,
	});

	return (
		<Form method="POST" {...form.props} className="max-w-3xl">
			<div className="pb-4 border-b border-gray-200 mb-4">
				<h3>Empresa</h3>
				<p className="text-gray-500 text-sm">
					Modifica los datos de la empresa.
				</p>
			</div>

			<div>
				<fieldset className="pb-4 border-b border-gray-200 mb-4 flex flex-col gap-4">
					<legend className="font-medium mb-4">
						Información de la empresa
					</legend>

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.name.id}>Nombre - Razón social</Label>
							<Input
								placeholder='Ej. "Villing SAS"'
								{...conform.input(fields.name)}
							/>
							<ErrorText id={fields.name.errorId}>
								{fields.name.error}
							</ErrorText>
						</div>

						<div className="flex-1">
							<Label htmlFor={fields.tradeName.id}>
								Nombre comercial (opcional)
							</Label>
							<Input
								placeholder='Ej. "Villing"'
								{...conform.input(fields.tradeName)}
							/>
							<ErrorText id={fields.tradeName.errorId}>
								{fields.tradeName.error}
							</ErrorText>
						</div>
					</TwoColumnsDiv>

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.typeDocumentIdentification.id}>
								Tipo de identificación
							</Label>
							<Select
								options={identifications}
								{...conform.select(fields.typeDocumentIdentification)}
							/>
							<ErrorText id={fields.typeDocumentIdentification.errorId}>
								{fields.typeDocumentIdentification.error}
							</ErrorText>
						</div>

						<div className="flex-1">
							<Label htmlFor={fields.idNumber.id}>
								NIT (sin dígito de verificación)
							</Label>
							<Input
								placeholder='Ej. "123456789"'
								{...conform.input(fields.idNumber)}
							/>
							<ErrorText id={fields.idNumber.errorId}>
								{fields.idNumber.error}
							</ErrorText>
						</div>
					</TwoColumnsDiv>

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.textInInvoice.id}>
								Texto en la tirilla (opcional)
							</Label>
							<Input
								placeholder='Ej. "Consignar a cuenta..."'
								{...conform.input(fields.textInInvoice)}
							/>
							<ErrorText id={fields.textInInvoice.errorId}>
								{fields.textInInvoice.error}
							</ErrorText>
						</div>

						<div className="flex-1">
							<Label htmlFor={fields.type.id}>Tipo de empresa</Label>
							<Select
								options={typeCompanies}
								{...conform.select(fields.type)}
							/>
							<ErrorText id={fields.type.errorId}>
								{fields.type.error}
							</ErrorText>
						</div>
					</TwoColumnsDiv>

					<OrganizationLogo />
				</fieldset>

				<fieldset className="mb-4 pb-4 border-b border-gray-200 flex flex-col gap-4">
					<legend className="font-medium mb-4">Información de contacto</legend>

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.email.id}>Correo electrónico</Label>
							<Input
								placeholder='Ej. "hola@villing.io"'
								{...conform.input(fields.email)}
							/>
							<ErrorText id={fields.email.errorId}>
								{fields.email.error}
							</ErrorText>
						</div>

						<div className="flex-1">
							<Label htmlFor={fields.tel.id}>Teléfono</Label>
							<Input
								placeholder='Ej. "hola@villing.io"'
								{...conform.input(fields.tel)}
							/>
							<ErrorText id={fields.tel.errorId}>{fields.tel.error}</ErrorText>
						</div>
					</TwoColumnsDiv>

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.phone.id}>Celular (opcional)</Label>
							<Input
								placeholder='Ej. "123456789"'
								{...conform.input(fields.phone)}
							/>
							<ErrorText id={fields.phone.errorId}>
								{fields.phone.error}
							</ErrorText>
						</div>

						<div className="flex-1">
							<Label htmlFor={fields.website.id}>Página web (opcional)</Label>
							<Input
								placeholder='Ej. "villing.io"'
								{...conform.input(fields.website)}
							/>
							<ErrorText id={fields.website.errorId}>
								{fields.website.error}
							</ErrorText>
						</div>
					</TwoColumnsDiv>
				</fieldset>

				<fieldset className="mb-4 pb-4 border-b border-gray-200 flex flex-col gap-4">
					<legend className="font-medium mb-4">Información de dirección</legend>

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.address.id}>Dirección</Label>
							<Input
								placeholder='Ej. "Calle 54 #45 - 55"'
								{...conform.input(fields.address)}
							/>
							<ErrorText id={fields.address.errorId}>
								{fields.address.error}
							</ErrorText>
						</div>

						<div className="flex-1">
							<Label htmlFor={fields.municipalityId.id}>Municipio</Label>
							<Select
								options={municipalities}
								{...conform.select(fields.municipalityId)}
							/>
							<ErrorText id={fields.municipalityId.errorId}>
								{fields.municipalityId.error}
							</ErrorText>
						</div>
					</TwoColumnsDiv>

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.country.id}>País</Label>
							<Select
								{...conform.select(fields.country)}
								options={[
									{ value: 'col', label: 'Colombia' },
									{ value: 'ven', label: 'Venezuela' },
								]}
							/>
							<ErrorText id={fields.country.errorId}>
								{fields.country.error}
							</ErrorText>
						</div>

						<div className="flex-1"></div>
					</TwoColumnsDiv>
				</fieldset>

				<fieldset className="mb-6 flex flex-col gap-4">
					<legend className="font-medium mb-4">Información tributaria</legend>

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.typeOrganization.id}>
								Tipo de persona
							</Label>
							<Select
								options={typeOrganizations}
								{...conform.select(fields.typeOrganization)}
							/>
							<ErrorText id={fields.typeOrganization.errorId}>
								{fields.typeOrganization.error}
							</ErrorText>
						</div>

						<div className="flex-1">
							<Label htmlFor={fields.typeRegime.id}>Tipo de régimen</Label>
							<Select
								options={typeRegimes}
								{...conform.select(fields.typeRegime)}
							/>
							<ErrorText id={fields.typeRegime.errorId}>
								{fields.typeRegime.error}
							</ErrorText>
						</div>
					</TwoColumnsDiv>

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.typeLiability.id}>
								Tipo de responsabilidad
							</Label>
							<Select
								options={typeLiabilities}
								{...conform.select(fields.typeLiability)}
							/>
							<ErrorText id={fields.typeLiability.errorId}>
								{fields.typeLiability.error}
							</ErrorText>
						</div>

						<div className="flex-1">
							<Label htmlFor={fields.taxDetail.id}>Detalle de impuestos</Label>
							<Select
								options={taxDetails}
								{...conform.select(fields.taxDetail)}
							/>
							<ErrorText id={fields.taxDetail.errorId}>
								{fields.taxDetail.error}
							</ErrorText>
						</div>
					</TwoColumnsDiv>
				</fieldset>

				<Toast variant="error" className="mb-4">
					{form.error}
				</Toast>

				<IntentButton intent="update">Actualizar empresa</IntentButton>
			</div>
		</Form>
	);
}

function OrganizationLogo() {
	const inputRef = React.useRef<HTMLInputElement>(null);
	const { signedLogoUrl } = useLoaderData<typeof loader>();
	const fetcher = useFetcher();
	const isLoading = fetcher.state !== 'idle';
	const [error, setError] = React.useState<string | null>(null);

	function handleSubmit() {
		const file = inputRef.current?.files?.[0];

		if (file && file.size > MAX_FILE_SIZE) {
			setError('El archivo es demasiado grande, el tamaño máximo es 1MB');
			return;
		}

		if (!file) return;

		const formData = new FormData();
		formData.append('file', file);

		fetcher.submit(formData, {
			method: 'post',
			action: `/settings/logo`,
			encType: 'multipart/form-data',
		});
	}

	return (
		<div>
			<input
				type="file"
				name="file"
				ref={inputRef}
				className="hidden"
				accept=".png, .jpeg, .jpg, .webp, .svg"
				onChange={handleSubmit}
			/>

			<Label>Logo</Label>
			<div className="flex gap-4 items-center">
				<div className="w-14 h-14">
					{signedLogoUrl ? (
						<ClientOnly>
							{() => (
								<div
									className={cn(
										'h-full w-full max-h-full max-w-full rounded-full',
										'bg-contain bg-center bg-no-repeat',
									)}
									style={{ backgroundImage: `url(${signedLogoUrl})` }}
								></div>
							)}
						</ClientOnly>
					) : (
						<EmptyUserIcon className="text-gray-300 w-full h-full" />
					)}
				</div>

				<Button
					variant="secondary"
					type="button"
					onClick={() => inputRef.current?.click()}
				>
					{isLoading ? 'Subiendo logo...' : 'Cambiar'}
				</Button>

				{error ? <ErrorText>{error}</ErrorText> : null}
			</div>
		</div>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con los ajustes. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}
