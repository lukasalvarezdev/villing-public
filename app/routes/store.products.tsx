import {
	type MetaFunction,
	type LoaderFunctionArgs,
	json,
	type ActionFunctionArgs,
} from '@remix-run/node';
import { useLoaderData, useSubmit } from '@remix-run/react';
import { rankItem } from '@tanstack/match-sorter-utils';
import {
	type SortingState,
	useReactTable,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	flexRender,
	type Table as TableType,
	type SortDirection,
	type ColumnDef,
	type FilterFn,
} from '@tanstack/react-table';
import * as React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Label } from 'recharts';
import { ShorcutIcon } from '~/assets/jsx-icons';
import { RouteErrorBoundary } from '~/components/error-boundary';
import { Button, Input, LinkButton, Select } from '~/components/form-utils';
import {
	Table,
	RawTableHead,
	TableHeadRow,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
	Box,
	ButtonIcon,
} from '~/components/ui-library';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { cn, formatCurrency, parseFormData } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{
		title: 'Productos de catálogo - Villing',
		description: 'Productos de catálogo',
	},
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const store = await db.store.findFirstOrThrow({
		where: { organizationId: orgId },
		select: { priceListId: true, subOrganizationId: true },
	});

	const products = await db.product.findMany({
		where: { Store: { organizationId: orgId } },
		orderBy: { createdAt: 'desc' },
		include: {
			prices: {
				where: { priceListId: store.priceListId || 0 },
				select: { value: true },
			},
			stocks: {
				where: { subOrgId: store.subOrganizationId || 0 },
				select: { value: true },
			},
		},
	});

	return json({
		products: products.map(p => ({
			id: p.id,
			internalId: p.internalId,
			name: p.name,
			price: `$${formatCurrency(p.prices[0]?.value || 0)}`,
			stock: p.stocks[0]?.value || 0,
		})),
	});
}

export async function action({ request }: ActionFunctionArgs) {
	try {
		const form = await parseFormData(request);
		const { db, orgId } = await getOrgDbClient(request);

		const products = form.getAll('ids');

		await db.store.update({
			where: { organizationId: orgId },
			data: {
				products: { disconnect: products.map(id => ({ id: Number(id) })) },
			},
		});

		return json({ ok: true });
	} catch (error) {
		await logError({ error, request });
		return json({ error: 'Hubo un error' }, 500);
	}
}

export default function Component() {
	const { products } = useLoaderData<typeof loader>();

	return (
		<div>
			<div className="pb-4 border-b border-gray-200 mb-4">
				<h3>Productos</h3>
				<p className="text-gray-500">
					Administra los productos que se van a mostar en la tienda.
				</p>
			</div>

			<ReactTable defaultData={products}>
				<LinkButton to="add" variant="black" prefetch="intent">
					<i className="ri-add-line mr-2"></i>
					Agregar productos
				</LinkButton>
			</ReactTable>
		</div>
	);
}

