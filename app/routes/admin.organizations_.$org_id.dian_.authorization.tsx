import {
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
} from '@remix-run/node';
import { Form, Link, useLoaderData, useParams } from '@remix-run/react';
import clsx from 'clsx';
import * as React from 'react';
import { Input, IntentButton, Label, Toast } from '~/components/form-utils';
import { Box, ButtonIcon } from '~/components/ui-library';
import { syncResolutions } from '~/utils/admin.server';
import { getOrgDbClient } from '~/utils/db.server';
import { dianClient } from '~/utils/dian-client.server';
import {
	soenacIdentificationsMapper,
	soenacTypeLiabilitiesMapper,
	soenacTypeOrganizationsMapper,
	soenacTypeRegimesMapper,
	soenacTaxDetailsMapper,
} from '~/utils/legal-values';
import { parseFormData, invariant } from '~/utils/misc';
import { protectSuperAdminRoute } from '~/utils/plan-protection.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.org_id, 'Missing org_id param');

	await Promise.all([protectRoute(request), protectSuperAdminRoute(request)]);
	const { db } = await getOrgDbClient(request);

	const {
		Resolution: [resolution],
		soenacToken,
	} = await db.organization.findUniqueOrThrow({
		where: { id: parseInt(params.org_id) },
		select: {
			soenacToken: true,
			Resolution: {
				where: { soenacId: { not: null } },
			},
		},
	});

	const steps = {
		register: false,
		createInSoenac: Boolean(soenacToken),
		updateEnv: false,
		createInvoices: false,
		registerInProd: false,
		syncResolutions: Boolean(resolution),
	};

	return json({ steps });
}

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.org_id, 'Missing org_id param');
	const orgId = parseInt(params.org_id);

	await Promise.all([protectRoute(request), protectSuperAdminRoute(request)]);
	const { db } = await getOrgDbClient(request);

	const form = await parseFormData(request);
	const action = form.get('intent');

	const {
		Resolution: [resolution],
		soenacToken,
	} = await db.organization.findUniqueOrThrow({
		where: { id: parseInt(params.org_id) },
		select: {
			soenacToken: true,
			OrganizationDianData: true,
			Resolution: {
				where: { soenacId: { not: null } },
			},
		},
	});

	const steps = {
		register: false,
		createInSoenac: Boolean(soenacToken),
		updateEnv: false,
		createInvoices: false,
		registerInProd: false,
		syncResolutions: Boolean(resolution),
	};

	switch (action) {
		case 'register': {
			await registerStep();
			await createInSoenacStep();
			await updateSoenacEnvStep();
			await createInvoicesStep();
			return json({ success: true });
		}
		case 'createInSoenac': {
			invariant(!steps.createInSoenac, 'Missing createInSoenac step');

			await createInSoenacStep();
			await updateSoenacEnvStep();
			await createInvoicesStep();
			return json({ success: true });
		}
		case 'updateEnv': {
			invariant(!steps.updateEnv, 'Missing updateEnv step');

			await updateSoenacEnvStep();
			await createInvoicesStep();
			return json({ success: true });
		}
		case 'createInvoices': {
			invariant(!steps.createInvoices, 'Missing createInvoices step');

			await createInvoicesStep();
			return json({ success: true });
		}
		case 'registerInProd': {
			invariant(!steps.registerInProd, 'Missing registerInProd step');

			await registerInProdStep();
			await syncResolutions(db, orgId);
			return json({ success: true });
		}
		case 'syncResolutions': {
			invariant(!steps.syncResolutions, 'Missing syncResolutions step');

			await syncResolutions(db, orgId);
			return json({ success: true });
		}
		default:
			throw 'Invalid action';
	}

	async function registerStep() {
		const testSetId = form.get('testSetId');
		const softwareId = form.get('softwareId');

		if (!testSetId || !softwareId) {
			throw 'Missing testSetId or softwareId';
		}

		await db.organization.update({
			where: { id: orgId },
			data: { testSetId, softwareId },
		});
	}

	async function createInSoenacStep() {
		const organization = await db.organization.findUniqueOrThrow({
			where: { id: orgId },
		});

		const soenacToken = await dianClient({
			action: 'createCompany',
			body: {
				address: organization.address!,
				business_name: organization.name,
				ciius: [],
				email: organization.email,
				merchant_registration: '1',
				municipality_id: organization.municipalityId,
				nit: organization.idNumber!,
				phone: organization.tel!,
				trade_name: organization.tradeName,
				type_document_identification_id:
					soenacIdentificationsMapper[organization.typeDocumentIdentification],
				type_liability_id:
					soenacTypeLiabilitiesMapper[organization.typeLiability],
				type_organization_id:
					soenacTypeOrganizationsMapper[organization.typeOrganization],
				type_regime_id: soenacTypeRegimesMapper[organization.typeRegime],
				tax_detail_id: soenacTaxDetailsMapper[organization.taxDetail],
			},
		});

		if (!soenacToken) throw new Error('No se pudo sincronizar con la DIAN');

		await db.organization.update({
			where: { id: orgId },
			data: { soenacToken },
		});
	}

	async function updateSoenacEnvStep() {
		const {
			soenacToken,
			certificateInBase64,
			certificatePassword,
			softwareId,
		} = await db.organization.findFirstOrThrow({
			where: { id: orgId },
			select: {
				soenacToken: true,
				certificatePassword: true,
				certificateInBase64: true,
				softwareId: true,
			},
		});

		invariant(soenacToken, 'Missing soenacToken');
		invariant(
			softwareId && certificatePassword && certificateInBase64,
			'Missing dianData',
		);

		await dianClient({
			action: 'updateEnvironment',
			accessToken: soenacToken,
			body: {
				softwareId,
				certificatePassword,
				certificate: certificateInBase64,
			},
		});
	}

	async function createInvoicesStep() {
		const { soenacToken, testSetId } = await db.organization.findFirstOrThrow({
			where: { id: orgId },
			select: {
				soenacToken: true,
				testSetId: true,
			},
		});

		invariant(soenacToken, 'Missing soenacToken');
		invariant(testSetId, 'Missing testSetId');

		await dianClient({
			action: 'createInvoiceExample',
			accessToken: soenacToken,
			body: testSetId,
		});
	}

	async function registerInProdStep() {
		const lastNumeration = form.get('count');

		if (!lastNumeration) throw 'Missing lastNumeration';

		await db.$transaction(async tx => {
			const { soenacToken } = await tx.organization.update({
				where: { id: orgId },
				data: { lastNumeration: parseInt(lastNumeration) },
				select: { soenacToken: true },
			});

			invariant(soenacToken, 'Missing soenacToken');

			await dianClient({
				action: 'updateEnvironmentToProd',
				accessToken: soenacToken,
				body: null,
			});
		});
	}
}

