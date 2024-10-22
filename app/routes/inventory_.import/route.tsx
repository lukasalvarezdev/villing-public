import {
	redirect,
	type DataFunctionArgs,
	json,
	type ActionFunctionArgs,
} from '@remix-run/node';
import {
	Form,
	useActionData,
	useFetcher,
	useFetchers,
	useLoaderData,
} from '@remix-run/react';
import { rankItem } from '@tanstack/match-sorter-utils';
import {
	flexRender,
	useReactTable,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type ColumnDef,
	type Table as TableType,
	type SortingState,
	type SortDirection,
	type FilterFn,
	type RowData,
} from '@tanstack/react-table';
import * as React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { v4 as uuid } from 'uuid';
import * as z from 'zod';
import { ShorcutIcon } from '~/assets/jsx-icons';
import {
	Button,
	CurrencyInput,
	Input,
	IntentButton,
	Label,
	Select,
	Toast,
} from '~/components/form-utils';

import {
	Box,
	PageWrapper,
	RawTableHead,
	Table,
	TableBody,
	TableHeadCell,
	TableHeadRow,
	TableRow,
} from '~/components/ui-library';
import { removePercentage } from '~/modules/invoice/invoice-math';
import { getOrgDbClient, logError } from '~/utils/db.server';
import {
	cn,
	compareStrings,
	formatCurrency,
	isNumber,
	parseFormData,
	toNumber,
	invariant,
} from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';

declare module '@tanstack/react-table' {
	interface TableMeta<TData extends RowData> {
		updateData: (
			rowIndex: number,
			columnId: string,
			value: unknown,
			d?: TData,
		) => void;
	}
}

