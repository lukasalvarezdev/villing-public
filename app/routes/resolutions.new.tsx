import { conform, useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	type ActionFunctionArgs,
	json,
	redirect,
	type MetaFunction,
} from '@remix-run/node';
import { Form, useActionData, useSearchParams } from '@remix-run/react';
import { z } from 'zod';
import { DatePicker } from '~/components/date-picker';
import {
	Label,
	Input,
	ErrorText,
	LinkButton,
	IntentButton,
	Toast,
	addCustomErrorToSubmission,
} from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import { TwoColumnsDiv } from '~/components/ui-library';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: `Crear resolución – Villing` },
];

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const formData = await request.formData();

	const submission = parse(formData, { schema });
	if (submission.intent !== 'submit' || !submission.value) {
		return json({ submission, error: null }, 400);
	}

	const { db, orgId, userId } = await getOrgDbClient(request);
	await legalActions.validateAndThrow(db, userId, 'update_organization');

	try {
		const { dateFrom, dateTo, ...resolution } = submission.value;

		await db.$transaction(async tx => {
			const resolutions = await tx.resolution.findMany({
				where: { organizationId: orgId, deletedAt: null, type: 'posInvoice' },
				orderBy: { createdAt: 'desc' },
			});

			// get the last resolution where the `to` of the resolution is greater than the `from` of the new resolution
			const overlapingResolution = resolutions.find(
				r => (r.to || 0) >= resolution.from && (r.from || 0) <= resolution.from,
			);

			if (overlapingResolution) {
				throw `La numeración de la resolución se superpone con otra resolución existente, la anterior resolución termina en ${overlapingResolution.to}`;
			}

			await tx.resolution.create({
				data: {
					...resolution,
					fromDate: dateFrom,
					toDate: dateTo,
					name: resolution.prefix,
					count: resolution.from,
					type: 'posInvoice',
					organizationId: orgId,
				},
				select: { id: true },
			});
		});
		const searchParams = new URL(request.url).searchParams;
		const from = searchParams.get('from');

		if (from === 'pos') return redirect('/invoices/pos/new');

		return redirect('/resolutions');
	} catch (error) {
		if (typeof error === 'string') {
			return json(
				{ submission: addCustomErrorToSubmission(error, submission), error },
				400,
			);
		}

		await logError({ request, error });

		return json(
			{ submission, error: 'Hubo un error al crear la resolución' },
			500,
		);
	}
}

export default function Component() {
	const actionData = useActionData<typeof action>();
	const [form, fields] = useForm({
		constraint: getFieldsetConstraint(schema),
		id: 'resolution-form',
		onValidate: ({ formData }) => parse(formData, { schema }),
		shouldRevalidate: 'onBlur',
		lastSubmission: actionData?.submission,
	});
	const [searchParams] = useSearchParams();
	const message =
		searchParams.get('from') === 'invoice'
			? 'No hay resoluciones de facturación electrónica activas, contacta a soporte para crear una'
			: searchParams.get('from') === 'pos'
				? 'No hay resoluciones de venta POS activas, crea una para poder crear facturas POS'
				: null;

	return (
		<Modal className="max-w-xl">
			<ModalHeader className="mb-4" href="/resolutions">
				<h4>Nueva resolución</h4>
			</ModalHeader>

			<Form method="POST" {...form.props}>
				<Toast variant="info" className="mb-4">
					Para crear una resolución de POS electrónico, debes contactar a
					soporte técnico enviando el PDF de la resolución que te entregó la
					DIAN. Si no cuentas con uno, puedes crear una resolución con datos
					ficticios.
				</Toast>

				{message ? (
					<Toast variant="error" className="mb-4">
						{message}
					</Toast>
				) : null}

				<div>
					<fieldset className="mb-4 flex flex-col gap-4">
						<TwoColumnsDiv>
							<div className="flex-1">
								<Label htmlFor={fields.prefix.id}>Prefijo</Label>
								<Input
									placeholder="Prefijo de la resolución"
									{...conform.input(fields.prefix)}
								/>
								<ErrorText id={fields.prefix.errorId}>
									{fields.prefix.error}
								</ErrorText>
							</div>

							<div className="flex-1">
								<Label htmlFor={fields.resolutionNumber.id}>
									Número de resolución
								</Label>
								<Input
									placeholder="Número de resolución"
									{...conform.input(fields.resolutionNumber)}
								/>
								<ErrorText id={fields.resolutionNumber.errorId}>
									{fields.resolutionNumber.error}
								</ErrorText>
							</div>
						</TwoColumnsDiv>

						<TwoColumnsDiv>
							<div className="flex-1">
								<Label htmlFor={fields.dateFrom.id}>
									Fecha de inicio de vigencia
								</Label>
								<DatePicker name="dateFrom" className="w-auto" />
								<ErrorText id={fields.dateFrom.errorId}>
									{fields.dateFrom.error}
								</ErrorText>
							</div>

							<div className="flex-1">
								<Label htmlFor={fields.dateTo.id}>
									Fecha de fin de vigencia
								</Label>
								<DatePicker name="dateTo" className="w-auto" />
								<ErrorText id={fields.dateTo.errorId}>
									{fields.dateTo.error}
								</ErrorText>
							</div>
						</TwoColumnsDiv>

						<TwoColumnsDiv>
							<div className="flex-1">
								<Label htmlFor={fields.from.id}>Numeración inicial</Label>
								<Input
									placeholder="Numeración inicial"
									{...conform.input(fields.from)}
								/>
								<ErrorText id={fields.from.errorId}>
									{fields.from.error}
								</ErrorText>
							</div>

							<div className="flex-1">
								<Label htmlFor={fields.to.id}>Numeración final</Label>
								<Input
									placeholder="Numeración final"
									{...conform.input(fields.to)}
								/>
								<ErrorText id={fields.to.errorId}>{fields.to.error}</ErrorText>
							</div>
						</TwoColumnsDiv>
					</fieldset>

					{form.error ? (
						<Toast variant="error" className="mb-4" id={form.errorId}>
							{form.error}
						</Toast>
					) : null}

					<div className="flex gap-4">
						<IntentButton intent="create">Crear resolución</IntentButton>
						<LinkButton to="/resolutions" variant="secondary">
							Cancelar
						</LinkButton>
					</div>
				</div>
			</Form>
		</Modal>
	);
}

const schema = z.object({
	prefix: z.string({ required_error: 'Este campo es requerido' }),
	resolutionNumber: z.string({ required_error: 'Este campo es requerido' }),
	from: z.coerce.number({ invalid_type_error: 'Debe ser un número' }),
	to: z.coerce.number({ invalid_type_error: 'Debe ser un número' }),
	dateFrom: z.coerce.date(),
	dateTo: z.coerce.date(),
});
