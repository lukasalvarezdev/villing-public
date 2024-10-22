import { Form, useActionData, useSubmit } from '@remix-run/react';
import * as React from 'react';
import {
	Button,
	CurrencyInput,
	Input,
	IntentButton,
	Label,
	Toast,
	getInputClasses,
} from '~/components/form-utils';
import { Box, BuilderContainer } from '~/components/ui-library';
import { cn, compareStrings, formatCurrency, toNumber } from '~/utils/misc';
import {
	ConceptSelector,
	ConceptsProvider,
	MINIMUM_SALARY,
	getConceptDefinition,
	useConceptsContext,
	useConceptsTotals,
	useDeductionConcepts,
	useIncomeConcepts,
} from './concepts-context';
import {
	type ConceptDefinition,
	type Concept,
	type ConceptDefinitionSubType,
	subTypeCalculators,
} from './definition';

export function ConceptsForm({
	children,
	concepts,
	daysWorked = 30,
}: {
	children: React.ReactNode;
	concepts?: Array<Concept>;
	daysWorked?: number;
}) {
	return (
		<ConceptsProvider daysWorked={daysWorked} defaultConcepts={concepts}>
			<BuilderContainer>{children}</BuilderContainer>
		</ConceptsProvider>
	);
}

ConceptsForm.Name = function ConceptsFormName({ name }: { name?: string }) {
	return (
		<div>
			<Label htmlFor="name">Nombre de la plantilla</Label>
			<Input
				name="name"
				placeholder="Ej: Nómina de empleados"
				className="mb-6"
				defaultValue={name}
			/>
		</div>
	);
};

ConceptsForm.ConceptsList = function ConceptsList() {
	const incomes = useIncomeConcepts();
	const deductions = useDeductionConcepts();

	return (
		<div className="flex flex-col gap-6">
			<ListContainer
				label="Ingresos"
				description="Agrega los ingresos que se repiten mes a mes."
				type="income"
			>
				{incomes.map(concept => (
					<ConceptItem key={concept.id} concept={concept} />
				))}
			</ListContainer>

			<ListContainer
				label="Deducciones"
				description="Agrega las deducciones que se repiten mes a mes."
				type="deduction"
			>
				{deductions.map(concept => (
					<ConceptItem key={concept.id} concept={concept} />
				))}
			</ListContainer>
		</div>
	);
};

ConceptsForm.Totals = function ConceptsTotals() {
	const { salary, concepts } = useConceptsContext();
	const { total, totalDeductions, totalIncomes } = useConceptsTotals();
	const transportAid = concepts.find(c =>
		compareStrings(c.keyName, 'auxilio de transporte'),
	);
	const shouldHaveTransportAid = salary <= MINIMUM_SALARY * 2;
	const showAlert = shouldHaveTransportAid && !transportAid;

	return (
		<div>
			<h5 className="mb-4">Detalles de la nómina</h5>

			<div className="text-sm">
				<div className="flex justify-between gap-4 mb-2">
					<p>Ingresos</p>
					<p className="font-medium">${formatCurrency(totalIncomes)}</p>
				</div>

				<div className="flex justify-between gap-4 mb-4">
					<p>Deducciones</p>
					<p className="font-medium">${formatCurrency(totalDeductions)}</p>
				</div>

				<div className="flex justify-between gap-4 pt-4 border-t border-gray-200">
					<p>Total a pagar</p>
					<p className="font-bold text-xl">${formatCurrency(total)}</p>
				</div>

				{showAlert ? (
					<p className="flex gap-2 text-orange-600 mt-2">
						<i className="ri-information-line"></i>
						El salario ingresado es menor a 2 salarios mínimos. Debes agregar el
						auxilio de transporte.
					</p>
				) : null}
			</div>
		</div>
	);
};

