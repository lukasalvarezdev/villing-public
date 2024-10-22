import {
	type ActionFunctionArgs,
	json,
	type LoaderFunctionArgs,
	redirect,
	type MetaFunction,
} from '@remix-run/node';
import {
	Link,
	Outlet,
	useLoaderData,
	useLocation,
	useParams,
} from '@remix-run/react';
import * as React from 'react';
import { z } from 'zod';
import {
	Button,
	Label,
	LinkButton,
	Select,
	Toast,
	getInputClasses,
} from '~/components/form-utils';
import {
	LegalInvoicePdf,
	InvoiceHeading,
	InvoiceQR,
} from '~/components/legal-invoice-pdf';
import { Modal, ModalHeader } from '~/components/modal';
import {
	NonPrintableContent,
	PrintableContent,
} from '~/components/printable-content';
import {
	Box,
	BuilderContainer,
	Container,
	GoBackLinkButton,
	PageWrapper,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeadCell,
	TableRow,
} from '~/components/ui-library';
import { ConceptsForm } from '~/modules/payroll/concept-forms';
import { parseConcepts } from '~/modules/payroll/concept-parser';
import { calculateConceptsTotals } from '~/modules/payroll/concepts-context';
import {
	getEmployeeStatus,
	getFrequencyByRange,
	getNoveltyBaseByPeriodFrequency,
	getWorkedDaysByPeriodFrequency,
} from '~/modules/payroll/payroll-misc';
import { useOrganization } from '~/root';
import { getOrgDbClient, logError } from '~/utils/db.server';
import {
	cn,
	formatCurrency,
	formatDate,
	invariant,
	parseFormData,
} from '~/utils/misc';
import { getFilePresignedUrlByKey } from '~/utils/misc.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: `Editar detalles del empleado - Villing` },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.payroll_employee_id, 'Missing payroll_employee_id');
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const employee = await db.payrollEmployee.findUniqueOrThrow({
		where: { id: params.payroll_employee_id, organizationId: orgId },
		select: {
			payroll: {
				select: {
					id: true,
					paidAt: true,
					startDate: true,
					endDate: true,
					status: true,
				},
			},
			employee: true,
			payrollConcepts: true,
			emission: {
				select: {
					internalId: true,
					uuid: true,
					zipKey: true,
					id: true,
					legalJson: true,
					qr_code: true,
				},
			},
			organization: { select: { imageUri: true } },
		},
	});

	const frequency = getFrequencyByRange(
		new Date(employee.payroll.startDate),
		new Date(employee.payroll.endDate),
	);

	return {
		payrollEmployee: {
			name: employee.employee.name,
			uuid: employee.emission?.uuid,
			qr_code: employee.emission?.qr_code,
			concepts: employee.payrollConcepts,
			employee: employee.employee,
			number: `NE-${employee.emission?.internalId}`,
		},
		frequency,
		status: getEmployeeStatus(employee),
		payroll: employee.payroll,
		totals: calculateConceptsTotals(employee.payrollConcepts),
		dianErrors: getDianErrors(),
		daysWorked: getWorkedDaysByPeriodFrequency(frequency),
		logoUrl: await getFilePresignedUrlByKey(employee.organization.imageUri),
		legalJson: employee.emission?.legalJson,
	};

	function getDianErrors() {
		try {
			return z
				.array(z.string())
				.parse((employee.emission?.legalJson as any)?.errors_messages);
		} catch (error) {
			return [];
		}
	}
}

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.payroll_employee_id, 'Missing payroll_employee_id');

	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);
	const formData = await parseFormData(request);

	try {
		const { errors, salary, concepts } = parseConcepts(formData);

		if (errors.length) return json({ errors }, 400);

		await db.$transaction(async tx => {
			const payroll = await tx.payroll.findUnique({
				where: { id: params.payroll_id, organizationId: orgId },
				select: { id: true, paidAt: true },
			});

			if (payroll?.paidAt) {
				throw 'No se puede modificar una nómina ya pagada';
			}

			await tx.payrollEmployee.update({
				where: { id: params.payroll_employee_id, organizationId: orgId },
				data: {
					payrollConcepts: { deleteMany: {} },
				},
				select: { id: true },
			});

			await tx.payrollEmployee.update({
				where: { id: params.payroll_employee_id, organizationId: orgId },
				data: {
					salary,
					payrollConcepts: {
						create: concepts.map(c => ({ ...c, organizationId: orgId })),
					},
				},
				select: { id: true },
			});
		});

		return redirect(`/payroll/${params.payroll_id}`);
	} catch (error) {
		await logError({ error, request });

		return json({ error: 'Error al actualizar el empleado' }, 400);
	}
}

