import { conform, type useForm, useFieldList, list } from '@conform-to/react';
import { Form, useFetcher, useLocation, useParams } from '@remix-run/react';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import * as z from 'zod';
import { ClientOnly } from '~/components/client-only';
import { DatePicker } from '~/components/date-picker';
import {
	Button,
	ErrorText,
	Input,
	Label,
	LinkButton,
	Select,
	Textarea,
	Toast,
	currencyTransformer,
} from '~/components/form-utils';
import { Box } from '~/components/ui-library';
import { useOrganization } from '~/root';
import { cn, safeNewDate, toNumber } from '~/utils/misc';
import { ProductPrices } from './product-prices-form';

type ProductFormProps = {
	methods: ReturnType<typeof useForm<z.infer<typeof productSchema>>>;
	children: React.ReactNode;
	title?: string;
	brands: Array<{ label: string; value: number }>;
	categories: Array<{ label: string; value: number }>;
	priceLists: Array<{ id: number; name: string; value: number }>;
	hideInitialStock?: boolean;
	imagesUrls?: Array<{ url: string; objectId: string }>;
};

export function ProductForm(props: ProductFormProps) {
	const { search } = useLocation();
	const {
		children,
		methods,
		title = 'Nuevo producto',
		brands,
		categories,
		priceLists,
		hideInitialStock,
		imagesUrls,
	} = props;
	const [form, fields] = methods;
	const { type } = useOrganization();
	const barCodes = useFieldList(form.ref, fields.barCodes);
	useHotkeys('enter', e => e.preventDefault(), { enableOnFormTags: true });

	return (
		<Form method="POST" {...form.props}>
			<div className="flex justify-between flex-col sm:flex-row sm:items-center mb-4 gap-4">
				<div className="flex gap-4 items-center">
					<LinkButton
						to={{ pathname: '/products', search }}
						prefetch="intent"
						variant="secondary"
						className="w-9"
					>
						<span className="sr-only">Volver a la lista de productos</span>
						<i className="ri-arrow-left-line min-w-min"></i>
					</LinkButton>

					<h4 className="text-base md:text-xl">{title}</h4>
				</div>

				{children}
			</div>

			<Toast className="mb-4" id={form.errorId}>
				{form.error}
			</Toast>

			<div className="flex-col lg:flex-row flex gap-4">
				<div className="flex-1 flex flex-col gap-4">
					<Box className="flex flex-col gap-4">
						<div>
							<Label htmlFor={fields.name.id}>Nombre</Label>
							<Input
								placeholder="Ej. Camisa de algodón"
								{...conform.input(fields.name)}
							/>
							<ErrorText id={fields.name.errorId}>
								{fields.name.error}
							</ErrorText>
						</div>

						<div>
							<Label htmlFor={fields.description.id}>Descripción</Label>
							<Textarea
								placeholder="Ej. La camisa de algodón más cómoda del mundo"
								{...conform.input(fields.description)}
							/>
							<ErrorText id={fields.description.errorId}>
								{fields.description.error}
							</ErrorText>
						</div>
					</Box>

					<Box>
						<ProductPrices
							cost={toNumber(fields.cost.defaultValue)}
							tax={toNumber(fields.tax.defaultValue)}
							priceLists={priceLists}
						/>
					</Box>
				</div>

				<div className="flex-1 lg:max-w-[20rem] flex flex-col gap-4">
					<Box className="flex flex-col gap-4">
						<h5>Taxonomía</h5>

						<div>
							<Label htmlFor={fields.reference.id}>Referencia - SKU</Label>
							<Input
								placeholder="Ej. SKU-1234"
								{...conform.input(fields.reference)}
							/>
							<ErrorText id={fields.reference.errorId}>
								{fields.reference.error}
							</ErrorText>
						</div>

						<div>
							<Label htmlFor={fields.categoryId.id}>Categoría</Label>
							<Select
								options={categories}
								{...conform.select(fields.categoryId)}
							/>
							<ErrorText id={fields.categoryId.errorId}>
								{fields.categoryId.error}
							</ErrorText>
						</div>

						<div className="pb-4 border-b border-gray-200">
							<Label htmlFor={fields.brandId.id}>Marca</Label>
							<Select options={brands} {...conform.select(fields.brandId)} />
							<ErrorText id={fields.brandId.errorId}>
								{fields.brandId.error}
							</ErrorText>
						</div>

						<fieldset>
							<legend className="font-bold mb-4">Códigos de barras</legend>

							<ul className="flex flex-col gap-2 mb-4">
								{barCodes.map((barCode, index) => (
									<li key={barCode.key} className="flex gap-2">
										<div className="flex-1">
											<Label htmlFor={barCode.id}>Código</Label>
											<Input
												{...conform.input(barCode)}
												placeholder='Ej. "123456789"'
												onKeyDown={e => {
													if (e.key === 'Enter') {
														e.preventDefault();
														e.stopPropagation();
													}
												}}
											/>
											<ErrorText id={barCode.errorId}>
												{barCode.error}
											</ErrorText>
										</div>

										<div>
											<p className="block font-medium text-sm mb-1 opacity-0">
												El.
											</p>
											<Button
												variant="destructive"
												className="w-9"
												{...list.remove('barCodes', { index })}
											>
												<span className="sr-only">Eliminar</span>
												<i className="ri-delete-bin-line"></i>
											</Button>
										</div>
									</li>
								))}
							</ul>

							<Button
								className="max-w-max"
								variant="secondary"
								{...list.insert('barCodes', { defaultValue: '' })}
							>
								<i className="ri-add-line"></i>
								Añadir código
							</Button>
						</fieldset>
					</Box>

					<Box className="flex flex-col gap-4">
						<h5>Stock - Inventario</h5>

						{!hideInitialStock ? (
							<div>
								<Label htmlFor={fields.initialStock.id}>Stock inicial</Label>
								<Input
									placeholder="Ej. 10"
									{...conform.input(fields.initialStock)}
								/>
								<ErrorText id={fields.initialStock.errorId}>
									{fields.initialStock.error}
								</ErrorText>

								<p className="text-sm text-gray-500 mt-1 pl-1">
									El stock inicial se añadirá a la sucursal principal.
								</p>
							</div>
						) : null}
					</Box>

					{type === 'pharmacy' ? (
						<Box className="flex flex-col gap-4">
							<h5>Medicamentos</h5>

							<div>
								<Label htmlFor={fields.invimaRegistry.id}>
									Registro invima
								</Label>
								<Input
									placeholder="Registro invima"
									{...conform.input(fields.invimaRegistry)}
								/>
								<ErrorText id={fields.invimaRegistry.errorId}>
									{fields.invimaRegistry.error}
								</ErrorText>
							</div>

							<div>
								<Label htmlFor={fields.batch.id}>Lote</Label>
								<Input placeholder="Lote" {...conform.input(fields.batch)} />
								<ErrorText id={fields.batch.errorId}>
									{fields.batch.error}
								</ErrorText>
							</div>

							<div>
								<Label htmlFor={fields.expirationDate.id}>
									Fecha de vencimiento
								</Label>
								<DatePicker
									name="expirationDate"
									className="w-full"
									defaultDate={safeNewDate(fields.expirationDate.defaultValue)}
								/>
								<ErrorText id={fields.expirationDate.errorId}>
									{fields.expirationDate.error}
								</ErrorText>
							</div>
						</Box>
					) : null}

					{imagesUrls ? (
						<Box>
							<h5>Imagenes de producto</h5>
							<Images imagesUrls={imagesUrls} />
						</Box>
					) : null}
				</div>
			</div>
		</Form>
	);
}

