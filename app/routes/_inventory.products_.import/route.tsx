import { json, redirect, type LoaderFunctionArgs } from '@remix-run/node';
import {
	Form,
	useActionData,
	useLoaderData,
	useSubmit,
} from '@remix-run/react';
import * as React from 'react';
import Dropzone from 'react-dropzone-esm';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { Checkbox, CheckboxField } from '~/components/checkbox';
import { ClientOnly } from '~/components/client-only';
import {
	Button,
	Input,
	IntentButton,
	Label,
	LinkButton,
	Select,
	Toast,
	getInputClasses,
} from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import {
	Box,
	Container,
	PageWrapper,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeadCell,
	TableRow,
	TwoColumnsDiv,
} from '~/components/ui-library';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { errorLogger } from '~/utils/logger';
import {
	cn,
	compareStrings,
	formatCurrency,
	parseFormData,
	toNumber,
} from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';
import { parseCsvFileToJSON } from '../inventory_.import/utils.import';
import { getDefaultColumns } from './columns-dictionary';
import {
	type Config,
	type ProductType,
	getProducts,
	prepareProductsToImport,
	product_schema,
} from './products-parser';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const { PriceList: priceLists, SubOrganization: branches } =
		await db.organization.findUniqueOrThrow({
			where: { id: orgId },
			select: {
				PriceList: {
					where: { deletedAt: null },
					select: { name: true },
				},
				SubOrganization: {
					where: { deletedAt: null },
					select: { id: true, name: true },
				},
			},
		});

	const villing_columns = [
		'name',
		'price',
		'reference',
		'tax',
		'category',
		'description',
		'brand',
		'barCodes',
		...priceLists.map(priceList => `price_list:${priceList.name}`),
		...branches.map(subOrg => `branch:${subOrg.name}`),
	];

	const translated_villing_columns = [
		'Nombre',
		'Costo (precio de compra)',
		'Referencia',
		'Impuesto',
		'Categoría',
		'Descripción',
		'Marca',
		'Códigos de barras',
		...priceLists.map(priceList => `Precio: ${priceList.name}`),
		...branches.map(subOrg => `Stock en: ${subOrg.name}`),
	];

	return { villing_columns, translated_villing_columns };
}

