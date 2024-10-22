import {
	type SerializeFrom,
	type LoaderFunctionArgs,
	type MetaFunction,
	type ActionFunctionArgs,
	json,
} from '@remix-run/node';
import {
	Form,
	Link,
	useActionData,
	useFetcher,
	useFetchers,
	useLoaderData,
} from '@remix-run/react';
import * as React from 'react';
import { Checkbox, CheckboxField } from '~/components/checkbox';
import { ContextMenu } from '~/components/dropdown-menu';
import {
	IntentButton,
	Label,
	LinkButton,
	Toast,
	getInputClasses,
} from '~/components/form-utils';
import {
	PageWrapper,
	Container,
	GoBackLinkButton,
	Table,
	TableHead,
	TableHeadCell,
	TableCell,
	TableRow,
	TableBody,
	BuilderContainer,
	Box,
} from '~/components/ui-library';
import { calculateConceptsTotals } from '~/modules/payroll/concepts-context';
import {
	getEmployeeStatus,
	getFrequencyByRange,
} from '~/modules/payroll/payroll-misc';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { errorLogger } from '~/utils/logger';
import {
	cn,
	formatCurrency,
	formatDate,
	invariant,
	parseFormData,
} from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';
import {
	type ActionData,
	createEmissions,
	updateEmployeeIntent,
} from './payroll-intents';

export const meta: MetaFunction = () => [
	{ title: 'Detalles de nómina - Villing' },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.payroll_id, 'Invalid payroll id');
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const payroll = await db.payroll.findUniqueOrThrow({
		where: { id: params.payroll_id, organizationId: orgId },
		select: {
			id: true,
			paidAt: true,
			status: true,
			endDate: true,
			startDate: true,
			employees: {
				select: {
					id: true,
					isSelected: true,
					employee: { select: { id: true, name: true } },
					payrollConcepts: true,
					emission: { select: { uuid: true, legalJson: true } },
				},
				orderBy: { employee: { name: 'asc' } },
			},
		},
	});

	const frequency = getFrequencyByRange(payroll.startDate, payroll.endDate);

	const employees = payroll.employees.map(mapEmployee);

	return {
		payroll,
		employees,
		frequency,
		totals: getGlobalTotals(),
		readOnly: payroll.status !== 'draft',
	};

	function mapEmployee(employee: (typeof payroll.employees)[0]) {
		const totals = calculateConceptsTotals(employee.payrollConcepts);

		return {
			id: employee.id,
			employeeId: employee.employee.id,
			name: employee.employee.name,
			isSelected: employee.isSelected,
			income: totals.totalIncomes,
			deductions: totals.totalDeductions,
			total: totals.total,
			status: getEmployeeStatus({ ...employee, payroll }),
		};
	}

	function getGlobalTotals() {
		const totals = employees
			.filter(e => e.isSelected)
			.reduce(
				(acc, employee) => {
					acc.income += employee.income;
					acc.deductions += employee.deductions;
					acc.total += employee.total;
					return acc;
				},
				{ income: 0, deductions: 0, total: 0 },
			);

		return totals;
	}
}

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.payroll_id, 'Missing payroll_id');
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);
	const formData = await parseFormData(request);
	const intent = formData.get('intent');

	const intentArgs = {
		db,
		orgId,
		payroll_id: params.payroll_id,
		formData,
		request,
	};

	try {
		switch (intent) {
			case 'updateEmployee': {
				return await updateEmployeeIntent(intentArgs);
			}
			case 'payPayroll': {
				return await createEmissions(intentArgs);
			}
			default:
				throw new Error('Invalid intent');
		}
	} catch (error) {
		if (typeof error === 'string') return json<ActionData>({ error }, 400);

		await logError({ error, request });

		const referenceId = errorLogger({
			error,
			path: request.url,
			customMessage: `Error on payroll action: ${intent}`,
			body: Object.fromEntries(formData),
		});

		return json<ActionData>(
			{
				error: `Lo sentimos, hubo un error modificando la nómina con referencia: ${referenceId}. Por favor envía esta referencia a soporte para porder ayudarte.`,
			},
			500,
		);
	}
}

type EmployeeItemType = SerializeFrom<typeof loader>['employees'][0];

export default function Component() {
	const { readOnly } = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<Container>
				<GoBackLinkButton to="/payroll">Regresar a nóminas</GoBackLinkButton>

				<div className="pb-4 border-b border-gray-200 mb-4">
					<Title />
				</div>

				{readOnly ? <ReadOnlyPayroll /> : <DraftPayroll />}
			</Container>
		</PageWrapper>
	);
}

function DraftPayroll() {
	return (
		<BuilderContainer>
			<BuilderContainer.BigColumn>
				<EmployeesTable />
				<EmployeesErrors />
			</BuilderContainer.BigColumn>

			<BuilderContainer.SmallColumn>
				<PayrollTotals>
					<PayPayrollForm />
				</PayrollTotals>
			</BuilderContainer.SmallColumn>
		</BuilderContainer>
	);
}