function Images({
	imagesUrls,
}: {
	imagesUrls: Array<{ url: string; objectId: string }>;
}) {
	const fetcher = useFetcher();
	const { product_id } = useParams();
	const submitButtonRef = React.useRef<HTMLButtonElement>(null);
	const [message, setMessage] = React.useState<string | null>(null);
	const isLoading = fetcher.state !== 'idle';
	const formId = React.useId();

	React.useEffect(() => {
		if (message) {
			setTimeout(() => {
				setMessage(null);
			}, 3000);
		}
	}, [message]);

	return (
		<div>
			<div className="grid grid-cols-fit-24 gap-4 mb-4">
				{imagesUrls.map((image, index) => (
					<div
						key={index}
						className="shadow-md rounded p-2 bg-white border border-gray-100"
					>
						<div className="relative group w-full h-0 pb-[100%] overflow-hidden">
							<img
								src={image.url}
								alt={`${index + 1}`}
								className="absolute inset-0 object-cover w-full h-full transition-transform duration-300 transform group-hover:scale-105"
							/>
							<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex justify-center items-center">
								<DeleteImageButton objectId={image.objectId} />
							</div>
						</div>
					</div>
				))}
			</div>

			{message ? (
				<p className="text-error-600 text-sm mt-4">{message}</p>
			) : null}

			{imagesUrls.length < 4 ? (
				<div>
					<label
						className={cn(
							'bg-white border border-gray-200 shadow-sm hover:bg-gray-50',
							'text-sm px-4 h-9 rounded flex items-center gap-2 max-w-max',
							isLoading &&
								'pointer-events-none bg-gray-200 text-gray-500 border-gray-300',
						)}
					>
						<i className="ri-add-line"></i>
						{isLoading ? 'Subiendo...' : 'Agregar imagen'}
						<input
							type="file"
							name="file"
							multiple
							accept=".jpg, .jpeg, .png"
							className="hidden"
							form={formId}
							onChange={e => {
								const files = Array.from(e.target.files || []);

								if (files.some(file => file.size > 1024 * 1024)) {
									setMessage(
										'Alguna de las imágenes es demasiado grande, el tamaño máximo es de 1MB',
									);
									return;
								}

								submitButtonRef.current?.click();
							}}
						/>
					</label>

					<ClientOnly>
						{() =>
							ReactDOM.createPortal(
								<fetcher.Form
									method="put"
									encType="multipart/form-data"
									action={`/products/${product_id}/upload`}
									id={formId}
								>
									<button ref={submitButtonRef} className="hidden" />
								</fetcher.Form>,

								document.body,
							)
						}
					</ClientOnly>
				</div>
			) : null}
		</div>
	);
}

