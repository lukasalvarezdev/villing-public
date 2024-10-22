import {
	json,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	redirect,
} from '@remix-run/node';
import {
	Link,
	useLoaderData,
	type MetaFunction,
	useFetcher,
} from '@remix-run/react';
import * as React from 'react';
import { DateString } from '~/components/client-only';
import { ContextMenu } from '~/components/dropdown-menu';
import { SearchInput } from '~/components/filters';
import { Button, Label, Select } from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
} from '~/components/ui-library';
import { calculateConceptsTotals } from '~/modules/payroll/concepts-context';
import { employeeMapper } from '~/modules/payroll/create-payroll';
import {
	PayrollStatusBadge,
	getWorkedDaysByPeriodFrequency,
} from '~/modules/payroll/payroll-misc';
import {
	configSchema,
	type PeriodFrequency,
} from '~/modules/payroll/payroll-schemas';
import { useOrganization } from '~/root';
import { months } from '~/utils/dates-misc';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { errorLogger } from '~/utils/logger';
import {
	cn,
	formatCurrency,
	formatDate,
	getColombiaDate,
	parseFormData,
} from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';
import {
	RangeSelector,
	getDefaultPeriod,
	getConfigRange,
} from './range-selector';

export const meta: MetaFunction = () => [{ title: `Nóminas - Villing` }];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const [{ payrollFrequency }, payrolls] = await db.$transaction([
		db.organization.findUniqueOrThrow({
			where: { id: orgId },
			select: { payrollFrequency: true },
		}),
		db.payroll.findMany({
			where: { organizationId: orgId },
			select: {
				id: true,
				paidAt: true,
				status: true,
				endDate: true,
				startDate: true,
				employees: {
					select: { id: true, payrollConcepts: true, isSelected: true },
				},
			},
			orderBy: { createdAt: 'desc' },
		}),
	]);

	return {
		config: getDefaultConfig(),
		payrolls: payrolls.map(payroll => {
			const { employees } = payroll;

			const paid = employees.reduce((acc, e) => {
				const { total } = calculateConceptsTotals(e.payrollConcepts);
				return acc + total;
			}, 0);

			return {
				id: payroll.id,
				paid,
				endDate: payroll.endDate,
				startDate: payroll.startDate,
				status: payroll.status,
				employees: employees.filter(e => e.isSelected).length,
			};
		}),
	};

	function getDefaultConfig() {
		const currentMonth = new Date().getMonth();
		const defaultMonth = months[currentMonth];
		const result = configSchema.safeParse({
			month: defaultMonth,
			frequency: payrollFrequency,
			period: getDefaultPeriod(payrollFrequency as PeriodFrequency),
		});

		if (!result.success) {
			return { month: 'Enero', frequency: 'Quincenal', period: 1 } as const;
		}

		return result.data;
	}
}

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);
	const formData = await parseFormData(request);

	try {
		const config = configSchema.safeParse(
			Object.fromEntries(formData.entries()),
		);

		if (!config.success) {
			console.error('Invalid config', config.error);
			return json({ error: 'Invalid config' }, 500);
		}

		const range = getConfigRange(config.data);

		const startDate = range.start;
		const endDate = range.end;

		const id = await db.$transaction(async tx => {
			const employees = await tx.employee.findMany({
				where: { organizationId: orgId, deletedAt: null },
				select: {
					id: true,
					salary: true,
					template: {
						select: { payrollConcepts: true, salary: true },
					},
					hasTransportHelp: true,
				},
			});

			const payroll = await tx.payroll.create({
				data: {
					endDate,
					startDate,
					organizationId: orgId,
					employees: {
						create: employees.map(employee => {
							return employeeMapper({ employee, orgId, config: config.data });
						}),
					},
					month: config.data.month,
					year: getColombiaDate().getFullYear(),
					daysWorked: getWorkedDaysByPeriodFrequency(config.data.frequency),
				},
			});

			return payroll.id;
		});

		return redirect(`/payroll/${id}`);
	} catch (error) {
		if (typeof error === 'string') return json({ error }, 400);

		const referenceId = errorLogger({
			error,
			path: 'createPayroll',
			customMessage: 'Error creating payroll',
		});

		await logError({ error, request });
		return json(
			{
				error: `No pudimos crear la nómina. Envía esta referencia (${referenceId}) a soporte para ayudarte.`,
			},
			500,
		);
	}
}