function useStepsState() {
	const { steps } = useLoaderData<typeof loader>();

	return {
		steps,
		enabledSteps: {
			register: true,
			createInSoenac: steps.register,
			updateEnv: steps.createInSoenac,
			createInvoices: steps.updateEnv,
			registerInProd: steps.createInvoices,
			syncResolutions: steps.registerInProd,
		},
	};
}

export default function Component() {
	const { org_id } = useParams();
	const { enabledSteps, steps } = useStepsState();

	return (
		<div>
			<div className="pb-4 border-b border-gray-200 mb-4 flex gap-4">
				<ButtonIcon className="shrink-0">
					<Link to={`/admin/organizations/${org_id}/dian`} prefetch="intent">
						<i className="ri-arrow-left-line"></i>
					</Link>
				</ButtonIcon>

				<div>
					<h3 className="font-medium">Habilitar la facturación electrónica</h3>
					<p className="text-gray-500 text-sm">
						Completa el proceso de habilitación para facturar electrónicamente.
					</p>
				</div>
			</div>

			<div className="flex flex-col gap-4">
				<StepBox
					title="1. Registar software en la DIAN (habilitación)"
					isCompleted={steps.register}
					isEnabled={enabledSteps.register}
				>
					<RegisterInDianStep />
				</StepBox>

				<StepBox
					title="2. Crear empresa en soenac"
					isCompleted={steps.createInSoenac}
					isEnabled={enabledSteps.createInSoenac}
				>
					<CreateCompanyInSoenacStep />
				</StepBox>

				<StepBox
					title="3. Actualizar ambiente de pruebas"
					isCompleted={steps.updateEnv}
					isEnabled={enabledSteps.updateEnv}
				>
					<UpdateSoenacEnvStep />
				</StepBox>

				<StepBox
					title="4. Crear facturas de prueba"
					isCompleted={steps.createInvoices}
					isEnabled={enabledSteps.createInvoices}
				>
					<CreateInvoicesStep />
				</StepBox>

				<StepBox
					title="5. Registar resolución en la DIAN (producción)"
					isCompleted={steps.registerInProd}
					isEnabled={enabledSteps.registerInProd}
				>
					<RegisterResolutionInProdStep />
				</StepBox>

				<StepBox
					title="6. Sincronizar resoluciones"
					isCompleted={steps.syncResolutions}
					isEnabled={enabledSteps.syncResolutions}
				>
					<SyncResolutionsStep />
				</StepBox>
			</div>
		</div>
	);
}