export default function Component() {
	const { payroll_id } = useParams();
	const loaderData = useLoaderData<typeof loader>();

	return (
		<div>
			<EmissionToPrint />

			<NonPrintableContent>
				<PageWrapper>
					<Outlet context={loaderData} />

					<Container>
						<GoBackLinkButton to={`/payroll/${payroll_id}`}>
							Volver a la nómina
						</GoBackLinkButton>

						<Title />

						{loaderData.status === 'draft' ? (
							<DraftLayout />
						) : (
							<ReadonlyLayout />
						)}
					</Container>
				</PageWrapper>
			</NonPrintableContent>
		</div>
	);
}

function Title() {
	const { payrollEmployee, status } = useLoaderData<typeof loader>();

	switch (status) {
		case 'draft':
			return (
				<div className="pb-4 border-b border-gray-200 mb-4">
					<h3>Actualiza la nómina de {payrollEmployee.name}</h3>
					<p className="text-gray-500 text-sm">
						Introduce las novedades de la nómina y actualiza su salario.
					</p>
				</div>
			);
		case 'to-emit':
			return (
				<div className="pb-4 border-b border-gray-200 mb-4">
					<h3>Emite la nómina de {payrollEmployee.name}</h3>
					<p className="text-gray-500 text-sm">
						La nómina está lista para ser emitida en la DIAN.
					</p>
				</div>
			);
		case 'emitted-with-errors':
			return (
				<div className="pb-4 border-b border-gray-200 mb-4">
					<h3>La nómina de {payrollEmployee.name} fue emitida con errores</h3>
					<p className="text-gray-500 text-sm">
						Revisa los errores encontrados en la DIAN.
					</p>
				</div>
			);
		case 'emitted':
			return (
				<div className="flex justify-between flex-col xl:flex-row border-b border-gray-200 mb-4">
					<div className="pb-4">
						<h3>Nómina de {payrollEmployee.name}</h3>
						<p className="text-gray-500 text-sm">
							Revisa los detalles de la nómina.
						</p>
					</div>

					<div className="flex gap-4">
						<Button
							type="button"
							onClick={() => window.print()}
							variant="secondary"
						>
							<i className="ri-printer-line"></i>
							Imprimir nómina
						</Button>
						<LinkButton type="button" variant="secondary" to="receipt">
							<i className="ri-receipt-line"></i>
							Imprimir compronante
						</LinkButton>
					</div>
				</div>
			);

		default:
			return null;
	}
}

