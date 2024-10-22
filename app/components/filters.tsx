import { useNavigation, useSearchParams } from '@remix-run/react';
import * as React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useDebouncedCallback } from 'use-debounce';
import { AbsoluteSlashIcon } from '~/assets/jsx-icons';
import { useDefaultDateRange } from '~/root';
import { cn, deepCopy, getColombiaDate, safeNewDate } from '~/utils/misc';
import { ClientOnly } from './client-only';
import { Input, type InputProps } from './form-utils';
import { MultiSelect } from './multi-select';
import { RangePicker } from './range-picker';

type ParamsState = Record<string, Array<string>>;
type FiltersContextState = {
	paramsState: ParamsState;
	updateStateItem: (key: string, values: Array<string>) => void;
};

const filtersContext = React.createContext<FiltersContextState | null>(null);

export function useFiltersContext() {
	const context = React.useContext(filtersContext);
	if (!context)
		throw new Error('useFiltersContext must be used within a Provider');
	return context;
}

export function FiltersProvider({ children }: { children: React.ReactNode }) {
	const [searchParams, setSearchParams] = useSearchParams();
	const [paramsState, setState] = React.useState<ParamsState>(
		parseSearchParamsToState(searchParams),
	);
	const submit = useDebouncedCallback((state: ParamsState) => {
		setSearchParams(searchParams => {
			for (const [key, items] of Object.entries(state)) {
				searchParams.delete(key);
				for (const item of items) searchParams.append(key, item);
			}
			return searchParams;
		});
	}, 300);

	const updateStateItem = React.useCallback(
		(key: string, values: Array<string>) => {
			setState(state => {
				const newState = deepCopy(state);
				newState[key] = values;

				submit(newState);
				return newState;
			});
		},
		[submit],
	);

	const state = React.useMemo<FiltersContextState>(() => {
		return {
			paramsState,
			updateStateItem,
		};
	}, [updateStateItem, paramsState]);

	return (
		<filtersContext.Provider value={state}>{children}</filtersContext.Provider>
	);
}

function parseSearchParamsToState(searchParams: URLSearchParams): ParamsState {
	const state: ParamsState = {};
	for (const [key, value] of searchParams.entries()) {
		if (!state[key]) state[key] = [];
		state[key]?.push(value);
	}
	return state;
}

export function SearchInput(props: InputProps) {
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [searchParams, setSearchParams] = useSearchParams();
	const navigation = useNavigation();
	const debouncedSearchParams = useDebouncedCallback((search: string) => {
		setSearchParams(params => {
			params.set('search', search);
			return params;
		});
	}, 300);
	useHotkeys('/', e => {
		e.preventDefault();
		inputRef.current?.focus();
	});
	useHotkeys(
		'esc',
		() => {
			inputRef.current?.blur();
		},
		{ enableOnFormTags: true },
	);
	const search = searchParams.get(props.name || 'search') || '';
	const nextNavigationSearchParams = new URLSearchParams(
		navigation.location?.search,
	);
	const nextSearch =
		nextNavigationSearchParams.get(props.name || 'search') || '';
	const inputValue = inputRef.current?.value || '';
	const isSearching = nextSearch === inputValue && nextSearch.length > 0;

	return (
		<div className="relative w-full">
			<Input
				ref={inputRef}
				defaultValue={search}
				{...props}
				onChange={e => {
					debouncedSearchParams(e.target.value);
					props.onChange?.(e);
				}}
			/>
			<AbsoluteSlashIcon />

			{isSearching ? (
				<div
					className={cn(
						'absolute top-0 left-0 flex h-full w-full items-center justify-end',
						'pr-3 md:pr-12 text-gray-500',
					)}
					role="spinbutton"
				>
					<i className="ri-loader-line animate-spin"></i>
				</div>
			) : null}
		</div>
	);
}

export function DateRangeFilter() {
	const { start, end } = useDefaultDateRange();
	const [, setSearchParams] = useSearchParams();
	const startDate = start ? getColombiaDate(safeNewDate(start)) : undefined;
	const endDate = end ? getColombiaDate(safeNewDate(end)) : undefined;

	const range =
		startDate && endDate ? { from: startDate, to: endDate } : undefined;

	return (
		<ClientOnly>
			{() => (
				<RangePicker
					name="createdAt"
					defaultDate={range}
					onSave={range => {
						if (!range.from || !range.to) return;
						setSearchParams(params => {
							if (!range.from || !range.to) return params;

							const start = range.from.toISOString().split('T')[0];
							const end = range.to.toISOString().split('T')[0];

							start && params.set('start', start);
							end && params.set('end', end);
							return params;
						});
					}}
				/>
			)}
		</ClientOnly>
	);
}

export function InvoiceFilters({ children }: { children: React.ReactNode }) {
	return (
		<FiltersProvider>
			<div className="flex gap-4 flex-wrap">
				<MultiSelect
					label="Método de pago"
					name="payment_method"
					items={[
						{ id: 'cash', name: 'Efectivo' },
						{ id: 'card', name: 'Datáfono' },
						{ id: 'transfer', name: 'Transferencia' },
						{ id: 'loan', name: 'Entidad crediticia' },
					]}
					unique
				/>
				<MultiSelect
					label="Plazo de pago"
					name="invoice_type"
					items={[
						{ id: 'cash', name: 'De contado' },
						{ id: 'loan', name: 'A crédito' },
					]}
					unique
				/>
				{children}
			</div>
		</FiltersProvider>
	);
}
