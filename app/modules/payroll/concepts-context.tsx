import * as React from 'react';
import { v4 as uuid } from 'uuid';
import { Combobox } from '~/components/combobox';
import { Label } from '~/components/form-utils';
import {
	type PartialWithMandatory,
	compareStrings,
	toNumber,
} from '~/utils/misc';
import {
	type ConceptDefinition,
	type Concept,
	definitions,
	incomeDefinitions,
	deductionDefinitions,
	getDefaultIncomes,
	getDefaultDeductions,
	getBaseSalaryFromSalaryPortionByDaysWorked,
} from './definition';

type ConceptContextType = {
	daysWorked: number;
	salary: number;
	concepts: Array<Concept>;
	totals: Record<string, number>;
	baseSalary: number;

	addConcept: (concept: Concept['type']) => void;
	removeConcept: (concept: Concept) => void;
	updateConcept: (concept: PartialWithMandatory<Concept, 'id'>) => void;
};

const conceptContext = React.createContext<ConceptContextType | undefined>(
	undefined,
);

export function ConceptsProvider({
	children,
	defaultConcepts,
	daysWorked,
}: {
	children: React.ReactNode;
	defaultConcepts?: Array<Concept>;
	daysWorked: number;
}) {
	const [concepts, setConcepts] = React.useState(
		defaultConcepts || [
			...getDefaultIncomes({
				salary: MINIMUM_SALARY,
				daysWorked: 30,
				baseSalary: MINIMUM_SALARY,
				hasTransportAid: true,
			}),
			...getDefaultDeductions(0),
		],
	);
	const salary = toNumber(
		concepts.find(c => compareStrings(c.keyName, 'salario'))?.amount,
	);
	const baseSalary = getBaseSalaryFromSalaryPortionByDaysWorked(
		salary,
		daysWorked,
	);

	const totals = React.useMemo(() => {
		return concepts.reduce((acc, concept) => {
			return {
				...acc,
				[concept.keyName]: concept.amount * concept.quantity,
			};
		}, {});
	}, [concepts]);

	function addConcept(type: Concept['type']) {
		setConcepts([
			...concepts,
			{
				id: uuid(),
				type,
				keyName: '',
				amount: 0,
				quantity: 0,
			},
		]);
	}

	function removeConcept(concept: Concept) {
		setConcepts(concepts.filter(c => c.id !== concept.id));
	}

	const updateConcept = React.useCallback(
		(concept: PartialWithMandatory<Concept, 'id'>) => {
			setConcepts(concepts => {
				const alreadyExists = concepts.some(c =>
					compareStrings(c.keyName, concept.keyName),
				);

				if (alreadyExists) {
					return concepts;
				}

				return concepts.map(c => {
					if (c.id === concept.id) {
						return { ...c, ...concept };
					}

					return c;
				});
			});
		},
		[],
	);

	return (
		<conceptContext.Provider
			value={{
				daysWorked,
				salary,
				concepts,
				totals,
				addConcept,
				removeConcept,
				updateConcept,
				baseSalary,
			}}
		>
			{children}
		</conceptContext.Provider>
	);
}

export function useConceptsContext() {
	const context = React.useContext(conceptContext);

	if (!context) {
		throw new Error(
			'useConceptsContext must be used within a ConceptsProvider',
		);
	}

	return context;
}

export function useIncomeConcepts() {
	const { concepts } = useConceptsContext();
	return concepts.filter(c => c.type === 'income');
}

export function useDeductionConcepts() {
	const { concepts } = useConceptsContext();
	return concepts.filter(c => c.type === 'deduction');
}

export function getConceptDefinition(concept: Concept): ConceptDefinition {
	const definition = definitions.find(d =>
		compareStrings(d.keyName, concept.keyName),
	);

	if (!definition) {
		throw new Error(`No definition found for concept ${concept.keyName}`);
	}

	return definition;
}

export function ConceptSelector({
	concept,
	disabled,
}: {
	concept: Concept;
	disabled?: boolean;
}) {
	const id = React.useId();
	const { updateConcept } = useConceptsContext();
	const concepts =
		concept.type === 'income' ? incomeDefinitions : deductionDefinitions;

	return (
		<div className="flex-1">
			<Label htmlFor={id}>Concepto</Label>
			<Combobox
				name="concept"
				inputProps={{ id, name: 'concept', disabled }}
				items={concepts.map(c => ({ label: c.keyName, value: c.keyName }))}
				value={concept.keyName}
				onChange={value => {
					updateConcept({
						...concept,
						keyName: value,
						amount: 0,
						quantity: 0,
						customPercentage: undefined,
					});
				}}
			/>
		</div>
	);
}

export function useConceptsTotals() {
	const { concepts } = useConceptsContext();
	return calculateConceptsTotals(concepts);
}

export function calculateConceptsTotals(concepts: Array<Concept>) {
	const incomes = concepts.filter(c => c.type === 'income');
	const deductions = concepts.filter(c => c.type === 'deduction');
	const salary = toNumber(
		concepts.find(c => compareStrings(c.keyName, 'salario'))?.amount,
	);

	const totalDeductions = deductions.reduce((acc, d) => acc + d.amount, 0);
	const totalIncomes = incomes.reduce((acc, i) => acc + i.amount, 0);
	const total = totalIncomes - totalDeductions;

	return { total, totalDeductions, totalIncomes, salary };
}

export const MINIMUM_SALARY = 1300000;
