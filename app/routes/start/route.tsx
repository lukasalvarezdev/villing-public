import { conform, useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	type LoaderFunctionArgs,
	json,
	redirect,
	type ActionFunctionArgs,
} from '@remix-run/node';
import { Form, Link } from '@remix-run/react';
import { z } from 'zod';
import {
	ErrorText,
	Input,
	IntentButton,
	Label,
	Toast,
} from '~/components/form-utils';
import { Switch } from '~/components/switch';
import { Container } from '~/components/ui-library';
import { getFreePlanExpiration } from '~/utils/admin.server';
import { getUser } from '~/utils/auth.server';
import { __prisma } from '~/utils/db.server';
import { AllowedAction } from '~/utils/enums';
import { errorLogger, logInfo } from '~/utils/logger';
import {
	cn,
	getMidnightExpirySeconds,
	invariant,
	useActionError,
} from '~/utils/misc';
import {
	getSession,
	protectRoute,
	villingSession,
} from '~/utils/session.server';
import { emptyBranch, emptyClient } from './empty-values';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const user = await getUser(request);
	const organizationId = user?.organizations[0]?.organizationId;
	if (organizationId) return redirect('/home');

	return {};
}

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const formData = await request.formData();
	const submission = parse(formData, { schema });
	if (!submission.value) {
		return json({ submission, error: 'Hubo un error' }, 400);
	}

	const { userName, companyName, typeRegime, phone } = submission.value;

	const session = await getSession(request);

	try {
		logInfo({
			message: 'Starting user onboarding',
			path: 'onboarding',
			data: submission.value,
		});

		const { branchId, companyId } = await __prisma.$transaction(async tx => {
			const user = await getUser(request);
			const company = await createCompany();
			const { id, branchId, clientId, priceListId, resolutionId } = company;

			await Promise.all([
				addUserOrganizationRole(),
				createCashier(),
				createCounts(),
				updateBranchConfig(),
			]);

			return { branchId, companyId: id };

			function addUserOrganizationRole() {
				invariant(user, 'No se encontró el usuario en addUserOrganizationRole');

				return tx.user.update({
					where: { id: user.id },
					data: {
						name: userName,
						allowedSubOrgs: { connect: { id: branchId } },
						role: {
							create: {
								organizationId: id,
								allowedActions: Object.values(AllowedAction),
								name: 'Administrador',
							},
						},
					},
				});
			}

			async function createCompany() {
				invariant(user, 'No se encontró el usuario en createCompany');

				const organization = await tx.organization.create({
					data: {
						name: companyName,
						ownerId: user.id,
						email: user.email,
						planType: 'free',
						planExpiresAt: getFreePlanExpiration(),
						typeRegime: typeRegime ? 'iva' : 'noIva',
						phone,

						members: { create: { userId: user.id } },
						PriceList: { create: { name: 'Precio de venta' } },
						SubOrganization: { create: emptyBranch },
						Client: { create: { ...emptyClient, email: user.email } },
						Resolution: { create: resolution },
					},
					select: {
						id: true,
						Client: true,
						SubOrganization: true,
						PriceList: true,
						Resolution: true,
					},
				});

				return branchConfigSchema.parse({
					id: organization.id,
					branchId: organization.SubOrganization[0]?.id,
					clientId: organization.Client[0]?.id,
					priceListId: organization.PriceList[0]?.id,
					resolutionId: organization.Resolution[0]?.id,
				});
			}

			function createCounts() {
				return tx.counts.create({ data: { id, organizationId: id } });
			}

			function createCashier() {
				invariant(user, 'No se encontró el usuario en createCashier');

				logInfo({ message: 'Creating cashier', path: 'onboarding' });
				return tx.cashier.create({
					data: {
						internalId: 1,
						organizationId: id,
						subOrganizationId: branchId,
						openedById: user.id,
					},
				});
			}

			function updateBranchConfig() {
				return tx.subOrganization.update({
					where: { id: branchId },
					data: {
						defaultClientId: clientId,
						defaultPriceListId: priceListId,
						defaultResolutionId: resolutionId,
					},
				});
			}
		});

		session.set('orgId', companyId);
		return redirect(`/builder/pos/new/${branchId}?onboarding=true`, {
			headers: {
				'Set-Cookie': await villingSession.commitSession(session, {
					maxAge: getMidnightExpirySeconds(),
				}),
			},
		});
	} catch (error) {
		const referenceId = errorLogger({ error, path: 'onboarding' });
		return json(
			{
				error: `Hubo un error al empezar con tu cuenta. Envía esta referencia (${referenceId}) a soporte para poder ayudarte.`,
			},
			500,
		);
	}
}

