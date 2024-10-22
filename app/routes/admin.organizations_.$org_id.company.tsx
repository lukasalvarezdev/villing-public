import { type PlanType } from '@prisma/client';
import {
	json,
	redirect,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import { DatePicker } from '~/components/date-picker';
import {
	Button,
	Input,
	Label,
	LinkButton,
	Select,
} from '~/components/form-utils';
import { TwoColumnsDiv } from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import { parseFormData, toNumber, formatDate, invariant } from '~/utils/misc';
import { protectAdminRoute } from '~/utils/plan-protection.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.org_id, 'Missing org_id param');

	await Promise.all([protectRoute(request), protectAdminRoute(request)]);
	const { db } = await getOrgDbClient(request);

	const organization = await db.organization.findFirstOrThrow({
		where: { id: parseInt(params.org_id) },
		select: {
			name: true,
			idNumber: true,
			email: true,
			tel: true,
			address: true,
			createdAt: true,
			planExpiresAt: true,
			planType: true,
			customPlanAmount: true,
			phone: true,
			owner: { select: { name: true, email: true } },
		},
	});

	return json({ organization });
}

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.org_id, 'Missing org_id param');

	await Promise.all([protectRoute(request), protectAdminRoute(request)]);

	const { db } = await getOrgDbClient(request);

	const form = await parseFormData(request);
	const plan = form.get('plan');
	const amount = toNumber(form.get('amount'));
	const planExpiresAt = form.get('planExpiresAt');
	const lastNumeration = toNumber(form.get('lastNumeration'));

	try {
		await db.organization.update({
			where: { id: parseInt(params.org_id) },
			data: {
				planType: plan as PlanType,
				customPlanAmount: amount ? amount : undefined,
				planExpiresAt: planExpiresAt ? new Date(planExpiresAt) : undefined,
			},
			select: { id: true },
		});

		if (lastNumeration) {
			await db.organizationDianData.upsert({
				where: { id: parseInt(params.org_id) },
				create: {
					id: parseInt(params.org_id),
					lastNumeration,
					organizationId: parseInt(params.org_id),
				},
				update: { lastNumeration },
				select: { id: true },
			});
		}

		return redirect('/admin/organizations');
	} catch (error) {
		console.error(error);
		return json({ error });
	}
}

export default function Component() {
	const { organization } = useLoaderData<typeof loader>();

	return (
		<div className="max-w-3xl">
			<div className="pb-4 border-b border-gray-200 mb-4">
				<h3 className="font-medium">Empresa</h3>
				<p className="text-gray-500 text-sm">Información de la empresa.</p>
			</div>

			<div className="flex flex-col gap-4 pb-4 border-b border-gray-200 mb-4">
				<TwoColumnsDiv>
					<div>
						<Label>Nombre</Label>
						<Input defaultValue={organization.name} readOnly />
					</div>

					<div>
						<Label>NIT</Label>
						<Input defaultValue={organization.idNumber || 'Sin NIT'} readOnly />
					</div>
				</TwoColumnsDiv>

				<TwoColumnsDiv>
					<div>
						<Label>Correo</Label>
						<Input defaultValue={organization.email} readOnly />
					</div>

					<div>
						<Label>Teléfono</Label>
						<Input
							defaultValue={
								organization.phone || organization.tel || 'Sin teléfono'
							}
							readOnly
						/>
					</div>
				</TwoColumnsDiv>

				<TwoColumnsDiv>
					<div>
						<Label>Nombre del administrador</Label>
						<Input defaultValue={organization.owner.name} readOnly />
					</div>

					<div>
						<Label>Correo del administrador</Label>
						<Input defaultValue={organization.owner.email} readOnly />
					</div>
				</TwoColumnsDiv>
				<TwoColumnsDiv>
					<div>
						<Label>Dirección</Label>
						<Input
							defaultValue={organization.address || 'Sin dirección'}
							readOnly
						/>
					</div>

					<div>
						<Label>Fecha de registro</Label>
						<Input defaultValue={formatDate(organization.createdAt)} readOnly />
					</div>
				</TwoColumnsDiv>
			</div>

			<Form method="POST">
				<h4 className="mb-4">Administrar suscripción</h4>

				<TwoColumnsDiv className="mb-4">
					<div>
						<Label htmlFor="plan">Plan</Label>
						<Select
							id="plan"
							name="plan"
							options={[
								{ value: 'free', label: 'Gratis' },
								{ value: 'entrepreneur', label: 'Emprendedor' },
								{ value: 'max', label: 'Pro' },
								{ value: 'proMax', label: 'Pro max' },
								{ value: 'custom', label: 'Personalizado' },
							]}
							defaultValue={organization.planType}
						/>
					</div>

					<div>
						<Label htmlFor="amount">Monto (solo si es personalizado)</Label>
						<Input
							id="amount"
							name="amount"
							placeholder="$50,000"
							defaultValue={organization.customPlanAmount || 0}
						/>
					</div>
				</TwoColumnsDiv>

				<TwoColumnsDiv className="mb-4">
					<div>
						<Label htmlFor="planExpiresAt">Fecha del próximo pago</Label>
						<DatePicker
							name="planExpiresAt"
							defaultDate={
								organization.planExpiresAt
									? new Date(organization.planExpiresAt)
									: undefined
							}
							className="w-full"
						/>
					</div>
					<div>
						<Label>
							Última numeración (solo modificar si se está habilitando)
						</Label>
						<Input name="lastNumeration" />
					</div>
				</TwoColumnsDiv>

				<div className="flex gap-4">
					<Button>Guardar</Button>

					<LinkButton variant="secondary" to="/admin/organizations">
						Cancelar
					</LinkButton>
				</div>
			</Form>
		</div>
	);
}