export default function Component() {
	const { payrolls } = useLoaderData<typeof loader>();

	return (
		<div>
			<div className="pb-4 border-b border-gray-200 mb-4">
				<h3>Nóminas</h3>
				<p className="text-gray-500 text-sm">
					Administra los pagos de tus empleados.
				</p>
			</div>

			<div className="mb-4 flex gap-4">
				<div className="flex-1">
					<SearchInput placeholder="Busca por nombre, email o NIT" />
				</div>
				<CreatePayrollButton />
				<PayrollConfigForm />
			</div>

			<div className="rounded border border-gray-200 shadow-sm mb-4 text-sm bg-white">
				<Table>
					<TableHead>
						<TableHeadCell>Periodo</TableHeadCell>
						<TableHeadCell>Empleados</TableHeadCell>
						<TableHeadCell>Total</TableHeadCell>
						<TableHeadCell>Estado</TableHeadCell>
						<TableHeadCell></TableHeadCell>
					</TableHead>
					<TableBody>
						{payrolls.map((payroll, index) => (
							<TableRow key={payroll.id} className="h-11">
								<TableCell className="whitespace-nowrap">
									<Link
										to={`${payroll.id}`}
										prefetch="intent"
										className={cn(
											payroll.status === 'missing_emissions' &&
												'text-orange-600',
											'flex gap-2',
										)}
									>
										<DateString>
											{formatDate(payroll.startDate)} -{' '}
											{formatDate(payroll.endDate)}
										</DateString>
										{payroll.status === 'missing_emissions' ? (
											<i className="ri-error-warning-line"></i>
										) : null}
									</Link>
								</TableCell>
								<TableCell>
									<Link to={`${payroll.id}`} prefetch="intent">
										{payroll.employees}
									</Link>
								</TableCell>
								<TableCell>
									<Link to={`${payroll.id}`} prefetch="intent">
										${formatCurrency(payroll.paid)}
									</Link>
								</TableCell>
								<TableCell>
									<Link to={`${payroll.id}`} prefetch="intent">
										<PayrollStatusBadge status={payroll.status} />
									</Link>
								</TableCell>
								<td>
									<ContextMenu
										srLabel={`Opciones de nómina ${index}`}
										items={[
											{
												label:
													payroll.status === 'emitted'
														? 'Ver nómina'
														: payroll.status === 'missing_emissions'
															? 'Ver o emitir nómina'
															: 'Editar nómina',
												icon: 'ri-pencil-line',
												href: `/payroll/${payroll.id}`,
											},
											{
												label: 'Duplicar',
												icon: 'ri-file-copy-2-line',
												href: `/payroll/new?payroll_id=${payroll.id}`,
											},
										]}
									/>
								</td>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

function CreatePayrollButton() {
	const { config } = useLoaderData<typeof loader>();
	const [isOpen, setIsOpen] = React.useState(false);

	return (
		<div>
			<Button variant="black" type="button" onClick={() => setIsOpen(true)}>
				<i className="ri-add-circle-line"></i>
				Crear nómina
			</Button>

			{isOpen ? (
				<RangeSelector
					defaultConfig={config}
					onClose={() => setIsOpen(false)}
				/>
			) : null}
		</div>
	);
}

function PayrollConfigForm() {
	const fetcher = useFetcher();
	const [isOpen, setIsOpen] = React.useState(false);
	const organization = useOrganization();

	React.useEffect(() => {
		if (fetcher.data) setIsOpen(false);
	}, [fetcher.data]);

	return (
		<div>
			<Button variant="secondary" type="button" onClick={() => setIsOpen(true)}>
				<i className="ri-settings-line"></i>
				Ajustes
			</Button>

			{isOpen ? (
				<Modal className="max-w-md">
					<ModalHeader onClick={() => setIsOpen(false)} className="mb-4">
						<h4>Ajustes de nómina</h4>
					</ModalHeader>

					<fetcher.Form
						onChange={e => {
							const formData = new FormData(e.currentTarget);
							fetcher.submit(formData, {
								method: 'POST',
								action: '/payroll/config',
							});
						}}
					>
						<Label htmlFor="frequency">Frecuencia de pago</Label>
						<Select
							id="frequency"
							name="frequency"
							options={[
								{ value: 'Semanal', label: 'Semanal' },
								{ value: 'Decadal', label: 'Decadal' },
								{ value: 'Quincenal', label: 'Quincenal' },
								{ value: 'Mensual', label: 'Mensual' },
							]}
							defaultValue={organization.payrollFrequency}
							className="mb-4"
						/>

						<Button
							variant="secondary"
							type="button"
							onClick={() => setIsOpen(false)}
						>
							Cancelar
						</Button>

						{fetcher.state !== 'idle' ? (
							<p className="text-sm mt-2 text-gray-500">Guardando...</p>
						) : null}
					</fetcher.Form>
				</Modal>
			) : null}
		</div>
	);
}