export default function Component() {
	const error = useActionError();
	const [form, fields] = useForm({
		id: 'onboarding',
		constraint: getFieldsetConstraint(schema),
		onValidate: ({ formData }) => parse(formData, { schema }),
	});

	return (
		<Container className="mt-20 max-w-sm mx-auto">
			<Link
				to="/"
				className="flex justify-center items-center text-xl font-bold gap-2 mb-6"
			>
				<div className="w-7 h-7">
					<img
						src="/img/villing-logo.svg"
						alt="Villing"
						className="h-full w-full"
					/>
				</div>
				Villing
			</Link>

			<div className="text-center">
				<h1 className="text-2xl mb-2">Crea tu empresa</h1>
				<p className="text-sm text-gray-500 mb-4">
					Solo necesitamos un par de datos para empezar a configurar tu cuenta.
				</p>
			</div>

			<Form method="POST" {...form.props}>
				<div className="mb-2">
					<Label htmlFor={fields.userName.id}>Nombre de usuario</Label>
					<Input
						{...conform.input(fields.userName)}
						placeholder="Tu nombre"
						autoFocus
					/>
					<ErrorText>{fields.userName.error}</ErrorText>
				</div>

				<div className="mb-4">
					<Label htmlFor={fields.companyName.id}>Nombre de la empresa</Label>
					<Input
						{...conform.input(fields.companyName)}
						placeholder="Nombre de tu empresa"
					/>
					<ErrorText>{fields.companyName.error}</ErrorText>
				</div>

				<div className="mb-4">
					<Label htmlFor={fields.phone.id}>Número de teléfono</Label>
					<Input
						{...conform.input(fields.phone)}
						placeholder="Tu número de teléfono"
					/>
					<ErrorText>{fields.phone.error}</ErrorText>
				</div>

				<div className="mb-6">
					<div
						className={cn(
							'flex justify-between gap-4 border border-gray-200',
							'items-center mb-4 p-4 rounded-md',
						)}
					>
						<div>
							<label className="font-bold">¿Eres responsable de IVA?</label>
							<p className="text-sm text-gray-500">
								Selecciona si eres responsable de IVA o no.
							</p>
						</div>

						<Switch name={fields.typeRegime.name} defaultChecked />
					</div>
				</div>

				{error ? (
					<Toast variant="error" className="mb-6">
						{error}
					</Toast>
				) : null}

				<IntentButton intent="create" className="w-full font-medium">
					Crear empresa y continuar
				</IntentButton>
			</Form>
		</Container>
	);
}

const schema = z.object({
	userName: z.string({
		required_error: 'Debes ingresar un nombre de usuario',
	}),
	phone: z
		.string({
			required_error: 'Debes ingresar tu número de teléfono',
		})
		.min(10, 'El número de teléfono debe tener al menos 10 dígitos'),
	companyName: z.string({
		required_error: 'Debes ingresar el nombre de tu empresa',
	}),
	typeRegime: z.boolean().default(false),
});

const resolution = {
	name: 'POS',
	prefix: 'POS',
	from: 1,
	to: 100_000,
	fromDate: new Date(),
	toDate: new Date(
		new Date().getFullYear() + 5,
		new Date().getMonth(),
		new Date().getDate(),
	),
	type: 'posInvoice',
	resolutionNumber: '1',
	count: 0,
} as const;

const branchConfigSchema = z.object({
	id: z.number(),
	branchId: z.number(),
	clientId: z.number(),
	priceListId: z.number(),
	resolutionId: z.number(),
});