type StepBoxProps = {
	isCompleted: boolean;
	children: React.ReactNode;
	title: string;
	isEnabled: boolean;
};
function StepBox({ children, title, isCompleted }: StepBoxProps) {
	const [isOpen, setIsOpen] = React.useState(false);

	return (
		<div>
			<button
				type="button"
				className={clsx('w-full group')}
				onClick={() => {
					setIsOpen(!isOpen);
				}}
			>
				<Box
					className={clsx(
						'shadow-none !border-gray-100 group-hover:bg-gray-50',
						'p-4 flex justify-between gap-4',
						isOpen && 'rounded-b-none',
					)}
				>
					<div className="flex gap-4">
						{isCompleted ? (
							<i className="ri-checkbox-circle-line text-success-600"></i>
						) : (
							<i className="ri-close-circle-line text-gray-600"></i>
						)}
						<p className="font-medium">{title}</p>
					</div>

					<i
						className={clsx(
							'ri-arrow-right-line text-gray-600',
							isOpen && 'transform rotate-90',
						)}
					></i>
				</Box>
			</button>

			{isOpen ? (
				<div className="border border-t-0 border-gray-100 rounded-b-md p-4 pl-12">
					{children}
				</div>
			) : null}
		</div>
	);
}

function RegisterInDianStep() {
	return (
		<Form method="POST">
			<Toast variant="info" className="text-sm py-2 mb-4">
				Para obtener el <strong>Test Set Id</strong> y el{' '}
				<strong>Software Id</strong> debes ingresar a la plataforma de la DIAN.
				Sigue el siguiente tutorial para obtenerlos.{' '}
				<a
					href="/"
					className="underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					Ver tutorial
				</a>
			</Toast>

			<Label>Test Set Id</Label>
			<Input
				name="testSetId"
				placeholder="Ingrese el Test Set Id"
				className="mb-2"
			/>

			<Label>Software Id</Label>
			<Input
				name="softwareId"
				placeholder="Ingrese el Software Id"
				className="mb-4"
			/>

			<IntentButton variant="black" intent="register">
				Guardar información y comenzar registro{' '}
				<i className="ri-arrow-right-line"></i>
			</IntentButton>
		</Form>
	);
}

function CreateCompanyInSoenacStep() {
	return (
		<Form method="POST">
			<Toast variant="info" className="text-sm py-2 mb-4">
				Crea una cuenta para esta empresa en la plataforma de nuestro proveedor
				de facturación electrónica Soenac.
			</Toast>

			<IntentButton variant="black" intent="createInSoenac">
				Crear empresa <i className="ri-arrow-right-line"></i>
			</IntentButton>
		</Form>
	);
}

function UpdateSoenacEnvStep() {
	return (
		<Form method="POST">
			<Toast variant="info" className="text-sm py-2 mb-4">
				Este paso es necesario para que la empresa pueda generar la firma
				electrónica. Se encargará de actualizar la empresa en Soenac con el{' '}
				<strong>Test Set Id</strong>, <strong>Software Id</strong> y el{' '}
				<strong>Certificado Digital</strong>.
			</Toast>

			<IntentButton variant="black" intent="updateEnv">
				Actualizar ambiente <i className="ri-arrow-right-line"></i>
			</IntentButton>
		</Form>
	);
}

function CreateInvoicesStep() {
	return (
		<Form method="POST">
			<Toast variant="info" className="text-sm py-2 mb-4">
				Este paso se encargará de crear las facturas de prueba requeridas por la
				DIAN para la aceptación de nuestro software.
			</Toast>

			<IntentButton variant="black" intent="createInvoices">
				Crear facturas de prueba <i className="ri-arrow-right-line"></i>
			</IntentButton>
		</Form>
	);
}

function RegisterResolutionInProdStep() {
	return (
		<Form method="POST">
			<Toast variant="info" className="text-sm py-2 mb-4">
				Debes ingresar a la plataforma de la DIAN en producción y asignar
				nuestro software a la resolución que el cliente tenga activa. También
				debes consultar la numeración de la última factura que el cliente haya
				emitido. Sigue el siguiente tutorial para completar este paso.{' '}
				<a
					href="/"
					className="underline"
					target="_blank"
					rel="noopener noreferrer"
				>
					Ver tutorial
				</a>
			</Toast>

			<Label>Última numeración</Label>
			<Input
				name="count"
				placeholder="Ingrese la numeración de la última factura"
				className="mb-2"
			/>

			<IntentButton variant="black" intent="registerInProd">
				Guardar numeración y continuar <i className="ri-arrow-right-line"></i>
			</IntentButton>
		</Form>
	);
}

function SyncResolutionsStep() {
	return (
		<Form method="POST">
			<Toast variant="info" className="text-sm py-2 mb-4">
				Este paso se encargará de sincronizar las resoluciones de la DIAN con
				nuestro sistema.
			</Toast>

			<IntentButton variant="black" intent="syncResolutions">
				Sincronizar resoluciones y habilitar cliente{' '}
				<i className="ri-arrow-right-line"></i>
			</IntentButton>
		</Form>
	);
}
