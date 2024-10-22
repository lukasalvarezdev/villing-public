import {
	json,
	type MetaFunction,
	type LoaderFunctionArgs,
} from '@remix-run/node';
import { useFetcher, useLoaderData } from '@remix-run/react';
import * as React from 'react';
import { flushSync } from 'react-dom';
import { Button, ErrorText, Input, Label } from '~/components/form-utils';
import { Box, Container, PageWrapper } from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [
	{ title: `Atributos de inventario - Villing` },
];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const {
		PriceList: priceLists,
		Category: categories,
		Brand: brands,
	} = await db.organization.findUniqueOrThrow({
		where: { id: orgId },
		select: {
			PriceList: {
				where: { deletedAt: null },
				orderBy: { id: 'asc' },
				select: { id: true, name: true },
			},
			Category: { orderBy: { name: 'asc' }, select: { id: true, name: true } },
			Brand: { orderBy: { name: 'asc' }, select: { id: true, name: true } },
		},
	});

	return json({ priceLists, categories, brands });
}

export default function Component() {
	const { priceLists, brands, categories } = useLoaderData<typeof loader>();

	return (
		<PageWrapper>
			<Container>
				<h2>Atributos de inventario</h2>
				<p className="text-sm mb-4 text-gray-500">
					En esta sección puedes crear y editar las listas de precios,
					categorías y marcas que vas a utilizar en tu inventario.
				</p>

				<div className="grid grid-cols-fit-72 gap-4">
					<div>
						<Box>
							<h5 className="mb-4">Listas de precios</h5>

							<ul className="mb-4 list-none">
								{priceLists.map(priceList => (
									<AttributeListItem
										key={priceList.id}
										name={priceList.name}
										id={priceList.id}
										formAction="/inventory/api/price-list"
									/>
								))}
							</ul>

							<CreateAttributeForm
								formAction="/inventory/api/price-list"
								createButtonLabel="Crear lista de precios"
							/>
						</Box>
					</div>
					<div>
						<Box>
							<h5 className="mb-4">Categorías</h5>

							{categories.length ? (
								<ul className="mb-4 list-none">
									{categories.map(category => (
										<AttributeListItem
											key={category.id}
											name={category.name}
											id={category.id}
											formAction="/inventory/api/category"
										/>
									))}
								</ul>
							) : (
								<p className="mb-4 text-sm">No tienes ninguna categoría</p>
							)}

							<CreateAttributeForm
								formAction="/inventory/api/category"
								createButtonLabel="Crear categoría"
							/>
						</Box>
					</div>
					<div>
						<Box>
							<h3 className="mb-4">Marcas</h3>

							{brands.length ? (
								<ul className="mb-4 list-none">
									{brands.map(brand => (
										<AttributeListItem
											key={brand.id}
											name={brand.name}
											id={brand.id}
											formAction="/inventory/api/brand"
										/>
									))}
								</ul>
							) : (
								<p className="mb-4 text-sm">No tienes ninguna marca</p>
							)}

							<CreateAttributeForm
								formAction="/inventory/api/brand"
								createButtonLabel="Crear marca"
							/>
						</Box>
					</div>
				</div>
			</Container>
		</PageWrapper>
	);
}

type AttributeListItemProps = { name: string; id: number; formAction: string };