export async function action({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);
	const formData = await parseFormData(request);

	try {
		let productsState = z
			.array(product_schema)
			.parse(JSON.parse(formData.get('products')!));

		const brandsMap = new Map<string, string>();
		const categoriesMap = new Map<string, string>();

		for (const product of productsState) {
			if (product.brand && !brandsMap.has(product.brand)) {
				brandsMap.set(product.brand, product.brand);
			}

			if (product.category && !categoriesMap.has(product.category)) {
				categoriesMap.set(product.category, product.category);
			}
		}

		await db.$transaction(
			async tx => {
				const [
					{
						PriceList: priceLists,
						SubOrganization: branches,
						Brand: baseBrands,
						Category: baseCategories,
					},
					{ productsCount: count },
				] = await Promise.all([
					tx.organization.findUniqueOrThrow({
						where: { id: orgId },
						select: {
							PriceList: {
								where: { deletedAt: null },
								select: { id: true, name: true },
							},
							SubOrganization: {
								where: { deletedAt: null },
								select: { id: true, name: true },
							},
							Brand: { select: { name: true, id: true } },
							Category: { select: { name: true, id: true } },
						},
					}),
					tx.counts.findFirstOrThrow({
						where: { organizationId: orgId },
						select: { productsCount: true },
					}),
				]);

				const nonExistingBrands = Array.from(brandsMap.keys()).filter(
					brand => !baseBrands.find(b => compareStrings(b.name, brand)),
				);
				const nonExistingCategories = Array.from(categoriesMap.keys()).filter(
					category =>
						!baseCategories.find(c => compareStrings(c.name, category)),
				);

				await Promise.all([
					tx.brand.createMany({
						data: nonExistingBrands.map(name => ({
							name,
							organizationId: orgId,
						})),
					}),
					tx.category.createMany({
						data: nonExistingCategories.map(name => ({
							name,
							organizationId: orgId,
						})),
					}),
				]);

				const [brands, categories] = await Promise.all([
					tx.brand.findMany({
						where: { organizationId: orgId },
						select: { id: true, name: true },
					}),
					tx.category.findMany({
						where: { organizationId: orgId },
						select: { id: true, name: true },
					}),
				]);

				const products = productsState.map(product => {
					const prices = product.prices.map(price => ({
						...price,
						priceListId: findPriceListId(price.name),
					}));
					const stocks = product.stocks.map(stock => ({
						...stock,
						value: toNumber(stock.value),
						branchId: findBranchId(stock.name),
					}));

					const brandId = brands.find(b =>
						compareStrings(b.name, product.brand),
					)?.id;
					const categoryId = categories.find(c =>
						compareStrings(c.name, product.category),
					)?.id;

					return {
						...product,
						prices,
						stocks,
						uuid: uuid(),
						brandId,
						categoryId,
					};
				});

				const productsToCreate = products.map(productMapper);
				await tx.product.createMany({ data: productsToCreate });

				const uuids = productsToCreate.map(
					product => product.uuid,
				) as Array<string>;

				const createdProducts = await tx.product.findMany({
					where: { organizationId: orgId, uuid: { in: uuids } },
					select: { id: true, uuid: true },
				});

				await Promise.all([
					createPriceValues(),
					createStockValues(),
					tx.counts.update({
						where: { id: orgId },
						data: { productsCount: { increment: products.length } },
					}),
				]);

				function createPriceValues() {
					return tx.priceValue.createMany({
						data: products.flatMap(product => {
							const productId = findProductId(product.uuid);

							return priceLists.map(priceList => {
								const value =
									toNumber(
										product.prices.find(p => p.priceListId === priceList.id)
											?.value,
									) || 1;

								return {
									value,
									productId,
									organizationId: orgId,
									priceListId: priceList.id,
								};
							});
						}),
					});
				}

				function createStockValues() {
					return tx.stockValue.createMany({
						data: products.flatMap(product => {
							const productId = findProductId(product.uuid);

							return branches.map(branch => {
								const value = toNumber(
									product.stocks.find(b => b.branchId === branch.id)?.value,
								);

								return {
									value,
									productId,
									subOrgId: branch.id,
									organizationId: orgId,
								};
							});
						}),
					});
				}

				function findProductId(uuid?: string) {
					const productId = createdProducts.find(p => p.uuid === uuid)?.id;
					if (!productId) {
						throw new Error(`No se encontró el producto con uuid ${uuid}`);
					}
					return productId;
				}

				function findPriceListId(name: string) {
					const priceList = priceLists.find(p => compareStrings(p.name, name));
					if (!priceList) {
						throw new Error(`No se encontró la lista de precios "${name}"`);
					}
					return priceList.id;
				}

				function findBranchId(name: string) {
					const branch = branches.find(b => compareStrings(b.name, name));
					if (!branch) {
						throw new Error(`No se encontró la sucursal "${name}"`);
					}
					return branch.id;
				}

				function productMapper(product: (typeof products)[0], index: number) {
					return {
						organizationId: orgId,
						internalId: count + index + 1,
						uuid: product.uuid,

						name: product.name,
						description: product.description,
						reference: product.reference,

						tax: product.tax,
						price: product.price,
						brandId: product.brandId,
						categoryId: product.categoryId,
						barCodes: product.barCodes,
					};
				}
			},
			{ timeout: 15000 },
		);

		return redirect('/products');
	} catch (error) {
		const referenceId = errorLogger({
			error,
			path: '/inventory/products/import',
			body: formData,
			customMessage: 'Error al importar productos',
		});

		await logError({ error, request });

		return json<ActionData>(
			{
				error: `Hubo un error al importar los productos. Por favor envía a soporte esta referencia: ${referenceId} para poder solucionar tu problema.`,
			},
			500,
		);
	}

	type ActionData = { error?: string };
}

type DataType = { products: Array<unknown>; headers: Array<string> };

export default function Component() {
	const [fileName, setFileName] = React.useState<string>('');
	const [data, setData] = React.useState<DataType>({
		products: [],
		headers: [],
	});
	const [error, setError] = React.useState<string | null>(null);

	return (
		<PageWrapper>
			<Container className="flex items-center justify-center children:flex-1">
				{data.products.length ? (
					<ColumnsAssigner
						{...data}
						fileName={fileName}
						onReset={() => {
							setData({ products: [], headers: [] });
							setFileName('');
						}}
					/>
				) : (
					<div className="max-w-2xl mx-auto">
						<h3>Sube tu archivo.</h3>
						<p className="text-gray-500 mb-4">
							Sube el archivo de productos de tu programa anterior en formato
							CSV o Excel.
						</p>

						<FileUploader
							onFileChange={async file => {
								const data = await parseCsvFileToJSON(file);
								setData({
									products: data.data,
									headers: data.headers.map(h => h.toLowerCase()),
								});
								setFileName(file.name);
								setError(null);
							}}
							onError={setError}
						/>

						{error ? (
							<Toast className="mb-4" variant="error">
								{error}
							</Toast>
						) : null}

						<div className="flex justify-end">
							<LinkButton to="/products" variant="secondary">
								Cancelar
							</LinkButton>
						</div>
					</div>
				)}
			</Container>
		</PageWrapper>
	);
}

