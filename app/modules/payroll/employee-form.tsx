import { type FieldConfig, conform, useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import { Form } from '@remix-run/react';
import { type z } from 'zod';
import { Combobox } from '~/components/combobox';
import { DatePicker } from '~/components/date-picker';
import {
	CurrencyInput,
	ErrorText,
	Input,
	Label,
	Select,
} from '~/components/form-utils';
import { Switch } from '~/components/switch';
import { TwoColumnsDiv } from '~/components/ui-library';
import {
	banks,
	compensationFunds,
	epsList,
	identifications,
	municipalities,
	paymentMethods,
	pensionFunds,
	redundancyFunds,
	typeContracts,
	typeWorkers,
} from '~/utils/legal-values';
import { cn, formatCurrency, safeNewDate, toNumber } from '~/utils/misc';
import { employeeSchema } from './payroll-schemas';

export function EmployeeForm({
	defaultValue,
	children,
}: {
	defaultValue?: z.infer<typeof employeeSchema>;
	children: React.ReactNode;
}) {
	const [form, fields] = useForm({
		id: 'employee-form',
		constraint: getFieldsetConstraint(employeeSchema),
		onValidate: ({ formData }) => parse(formData, { schema: employeeSchema }),
		shouldValidate: 'onBlur',
		defaultValue,
	});

	return (
		<Form method="POST" {...form.props} className="max-w-3xl">
			<FieldSet legend="Información personal">
				<TwoColumnsDiv>
					<Field label="Nombre" field={fields.name} placeholder="Ej: Juan" />
					<Field
						label="Apellido"
						field={fields.surname}
						placeholder="Ej: Perez"
					/>
				</TwoColumnsDiv>

				<TwoColumnsDiv>
					<Field label="Tipo de identificación" field={fields.idType}>
						<Select
							options={identifications}
							{...conform.select(fields.idType)}
						/>
					</Field>
					<Field
						label="Número de identificación"
						field={fields.idNumber}
						placeholder="Ej: 1234567890"
					/>
				</TwoColumnsDiv>

				<TwoColumnsDiv>
					<Field label="Municipio" field={fields.city}>
						<Combobox items={municipalities} {...conform.select(fields.city)} />
					</Field>
					<Field
						label="Dirección"
						field={fields.address}
						placeholder="Ej: Calle 123 # 45-67"
					/>
				</TwoColumnsDiv>

				<TwoColumnsDiv>
					<Field
						label="Correo electrónico"
						field={fields.email}
						placeholder="Ej: contacto@villing.io"
					/>
					<div></div>
				</TwoColumnsDiv>
			</FieldSet>

			<FieldSet legend="Información laboral">
				<TwoColumnsDiv>
					<Field
						label="Cargo"
						field={fields.jobTitle}
						placeholder="Ej: Vendedor"
					/>
					<Field label="Salario" field={fields.salary}>
						<CurrencyInput
							{...conform.input(fields.salary)}
							defaultValue={
								fields.salary.defaultValue
									? formatCurrency(toNumber(fields.salary.defaultValue))
									: undefined
							}
						/>
					</Field>
				</TwoColumnsDiv>

				<TwoColumnsDiv>
					<Field label="Tipo de contrato" field={fields.typeContract}>
						<Select
							options={typeContracts}
							{...conform.select(fields.typeContract)}
						/>
					</Field>
					<Field label="Fecha de contratación" field={fields.startDate}>
						<DatePicker
							name={fields.startDate.name}
							defaultDate={
								fields.startDate.defaultValue
									? safeNewDate(fields.startDate.defaultValue)
									: undefined
							}
							inputProps={conform.input(fields.startDate)}
						/>
					</Field>
				</TwoColumnsDiv>

				<TwoColumnsDiv>
					<Field label="Tipo de trabajador" field={fields.typeEmployee}>
						<Combobox
							items={typeWorkers}
							{...conform.select(fields.typeEmployee)}
						/>
					</Field>
					<div></div>
				</TwoColumnsDiv>

				<SwitchField
					label="Es salario integral"
					field={fields.isIntegralSalary}
					description="Si el salario es mayor a 10 SMLV + 30% de prestaciones. ($16,900,000)"
				/>

				<SwitchField
					label="Es pensionado por vejez activo"
					field={fields.hasPension}
					description="Si el empleado ya está pensionado por vejez y sigue trabajando."
				/>

				<SwitchField
					label="Tiene auxilio de transporte"
					field={fields.hasTransportHelp}
					description="Obligatorio si el salario es menor a 2 SMLV."
				/>

				<SwitchField
					label="Es de alto riesgo"
					field={fields.isHighRisk}
					description="Si el empleado desempeña una labor de alto riesgo. (Según el decreto 2090 de 2003)"
				/>
			</FieldSet>

			<FieldSet legend="Información de pago">
				<TwoColumnsDiv>
					<Field label="Método de pago" field={fields.paymentMethod}>
						<Combobox
							items={paymentMethods}
							{...conform.select(fields.paymentMethod)}
						/>
					</Field>

					<Field label="Banco (opcional)" field={fields.bank}>
						<Combobox items={banks} {...conform.select(fields.bank)} />
					</Field>
				</TwoColumnsDiv>

				<TwoColumnsDiv>
					<Field label="Tipo de cuenta (opcional)" field={fields.accountType}>
						<Select
							options={[
								{ value: '', label: 'Selecciona una opción' },
								{ value: 'Ahorros', label: 'Ahorros' },
								{ value: 'Corriente', label: 'Corriente' },
							]}
							{...conform.select(fields.accountType)}
						/>
					</Field>
					<Field
						label="Número de cuenta (opcional)"
						field={fields.accountNumber}
						placeholder="Ej: 1234567890"
					/>
				</TwoColumnsDiv>
			</FieldSet>

			<FieldSet legend="Información de afiliaciones">
				<TwoColumnsDiv>
					<Field label="EPS" field={fields.eps}>
						<Combobox items={epsList} {...conform.select(fields.eps)} />
					</Field>

					<Field label="Caja de compensación" field={fields.compensationFund}>
						<Combobox
							items={compensationFunds}
							{...conform.select(fields.compensationFund)}
						/>
					</Field>
				</TwoColumnsDiv>

				<TwoColumnsDiv>
					<Field label="Fondo de pensiones" field={fields.pensionFund}>
						<Combobox
							items={pensionFunds}
							{...conform.select(fields.pensionFund)}
						/>
					</Field>

					<Field label="Fondo de cesantías" field={fields.redundancyFund}>
						<Combobox
							items={redundancyFunds}
							{...conform.select(fields.redundancyFund)}
						/>
					</Field>
				</TwoColumnsDiv>
			</FieldSet>

			{children}
		</Form>
	);
}

function Field({
	label,
	field,
	placeholder,
	children,
}: {
	label: string;
	field: FieldConfig<any>;
	placeholder?: string;
	children?: React.ReactNode;
}) {
	return (
		<div>
			<Label htmlFor={field.id}>{label}</Label>

			{children ?? (
				<Input {...conform.input(field)} placeholder={placeholder} />
			)}

			<ErrorText id={field.errorId}>{field.error}</ErrorText>
		</div>
	);
}

function FieldSet({
	legend,
	children,
}: {
	legend: string;
	children: React.ReactNode;
}) {
	return (
		<fieldset className="pb-4 border-b border-gray-100 mb-4 flex flex-col gap-4">
			<legend className="font-bold mb-2">{legend}</legend>
			{children}
		</fieldset>
	);
}

function SwitchField({
	description,
	field,
	label,
}: {
	label: string;
	field: FieldConfig<boolean>;
	description: string;
}) {
	return (
		<div
			className={cn(
				'flex justify-between gap-4 items-center',
				'border border-gray-200 rounded-md p-4 ',
			)}
		>
			<div>
				<Label htmlFor={field.id} className="text-base mb-0">
					{label}
				</Label>
				<p className="text-sm text-gray-500">{description}</p>
			</div>

			<Switch
				name={field.name}
				id={field.id}
				defaultChecked={Boolean(field.defaultValue)}
			/>
		</div>
	);
}