export async function loader({ request }: DataFunctionArgs) {
	await protectRoute(request);

	const { db, userId, orgId } = await getOrgDbClient(request);

	const {
		PriceList: priceLists,
		Category: categories,
		Brand: brands,
		SubOrganization: subOrgs,
	} = await db.organization.findUniqueOrThrow({
		where: { id: orgId },
		select: {
			PriceList: {
				where: { deletedAt: null },
				orderBy: { name: 'asc' },
				select: { id: true, name: true },
			},
			Category: { orderBy: { name: 'asc' }, select: { id: true, name: true } },
			Brand: { orderBy: { name: 'asc' }, select: { id: true, name: true } },
			SubOrganization: { where: { deletedAt: null } },
		},
	});

	try {
		const invoiceSelection = await db.invoiceSelection.findFirst({
			where: { userId },
			select: { productsImport: true },
		});

		const defaultState = z
			.array(z.record(z.union([z.string(), z.number()])))
			.parse(invoiceSelection?.productsImport);

		return json({ defaultState, priceLists, categories, brands, subOrgs });
	} catch (error) {}

	return json({ defaultState: [], priceLists, categories, brands, subOrgs });
}

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const { db, orgId, userId } = await getOrgDbClient(request);

	const { error } = await legalActions.validate(db, userId, 'update_products');
	if (error) return json({ error }, 403);

	try {
		const form = await parseFormData(request);
		const products = JSON.parse(form.get('products')!) as Array<
			Record<string, string>
		>;

		if (products.some(p => !p.name)) {
			return json({ error: 'Todos los productos deben tener un nombre' }, 400);
		}

		const length = await db.$transaction(
			async tx => {
				const transactionId = uuid();
				const [
					brandsMap,
					categoriesMap,
					productsCount,
					organization,
					invoiceSelection,
				] = await Promise.all([
					getBrandsMap(),
					getCategoriesMap(),
					getCounts(),
					getOrganization(),
					getInvoiceSelection(),
				]);
				const priceListsMap = getPriceListsMap();

				await tx.product.createMany({
					data: products.map((product, index) => ({
						transactionId,
						organizationId: orgId,
						internalId: getInternalId(index),

						name: product.name || '',
						description: product.description || '',
						reference: product.reference ? String(product.reference) : null,

						tax: toNumber(product.tax),
						price: toNumber(product.price),

						brandId: getBrandId(product.brand),
						categoryId: getCategoryId(product.category),
						barCodes: getBarCodes(product),

						expirationDate: product.expiryDate
							? new Date(product.expiryDate)
							: null,
						batch: product.lot ? String(product.lot) : null,
						invimaRegistry: product.invima ? String(product.invima) : null,
					})),
				});

				const createdProducts = await tx.product.findMany({
					where: { transactionId },
					select: {
						id: true,
						internalId: true,
						name: true,
						price: true,
						tax: true,
					},
				});

				if (createdProducts.length !== products.length) {
					throw new Error('Error al crear los productos');
				}

				// create product relationships (prices and stocks)
				await Promise.all([
					createPriceValues(),
					createStockValues(),
					updateProductsCount(),
					clearSession(),
				]);

				return createdProducts.length;

				function getInvoiceSelection() {
					return tx.invoiceSelection.findFirst({ where: { userId } });
				}

				function clearSession() {
					return tx.invoiceSelection.update({
						where: { id: invoiceSelection?.id || 0 },
						data: { productsImport: [] },
					});
				}

				function getBarCodes(product: Record<string, string>) {
					const value =
						typeof product.barCodes === 'string' ? product.barCodes : '';
					return value
						.split(',')
						.map(barCode => barCode.trim())
						.filter(Boolean);
				}

				function getOrganization() {
					return tx.organization.findFirstOrThrow({
						where: { id: orgId },
						select: { PriceList: true, SubOrganization: true },
					});
				}

				function updateProductsCount() {
					return tx.counts.update({
						where: { id: orgId },
						data: { productsCount: { increment: createdProducts.length } },
					});
				}

				function getProductPrices(product?: Record<string, string | number>) {
					if (!product) return [];

					return Object.entries(product)
						.filter(([key]) => key.includes('price:'))
						.map(([key, value]) => ({
							name: key.split('price:')[1]!,
							value: toNumber(value),
						}));
				}

				function getProductStocks(product?: Record<string, string | number>) {
					if (!product) return [];

					return Object.entries(product)
						.filter(([key]) => key.includes('stock:'))
						.map(([key, value]) => ({
							name: key.split('stock:')[1]!,
							value: toNumber(value),
						}));
				}

				function findStockValue(
					subName: string,
					product?: Record<string, string | number>,
				) {
					const stocks = getProductStocks(product);
					return stocks.find(s => compareStrings(s.name, subName))?.value || 0;
				}

				function createStockValues() {
					return tx.stockValue.createMany({
						data: createdProducts.flatMap((product, index) => {
							return organization.SubOrganization.map(sub => {
								const value = findStockValue(sub.name, products[index]);
								return {
									productId: product.id,
									subOrgId: sub.id,
									value,
									organizationId: orgId,
								};
							});
						}),
					});
				}

				function createPriceValues() {
					return tx.priceValue.createMany({
						data: createdProducts.flatMap((product, index) => {
							const prices = getProductPrices(products[index]);

							return prices.map(({ name, value }) => {
								const priceListId = getPriceListId(name);
								const valueWithoutTax = removePercentage(value, product.tax);

								invariant(
									priceListId,
									`No se encontró la lista de precios ${name}`,
								);

								return {
									productId: product.id,
									priceListId,
									value: valueWithoutTax,
									organizationId: orgId,
								};
							});
						}),
					});
				}

				function getPriceListId(priceList: string) {
					return priceListsMap.get(priceList.toLowerCase());
				}

				function getBrandId(brand?: string) {
					return brandsMap.get(brand?.toLowerCase() as string) || null;
				}

				function getCategoryId(category?: string) {
					return categoriesMap.get(category?.toLowerCase() as string) || null;
				}

				function getInternalId(index: number) {
					return productsCount + index + 1;
				}

				async function getCounts() {
					const { productsCount } = await tx.counts.findFirstOrThrow({
						where: { id: orgId },
						select: { productsCount: true },
					});

					return productsCount;
				}

				function getPriceListsMap() {
					return new Map(
						organization.PriceList.map(pl => [pl.name.toLowerCase(), pl.id]),
					);
				}

				async function getBrandsMap() {
					const items = products
						.filter(p => p.brand)
						.map(p => p.brand) as Array<string>;
					const uniqueItems = [...new Set(items)];
					const existingBrands = await tx.brand.findMany({
						where: {
							organizationId: orgId,
							name: { in: uniqueItems, mode: 'insensitive' },
						},
					});
					const nonExistingBrands = uniqueItems.filter(
						brand => !existingBrands.find(b => compareStrings(b.name, brand)),
					);

					await tx.brand.createMany({
						data: nonExistingBrands.map(brand => ({
							name: brand,
							organizationId: orgId,
						})),
					});

					const brands = await tx.brand.findMany({
						where: { organizationId: orgId },
					});

					return new Map(
						brands.map(brand => [brand.name.toLowerCase(), brand.id]),
					);
				}

				async function getCategoriesMap() {
					const items = products
						.filter(p => p.category)
						.map(p => p.category) as Array<string>;
					const uniqueItems = [...new Set(items)];
					const existingCategories = await tx.category.findMany({
						where: {
							organizationId: orgId,
							name: { in: uniqueItems, mode: 'insensitive' },
						},
					});
					const nonExistingCategories = uniqueItems.filter(
						category =>
							!existingCategories.find(b => compareStrings(b.name, category)),
					);

					await tx.category.createMany({
						data: nonExistingCategories.map(category => ({
							name: category,
							organizationId: orgId,
						})),
					});

					const categories = await tx.category.findMany({
						where: { organizationId: orgId },
					});

					return new Map(
						categories.map(category => [
							category.name.toLowerCase(),
							category.id,
						]),
					);
				}
			},
			{ timeout: 15_000 },
		);

		return redirect(`/products?length=${length}`);
	} catch (error) {
		await logError({ error, request });
		return json({ error: 'Hubo un error' }, 500);
	}
}

