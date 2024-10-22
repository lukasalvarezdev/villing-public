import { json, redirect, type ActionFunctionArgs } from '@remix-run/node';
import { Form, useActionData, useSubmit } from '@remix-run/react';
import * as React from 'react';
import { useDropzone } from 'react-dropzone-esm';

import * as z from 'zod';
import { Button, Select, Toast } from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import {
	Box,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeadCell,
	TableRow,
} from '~/components/ui-library';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { cn, parseFormData } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';
import { parseCsvFileToJSON } from './inventory_.import/utils.import';

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);
	try {
		const form = await parseFormData(request);
		const state = JSON.parse(form.get('products') || '{}');
		const result = clientsSchema.safeParse(state);

		if (!result.success) {
			const error = result.error.errors.map(e => e.message).join(', ');
			return json({ error, flet: result.error.flatten() }, 400);
		}

		await db.client.createMany({
			data: result.data.map(client => ({ ...client, organizationId: orgId })),
		});

		return redirect('/clients');
	} catch (error) {
		await logError({ error, request });

		return json({ error: 'Hubo un error importando los clientes' }, 500);
	}
}

const clientsSchema = z.array(
	z
		.object({
			name: z.string(),
			idNumber: z.coerce.string(),
			email: z.string(),
			tel: z.coerce.string(),
			simpleAddress: z.coerce.string(),
		})
		.transform((val, ctx) => {
			if (!val.idNumber.length) {
				ctx.addIssue({
					code: 'custom',
					message: `El nit de ${val.name} requerido.`,
					path: ['idNumber'],
				});

				return z.NEVER;
			}

			if (!val.email) {
				ctx.addIssue({
					code: 'custom',
					message: `El correo de ${val.name} es requerido.`,
					path: ['email'],
				});

				return z.NEVER;
			}

			return val;
		}),
);

export default function Component() {
	const [state, dispatch] = React.useReducer(reducer, initialState);
	const { file, error, userHeadersData, data } = state;
	const { getInputProps, getRootProps, isDragActive } = useDropzone({
		onDrop: acceptedFiles => {
			dispatch({ type: 'SET_FILE', payload: acceptedFiles[0] || null });
		},
		accept: {
			'application/vnd.ms-excel': ['.xlsx', '.xls', '.csv'],
			'text/csv': ['.csv'],
		},
		maxSize: 1024 * 1024 * 5, // 5MB
		maxFiles: 1,
		multiple: false,
	});

	const { handleSubmit } = useUploadParsedFile();
	const organizationTemplateHeaders = useOrganizationTemplateHeaders();
	const actionData = useActionData<typeof action>();
	const submitError = actionData?.error;

	React.useEffect(() => {
		if (file) dispatch({ type: 'SET_ERROR', payload: null });
	}, [file]);

	async function validateAndParseFile(file: File) {
		const { data, hasAllRequiredHeaders, userHeadersData } =
			await parseUserFile(file, organizationTemplateHeaders);

		if (!hasAllRequiredHeaders) {
			dispatch({ type: 'SET_USER_HEADERS_DATA', payload: userHeadersData });
			dispatch({ type: 'SET_DATA', payload: data });
			return;
		}

		handleSubmit(data);
	}

	return (
		<Modal className="max-w-2xl">
			<ModalHeader href="/clients">
				<h4>Sube tu archivo.</h4>
			</ModalHeader>

			<p className="text-gray-500 mb-6">
				Sube el archivo de productos de tu programa anterior en formato CSV o
				Excel.
			</p>

			{userHeadersData.length ? (
				<ColumnKeysAssigner
					userHeadersData={userHeadersData}
					setUserHeadersData={updater => {
						dispatch({
							type: 'SET_USER_HEADERS_DATA',
							payload: updater(userHeadersData),
						});
					}}
					data={data}
					onCancel={() => {
						dispatch({ type: 'SET_USER_HEADERS_DATA', payload: [] });
						dispatch({ type: 'SET_DATA', payload: [] });
						dispatch({ type: 'SET_FILE', payload: null });
					}}
				/>
			) : (
				<div>
					<div>
						<div
							{...getRootProps({
								className: cn(
									'mb-6 flex flex-col items-center justify-center p-4 h-40',
									'rounded-sm border border-dashed border-gray-300',
									isDragActive && 'border-gray-400 bg-gray-100',
								),
							})}
						>
							<input {...getInputProps()} name="file" id="file-upload" />

							<div className="mt-2 text-center">
								<p>Arrastra y suelta tu archivo aquí o</p>
								<button className="text-primary-600 underline">
									busca en tu dispositivo
								</button>
							</div>
						</div>
					</div>

					{file ? (
						<Box className="flex gap-4 items-center">
							<i className="ri-file-pdf-2-line"></i>
							<p className="flex-1">{file.name}</p>
							<button
								className="underline text-sm"
								onClick={() => dispatch({ type: 'SET_FILE', payload: null })}
							>
								Eliminar
							</button>
						</Box>
					) : null}

					{error || submitError ? (
						<Toast variant="error" className="mt-6">
							{submitError || error}
						</Toast>
					) : null}

					<div className="flex mt-6 justify-end">
						<Button
							variant="primary"
							onClick={() => {
								if (!file) {
									dispatch({
										type: 'SET_ERROR',
										payload: 'Debes subir un archivo para continuar.',
									});
									return;
								}

								validateAndParseFile(file);
							}}
							type="button"
						>
							Analizar archivo
							<i className="ri-arrow-right-line ml-2" />
						</Button>
					</div>
				</div>
			)}
		</Modal>
	);
}