function DeleteImageButton({ objectId }: { objectId: string }) {
	const fetcher = useFetcher();
	const { product_id } = useParams();

	return (
		<div>
			<button
				className="absolute top-0 right-0 w-6 h-6 bg-white flex items-center justify-center shadow-md hover:bg-gray-100"
				type="submit"
				form="delete-image-form"
			>
				<i className="ri-close-line text-red-500"></i>
			</button>
			<ClientOnly>
				{() =>
					ReactDOM.createPortal(
						<fetcher.Form
							action={`/products/${product_id}/delete-image?objectId=${objectId}`}
							method="post"
							id="delete-image-form"
						></fetcher.Form>,

						document.body,
					)
				}
			</ClientOnly>
		</div>
	);
}

export const productSchema = z.object({
	name: z.string({ required_error: 'El nombre es obligatorio' }),
	reference: z.string().optional(),
	description: z.string().optional(),
	cost: z.string().transform(currencyTransformer),
	tax: z.coerce.number(),
	barCodes: z.array(
		z.string({
			required_error: 'El código de barras es obligatorio',
		}),
	),
	categoryId: z.coerce.number().optional(),
	brandId: z.coerce.number().optional(),
	initialStock: z.coerce.number().optional(),
	initialSubOrgId: z.coerce.number().optional(),
	invimaRegistry: z.string().optional(),
	batch: z.string().optional(),
	expirationDate: z.coerce.date().optional(),
});

export function parseProductPrices(formData: FormData) {
	const prices = Array.from(formData.entries())
		.filter(([key]) => key.startsWith('price-'))
		.map(([key, value]) => {
			const id = toNumber(key.split('-')[1]);
			const price = toNumber(value);

			return { id, price };
		});

	return prices;
}