function AttributeListItem({ name, id, formAction }: AttributeListItemProps) {
	const [isEditing, setIsEditing] = React.useState(false);
	const [isDeleting, setIsDeleting] = React.useState(false);
	const updateFetcher = useFetcher<any>();
	const deleteFetcher = useFetcher<any>();
	const inputId = React.useId();
	const optimisticName = updateFetcher.formData?.get('name')?.toString();
	const inputRef = React.useRef<HTMLInputElement>(null);
	const error = updateFetcher.data?.error || deleteFetcher.data?.error;

	React.useEffect(() => {
		if (optimisticName) setIsEditing(false);
	}, [optimisticName]);

	if (deleteFetcher.state !== 'idle') return null;

	if (isDeleting) {
		return (
			<li className="py-2 first-of-type:pt-0 border-b border-gray-200">
				<p className="text-sm">
					Deseas eliminar <strong>{name}</strong>?
				</p>

				<deleteFetcher.Form
					method="delete"
					className="flex gap-2 mt-2 text-sm"
					action={formAction}
				>
					<input type="hidden" name="id" value={id} />

					<Button variant="destructive" className="h-8">
						Sí, eliminar
					</Button>
					<Button
						type="button"
						onClick={() => setIsDeleting(false)}
						variant="secondary"
						className="h-8"
					>
						Cancelar
					</Button>
				</deleteFetcher.Form>
			</li>
		);
	}

	if (optimisticName) {
		return (
			<li className="flex text-sm first-of-type:pt-0 gap-4 justify-between py-2 items-center border-b border-gray-200">
				<p>{optimisticName}</p>
			</li>
		);
	}

	if (isEditing) {
		return (
			<li className="flex first-of-type:pt-0 gap-4 justify-between py-2 items-center border-b border-gray-200">
				<updateFetcher.Form method="PUT" action={formAction} className="w-full">
					<input type="hidden" name="id" value={id} />

					<Label htmlFor={`name-${inputId}`}>Nombre</Label>
					<Input
						name="name"
						placeholder="Escribe el nombre aquí"
						id={`name-${inputId}`}
						defaultValue={name}
						ref={inputRef}
					/>

					{error ? (
						<ErrorText className="text-error-600 text-sm mt-2">
							{error}
						</ErrorText>
					) : null}

					<div className="flex gap-2 mt-4">
						<Button variant="black" type="submit">
							Guardar
						</Button>
						<Button
							type="button"
							onClick={() => setIsEditing(false)}
							variant="secondary"
						>
							Cancelar
						</Button>
					</div>
				</updateFetcher.Form>
			</li>
		);
	}

	return (
		<li className="flex first-of-type:pt-0 gap-4 justify-between py-2 items-center border-b border-gray-200">
			<p className="flex-1 text-sm">{name}</p>
			<div className="flex gap-2">
				<button
					type="button"
					onClick={() => {
						flushSync(() => setIsEditing(true));
						inputRef.current?.select();
					}}
				>
					<i className="ri-edit-line text-xl"></i>
				</button>
				<button type="button" onClick={() => setIsDeleting(true)}>
					<i className="ri-delete-bin-line text-xl text-error-600"></i>
				</button>
			</div>
		</li>
	);
}

type CreateAttributeFormProps = {
	formAction: string;
	createButtonLabel: string;
};

function CreateAttributeForm({
	createButtonLabel,
	formAction,
}: CreateAttributeFormProps) {
	const fetcher = useFetcher<any>();
	const formRef = React.useRef<HTMLFormElement>(null);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const isAdding = fetcher.formMethod === 'POST';
	const optimisticName = fetcher.formData?.get('name')?.toString();
	const [error, setError] = React.useState<string | null>(null);

	React.useEffect(() => {
		if (isAdding) formRef.current?.reset();
	}, [isAdding]);

	if (optimisticName) {
		return (
			<div className="text-sm">
				<p>{optimisticName}</p>
			</div>
		);
	}

	return (
		<fetcher.Form
			method="POST"
			ref={formRef}
			action={formAction}
			onSubmit={e => {
				const formData = new FormData(e.currentTarget);
				const name = formData.get('name')?.toString();

				if (!name) {
					e.preventDefault();
					setError('El nombre es requerido');
					return;
				}
			}}
			onChange={() => setError(null)}
		>
			<Label htmlFor="name">Nombre</Label>
			<Input
				name="name"
				placeholder="Escribe el nombre aquí"
				disabled={isAdding}
				ref={inputRef}
			/>

			{error || fetcher.data?.error ? (
				<p className="text-error-600 text-sm mt-2">
					{error || fetcher.data.error}
				</p>
			) : null}

			<Button type="submit" variant="black" className="mt-2">
				<i className="ri-add-circle-line"></i>
				{createButtonLabel}
			</Button>
		</fetcher.Form>
	);
}
