import * as React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Input, type InputProps } from '~/components/form-utils';
import { type DivProps } from '~/components/ui-library';
import { useOnClickOutside, cn } from '~/utils/misc';

type PopoverContext = {
	search: string;
	setSearch: (search: string) => void;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	activeIndex: number | null;
	setActiveIndex: React.Dispatch<React.SetStateAction<number | null>>;
	listId: string;
	listLength: number;
};
const popoverContext = React.createContext<PopoverContext | undefined>(
	undefined,
);
function usePopoverContext() {
	const context = React.useContext(popoverContext);
	if (!context) {
		throw new Error('Popover compound components cannot be rendered outside');
	}
	return context;
}

export function Popover({
	open,
	onOpenChange,
	children,
	search: controlledSearch,
	setSearch: controlledSetSearch,
	listLength,
}: {
	children: React.ReactNode;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	search?: string;
	setSearch?: (search: string) => void;
	listLength: number;
}) {
	const [_search, _setSearch] = React.useState('');
	const [activeIndex, setActiveIndex] = React.useState<number | null>(null);
	const containerRef = React.useRef<HTMLDivElement>(null);
	const listId = React.useId();
	const search = controlledSearch ?? _search;
	const setSearch = controlledSetSearch ?? _setSearch;

	useOnClickOutside(containerRef, () => {
		onOpenChange(false);
		setActiveIndex(null);
		setSearch('');
	});

	if (controlledSearch !== undefined && !controlledSetSearch) {
		console.error('Popover: setSearch is required when search is controlled');
	}

	return (
		<popoverContext.Provider
			value={{
				search,
				activeIndex,
				onOpenChange,
				open,
				setActiveIndex,
				setSearch,
				listId,
				listLength,
			}}
		>
			<div className="relative" ref={containerRef}>
				{children}
			</div>
		</popoverContext.Provider>
	);
}

export function PopoverTriggerInput({
	disableShortcuts,
	...props
}: InputProps & {
	disableShortcuts?: boolean;
}) {
	const inputRef = React.useRef<HTMLInputElement>(null);
	const {
		search,
		setSearch,
		onOpenChange,
		setActiveIndex,
		listId,
		listLength,
	} = usePopoverContext();
	useHotkeys(
		'/',
		e => {
			if (disableShortcuts) return;

			e.preventDefault();
			onOpenChange(true);
			setActiveIndex(null);
			inputRef.current?.focus();
		},
		{ enableOnFormTags: true },
		[onOpenChange, disableShortcuts],
	);

	return (
		<Input
			{...props}
			value={search}
			ref={inputRef}
			onChange={e => setSearch(e.target.value)}
			onClick={() => onOpenChange(true)}
			onFocus={e => {
				onOpenChange(true);
				e.target.select();
			}}
			className={cn('appearance-none', props.className)}
			style={{ appearance: 'none' }}
			name="search"
			autoComplete="off"
			autoCorrect="off"
			type="search"
			onKeyDown={e => {
				switch (e.key) {
					case 'ArrowDown': {
						e.preventDefault();
						setActiveIndex(0);
						const list = document.getElementById(listId);
						const firstButton = list?.getElementsByTagName('button')[0];
						if (firstButton instanceof HTMLButtonElement) {
							firstButton?.focus();
						}
						break;
					}
					case 'ArrowUp': {
						e.preventDefault();
						setActiveIndex(listLength - 1);
						const list = document.getElementById(listId);
						const lastButton =
							list?.getElementsByTagName('button')[listLength - 1];

						if (lastButton instanceof HTMLButtonElement) {
							lastButton?.focus();
						}
						break;
					}
					case 'Escape': {
						onOpenChange(false);
						setActiveIndex(null);
						setSearch('');
						inputRef.current?.blur();
						break;
					}
					case 'Enter': {
						e.preventDefault();
						break;
					}
					default:
						break;
				}
			}}
		/>
	);
}

export function PopoverContent(props: DivProps) {
	const { open } = usePopoverContext();

	if (!open) return null;

	return (
		<div
			{...props}
			className={cn(
				'absolute w-full mt-2 bg-white shadow-sm rounded border border-gray-100',
				props.className,
			)}
		>
			{props.children}
		</div>
	);
}

export function PopoverList({
	children,
	isLoading,
	className,
}: {
	children: React.ReactNode;
	isLoading?: boolean;
	className?: string;
}) {
	const { listId, listLength } = usePopoverContext();

	return (
		<ul
			id={listId}
			className={cn(
				'list-none p-1 max-h-[200px] overflow-y-auto custom-scrollbar',
				className,
			)}
		>
			{isLoading ? (
				<li className={cn('px-4 py-2 w-full text-left text-sm')}>
					Cargando...
				</li>
			) : listLength === 0 ? (
				<li className={cn('px-4 py-2 w-full text-left text-sm')}>
					No hay resultados
				</li>
			) : (
				children
			)}
		</ul>
	);
}

export function PopoverItem<T>({
	index,
	children,
	onSelect,
	item,
	ariaLabel,
}: {
	index: number;
	children: React.ReactNode;
	item: T;
	onSelect?: (item: T) => void;
	ariaLabel?: string;
}) {
	const itemRef = React.useRef<HTMLButtonElement>(null);
	const { setActiveIndex, activeIndex, setSearch, onOpenChange, listLength } =
		usePopoverContext();

	React.useEffect(() => {
		if (activeIndex === index) itemRef.current?.focus();
	}, [activeIndex, index]);

	return (
		<li>
			<button
				ref={itemRef}
				className={cn(
					'px-4 py-2 w-full text-left text-sm rounded',
					'hover:bg-gray-100 focus:bg-gray-100',
					'flex justify-between items-center gap-4',
				)}
				type="button"
				onClick={() => {
					onSelect?.(item);
					setActiveIndex(null);
					setSearch('');
					onOpenChange(false);
				}}
				onKeyDown={e => {
					switch (e.key) {
						case 'ArrowDown': {
							setActiveIndex(activeIndex => {
								const isLast = activeIndex === listLength - 1;
								if (isLast) return 0;
								return (activeIndex || 0) + 1;
							});
							break;
						}
						case 'ArrowUp': {
							setActiveIndex(activeIndex => {
								const isFirst = activeIndex === 0;
								if (isFirst) return listLength - 1;
								return (activeIndex || 0) - 1;
							});
							break;
						}
						default:
							break;
					}
				}}
				aria-label={ariaLabel}
			>
				{children}
			</button>
		</li>
	);
}