function ReadOnlyPayroll() {
	const {
		payroll: { status },
	} = useLoaderData<typeof loader>();

	return (
		<BuilderContainer>
			<BuilderContainer.BigColumn>
				<EmployeesTable />
			</BuilderContainer.BigColumn>

			<BuilderContainer.SmallColumn>
				<PayrollTotals>
					{status === 'missing_emissions' ? (
						<PayPayrollForm customText="Emitir nóminas faltantes" />
					) : null}
				</PayrollTotals>
			</BuilderContainer.SmallColumn>
		</BuilderContainer>
	);
}

function EmployeesTable() {
	const { employees } = useLoaderData<typeof loader>();

	return (
		<div className="rounded-lg border border-gray-200 shadow-sm mb-4 bg-white overflow-hidden">
			<Table className="min-w-sm w-full">
				<TableHead>
					<TableHeadCell className="pl-2"></TableHeadCell>
					<TableHeadCell className="pl-4">Empleado</TableHeadCell>
					<TableHeadCell className="pl-4">Ingresos</TableHeadCell>
					<TableHeadCell className="pl-4">Deducciones</TableHeadCell>
					<TableHeadCell className="pl-4">Total</TableHeadCell>
					<TableHeadCell className="pl-4">Estado</TableHeadCell>
					<TableHeadCell className="pr-12"></TableHeadCell>
				</TableHead>

				<TableBody>
					{employees.map(employee => (
						<EmployeeItemRow key={employee.id} employee={employee} />
					))}
				</TableBody>
			</Table>
		</div>
	);
}

function EmployeeItemRow({ employee }: { employee: EmployeeItemType }) {
	const { readOnly } = useLoaderData<typeof loader>();
	const { isSelected, onToggle } = useEmployeeSelectionState(
		employee.id,
		employee.isSelected,
	);
	const isDraft = !readOnly;

	function Status() {
		switch (employee.status) {
			case 'emitted':
				return (
					<div className="flex gap-2 text-gray-500 items-center">
						<i className="ri-checkbox-circle-line text-success-600"></i>
						Emitida
					</div>
				);
			case 'emitted-with-errors':
				return (
					<div className="flex gap-2 text-error-600 items-center">
						<i className="ri-close-circle-line"></i>
						Emitida con errores
					</div>
				);
			case 'to-emit':
				return (
					<div className="flex gap-2 text-orange-600 items-center whitespace-nowrap">
						<i className="ri-question-line "></i>
						Por emitir
					</div>
				);
			default:
				return null;
		}
	}

	return (
		<TableRow
			className={cn(
				'border-b border-gray-200 children:align-bottom text-sm children:!py-0',
				isDraft && 'transition-all hover:bg-gray-50',
			)}
		>
			<TableCell className="pl-2">
				<Checkbox
					name="employee"
					value={employee.id}
					onCheckedChange={checked => onToggle(Boolean(checked.valueOf()))}
					checked={isSelected}
					disabled={!isDraft}
				/>
			</TableCell>
			<TableCell className="w-full pl-4 group">
				<Link to={employee.id} className="py-2 block">
					<p className={cn('text-base font-medium flex gap-4', 'items-center')}>
						<span className="group-hover:underline">{employee.name}</span>

						{isSelected && isDraft ? (
							<span
								className={cn(
									'text-xs font-medium bg-white rounded',
									'flex items-center px-2 border border-gray-200',
								)}
							>
								Seleccionado
							</span>
						) : null}
					</p>
				</Link>
			</TableCell>

			<TableCell className="pl-4">
				<Link to={employee.id} className="py-2 block">
					${formatCurrency(employee.income)}
				</Link>
			</TableCell>
			<TableCell className="pl-4">
				<Link to={employee.id} className="py-2 block">
					${formatCurrency(employee.deductions)}
				</Link>
			</TableCell>
			<TableCell className="pl-4">
				<Link to={employee.id} className="py-2 block">
					${formatCurrency(employee.total)}
				</Link>
			</TableCell>
			<TableCell className="pl-4">
				<Link to={employee.id} className="py-2 block">
					<Status />
				</Link>
			</TableCell>
			<TableCell className="pr-12">
				{isDraft ? (
					<LinkButton
						to={employee.id}
						className="h-7 w-7 p-0 group"
						variant="secondary"
					>
						<i
							className={cn(
								'group-hover:translate-x-0.5 transition-all',
								'ri-arrow-right-line',
							)}
						/>
					</LinkButton>
				) : (
					<ContextMenu
						srLabel={`Opciones para ${employee.name}`}
						items={[
							{ label: 'Ver detalles', href: `${employee.id}` },
							{ label: 'Imprimir nómina', href: `${employee.id}?print=true` },
						]}
					/>
				)}
			</TableCell>
		</TableRow>
	);
}