ConceptsForm.SaveButton = function ConceptsSaveButton() {
	const { concepts } = useConceptsContext();
	const submit = useSubmit();
	const actionData = useActionData<any>();
	const [errorState, setError] = React.useState<string | null>(null);
	const actionError = actionData?.error as string | undefined;
	const error = actionError ?? errorState;
	const errors = actionData?.errors as Array<string> | undefined;

	return (
		<div>
			{error ? <Toast variant="error">{error}</Toast> : null}

			{errors?.length ? (
				<Toast variant="error">
					<ul className="list-disc pl-4">
						{errors.map((error, index) => (
							<li key={index}>{error}</li>
						))}
					</ul>
				</Toast>
			) : null}

			<Form
				method="POST"
				id="template-form"
				className="w-full"
				onSubmit={e => {
					e.preventDefault();
					const formData = new FormData(e.currentTarget);

					formData.set('intent', 'saveChanges');
					formData.set('concepts', JSON.stringify(concepts));
					submit(formData, { method: 'POST' });
					setError(null);
				}}
			>
				<IntentButton
					intent="saveChanges"
					variant="primary"
					type="submit"
					className="w-full mt-4"
				>
					Guardar datos
				</IntentButton>
			</Form>
		</div>
	);
};

function ListContainer({
	children,
	description,
	label,
	type,
}: {
	children: React.ReactNode;
	label: string;
	description: string;
	type: ConceptDefinition['type'];
}) {
	const { addConcept } = useConceptsContext();

	return (
		<div className="flex gap-6 pb-6 border-b border-gray-300">
			<div className="flex-1 max-w-[16rem] hidden xl:block">
				<div className="sticky z-10 top-[calc(60px+1rem)]">
					<h5 className="mb-2">{label}</h5>
					<p className="text-sm text-gray-500">{description}</p>
				</div>
			</div>

			<div className="flex-1">
				<div className="flex flex-col gap-4 mb-4">{children}</div>

				<Button variant="black" type="button" onClick={() => addConcept(type)}>
					<i className="ri-add-circle-line mr-2"></i>
					Agregar {type === 'income' ? 'ingreso' : 'deducción'}
				</Button>
			</div>
		</div>
	);
}

function ConceptItem({ concept }: { concept: Concept }) {
	const id = React.useId();
	const { updateConcept, removeConcept, salary, baseSalary } =
		useConceptsContext();

	const definition = concept.keyName
		? getConceptDefinition(concept)
		: undefined;
	const { amount } = concept;
	const Form = definition?.subType ? forms[definition.subType] : () => null;
	const isSalaryConcept = compareStrings(concept.keyName, 'salario');

	return (
		<Box className="flex flex-col gap-4">
			<div className="flex justify-between gap-4">
				<div className="flex-1">
					<ConceptSelector concept={concept} disabled={definition?.required} />
				</div>

				<div className="w-40">
					<Label htmlFor={id}>Valor</Label>
					{definition?.readOnly ? (
						<p className={cn(getInputClasses(), 'items-center')}>
							{formatCurrency(amount)}
						</p>
					) : (
						<CurrencyInput
							id={id}
							defaultValue={formatCurrency(amount)}
							onValueChange={value => {
								updateConcept({ id: concept.id, amount: toNumber(value) });
							}}
						/>
					)}
				</div>
			</div>

			<Form {...concept} />

			{isSalaryConcept && baseSalary !== salary ? (
				<div className="w-40">
					<Label htmlFor={id}>Salario base</Label>
					<p className={cn(getInputClasses(), 'items-center')}>
						{formatCurrency(baseSalary)}
					</p>
				</div>
			) : null}

			{definition?.required ? (
				<div className="flex gap-2 text-xs text-gray-500">
					<p>
						<i className="ri-information-line mr-2"></i>
						Este concepto no se puede eliminar.{' '}
					</p>
					<button className="font-medium hover:underline">Ver porqué</button>
				</div>
			) : (
				<Button
					variant="secondary"
					type="button"
					className="max-w-max"
					onClick={() => removeConcept(concept)}
				>
					Eliminar
				</Button>
			)}
		</Box>
	);
}

export const forms = {
	layOff: LayoffForm,
	layOffInterests: LayoffInterestForm,
	percentOfSalary: PercentOfSalaryForm,
	value: () => null,
	valueFromDaysWorked: ValueFromDaysWorkedForm,
	quantity: QuantityForm,
} satisfies Record<ConceptDefinitionSubType, React.ComponentType<Concept>>;

