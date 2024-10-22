import { conform, useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	json,
	redirect,
	type MetaFunction,
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
} from '@remix-run/node';
import { Form, useLoaderData } from '@remix-run/react';
import * as z from 'zod';
import { DatePicker } from '~/components/date-picker';
import {
	ErrorText,
	Input,
	IntentButton,
	Label,
	LinkButton,
	addCustomErrorToSubmission,
} from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import { TwoColumnsDiv } from '~/components/ui-library';
import { getOrgDbClient, logError } from '~/utils/db.server';
import {
	formatDate,
	invariantResponse,
	safeNewDate,
	invariant,
} from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [{ title: `Ver resolución - Villing` }];

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.resolution_id, 'resolution_id is required');
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const resolution = await db.resolution.findUnique({
		where: { id: parseInt(params.resolution_id), organizationId: orgId },
	});

	invariantResponse(resolution, 'Resolución no encontrada');

	return json({ resolution });
}

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.resolution_id, 'resolution_id is required');

	await protectRoute(request);

	const formData = await request.formData();

	const submission = parse(formData, { schema });
	if (submission.intent !== 'submit' || !submission.value) {
		return json({ submission, error: null }, 400);
	}

	const { db, orgId, userId } = await getOrgDbClient(request);
	await legalActions.validateAndThrow(db, userId, 'update_organization');

	const resolution_id = parseInt(params.resolution_id);
	try {
		const { dateFrom, dateTo, from, to, ...resolution } = submission.value;

		await db.$transaction(async tx => {
			const existingResolution = await tx.resolution.findUniqueOrThrow({
				where: { id: resolution_id },
			});

			if (existingResolution.type !== 'posInvoice') {
				throw 'Solo puedes actualizar resoluciones de facturación POS';
			}

			await tx.resolution.update({
				where: { id: resolution_id, type: 'posInvoice' },
				data: {
					...resolution,
					fromDate: dateFrom,
					toDate: dateTo,
					type: 'posInvoice',
					organizationId: orgId,
				},
				select: { id: true },
			});
		});

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
	const { resolution } = useLoaderData<typeof loader>();
	const [form, fields] = useForm({
		constraint: getFieldsetConstraint(schema),
		id: 'resolution-form',
		onValidate: ({ formData }) => parse(formData, { schema }),
		shouldRevalidate: 'onBlur',
		defaultValue: resolution,
	});

	return (
		<Modal className="max-w-xl">
			<ModalHeader className="mb-4" href="/resolutions">
				<h4>Resolución {resolution?.prefix}</h4>
			</ModalHeader>

			<Form method="POST" {...form.props}>
				<fieldset className="mb-4 flex flex-col gap-4">
					<TwoColumnsDiv>
						<div className="flex-1">
							<Label>Prefijo</Label>
							<Input placeholder="Prefijo" {...conform.input(fields.prefix)} />
						</div>

						<div className="flex-1">
							<Label>Número de resolución</Label>
							<Input
								placeholder="Número de resolución"
								{...conform.input(fields.resolutionNumber)}
							/>
						</div>
					</TwoColumnsDiv>

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.dateFrom.id}>
								Fecha de inicio de vigencia
							</Label>
							<DatePicker
								name="dateFrom"
								className="w-auto"
								defaultDate={safeNewDate(resolution.fromDate)}
							/>
							<ErrorText id={fields.dateFrom.errorId}>
								{fields.dateFrom.error}
							</ErrorText>
						</div>

						<div className="flex-1">
							<Label htmlFor={fields.dateTo.id}>Fecha de fin de vigencia</Label>
							<DatePicker
								name="dateTo"
								className="w-auto"
								defaultDate={safeNewDate(resolution.toDate)}
							/>
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

					<TwoColumnsDiv>
						<div className="flex-1 shrink-0">
							<p className="font-medium text-sm mb-1">Fecha de resolución</p>
							<p className="h-9 border border-gray-200 rounded pl-3 flex items-center text-sm">
								{formatDate(resolution.resolutionDate!)}
							</p>
						</div>

						<div className="flex-1">
							<p className="font-medium text-sm mb-1">Llave técnica</p>
							<Input
								readOnly
								defaultValue={resolution.technicalKey || 'Sin llave técnica'}
							/>
						</div>
					</TwoColumnsDiv>
				</fieldset>

				<div className="flex gap-4 justify-end">
					<LinkButton to="/resolutions" variant="secondary">
						Volver
					</LinkButton>
					{resolution.type === 'posInvoice' ? (
						<IntentButton intent="submit">Actualizar resolución</IntentButton>
					) : null}
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
