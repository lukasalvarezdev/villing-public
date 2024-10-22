import { conform, useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import { json, redirect, type ActionFunctionArgs } from '@remix-run/node';
import { Form, useActionData } from '@remix-run/react';
import * as React from 'react';
import * as z from 'zod';
import {
	ErrorText,
	Input,
	IntentButton,
	Label,
	LinkButton,
	Select,
} from '~/components/form-utils';
import { TwoColumnsDiv } from '~/components/ui-library';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';
import { useSubOrganizationsLoaderData } from './settings.suborganizations';

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const formData = await request.formData();

	const submission = parse(formData, { schema });
	if (submission.intent !== 'submit' || !submission.value) {
		return json({ submission, error: null }, 400);
	}

	const { clientId, priceListId, resolutionId, balance, ...sub } =
		submission.value;

	try {
		const { db, orgId, userId } = await getOrgDbClient(request);

		await legalActions.validateAndThrow(db, userId, 'update_organization');

		await db.$transaction(
			async tx => {
				const [{ id }, products] = await Promise.all([
					tx.subOrganization.create({
						data: {
							...sub,
							organizationId: orgId,
							initialBalance: balance,
							defaultClientId: clientId || null,
							defaultPriceListId: priceListId || null,
							defaultResolutionId: resolutionId || null,
							Cashier: {
								create: {
									internalId: 1,
									organizationId: orgId,
									openedById: userId,
									closedById: userId,
								},
							},
						},
						select: { id: true },
					}),
					tx.product.findMany({ where: { organizationId: orgId } }),
				]);

				await Promise.all([
					tx.stockValue.createMany({
						data: products.map(product => ({
							productId: product.id,
							subOrgId: id,
							value: 0,
							organizationId: orgId,
						})),
					}),
					tx.organization.update({
						where: { id: orgId },
						data: {
							owner: { update: { allowedSubOrgs: { connect: { id } } } },
						},
					}),
				]);
			},
			{ timeout: 15000 },
		);

		return redirect('/settings/suborganizations');
	} catch (error) {
		await logError({ request, error });

		return json(
			{ submission, error: 'Hubo un error al crear la sucursal' },
			500,
		);
	}
}

export default function Component() {
	const formId = React.useId();
	const parentData = useSubOrganizationsLoaderData();
	const actionData = useActionData<typeof action>();
	const [form, fields] = useForm({
		id: formId,
		constraint: getFieldsetConstraint(schema),
		shouldValidate: 'onBlur',
		onValidate: ({ formData }) => parse(formData, { schema }),
		lastSubmission: actionData?.submission || undefined,
	});

	if (!parentData) return null;
	const { resolutions, priceLists, clients } = parentData;

	return (
		<Form
			method="POST"
			{...form.props}
			className="p-4 border border-gray-200 flex flex-col gap-4 rounded-md"
		>
			<h5>Crea una sucursal</h5>

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
							options={resolutions}
							{...conform.select(fields.resolutionId)}
						/>
					</div>

					<div className="flex-1">
						<Label htmlFor={fields.priceListId.id}>
							Lista de precios predeterminada
						</Label>
						<Select
							options={priceLists}
							{...conform.select(fields.priceListId)}
						/>
					</div>
				</TwoColumnsDiv>
			</fieldset>

			<fieldset className="flex gap-6 md:gap-4 flex-col md:flex-row justify-between text-sm">
				<div className="flex flex-col md:flex-row gap-2 md:gap-4">
					<IntentButton
						intent="create"
						className="whitespace-nowrap"
						variant="black"
					>
						Crear sucursal
					</IntentButton>
					<LinkButton
						variant="secondary"
						to="/settings/suborganizations"
						prefetch="intent"
					>
						Cancelar
					</LinkButton>
				</div>
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