function FileUploader({
	onFileChange,
	onError,
}: {
	onFileChange: (file: File) => Promise<void>;
	onError: (error: string) => void;
}) {
	return (
		<ClientOnly>
			{() => (
				<Dropzone
					onDrop={acceptedFiles => {
						const file = acceptedFiles[0];
						const fileExtension = file?.name.split('.').pop();

						if (fileExtension !== 'csv' && fileExtension !== 'xlsx') {
							onError(
								'El archivo debe ser un archivo CSV (.csv) o Excel (.xlsx)',
							);
							return;
						}

						if (file) onFileChange(file);
					}}
					accept={{
						'application/vnd.ms-excel': ['.xlsx'],
						'text/csv': ['.csv'],
					}}
					maxSize={1024 * 1024 * 5} // 5MB
					maxFiles={1}
					multiple={false}
				>
					{({ getInputProps, getRootProps, isDragActive }) => (
						<div
							{...getRootProps({
								className: cn(
									'mb-6 flex flex-col items-center justify-center p-4 h-40',
									'rounded-sm border border-dashed border-gray-300',
									isDragActive && 'border-gray-400 bg-gray-100',
								),
							})}
						>
							<input {...getInputProps()} name="file" />

							<div className="mt-2 text-center">
								<p>Arrastra y suelta tu archivo aquí o</p>
								<button className="text-primary-600 underline">
									busca en tu dispositivo
								</button>
							</div>
						</div>
					)}
				</Dropzone>
			)}
		</ClientOnly>
	);
}

const config = { is_tax_included: true } satisfies Config;