export default function Component() {
	const { defaultState } = useLoaderData<typeof loader>();
	const isSaving = useIsSaving();
	const error = useActionData<typeof action>()?.error;

	return (
		<PageWrapper>
			<div className="mb-4 flex gap-4">
				<div>
					<h2 className="font-bold">Importar productos masivamente</h2>
					<p className="text-gray-500">
						Presiona en cualquier celda para editar
					</p>
				</div>

				{isSaving ? (
					<p className="text-sm text-gray-500 mt-2">
						<i className="ri-loop-left-line animate-spin inline-block mr-2"></i>
						<span>Guardando...</span>
					</p>
				) : null}
			</div>

			<Toast className="mb-4" variant="error">
				{error}
			</Toast>

			<Form method="POST">
				<Box className="px-0 py-4">
					<ReactTable defaultData={defaultState}></ReactTable>

					<div className="flex mt-4 justify-end px-4">
						<IntentButton intent="import">
							<i className="mr-2 ri-file-excel-2-line"></i>
							Importar productos
						</IntentButton>
					</div>
				</Box>
			</Form>
		</PageWrapper>
	);
}

function useIsSaving() {
	const fetchers = useFetchers();
	return fetchers.some(fetcher => fetcher.formAction === '/import-session');
}

type TableContextType = { brands: Array<string>; categories: Array<string> };
const tableContext = React.createContext<TableContextType | null>(null);
function useTableContext() {
	const context = React.useContext(tableContext);
	if (!context)
		throw new Error(
			'useTableContext must be used within a TableContextProvider',
		);
	return context;
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

type ReactTableProps = {
	defaultData: Array<Record<string, string | number>>;
	children?: React.ReactNode;
};
function ReactTable({ defaultData, children }: ReactTableProps) {
	const { brands: orgBrands, categories: orgCategories } =
		useLoaderData<typeof loader>();
	const [data, setData] = React.useState(defaultData);
	const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();
	const columns = useProductsTableColumns();

	const [rowSelection, setRowSelection] = React.useState<
		Record<string, boolean>
	>({});
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const fetcher = useFetcher();
	const [globalFilter, setGlobalFilter] = React.useState('');
	const table = useReactTable({
		data,
		columns,
		defaultColumn,
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
				setData(old => {
					const newData = old.map((row, index) => {
						if (index === rowIndex) {
							return {
								...old[rowIndex]!,
								[columnId]: value as string | number,
							};
						}
						return row;
					});
					fetcher.submit(
						{ state: JSON.stringify(newData) },
						{ method: 'POST', action: '/inventory/import-session' },
					);

					return newData;
				});
			},
		},
	});
	const { getHeaderGroups, getRowModel } = table;
	const brands = React.useMemo(() => {
		return getUniqueItems(
			data.map(product => product.brand).filter(Boolean) as Array<string>,
			orgBrands.map(brand => brand.name),
		);
	}, [data, orgBrands]);

	const categories = React.useMemo(() => {
		return getUniqueItems(
			data.map(product => product.category).filter(Boolean) as Array<string>,
			orgCategories.map(category => category.name),
		);
	}, [data, orgCategories]);

	return (
		<tableContext.Provider value={{ brands, categories }}>
			<input type="hidden" name="products" value={JSON.stringify(data)} />

			<div className="flex gap-4 mb-4 px-4 items-end">
				<div className="flex-1">
					<DebouncedInput
						value={globalFilter ?? ''}
						onChange={value => setGlobalFilter(String(value))}
						className="p-2 font-lg shadow border border-block"
						placeholder="Search all columns..."
					/>
				</div>
				<div className="shrink-0">{children}</div>
			</div>

			{Object.keys(rowSelection).length ? (
				<div className="mx-4 mb-4">
					<Button
						variant="destructive"
						type="button"
						onClick={() => {
							setData(old => old.filter((_, index) => !rowSelection[index]));
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
								<TableHeadCell
									key={header.id}
									colSpan={header.colSpan}
									className="pl-4 border-x border-gray-200 border-b border-b-gray-300"
								>
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
								<th
									key={cell.id}
									className={cn(
										'min-w-[150px] border-x border-gray-200',
										'[&>*:nth-child(2)]:w-full [&>*:nth-child(2)]:min-w-[250px]',
										'first-of-type:border-none first-of-type:pl-2 first-of-type:w-[30px] first-of-type:min-w-[30px]',
									)}
								>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</th>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>

			<div className="px-4 flex flex-col md:flex-row gap-4  justify-between mt-4">
				<Button
					variant="secondary"
					className="max-w-max"
					onClick={() => setData(old => [...old, {}])}
					type="button"
				>
					<i className="ri-add-line mr-2"></i>
					Agregar producto
				</Button>
				<TablePagination table={table} />
			</div>
		</tableContext.Provider>
	);
}

function useProductsTableColumns() {
	const { priceLists, subOrgs } = useLoaderData<typeof loader>();
	return React.useMemo<Array<ColumnDef<any>>>(() => {
		const priceColumns = priceLists.map(price => ({
			accessorKey: `price:${price.name.toLowerCase()}`,
			header: () => `Precio: ${price.name}`,
		}));
		const stockColumns = subOrgs.map(subOrganization => ({
			accessorKey: `stock:${subOrganization.name.toLowerCase()}`,
			header: () => `Stock: ${subOrganization.name}`,
		}));

		return [
			{
				id: 'select',
				header: ({ table }) => (
					<IndeterminateCheckbox
						{...{
							checked: table.getIsAllRowsSelected(),
							indeterminate: table.getIsSomeRowsSelected(),
							onChange: table.getToggleAllRowsSelectedHandler(),
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
			...priceColumns,
			...stockColumns,
		];
	}, [priceLists, subOrgs]);
}

const staticColumns = [
	{ accessorKey: 'name', header: () => 'Nombre', filterFn: 'fuzzy' },
	{ accessorKey: 'description', header: () => 'Descripción' },
	{ accessorKey: 'reference', header: () => 'Referencia' },
	{ accessorKey: 'price', header: () => 'Costo unitario' },
	{ accessorKey: 'tax', header: () => 'Impuesto' },
	{ accessorKey: 'brand', header: () => 'Marca' },
	{ accessorKey: 'category', header: () => 'Categoría' },
	{ accessorKey: 'barCodes', header: () => 'Códigos de barras' },
	{ accessorKey: 'lot', header: () => 'Lote' },
	{ accessorKey: 'invima', header: () => 'Registro invima' },
	{ accessorKey: 'expiryDate', header: () => 'Fecha de vencimiento' },
];

export function mapCsvProductsToProducts(csvProducts: Array<unknown>) {
	const list = csvProducts as Array<Record<string, any>>;

	return list.map(product => {
		const copy = structuredClone(product);

		for (const key in copy) {
			const mappedKey = mapKey({ key });

			const value = parseCsvValue(copy[key], mappedKey);

			// ignore all other keys
			delete copy[key];

			if (typeof value !== undefined && mappedKey) copy[mappedKey] = value;
		}

		return copy;
	}) as Array<Record<string, string | number>>;
}

type MapKeyProps = {
	key: string;
	existingPrices?: Array<string>;
	existingStocks?: Array<string>;
};
export function mapKey({ key, existingPrices, existingStocks }: MapKeyProps) {
	const keyGroup = getKeyGroup(key);
	const lowerCaseKey = key.toLowerCase();
	const mapperValues = Object.values(mapper);

	if (mapperValues.includes(lowerCaseKey)) return lowerCaseKey;

	switch (keyGroup) {
		case 'prices': {
			const name =
				lowerCaseKey.split('precio:')[1]?.trim() ||
				lowerCaseKey.split('price:')[1]?.trim();
			if (existingPrices && name && !existingPrices.includes(name))
				return undefined;
			return `price:${name}`;
		}
		case 'stocks': {
			const name = lowerCaseKey.split('stock:')[1]?.trim();
			if (existingStocks && name && !existingStocks.includes(name))
				return undefined;
			return `stock:${name}`;
		}
		default:
			return mapper[lowerCaseKey];
	}
}
type KeyGroupType = 'normal' | 'stocks' | 'prices';
function getKeyGroup(key: string): KeyGroupType {
	const lowerCaseKey = key.toLowerCase();

	if (lowerCaseKey.includes('stock:')) return 'stocks';
	if (lowerCaseKey.includes('precio:')) return 'prices';
	if (lowerCaseKey.includes('price:')) return 'prices';

	return 'normal';
}

function parseCsvValue(value: unknown, key?: string) {
	const shouldParseToNumber = isNumber(value);

	try {
		if (key === 'barCodes') return value as string;

		if (shouldParseToNumber) {
			const parsedValue = parseFloat(value as string);
			return isNaN(parsedValue) ? (value as string) : parsedValue;
		}
	} catch (error) {}

	return value as string;
}

const mapper = {
	nombre: 'name',
	name: 'name',
	descripcion: 'description',
	description: 'description',
	descripción: 'description',
	precio: 'price',
	price: 'price',
	costo: 'price',
	'costo unitario': 'price',
	'precio unitario': 'price',
	marca: 'brand',
	brand: 'brand',
	categoria: 'category',
	category: 'category',
	categoría: 'category',
	impuesto: 'tax',
	tax: 'tax',
	'código de barras': 'barCodes',
	'códigos de barras': 'barCodes',
	'codigo de barras': 'barCodes',
	'codigos de barras': 'barCodes',
	'codigos de barra': 'barCodes',
	'códigos de barra': 'barCodes',
	referencia: 'reference',
	ref: 'reference',
	lote: 'lot',
	'registro invima': 'invima',
	'fecha de vencimiento': 'expiryDate',
} as Record<string, string>;

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

const taxes = ['19', '5', '0'];
const defaultColumn: Partial<ColumnDef<any>> = {
	cell: ({ getValue, row: { index }, column: { id }, table }) => {
		const initialValue = getValue();

		// eslint-disable-next-line react-hooks/rules-of-hooks
		const [value, setValue] = React.useState(initialValue);
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const { brands, categories } = useTableContext();
		const columnType = getColumnType(id);
		const shouldFormat = isNumber(value as string) && columnType === 'currency';

		switch (columnType) {
			case 'select': {
				const options =
					id === 'brand' ? brands : id === 'category' ? categories : taxes;

				return (
					<select
						className={cn(
							'h-9 w-full pl-4 font-normal appearance-none bg-white',
							"bg-[url('/img/expand-up-down-line.svg')] bg-[length:14px_14px] bg-select bg-no-repeat",
							'bg-[position:calc(100%-0.75rem)_center]',
						)}
						value={(value as string) ?? ''}
						onChange={e => {
							setValue(e.target.value);
							table.options.meta?.updateData(index, id, e.target.value);
						}}
					>
						{[''].concat(options).map(option => (
							<option key={option} value={option}>
								{option || 'Seleccionar'}
							</option>
						))}
					</select>
				);
			}
		}

		if (shouldFormat) {
			return (
				<CurrencyInput
					className="h-9 w-full pl-4 font-normal bg-white border-none"
					value={value as number}
					onValueChange={v => setValue(v)}
					onFocus={e => {
						if (shouldFormat) e.target.select();
					}}
					onBlur={() => table.options.meta?.updateData(index, id, value)}
				/>
			);
		}

		return (
			<input
				className="h-9 w-full pl-4 font-normal bg-white"
				type={columnType === 'date' ? 'date' : 'text'}
				value={
					shouldFormat
						? formatCurrency(value as number)
						: (value as string) || ''
				}
				onChange={e => setValue(e.target.value)}
				onFocus={e => {
					if (shouldFormat) e.target.select();
				}}
				inputMode={columnType === 'currency' ? 'decimal' : 'text'}
				onBlur={() => table.options.meta?.updateData(index, id, value)}
			/>
		);
	},
};

type ColumnType = 'normal' | 'currency' | 'select' | 'date';
const baseColumnsTypes: Record<string, ColumnType> = {
	name: 'normal',
	description: 'normal',
	reference: 'normal',
	price: 'currency',
	tax: 'select',
	brand: 'select',
	category: 'select',
	lot: 'normal',
	invima: 'normal',
	expiryDate: 'date',
};

function getColumnType(key: string): ColumnType {
	if (key.includes('price:')) return 'currency';
	if (key.includes('stock:')) return 'currency';

	return baseColumnsTypes[key] || 'normal';
}

function getUniqueItems(
	array1: Array<string>,
	array2: Array<string>,
): Array<string> {
	const combinedArray = [...array1, ...array2];
	return [...new Set(combinedArray)];
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
		<button
			className={cn(
				'h-9 w-9 border border-slate-200 rounded-sm hover:bg-slate-50 shadow-sm',
				'grid place-items-center',
			)}
			onClick={onClick}
			disabled={disabled}
			type="button"
		>
			{children}
		</button>
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

const fuzzyFilter: FilterFn<any> = (row, columnId, value, addMeta) => {
	// Rank the item
	const itemRank = rankItem(row.getValue(columnId), value);

	// Store the itemRank info
	addMeta({ itemRank });

	// Return if the item should be filtered in/out
	return itemRank.passed;
};
