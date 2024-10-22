import * as React from 'react';
import {
	CurrencyInput,
	Label,
	Select,
	getInputClasses,
} from '~/components/form-utils';
import { TwoColumnsDiv } from '~/components/ui-library';
import { removePercentage, roundNumber } from '~/modules/invoice/invoice-math';
import { addTax, cn, formatCurrency, invariant, toNumber } from '~/utils/misc';

type StateType = {
	tax: number;
	cost: string;
	costWithTax: string;
	prices: Array<{ id: number; value: string; valueWithTax: string }>;
};
type ContextType = { state: StateType; dispatch: React.Dispatch<ActionType> };

export function ProductPrices({
	priceLists,
	tax,
	cost,
}: {
	cost: number;
	tax: number;
	priceLists: Array<{
		id: number;
		name: string;
		value: number;
	}>;
}) {
	const [state, dispatch] = React.useReducer(reducer, {
		cost: formatCurrency(cost),
		costWithTax: formatCurrency(addTax(cost, tax)),
		tax,
		prices: priceLists.map(priceList => ({
			id: priceList.id,
			value: formatCurrency(priceList.value),
			valueWithTax: formatCurrency(addTax(priceList.value, tax)),
		})),
	});

	return (
		<pricesContext.Provider value={{ state, dispatch }}>
			<div className="flex flex-col gap-4 pb-4 border-b border-gray-200 mb-4">
				<TaxField />
				<PriceFields
					valueProps={{ name: 'cost', label: 'Costo', srName: 'Costo' }}
					valueWithTaxProps={{
						name: 'costWithTax',
						label: 'Costo (mas impuestos)',
						srName: 'Costo (mas impuestos)',
					}}
				/>
			</div>

			<ul className="flex flex-col gap-4">
				{priceLists.map((priceList, index) => (
					<li
						key={priceList.id}
						className={cn(
							'pb-4 border-b border-gray-200',
							'last-of-type:pb-0 last-of-type:border-none',
						)}
					>
						<p className="mb-2 font-bold text-sm">
							{index + 1}. {priceList.name}
						</p>

						<PriceFields
							id={priceList.id}
							valueProps={{
								name: `price-${priceList.id}`,
								label: 'Precio',
								srName: `Precio: ${priceList.name}`,
							}}
							valueWithTaxProps={{
								name: `tax-${priceList.id}`,
								label: `Precio (mas impuestos)`,
								srName: `Precio (mas impuestos): ${priceList.name}`,
							}}
						/>

						<TwoColumnsDiv className="mt-4">
							<ProfitField
								costWithTax={state.costWithTax}
								valueWithTax={String(state.prices[index]?.valueWithTax)}
							/>
							<div></div>
						</TwoColumnsDiv>
					</li>
				))}
			</ul>
		</pricesContext.Provider>
	);
}

function TaxField() {
	const { state, dispatch } = usePricesContext();

	return (
		<div>
			<Label htmlFor="tax">Impuesto (%)</Label>
			<Select
				name="tax"
				id="tax"
				options={[
					{ label: 'No aplica', value: 0 },
					{ label: 'IVA 19%', value: 19 },
				]}
				value={state.tax}
				onChange={e => {
					dispatch({ type: 'SET_TAX', payload: parseInt(e.target.value) });
				}}
			/>
		</div>
	);
}

function PriceFields({
	id,
	valueProps,
	valueWithTaxProps,
}: {
	id?: number;
	valueProps: { name: string; label: string; srName: string };
	valueWithTaxProps: { name: string; label: string; srName: string };
}) {
	const inputId = React.useId();
	const { state, dispatch } = usePricesContext();
	const { cost, costWithTax, prices } = state;

	const price = prices.find(p => p.id === id);
	const value = id ? price?.value : cost;
	const valueWithTax = id ? price?.valueWithTax : costWithTax;

	const [priceSwitch, setPriceSwitch] = React.useState(false);
	const [priceWithTaxSwitch, setPriceWithTaxSwitch] = React.useState(false);

	return (
		<TwoColumnsDiv className="items-end">
			<div>
				<Label htmlFor={`cost-${inputId}`}>{valueProps.label}</Label>

				<CurrencyInput
					id={`cost-${inputId}`}
					aria-label={valueProps.srName}
					name={valueProps.name}
					value={value}
					onValueChange={value => {
						if (id) {
							dispatch({ type: 'SET_PRICE_VALUE', payload: { id, value } });
						} else {
							dispatch({ type: 'SET_COST', payload: value });
						}

						setPriceWithTaxSwitch(!priceWithTaxSwitch);
					}}
					onFocus={e => e.currentTarget.select()}
					key={String(priceSwitch)}
				/>
			</div>
			<div>
				<Label htmlFor={`cost-with-tax-${inputId}`}>
					{valueWithTaxProps.label}
				</Label>
				<CurrencyInput
					aria-label={valueWithTaxProps.srName}
					id={`cost-with-tax-${inputId}`}
					name={valueWithTaxProps.name}
					value={valueWithTax}
					onValueChange={value => {
						if (id) {
							dispatch({
								type: 'SET_PRICE_WITH_TAX_VALUE',
								payload: { id, value },
							});
						} else {
							dispatch({ type: 'SET_COST_WITH_TAX', payload: value });
						}

						setPriceSwitch(!priceSwitch);
					}}
					onFocus={e => e.currentTarget.select()}
					key={String(priceWithTaxSwitch)}
				/>
			</div>
		</TwoColumnsDiv>
	);
}