function ColumnsAssigner({
	headers,
	products: xlsx_products,
	fileName,
	onReset,
}: DataType & { fileName: string; onReset: () => void }) {
	const loaderData = useLoaderData<typeof loader>();
	const { translated_villing_columns, villing_columns } = loaderData;

	const [selectedColumns, setSelectedColumns] = React.useState(
		getDefaultColumns(headers),
	);

	function getProductExample() {
		const products = getProducts(xlsx_products.slice(0, 1), selectedColumns);
		return prepareProductsToImport(products, config)[0];
	}

	return (
		<div>
			<h3>Configura tu archivo</h3>
			<p className="text-gray-500 mb-4">
				Asigna las columnas de tu archivo a las propiedades de Villing.
			</p>

			<Toast variant="info" className="mb-4">
				El archivo que seleccionaste es <strong>{fileName}</strong>
				<button
					className="text-primary-600 underline ml-2"
					onClick={onReset}
					type="button"
				>
					Cambiar
				</button>
			</Toast>

			<div className="text-sm flex gap-6">
				<Box className="flex-1">
					<h5>Asgina las columnas</h5>
					<p className="text-gray-500 mb-4">
						Selecciona la columna de tu archivo que corresponda a la propiedad
						de Villing. En la parte derecha se muestra un ejemplo de cómo se
						vería el producto importado.
					</p>

					<div className="rounded border border-gray-200 shadow-sm bg-white overflow-hidden">
						<Table>
							<TableHead>
								<TableHeadCell
									className="bg-gray-100 text-gray-700"
									colSpan={1}
								>
									Columna de tu archivo
								</TableHeadCell>
								<TableHeadCell
									className="border-l border-gray-200 bg-gray-100 text-gray-700"
									colSpan={1}
								>
									Propiedad de Villing
								</TableHeadCell>
							</TableHead>
							<TableBody>
								{headers.map(header => (
									<TableRow key={header}>
										<TableCell className="whitespace-nowrap" colSpan={1}>
											<p className="text-sm capitalize">{header}</p>
										</TableCell>
										<TableCell
											className="border-l border-gray-200 p-0"
											colSpan={1}
										>
											<Label className="sr-only" htmlFor={`column-${header}`}>
												Selecciona una columna para {header}
											</Label>
											<Select
												id={`column-${header}`}
												name="column"
												options={[
													{ label: 'Selecciona una columna', value: '' },
												].concat(
													villing_columns.map((x, index) => ({
														label: translated_villing_columns[index] || x,
														value: x,
													})),
												)}
												className="border-none w-full"
												onChange={e =>
													setSelectedColumns({
														...selectedColumns,
														[header]: e.target.value,
													})
												}
												value={selectedColumns[header]}
											/>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</Box>

				<ProductPreview product={getProductExample()} />
			</div>

			<ConfirmImport
				xlsx_products={xlsx_products}
				selectedColumns={selectedColumns}
				onReset={onReset}
			/>
		</div>
	);
}

function ConfirmImport({
	xlsx_products,
	selectedColumns,
	onReset,
}: {
	xlsx_products: Array<unknown>;
	selectedColumns: Record<string, string>;
	onReset: () => void;
}) {
	const [isOpened, setIsOpened] = React.useState(false);
	const [isConfirmed, setIsConfirmed] = React.useState(false);
	const submit = useSubmit();
	const actionData = useActionData<typeof action>();
	const error = actionData?.error;

	return (
		<div>
			<div className="flex justify-end mt-4 gap-4">
				<Button type="button" onClick={onReset} variant="secondary">
					Cancelar
				</Button>
				<Button type="button" onClick={() => setIsOpened(true)}>
					Importar productos
				</Button>
			</div>

			{isOpened ? (
				<Modal className="max-w-md">
					<ModalHeader onClick={() => setIsOpened(false)} className="mb-4">
						<h5>Confirmar la importación</h5>
					</ModalHeader>

					<Toast variant="warning" className="mb-4">
						Vas a importar un total de <strong>{xlsx_products.length}</strong>{' '}
						productos de manera masiva. ¿Estás seguro de que los datos son
						correctos?
					</Toast>

					{error ? <Toast variant="error">{error}</Toast> : null}

					<CheckboxField
						label="Confirmo que si hay productos que no tengan un precio asignado. El valor de este será cambiado a 1 (uno)."
						className="mb-4 text-sm items-start"
					>
						<Checkbox
							className="mt-1"
							onCheckedChange={v => setIsConfirmed(Boolean(v.valueOf()))}
						/>
					</CheckboxField>

					<Form
						className="flex justify-end mt-4 gap-4"
						method="POST"
						onSubmit={e => {
							e.preventDefault();
							const products = prepareProductsToImport(
								getProducts(xlsx_products, selectedColumns),
								config,
							);

							submit(
								{ products: JSON.stringify(products) },
								{ method: 'POST' },
							);
						}}
					>
						<Button type="button" onClick={onReset} variant="secondary">
							Cancelar
						</Button>
						<IntentButton disabled={!isConfirmed} type="submit">
							Si, importar productos
						</IntentButton>
					</Form>
				</Modal>
			) : null}
		</div>
	);
}

function ProductPreview({ product }: { product?: ProductType }) {
	return (
		<Box className="flex-1">
			<h4>Previsualización de los datos</h4>
			<p className="text-gray-500 mb-4">
				Este es un producto de ejemplo que se importará a Villing. Verifica que
				la información sea correcta y todos los campos contengan un valor
			</p>

			<div className="flex flex-col gap-4">
				<TwoColumnsDiv className="children:shrink-0">
					<ProductValue label="Nombre" value={product?.name} required />
					<ProductValue label="Referencia" value={product?.reference} />
				</TwoColumnsDiv>

				<TwoColumnsDiv>
					<ProductValue
						label="Costo (sin IVA)"
						value={`$${formatCurrency(product?.price || 1)}`}
						required
					/>
					<ProductValue
						label="Impuesto"
						value={`${product?.tax || 0}%`}
						required
					/>
				</TwoColumnsDiv>

				{product?.prices.length ? (
					<div>
						<p className="font-bold mb-2">Precios de venta</p>

						{product.prices.map(price => (
							<TwoColumnsDiv key={price.name}>
								<ProductValue
									label={`${price.name} (sin IVA)`}
									value={`$${formatCurrency(price.value)}`}
								/>
								<div></div>
							</TwoColumnsDiv>
						))}
					</div>
				) : (
					<Toast variant="warning" className="text-xs">
						No se encontraron precios para este producto o no se asignaron
						columnas para los precios.
					</Toast>
				)}

				<TwoColumnsDiv>
					<ProductValue label="Categoría" value={product?.category} />
					<ProductValue label="Marca" value={product?.brand} />
				</TwoColumnsDiv>

				{product?.barCodes?.length ? (
					<div>
						<p className="font-bold mb-2">Códigos de barras</p>

						{product.barCodes.map((barCode, index) => (
							<TwoColumnsDiv key={barCode}>
								<ProductValue
									label={`Código No. ${index + 1}`}
									value={barCode}
								/>
								<div></div>
							</TwoColumnsDiv>
						))}
					</div>
				) : null}
			</div>
		</Box>
	);
}

function ProductValue({
	label,
	value,
	required,
}: {
	label: string;
	value?: string | number;
	required?: boolean;
}) {
	return (
		<div>
			<Label htmlFor="name">{label}</Label>
			<Input
				className={cn(
					getInputClasses(),
					'flex items-center',
					!value && required && 'border-error-200',
					!value && !required && 'border-gray-200',
				)}
				readOnly
				value={value ?? `No asignado`}
			/>

			{!value ? (
				<p
					className={cn('text-xs text-gray-500', required && 'text-error-600')}
				>
					Asigna una columna para {label.toLowerCase()}
				</p>
			) : null}
		</div>
	);
}