function ReadonlyLayout() {
	const {
		payroll,
		totals,
		payrollEmployee: { concepts },
	} = useLoaderData<typeof loader>();
	const incomes = concepts.filter(c => c.type === 'income');
	const deductions = concepts.filter(c => c.type === 'deduction');

	function getOptions(date: string) {
		return [{ value: formatDate(date), label: formatDate(date) }];
	}

	return (
		<BuilderContainer>
			<BuilderContainer.BigColumn>
				<div className="mb-6">
					<h4>Ingresos</h4>
					<p className="mb-2 text-gray-500 text-sm">
						Devengados aparte del salario
					</p>
					<ConceptsTable concepts={incomes} />
				</div>

				<h4>Deducciones</h4>
				<p className="mb-2 text-gray-500 text-sm">Deducciones de la nómina</p>
				<ConceptsTable concepts={deductions} />
			</BuilderContainer.BigColumn>

			<BuilderContainer.SmallColumn>
				<Box>
					<h5 className="mb-4">Detalles de la nómina</h5>

					<div className="mb-4">
						<EmployeeStatus />
					</div>

					<div className="mb-2">
						<Label>Desde</Label>
						<Select options={getOptions(payroll.startDate)} disabled />
					</div>

					<div className="mb-2">
						<Label>Hasta</Label>
						<Select options={getOptions(payroll.endDate)} disabled />
					</div>

					{payroll.paidAt ? (
						<div>
							<Label>Fecha de pago</Label>
							<Select options={getOptions(payroll.paidAt)} disabled />
						</div>
					) : null}

					<div className="flex flex-col gap-2 text-sm mt-4">
						<div className="flex justify-between gap-4">
							<p>Ingresos</p>
							<p className="font-medium">
								${formatCurrency(totals.totalIncomes)}
							</p>
						</div>

						<div className="flex justify-between gap-4">
							<p>Deducciones</p>
							<p className="font-medium">
								${formatCurrency(totals.totalDeductions)}
							</p>
						</div>

						<div className="flex justify-between gap-4 pt-4 mt-2 border-t border-gray-200">
							<p>Total pagado</p>
							<p className="font-bold text-xl">
								${formatCurrency(totals.total)}
							</p>
						</div>
					</div>
				</Box>
			</BuilderContainer.SmallColumn>
		</BuilderContainer>
	);
}

function EmployeeStatus() {
	const { status, payroll } = useLoaderData<typeof loader>();

	switch (status) {
		case 'to-emit': {
			return (
				<div>
					<Label>Estado de la nómina</Label>
					<p
						className={cn(
							getInputClasses(),
							'items-center text-gray-600 bg-gray-50',
							'gap-2 font-medium justify-between',
						)}
					>
						A espera de emisión en la DIAN
						<i className="ri-question-line"></i>
					</p>
					<Link
						to={`/payroll/${payroll.id}`}
						className="font-medium text-sm text-primary-600 hover:underline"
						prefetch="intent"
					>
						Emitir nómina
					</Link>
				</div>
			);
		}
		case 'emitted-with-errors': {
			return (
				<div>
					<Label>Estado de la nómina</Label>
					<p
						className={cn(
							getInputClasses(),
							'items-center border-error-200 text-error-600 bg-error-50',
							'gap-2 font-medium justify-between',
						)}
					>
						Emitida con errores en la DIAN
						<i className="ri-close-line"></i>
					</p>
					<DianErrorsButton />
				</div>
			);
		}
		case 'emitted': {
			return (
				<div>
					<Label>Estado de la nómina</Label>
					<p
						className={cn(
							getInputClasses(),
							'items-center border-success-200 text-success-600 bg-success-50',
							'gap-2 font-medium justify-between',
						)}
					>
						Emitida y enviada a la DIAN
						<i className="ri-check-line"></i>
					</p>
				</div>
			);
		}
		default:
			return null;
	}
}

function DianErrorsButton() {
	const { dianErrors } = useLoaderData<typeof loader>();
	const [isOpened, setIsOpened] = React.useState(false);

	return (
		<div>
			<button
				className="font-medium text-sm text-error-600 underline"
				type="button"
				onClick={() => setIsOpened(true)}
			>
				Ver errores
			</button>

			{isOpened ? (
				<Modal className="max-w-md">
					<ModalHeader onClick={() => setIsOpened(false)} className="mb-4">
						<h5>Errores encontrados en la DIAN</h5>
					</ModalHeader>

					<Toast variant="error" className="mb-4">
						<ul className="text-sm list-disc pl-4">
							{dianErrors.map((error, index) => (
								<li key={index}>{error}</li>
							))}
						</ul>
					</Toast>

					<div className="flex justify-end">
						<Button
							variant="secondary"
							type="button"
							onClick={() => setIsOpened(false)}
						>
							Cerrar
						</Button>
					</div>
				</Modal>
			) : null}
		</div>
	);
}