function ProfitField({
	costWithTax,
	valueWithTax,
}: {
	costWithTax: string;
	valueWithTax: string;
}) {
	const cost = toNumber(costWithTax);
	const value = toNumber(valueWithTax);

	const profitInPercentage = React.useMemo(() => {
		const profit = value - cost;
		const percentage = cost === 0 ? 0 : (profit / cost) * 100;
		return isNaN(percentage) ? 0 : roundNumber(percentage);
	}, [cost, value]);

	return (
		<div className="flex-1">
			<p className="font-medium text-sm mb-1">Rentabilidad</p>
			<p className={cn(getInputClasses(), 'items-center')}>
				%{profitInPercentage}
			</p>
		</div>
	);
}

const pricesContext = React.createContext<ContextType | undefined>(undefined);
function usePricesContext() {
	const context = React.useContext(pricesContext);
	if (!context) {
		throw new Error('usePricesContext must be used within a PricesProvider');
	}
	return context;
}

type CurrencyInputValue = string | number;
type ActionType =
	| { type: 'SET_TAX'; payload: number }
	| { type: 'SET_COST'; payload: CurrencyInputValue }
	| { type: 'SET_COST_WITH_TAX'; payload: CurrencyInputValue }
	| {
			type: 'SET_PRICE_VALUE';
			payload: { id: number; value: CurrencyInputValue };
	  }
	| {
			type: 'SET_PRICE_WITH_TAX_VALUE';
			payload: { id: number; value: CurrencyInputValue };
	  };

function reducer(state: StateType, action: ActionType): StateType {
	switch (action.type) {
		case 'SET_TAX': {
			const { valueWithTax: costWithTax } = onChangeValues('base', {
				tax: action.payload,
				value: state.cost,
				valueWithTax: state.costWithTax,
			});

			return { ...state, tax: action.payload, costWithTax };
		}
		case 'SET_COST': {
			const { value: cost, valueWithTax: costWithTax } = onChangeValues(
				'base',
				{
					tax: state.tax,
					value: action.payload,
					valueWithTax: state.costWithTax,
				},
			);

			return { ...state, cost, costWithTax };
		}
		case 'SET_COST_WITH_TAX': {
			const { value: cost, valueWithTax: costWithTax } = onChangeValues(
				'withTax',
				{
					tax: state.tax,
					value: state.cost,
					valueWithTax: action.payload,
				},
			);

			return { ...state, cost, costWithTax };
		}
		case 'SET_PRICE_VALUE': {
			const price = state.prices.find(p => p.id === action.payload.id);
			invariant(price, 'Price not found');
			const { value, valueWithTax } = onChangeValues('base', {
				tax: state.tax,
				value: action.payload.value,
				valueWithTax: price.valueWithTax,
			});
			price.value = value;
			price.valueWithTax = valueWithTax;

			return {
				...state,
				prices: state.prices.map(p => (p.id === action.payload.id ? price : p)),
			};
		}
		case 'SET_PRICE_WITH_TAX_VALUE': {
			const price = state.prices.find(p => p.id === action.payload.id);
			invariant(price, 'Price not found');

			const { value, valueWithTax } = onChangeValues('withTax', {
				tax: state.tax,
				value: price.value,
				valueWithTax: action.payload.value,
			});
			price.value = value;
			price.valueWithTax = valueWithTax;

			return {
				...state,
				prices: state.prices.map(p => (p.id === action.payload.id ? price : p)),
			};
		}
		default:
			return state;
	}
}

function onChangeValues(
	action: 'base' | 'withTax',
	config: {
		tax: number;
		value: CurrencyInputValue;
		valueWithTax: CurrencyInputValue;
	},
) {
	const { tax, value, valueWithTax } = config;

	switch (action) {
		case 'base': {
			const costValue = toNumber(value);
			const costWithTax = addTax(costValue, tax);

			return {
				value: String(value),
				valueWithTax: formatCurrency(costWithTax),
			};
		}
		case 'withTax': {
			const costWithTaxValue = toNumber(valueWithTax);
			const cost = removePercentage(costWithTaxValue, tax);

			return {
				value: formatCurrency(cost),
				valueWithTax: String(valueWithTax),
			};
		}
		default:
			throw new Error('Invalid action');
	}
}
