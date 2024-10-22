import { conform, useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import { json, redirect, type ActionFunctionArgs } from '@remix-run/node';
import { Form, useActionData, useParams } from '@remix-run/react';
import * as React from 'react';
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
import { TwoColumnsDiv } from '~/components/ui-library';
import { getOrgDbClient, logError } from '~/utils/db.server';
import {
	getRequestSearchParams,
	invariantResponse,
	parseFormData,
	useIsSubmitting,
} from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';
import { useSubOrganizationsLoaderData } from './settings.suborganizations';

export async function action({ request, params }: ActionFunctionArgs) {
	await protectRoute(request);

	const formData = await parseFormData(request);
	const searchParams = getRequestSearchParams(request);
	const intent = formData.get('intent');
	const subId = Number(params.sub_id);

	const submission = parse(formData, { schema });
	if (submission.intent !== 'submit' || !submission.value) {
		return json({ submission, error: null }, 400);
	}

	const { clientId, priceListId, resolutionId, balance, ...sub } =
		submission.value;

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
		switch (intent) {
			case `update-${subId}`: {
				await db.subOrganization.update({
					where: { id: subId, organizationId: orgId },
					data: {
						...sub,
						initialBalance: balance,
						defaultClientId: clientId || null,
						defaultPriceListId: priceListId || null,
						defaultResolutionId: resolutionId || null,
					},
					select: { id: true },
				});
				break;
			}
			case `delete-${subId}`: {
				await db.$transaction(async tx => {
					await db.subOrganization.update({
						where: { id: subId },
						data: { deletedAt: new Date() },
					});

					const subOrganizations = await tx.subOrganization.findMany({
						where: { organizationId: orgId, deletedAt: null },
					});

					invariantResponse(
						subOrganizations.length > 0,
						'No puedes eliminar la última sucursal',
					);
				});
				break;
			}
			default:
				break;
		}

		if (searchParams.get('from') === 'pos') {
			return redirect(`/builder/pos/new/${subId}`);
		}

		return redirect(`/settings/suborganizations?success=${subId}`);
	} catch (error) {
		await logError({ request, error });

		return json(
			{ submission, error: 'Hubo un error al actualizar la sucursal' },
			500,
		);
	}
}

export default function Component() {
	const { sub_id } = useParams();
	const formId = React.useId();
	const parentData = useSubOrganizationsLoaderData();
	const sub = parentData?.subOrganizations.find(
		s => s.id.toString() === sub_id,
	);
	const actionData = useActionData<typeof action>();
	const [form, fields] = useForm({
		id: formId,
		constraint: getFieldsetConstraint(schema),
		shouldValidate: 'onBlur',
		onValidate: ({ formData }) => parse(formData, { schema }),
		defaultValue: {
			name: sub?.name || '',
			nit: sub?.nit || '',
			tel: sub?.tel || '',
			address: sub?.address || '',
			balance: sub?.initialBalance || '',
			clientId: sub?.defaultClientId || '',
			resolutionId: sub?.defaultResolutionId || '',
			priceListId: sub?.defaultPriceListId || '',
		},
		lastSubmission: actionData?.submission || undefined,
	});
	const isDeleting = useIsSubmitting(`delete-${form.id}`);

	if (!parentData || isDeleting) return null;
	const { resolutions, priceLists, clients, subOrganizations } = parentData;
	const canDelete = subOrganizations.length > 1;

	return (
		<Form method="POST" {...form.props} className="flex flex-col gap-4">
			<TwoColumnsDiv>
				<div className="flex-1">
					<Label htmlFor={fields.name.id}>Nombre de la sucursal</Label>
					<Input
						placeholder='Ej. "Principal"'
						autoFocus
						{...conform.input(fields.name)}
					/>
					<ErrorText id={fields.name.errorId}>{fields.name.error}</ErrorText>
				</div>

				<div className="flex-1">
					<Label htmlFor={fields.nit.id}>NIT (opcional)</Label>
					<Input placeholder='Ej. "123456789"' {...conform.input(fields.nit)} />
					<ErrorText id={fields.nit.errorId}>{fields.nit.error}</ErrorText>
				</div>
			</TwoColumnsDiv>

			<TwoColumnsDiv>
				<div className="flex-1">
					<Label htmlFor={fields.address.id}>Dirección</Label>
					<Input
						placeholder='Ej. "Principal"'
						{...conform.input(fields.address)}
					/>
					<ErrorText id={fields.address.errorId}>
						{fields.address.error}
					</ErrorText>
				</div>

				<div className="flex-1">
					<Label htmlFor={fields.tel.id}>Teléfono</Label>
					<Input placeholder='Ej. "123456789"' {...conform.input(fields.tel)} />
					<ErrorText id={fields.tel.errorId}>{fields.tel.error}</ErrorText>
				</div>
			</TwoColumnsDiv>

			<fieldset className="mb-6 flex flex-col gap-4">
				<legend className="font-medium mb-2">
					Configuración del punto de venta
				</legend>

				<TwoColumnsDiv>
					<div className="flex-1">
						<Label htmlFor={fields.balance.id}>Balance inicial de cajero</Label>
						<Input
							placeholder='Ej. "50,000"'
							{...conform.input(fields.balance)}
						/>
						<ErrorText id={fields.balance.errorId}>
							{fields.balance.error}
						</ErrorText>
					</div>

					<div className="flex-1">
						<Label htmlFor={fields.clientId.id}>Cliente predeterminado</Label>

						<Select options={clients} {...conform.select(fields.clientId)} />
					</div>
				</TwoColumnsDiv>

				<TwoColumnsDiv>
					<div className="flex-1">
						<Label htmlFor={fields.resolutionId.id}>
							Resolución predeterminada
						</Label>
						<Select
							options={[{ value: '', label: 'Sin resolución' }, ...resolutions]}
							{...conform.select(fields.resolutionId)}
						/>
					</div>

					<div className="flex-1">
						<Label htmlFor={fields.priceListId.id}>
							Lista de precios predeterminada
						</Label>
						<Select
							options={[
								{ value: '', label: 'Sin lista de precios' },
								...priceLists,
							]}
							{...conform.select(fields.priceListId)}
						/>
					</div>
				</TwoColumnsDiv>
			</fieldset>

			<Toast variant="error">{form.error}</Toast>

			<fieldset className="flex gap-6 md:gap-4 flex-col md:flex-row justify-between text-sm">
				<div className="flex flex-col md:flex-row gap-2 md:gap-4">
					<IntentButton
						intent={`update-${sub?.id}`}
						className="whitespace-nowrap"
					>
						Actualizar sucursal
					</IntentButton>
					<LinkButton
						variant="secondary"
						to="/settings/suborganizations"
						prefetch="intent"
					>
						Cancelar
					</LinkButton>
				</div>

				{canDelete ? (
					<IntentButton
						intent={`delete-${sub?.id}`}
						className="whitespace-nowrap max-w-max"
						variant="destructive"
					>
						Eliminar sucursal
					</IntentButton>
				) : null}
			</fieldset>
		</Form>
	);
}

const schema = z.object({
	name: z.string({ required_error: 'El nombre es obligatorio' }),
	nit: z.string().optional(),
	tel: z.string().optional(),
	address: z.string({ required_error: 'La dirección es obligatoria' }),
	balance: z.coerce.number().optional(),
	clientId: z.coerce.number().optional(),
	resolutionId: z.coerce.number().optional(),
	priceListId: z.coerce.number().optional(),
});