type ReactTableProps = {
	defaultData: Array<Record<string, string | number>>;
	children: React.ReactNode;
};
export function ReactTable({ defaultData, children }: ReactTableProps) {
	const [data, setData] = React.useState(defaultData);
	const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();
	const columns = useProductsTableColumns();

	const [rowSelection, setRowSelection] = React.useState<
		Record<string, boolean>
	>({});
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [globalFilter, setGlobalFilter] = React.useState('');
	const submit = useSubmit();
	const table = useReactTable({
		data,
		columns,
		autoResetPageIndex,
		globalFilterFn: fuzzyFilter,
		state: { sorting, globalFilter, rowSelection },
		filterFns: { fuzzy: fuzzyFilter },
		enableRowSelection: true,
		onRowSelectionChange: setRowSelection,
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		meta: {
			updateData: (rowIndex, columnId, value) => {
				// Skip page index reset until after next rerender
				skipAutoResetPageIndex();
			},
		},
	});
	const { getHeaderGroups, getRowModel } = table;

	return (
		<Box className="p-0">
			<div className="p-4 flex gap-4">
				<div className="flex-1">
					<DebouncedInput
						value={globalFilter ?? ''}
						onChange={value => setGlobalFilter(String(value))}
						className="p-2 font-lg shadow border border-block"
						placeholder="Search all columns..."
					/>
				</div>
				{children}
			</div>

			{Object.keys(rowSelection).length ? (
				<div className="mx-4 mb-4">
					<Button
						variant="destructive"
						type="button"
						onClick={() => {
							const filtered = data.filter((_, index) => !rowSelection[index]);
							const deletedIds = data
								.filter((_, index) => rowSelection[index])
								.map(p => p.id as number);

							const formData = new FormData();
							for (const id of deletedIds) {
								formData.append('ids', id.toString());
							}

							submit(formData, { method: 'POST' });
							setData(filtered);
							setRowSelection({});
						}}
					>
						<i className="ri-delete-bin-line mr-2"></i>
						Eliminar {Object.keys(rowSelection).length} producto
						{Object.keys(rowSelection).length > 1 && 's'}
					</Button>
				</div>
			) : null}

			<Table className="border-y border-gray-200 text-sm">
				<RawTableHead>
					{getHeaderGroups().map(headerGroup => (
						<TableHeadRow key={headerGroup.id}>
							{headerGroup.headers.map(header => (
								<TableHeadCell key={header.id} colSpan={header.colSpan}>
									{header.isPlaceholder ? null : (
										<div
											className={cn(
												'whitespace-nowrap flex gap-2',
												header.column.getCanSort() &&
													'cursor-pointer select-none',
											)}
											onClick={header.column.getToggleSortingHandler()}
										>
											{flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}

											<SortingIcon
												sortDirection={
													header.column.getIsSorted() as SortDirection | false
												}
											/>
										</div>
									)}
								</TableHeadCell>
							))}
						</TableHeadRow>
					))}
				</RawTableHead>

				<TableBody>
					{getRowModel().rows.map(row => (
						<TableRow key={row.id}>
							{row.getVisibleCells().map(cell => (
								<TableCell key={cell.id} className={cn()}>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>

			<div className="p-4 flex justify-end mt-4">
				<TablePagination table={table} />
			</div>
		</Box>
	);
}

function useProductsTableColumns() {
	return React.useMemo<Array<ColumnDef<any>>>(() => {
		return [
			{
				id: 'select',
				header: ({ table }) => (
					<IndeterminateCheckbox
						{...{
							checked: table.getIsAllRowsSelected(),
							indeterminate: table.getIsSomeRowsSelected(),
							onChange: table.getToggleAllRowsSelectedHandler(),
							className: 'ml-1',
						}}
					/>
				),
				cell: ({ row }) => (
					<div className="px-1">
						<IndeterminateCheckbox
							{...{
								checked: row.getIsSelected(),
								disabled: !row.getCanSelect(),
								indeterminate: row.getIsSomeSelected(),
								onChange: row.getToggleSelectedHandler(),
							}}
						/>
					</div>
				),
			},
			...staticColumns,
		];
	}, []);
}

const staticColumns = [
	{ accessorKey: 'internalId', header: () => 'No.' },
	{ accessorKey: 'name', header: () => 'Nombre' },
	{ accessorKey: 'price', header: () => 'Precio' },
	{ accessorKey: 'stock', header: () => 'Stock' },
];

function useSkipper() {
	const shouldSkipRef = React.useRef(true);
	const shouldSkip = shouldSkipRef.current;

	// Wrap a function with this to skip a pagination reset temporarily
	const skip = React.useCallback(() => {
		shouldSkipRef.current = false;
	}, []);

	React.useEffect(() => {
		shouldSkipRef.current = true;
	});

	return [shouldSkip, skip] as const;
}

function SortingIcon({
	sortDirection,
}: {
	sortDirection: SortDirection | false;
}) {
	if (sortDirection === 'asc') return <i className="ri-arrow-up-s-line"></i>;
	if (sortDirection === 'desc') return <i className="ri-arrow-down-s-line"></i>;
	return null;
}

function IndeterminateCheckbox({
	indeterminate,
	className = '',
	...rest
}: { indeterminate?: boolean } & React.HTMLProps<HTMLInputElement>) {
	const ref = React.useRef<HTMLInputElement>(null!);

	React.useEffect(() => {
		if (typeof indeterminate === 'boolean') {
			ref.current.indeterminate = !rest.checked && indeterminate;
		}
	}, [ref, indeterminate, rest.checked]);

	return (
		<input
			type="checkbox"
			ref={ref}
			className={className + ' cursor-pointer'}
			{...rest}
		/>
	);
}

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
	// Rank the item
	const itemRank = rankItem(row.getValue(columnId), value);

	// Store the itemRank info
	addMeta({ itemRank });

	// Return if the item should be filtered in/out
	return itemRank.passed;
};

function DebouncedInput({
	value: initialValue,
	onChange,
	debounce = 500,
	...props
}: {
	value: string | number;
	onChange: (value: string | number) => void;
	debounce?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
	const [value, setValue] = React.useState(initialValue);
	const inputRef = React.useRef<HTMLInputElement>(null);
	useHotkeys('/', e => {
		e.preventDefault();
		inputRef.current?.focus();
	});

	React.useEffect(() => {
		setValue(initialValue);
	}, [initialValue]);

	React.useEffect(() => {
		const timeout = setTimeout(() => {
			onChange(value);
		}, debounce);

		return () => clearTimeout(timeout);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [value]);

	return (
		<div className="w-full">
			<Label>Buscar producto</Label>

			<div className="relative w-full">
				<Input
					{...props}
					placeholder="Ingresa el nombre del producto"
					className="w-full"
					value={value}
					onChange={e => setValue(e.target.value)}
					ref={inputRef}
				/>
				<ShorcutIcon>/</ShorcutIcon>
			</div>
		</div>
	);
}

function TablePagination({ table }: { table: TableType<any> }) {
	return (
		<div className="flex flex-col md:flex-row gap-4">
			<div className="flex gap-2">
				<PaginationButton
					onClick={() => table.setPageIndex(0)}
					disabled={!table.getCanPreviousPage()}
				>
					<span className="sr-only">Ir a la primera página</span>
					<i className="ri-arrow-left-double-fill"></i>
				</PaginationButton>

				<PaginationButton
					onClick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
				>
					<span className="sr-only">Ir a la página anterior</span>
					<i className="ri-arrow-left-s-line"></i>
				</PaginationButton>

				<PaginationButton
					onClick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
				>
					<span className="sr-only">Ir a la página siguiente</span>
					<i className="ri-arrow-right-s-line"></i>
				</PaginationButton>

				<PaginationButton
					onClick={() => table.setPageIndex(table.getPageCount() - 1)}
					disabled={!table.getCanNextPage()}
				>
					<span className="sr-only">Ir a la última página</span>
					<i className="ri-arrow-right-double-fill"></i>
				</PaginationButton>
			</div>

			<div className="flex items-center gap-4">
				<div className="flex items-center gap-1 text-gray-700 whitespace-nowrap text-sm">
					<p>Página</p>

					<strong className="font-medium">
						{table.getState().pagination.pageIndex + 1} de{' '}
						{table.getPageCount()}
					</strong>
				</div>

				<Select
					name="pageSize"
					id="pageSize"
					className="w-32 text-sm"
					value={table.getState().pagination.pageSize}
					onChange={e => table.setPageSize(Number(e.target.value))}
					options={[10, 20, 30, 40, 50].map(pageSize => ({
						value: `${pageSize}`,
						label: `Mostrar ${pageSize}`,
					}))}
				/>
			</div>
		</div>
	);
}

type PaginationButtonProps = {
	children: React.ReactNode;
	onClick: () => void;
	disabled?: boolean;
};
function PaginationButton({
	children,
	onClick,
	disabled,
}: PaginationButtonProps) {
	return (
		<ButtonIcon
			className="cursor-pointer"
			onClick={onClick}
			disabled={disabled}
			type="button"
		>
			{children}
		</ButtonIcon>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con los pedidos. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}