type ColumnKeysAssignerProps = {
	userHeadersData: UserHeadersData;
	setUserHeadersData: (
		fn: (userHeadersData: UserHeadersData) => UserHeadersData,
	) => void;
	data: Array<unknown>;
	onCancel: () => void;
};

function ColumnKeysAssigner(props: ColumnKeysAssignerProps) {
	const { userHeadersData, setUserHeadersData, data, onCancel } = props;
	const [error, setError] = React.useState<string | null>(null);
	const { handleSubmit } = useUploadParsedFile();
	const templateHeaders = useOrganizationTemplateHeaders();
	const columnTranslations = useColumnsTranslations();
	const actionData = useActionData<typeof action>();
	const actionError = actionData?.error;

	React.useEffect(() => {
		setError(null);
	}, [userHeadersData]);

	return (
		<div>
			<Box>
				<h3>Configura tus columnas</h3>
				<p className="text-gray-600 text-sm mb-4">
					Asigna las columnas de tu archivo a la plantilla de Villing
				</p>

				<div className="rounded border border-gray-200 shadow-sm">
					<Table>
						<TableHead>
							<TableHeadCell className="w-1/2">Tus columnas</TableHeadCell>
							<TableHeadCell className="border-l border-gray-200 w-1/2">
								Columnas de Villing
							</TableHeadCell>
						</TableHead>
						<TableBody>
							{userHeadersData.map(data => (
								<TableRow key={data.key}>
									<TableCell className="whitespace-nowrap w-1/2">
										<div className="flex-1 flex gap-2">
											<span
												className={cn(
													'w-6 h-6 rounded-full border',
													'flex items-center justify-center',
													data.mappedKey
														? 'border-primary-600'
														: 'border-error-600',
												)}
											>
												{data.mappedKey ? (
													<i className="ri-check-line text-primary-600"></i>
												) : (
													<i className="ri-close-line text-error-600"></i>
												)}
											</span>
											<p className="text-sm">{data.key}</p>
										</div>
									</TableCell>
									<TableCell className="text-sm border-l border-gray-200 w-1/2">
										<Select
											defaultValue={data.mappedKey}
											options={[
												{ value: '', label: 'Selecciona una columna' },
												...templateHeaders.map(header => ({
													value: header,
													label: columnTranslations[header] || header,
												})),
											]}
											onChange={e => {
												const value = e.target.value;

												setUserHeadersData(prev => {
													return prev.map(item => {
														if (item.key === data.key)
															return { ...item, mappedKey: value };
														return item;
													});
												});
											}}
										/>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			</Box>

			{error || actionError ? (
				<Toast variant="error" className="mt-6">
					{error || actionError}
				</Toast>
			) : null}

			<Form
				onSubmit={e => {
					e.preventDefault();
					handleSubmit(replaceAssignedKeys(data, userHeadersData));
				}}
				className="flex mt-6 justify-end gap-4"
			>
				<Button variant="secondary" type="button" onClick={onCancel}>
					Cambiar archivo
				</Button>
				<Button
					variant="primary"
					onClick={e => {
						const mappedKeys = userHeadersData
							.map(({ mappedKey }) => mappedKey as string)
							.filter(Boolean);

						if (mappedKeys.length < 1) {
							e.preventDefault();
							setError('Debes asignar al menos una columna para continuar.');
						}
					}}
				>
					Ir al último paso
					<i className="ri-arrow-right-line ml-2" />
				</Button>
			</Form>
		</div>
	);
}

function useOrganizationTemplateHeaders(): Array<string> {
	return baseHeaders;
}

export const baseHeaders = [
	'name',
	'idNumber',
	'email',
	'tel',
	'simpleAddress',
];

// create a function that checks if one array has all the keys of the other, regardless of order
// but it can have more keys than the other
function compareArrays(arr1: Array<string>, arr2: Array<string>): boolean {
	if (arr1.length > arr2.length) return false;

	const arr1Set = new Set(arr1);
	const arr2Set = new Set(arr2);

	for (const item of arr1Set) {
		if (!arr2Set.has(item)) return false;
	}

	return true;
}

function useColumnsTranslations() {
	return defaultTranslations;
}

export const defaultTranslations = {
	name: 'Nombre',
	email: 'Correo electrónico',
	idNumber: 'NIT',
	tel: 'Teléfono',
	simpleAddress: 'Dirección',
} as Record<string, string>;

function replaceAssignedKeys(
	data: Array<unknown>,
	userHeadersData: UserHeadersData,
) {
	const list = data as Array<Record<string, string>>;
	return list.map(item => {
		const newItem: Record<string, string> = {};

		for (const { key, mappedKey } of userHeadersData) {
			if (mappedKey) newItem[mappedKey] = item[key] ?? '';
		}

		return newItem;
	});
}

async function parseUserFile(file: File, templateHeders: Array<string>) {
	const { headers, data } = await parseCsvFileToJSON(file);

	const userHeadersData = headers.map(header => ({
		key: header,
		mappedKey: mapKey(header),
	}));

	const mappedKeys = userHeadersData
		.map(({ mappedKey }) => mappedKey as string)
		.filter(Boolean);
	const hasAllRequiredHeaders = compareArrays(templateHeders, mappedKeys);

	return { userHeadersData, hasAllRequiredHeaders, data };
}

type UserHeadersData = Array<{ key: string; mappedKey?: string }>;
type State = {
	file: File | null;
	error: string | null;
	userHeadersData: UserHeadersData;
	data: Array<unknown>;
};

type Action =
	| { type: 'SET_FILE'; payload: File | null }
	| { type: 'SET_ERROR'; payload: string | null }
	| { type: 'SET_USER_HEADERS_DATA'; payload: UserHeadersData }
	| { type: 'SET_DATA'; payload: Array<unknown> };

const initialState: State = {
	file: null,
	error: null,
	userHeadersData: [],
	data: [],
};

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case 'SET_FILE':
			return { ...state, file: action.payload };
		case 'SET_ERROR':
			return { ...state, error: action.payload };
		case 'SET_USER_HEADERS_DATA':
			return { ...state, userHeadersData: action.payload };
		case 'SET_DATA':
			return { ...state, data: action.payload };
		default:
			return state;
	}
}

function useUploadParsedFile() {
	const submit = useSubmit();

	function handleSubmit(data: Array<unknown>) {
		const products = mapCsvProductsToProducts(data);
		submit({ products: JSON.stringify(products) }, { method: 'POST' });
	}

	return { handleSubmit };
}

export function mapKey(key: string) {
	const lowerCaseKey = key.toLowerCase();

	return mapper[lowerCaseKey];
}

function parseCsvValue(value: unknown) {
	return value as string;
}

const mapper = {
	nombre: 'name',
	name: 'name',
	correo: 'email',
	'correo electrónico': 'email',
	'correo electronico': 'email',
	email: 'email',
	nit: 'idNumber',
	teléfono: 'tel',
	tel: 'tel',
	dirección: 'simpleAddress',
	direccion: 'simpleAddress',
} as Record<string, string>;

export function mapCsvProductsToProducts(csvProducts: Array<unknown>) {
	const list = csvProducts as Array<Record<string, any>>;

	return list.map(product => {
		const copy = structuredClone(product);

		for (const key in copy) {
			const mappedKey = mapKey(key) || key;

			const value = parseCsvValue(copy[key]);

			// ignore all other keys
			delete copy[key];

			if (typeof value !== undefined && mappedKey) copy[mappedKey] = value;
		}

		return copy;
	}) as Array<Record<string, string | number>>;
}