function ValueFromDaysWorkedForm(concept: Concept) {
	const { updateConcept, daysWorked } = useConceptsContext();
	const { valueOn30DaysWorked = 0 } = getConceptDefinition(concept);

	React.useEffect(() => {
		updateConcept({
			id: concept.id,
			amount: (valueOn30DaysWorked / 30) * daysWorked,
		});
	}, [concept.id, daysWorked, updateConcept, valueOn30DaysWorked]);

	return null;
}

function QuantityForm(concept: Concept) {
	const id = React.useId();
	const { updateConcept } = useConceptsContext();
	const definition = getConceptDefinition(concept);
	const { label = 'Cantidad' } = definition;
	const { quantity } = concept;
	const props = useCalculatorProps(concept);

	const getNewAmount = React.useCallback(
		(quantity: number) => {
			return subTypeCalculators.quantity({ ...props, quantity });
		},
		[props],
	);

	React.useEffect(() => {
		const amount = getNewAmount(quantity);
		updateConcept({ id: concept.id, amount });
	}, [concept.id, getNewAmount, quantity, updateConcept]);

	return (
		<div>
			<Label htmlFor={id}>{label}</Label>
			<Input
				id={id}
				placeholder="Ej. 10"
				className="w-[20]"
				value={quantity}
				onChange={e => {
					const value = toNumber(e.target.value);
					const amount = getNewAmount(value);
					updateConcept({ id: concept.id, quantity: value, amount });
				}}
			/>
		</div>
	);
}

function PercentOfSalaryForm(concept: Concept) {
	const id = React.useId();
	const { updateConcept, salary } = useConceptsContext();
	const { readOnly, percentage: defaultPercentage } =
		getConceptDefinition(concept);
	const { customPercentage } = concept;
	const percentage = customPercentage ?? defaultPercentage;

	React.useEffect(() => {
		const amount = salary * (percentage / 100);
		updateConcept({ id: concept.id, amount });
	}, [concept.id, percentage, salary, updateConcept]);

	if (readOnly) return null;

	return (
		<div>
			<Label htmlFor={id}>Porcentaje (%)</Label>
			<Input
				id={id}
				placeholder="Ej. 10%"
				className="w-[20]"
				value={customPercentage || 0}
				onChange={e => {
					const value = toNumber(e.target.value);
					if (value > 100) return;
					const customPercentage = value < 0 ? 0 : value;
					updateConcept({ id: concept.id, customPercentage });
				}}
			/>
		</div>
	);
}

function LayoffForm(concept: Concept) {
	const id = React.useId();
	const { updateConcept } = useConceptsContext();
	const props = useCalculatorProps(concept);
	const { quantity } = concept;

	const getNewAmount = React.useCallback(
		(quantity: number) => {
			return subTypeCalculators.layOff({ ...props, quantity });
		},
		[props],
	);

	React.useEffect(() => {
		const amount = getNewAmount(quantity);
		updateConcept({ id: concept.id, amount });
	}, [concept.id, quantity, getNewAmount, updateConcept]);

	return (
		<div>
			<Label htmlFor={id}>Días trabajdos</Label>
			<Input
				id={id}
				placeholder="Ej. 10"
				className="w-[20]"
				value={quantity}
				onChange={e => {
					const value = toNumber(e.target.value);
					const amount = getNewAmount(value);
					updateConcept({ id: concept.id, quantity: value, amount });
				}}
			/>
		</div>
	);
}

function LayoffInterestForm(concept: Concept) {
	const { updateConcept, concepts } = useConceptsContext();
	const layoffConcept = concepts.find(c =>
		compareStrings(c.keyName, 'cesantías'),
	);
	const totalDaysWorked = toNumber(layoffConcept?.quantity);
	const props = useCalculatorProps(concept);

	React.useEffect(() => {
		const amount = subTypeCalculators.layOffInterests({
			...props,
			quantity: totalDaysWorked,
		});
		updateConcept({ id: concept.id, amount });
	}, [concept.id, props, totalDaysWorked, updateConcept]);

	return null;
}

function useCalculatorProps(concept: Concept) {
	const { salary, baseSalary } = useConceptsContext();
	const definition = getConceptDefinition(concept);

	return React.useMemo(() => {
		return { ...definition, salary, baseSalary };
	}, [baseSalary, definition, salary]);
}
