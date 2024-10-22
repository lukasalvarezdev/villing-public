import * as React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { cn, useOnClickOutside } from '~/utils/misc';
import { useFiltersContext } from './filters';

type SelectItemType = { id: number | string; name: string; icon?: string };
type MultiSelectProps = {
	name: string;
	items: Array<SelectItemType>;
	label: string;
	onSearchChange?: (search: string) => void;
	unique?: boolean;
};

export function MultiSelect(props: MultiSelectProps) {
	const { items, label, name, unique } = props;

	const contRef = React.useRef<HTMLDivElement>(null);
	const { updateStateItem, paramsState } = useFiltersContext();
	const state = paramsState[name] || [];
	const [{ isOpen, selectedItems }, dispatch] = React.useReducer(
		getMultiSelectReducer(state => {
			updateStateItem(
				name,
				state.selectedItems.map(item => item.id.toString()),
			);
		}),
		{
			...initialState,
			selectedItems: state
				.map(id => items.find(i => String(i.id) === id)!)
				.filter(Boolean),
		},
	);
	useOnClickOutside(contRef, () => dispatch({ type: 'close' }));
	useHotkeys('esc', () => dispatch({ type: 'close' }));

	function isIncluded(id: number | string) {
		return selectedItems.some(item => item.id === id);
	}

	return (
		<div className="relative overflow-x-auto" ref={contRef}>
			<button
				className={cn(
					'border border-gray-200 bg-white hover:bg-gray-50 border-dashed shadow-sm',
					'flex items-center gap-2 px-3 h-9 rounded-md',
					'text-sm ',
				)}
				type="button"
				onClick={() => dispatch({ type: isOpen ? 'close' : 'open' })}
			>
				<div className="flex gap-2 items-center">
					<i className="ri-add-circle-line text-base"></i>
					<p className="font-medium text-xs">{label}</p>
				</div>

				{selectedItems.length ? (
					<div className="flex gap-1 border-l border-gray-200 pl-2">
						{selectedItems.map(p => (
							<p
								key={p.id}
								className="text-xs px-2 text-gray-600 bg-gray-100 rounded-sm whitespace-nowrap max-w-[80px] overflow-hidden overflow-ellipsis"
							>
								{p.name}
							</p>
						))}
					</div>
				) : null}
			</button>

			{isOpen ? (
				<div
					className={cn(
						'fixed mt-1 bg-white shadow-md rounded-md z-10 border border-gray-200',
						'w-full min-w-fit max-w-max',
					)}
				>
					<ul className="p-1 max-h-52 overflow-y-auto">
						{items.map(i => (
							<li key={i.id}>
								<button
									className={cn(
										'p-1 px-2 hover:bg-gray-100 rounded-md flex gap-2 items-center text-sm',
										'text-gray-600 w-full whitespace-nowrap overflow-hidden overflow-ellipsis',
										'max-w-[200px]',
									)}
									onClick={() => {
										dispatch({
											type: isIncluded(i.id)
												? 'remove'
												: unique
												? 'selectUnique'
												: 'add',
											payload: i,
										});
									}}
									type="button"
								>
									<span
										className={cn(
											'w-4 h-4 flex items-center justify-center rounded-sm border shrink-0',
											isIncluded(i.id)
												? 'bg-gray-900 text-white border-gray-900'
												: 'border-gray-300',
										)}
									>
										{isIncluded(i.id) ? (
											<i className="ri-check-line text-xs"></i>
										) : null}
									</span>
									{i.icon ? <i className={i.icon}></i> : null}
									{i.name}
								</button>
							</li>
						))}
					</ul>
				</div>
			) : null}
		</div>
	);
}

type State = { isOpen: boolean; selectedItems: Array<SelectItemType> };
type Action =
	| { type: 'open' }
	| { type: 'close' }
	| { type: 'select' }
	| { type: 'add'; payload: SelectItemType }
	| { type: 'remove'; payload: SelectItemType }
	| { type: 'selectUnique'; payload: SelectItemType };

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case 'open':
			return { ...state, isOpen: true };
		case 'close':
			return { ...state, isOpen: false };
		case 'select':
			return { ...state, isOpen: false };
		case 'add':
			return {
				...state,
				selectedItems: [...state.selectedItems, action.payload],
			};
		case 'remove':
			return {
				...state,
				selectedItems: state.selectedItems.filter(
					item => item.id !== action.payload.id,
				),
			};
		case 'selectUnique':
			return {
				...state,
				selectedItems: [action.payload],
			};
		default:
			return state;
	}
}

const initialState = { isOpen: false, selectedItems: [] } satisfies State;

function getMultiSelectReducer(callback: (state: State) => void) {
	return (state: State, action: Action) => {
		const newState = reducer(state, action);
		if (!arraysEqual(newState.selectedItems, state.selectedItems)) {
			callback(newState);
		}
		return newState;
	};
}

function arraysEqual<T>(a: Array<T>, b: Array<T>) {
	if (a === b) return true;
	if (a == null || b == null) return false;
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; ++i) {
		if (a[i] !== b[i]) return false;
	}
	return true;
}