function ConceptsTable({ concepts }: { concepts: BaseConcepts }) {
	return (
		<div className="rounded-lg border border-gray-200 shadow-sm mb-4 bg-white overflow-hidden">
			<Table className="min-w-sm w-full">
				<TableHead>
					<TableHeadCell className="pl-4">Concepto</TableHeadCell>
					<TableHeadCell className="pl-4 pr-12">Valor</TableHeadCell>
				</TableHead>

				<TableBody>
					{concepts.map(novelty => (
						<TableRow
							className={cn('border-b border-gray-200 text-sm')}
							key={novelty.id}
						>
							<TableCell className="w-full pl-4">{novelty.keyName}</TableCell>
							<TableCell className="pl-4 pr-12">
								${formatCurrency(novelty.amount)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function DraftLayout() {
	const { payrollEmployee, daysWorked } = useLoaderData<typeof loader>();

	return (
		<ConceptsForm concepts={payrollEmployee.concepts} daysWorked={daysWorked}>
			<BuilderContainer.BigColumn>
				<ConceptsForm.ConceptsList />
			</BuilderContainer.BigColumn>

			<BuilderContainer.SmallColumn>
				<Box className="sticky z-10 top-[calc(60px+1rem)]">
					<ConceptsForm.Totals />
					<ConceptsForm.SaveButton />
				</Box>
			</BuilderContainer.SmallColumn>
		</ConceptsForm>
	);
}

function EmissionToPrint() {
	const { pathname } = useLocation();
	const {
		payrollEmployee: { employee, concepts, ...payrollEmployee },
		payroll,
		daysWorked,
		frequency,
		logoUrl,
		totals,
	} = useLoaderData<typeof loader>();
	const organization = useOrganization();
	const { salary } = calculateConceptsTotals(concepts);
	const baseSalary = getNoveltyBaseByPeriodFrequency(frequency, salary);
	const incomes = concepts.filter(c => c.type === 'income');
	const deductions = concepts.filter(c => c.type === 'deduction');

	if (pathname.includes('receipt')) return null;

	return (
		<PrintableContent>
			<LegalInvoicePdf textInInvoice={organization.textInInvoice}>
				<InvoiceHeading
					logo={logoUrl}
					number={payrollEmployee.number}
					createdAt={payroll.startDate}
					expiresAt={null}
					name={organization.name}
					address={organization.address || 'Sin dirección'}
					idNumber={organization.idNumber || 'Sin NIT'}
					email={organization.email}
					phone={organization.tel || 'Sin teléfono'}
					website={organization.website}
					resolution=""
					title="Nómina electrónica"
				>
					{payroll.paidAt ? (
						<p className="border-b border-gray-400">
							<strong>Fecha de pago </strong>
							<span>{formatDate(payroll.paidAt)}</span>
						</p>
					) : null}
					<p className="border-b border-gray-400">
						<strong>Desde </strong>
						<span>{formatDate(payroll.startDate)}</span>
					</p>
					<p className="border-b border-gray-400">
						<strong>Hasta </strong>
						<span>{formatDate(payroll.endDate)}</span>
					</p>
					<p className="border-b border-gray-400">
						<strong>Días trabajados </strong>
						<span>{daysWorked}</span>
					</p>
				</InvoiceHeading>

				<div className="flex border-b border-gray-400 border-dotted py-4 mb-4">
					<div className="flex flex-1 gap-6">
						<div className="w-32">
							<p className="leading-3 font-bold mb-2 text-xs">EMPLEADO</p>

							<p className="leading-5 font-bold">{employee.name}</p>
							<p className="leading-3">{employee.idNumber}</p>
							<p className="leading-3">{employee.address}</p>
							<p className="leading-3">{employee.email}</p>
						</div>

						<div className="leading-4">
							<p className="leading-3 font-bold mb-2 text-xs">
								INFORMACIÓN ADICIONAL
							</p>

							<p>
								<strong>Cargo </strong>
								{employee.jobTitle}
							</p>
							<p>
								<strong>Salario base </strong>${formatCurrency(baseSalary)}
							</p>
							<p>
								<strong>Método de pago </strong>
								<span className="capitalize">{employee.paymentMethod}</span>
							</p>
							{employee.bank ? (
								<p>
									<strong>Banco </strong>
									<span className="capitalize">{employee.bank}</span>
								</p>
							) : null}
							{employee.accountNumber ? (
								<p>
									<strong>Número de cuenta </strong>
									{employee.accountNumber}
								</p>
							) : null}

							{employee.accountType ? (
								<p>
									<strong>Tipo de cuenta </strong>
									<span className="capitalize">{employee.accountType}</span>
								</p>
							) : null}
							<p>
								<strong>Es salario integral </strong>
								<span className="capitalize">
									{employee.isIntegralSalary ? 'Si' : 'No'}
								</span>
							</p>
						</div>
					</div>

					{payrollEmployee.qr_code ? (
						<InvoiceQR url={payrollEmployee.qr_code} />
					) : null}
				</div>

				<div className="mb-6">
					<p className="font-bold text-xs">INGRESOS</p>
					<PrintableConceptsTable concepts={incomes} />
				</div>

				<div className="mb-4">
					<p className="font-bold text-xs">DEDUCCIONES</p>
					<PrintableConceptsTable concepts={deductions} />
				</div>

				<div className="flex justify-end pt-2 gap-6">
					<div className="flex-1 flex flex-col justify-end border-b border-dotted border-black">
						<p
							className="text-[8px] break-words mt-1"
							style={{ lineHeight: '1.5' }}
						>
							{payrollEmployee.uuid}
						</p>
					</div>
					<div className="w-52 flex flex-col">
						<div
							className={cn(
								'border-b border-dotted border-gray-400 pr-2',
								'flex justify-between items-center',
							)}
						>
							<p>INGRESOS</p>
							<p>${formatCurrency(totals.totalIncomes)}</p>
						</div>

						<div className="flex justify-between items-center pr-2">
							<p>DEDUCCIONES</p>
							<p>${formatCurrency(totals.totalDeductions)}</p>
						</div>

						<div className="flex justify-between items-center h-full border-y border-black">
							<p className="font-bold">TOTAL</p>

							<p
								className={cn(
									'font-bold text-xs bg-black text-white h-full',
									'flex items-center pr-2 pl-6',
								)}
							>
								${formatCurrency(totals.total)}
							</p>
						</div>
					</div>
				</div>

				<div className="flex gap-6 mt-32 justify-between max-w-96">
					<div className="flex-1 max-w-40">
						<div className="border-b border-gray-800" />
						<p>Firma empleador</p>
					</div>

					<div className="flex-1 max-w-40">
						<div className="border-b border-gray-800" />
						<p>Firma empleado</p>
					</div>
				</div>
			</LegalInvoicePdf>
		</PrintableContent>
	);
}

function PrintableConceptsTable({ concepts }: { concepts: BaseConcepts }) {
	return (
		<table className="mx-auto w-full table-auto border-b border-black border-dotted">
			<thead>
				<tr className="text-left children:pb-1 children:font-normal border-b border-black">
					<th>CONCEPTO</th>
					<th className="pl-1">TOTAL</th>
				</tr>
			</thead>

			<tbody className="text-[9px]">
				{concepts.map(novelty => (
					<tr
						className={cn(
							'text-left align-center border-b border-gray-400 border-dotted',
							'last:border-b-0 last:border-dotted-0 even:bg-gray-50',
						)}
						key={novelty.id}
					>
						<td className="leading-4 w-full">{novelty.keyName}</td>
						<td className="pl-1 pr-2 text-right">
							${formatCurrency(novelty.amount)}
						</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}

type BaseConcepts = Array<{ id: string; keyName: string; amount: number }>;