function useEmployeeSelectionState(id: string, defaultIsSelected: boolean) {
	const fetcher = useFetcher();
	const optimisticIsSelected = fetcher.formData?.get('isSelected') === 'true';
	const isPending = Boolean(fetcher.formData?.get('isSelected'));

	const isSelected = isPending ? optimisticIsSelected : defaultIsSelected;

	function onToggle(checked: boolean) {
		fetcher.submit(
			{
				isSelected: String(checked),
				payroll_employee_id: id,
				intent: 'updateEmployee',
			},
			{ method: 'POST' },
		);
	}

	return { isSelected, onToggle };
}

function EmployeesErrors() {
	const fetchers = useFetchers();
	const errors = fetchers.map(f => f.data?.error as string).filter(Boolean);

	if (errors.length === 0) return null;

	return (
		<Toast variant="error" className="mb-4">
			<ul className="list-disc pl-4">
				{errors.map((error, i) => (
					<li key={i}>{error}</li>
				))}
			</ul>
		</Toast>
	);
}

function PayrollTotals({ children }: { children?: React.ReactNode }) {
	const { payroll, totals, frequency } = useLoaderData<typeof loader>();

	return (
		<Box>
			<h5 className="mb-4">Detalles de la nómina</h5>

			<div className="mb-4">
				<Label>Periodo</Label>
				<p className={cn(getInputClasses(), 'items-center')}>
					{formatDate(payroll.startDate)} - {formatDate(payroll.endDate)}
				</p>
			</div>

			<div className="mb-2">
				<Label>Tipo de periodo</Label>
				<p className={cn(getInputClasses(), 'items-center')}>{frequency}</p>
			</div>

			<div className="flex flex-col gap-2 text-sm mt-4">
				<div className="flex justify-between gap-4">
					<p>Ingresos</p>
					<p className="font-medium">${formatCurrency(totals.income)}</p>
				</div>

				<div className="flex justify-between gap-4">
					<p>Deducciones</p>
					<p className="font-medium">${formatCurrency(totals.deductions)}</p>
				</div>
				<div className="flex justify-between gap-4 pt-4 mt-2 border-t border-gray-200">
					Total de la nómina
					<p className="font-bold text-xl">${formatCurrency(totals.total)}</p>
				</div>

				{children}
			</div>
		</Box>
	);
}

function PayPayrollForm({ customText }: { customText?: string }) {
	const { employees } = useLoaderData<typeof loader>();
	const [confirmed, setConfirmed] = React.useState(customText ? true : false);
	const actionData = useActionData<any>();
	const error = actionData?.error as string;
	const errors = actionData?.errors as Array<{ name: string; error: string }>;
	const selectedEmployeesLenght = employees.filter(e => e.isSelected).length;

	return (
		<div className="mt-2">
			{error || errors ? (
				<Toast variant="error" className="mb-4">
					{error ? <p className="mb-2">{error}</p> : null}

					<p className="mb-2">
						La nómina de los siguientes empleados no pudieron ser emitidas, por
						favor toma una captura de pantalla de este mensaje y contacta a
						soporte.
					</p>

					<ul className="list-disc pl-4">
						{errors.map((e, i) => (
							<li key={i}>
								{e.name}: {e.error}
							</li>
						))}
					</ul>
				</Toast>
			) : null}

			<Form method="POST" className="w-full">
				{!customText ? (
					<CheckboxField
						label={`
						He revisado y entiendo que al liquidar la nómina
						de los ${selectedEmployeesLenght} empleados seleccionados 
						no podré hacer cambios.
					`}
						className="mb-4 items-start"
					>
						<Checkbox
							name="confirmed"
							checked={confirmed}
							onCheckedChange={c => setConfirmed(Boolean(c.valueOf()))}
							className="mt-1"
						/>
					</CheckboxField>
				) : null}

				<IntentButton
					variant="primary"
					type="submit"
					className="w-full"
					intent="payPayroll"
					disabled={!confirmed}
				>
					{customText || 'Liquidar y emitir nómina en la DIAN'}
				</IntentButton>
			</Form>
		</div>
	);
}

function Title() {
	const {
		payroll: { status },
	} = useLoaderData<typeof loader>();

	if (status === 'missing_emissions') {
		return (
			<div>
				<h3>Algunas nóminas no fueron enviadas</h3>
				<p className="text-gray-500 text-sm">
					Presiona el botón "Emitir nóminas faltantes" para enviar las nóminas
					pendientes.
				</p>
			</div>
		);
	}

	if (status === 'emitted' || status === 'emitted_with_errors') {
		return (
			<div>
				<h3>Nómina emitida</h3>
				<p className="text-gray-500 text-sm">
					La nómina ha sido emitida a la DIAN.
				</p>
			</div>
		);
	}

	return (
		<div>
			<h3>Completa y paga tu nómina</h3>
			<p className="text-gray-500 text-sm">
				Selecciona los empleados que deseas pagar y haz clic en el botón "pagar
				nómina" para completar el proceso.
			</p>
		</div>
	);
}
