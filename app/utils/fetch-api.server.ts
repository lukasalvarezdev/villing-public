import { type z } from 'zod';
import { errorLogger, logInfo } from './logger';

type SchemaType = z.ZodSchema | undefined;

type Options<S extends SchemaType> = {
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	schema?: S;
	body?: any;
	token?: string;
};

export type ApiResponse<S extends SchemaType> =
	| {
			success: true;
			data: S extends z.ZodSchema ? z.infer<S> : unknown;
	  }
	| { success: false };

export async function fetchApi<S extends SchemaType = undefined>(
	path: string,
	options: Options<S>,
): Promise<ApiResponse<S>> {
	const { schema } = options;
	const init = await getFetchInit();

	try {
		const url = path.startsWith('http') ? path : soenacApiUrl + path;
		logInfo({ message: `Requesting path: ${path}`, data: options.body, path });

		const response = await fetch(url, init);

		const isJson = response.headers
			.get('content-type')
			?.includes('application/json');

		if (!response.ok) {
			const data = isJson ? await response.json() : await response.text();

			if (typeof data === 'string') {
				if (data.includes('<!DOCTYPE')) throw messages.unavailable;
				if (data.includes('Service Unavailable')) throw messages.unavailable;
			}

			errorLogger({ path, error: data, customMessage: 'Error in fetchApi' });

			return { success: false };
		}

		let data = await response.json();

		if (schema) {
			const result = schema.safeParse(data);

			if (!result.success) {
				const flatErrors = result.error.flatten();

				errorLogger({
					path,
					body: data,
					error: flatErrors,
					customMessage: 'Error parsing response from DIAN',
				});

				return { success: false };
			}

			data = result.data;
		}

		return { success: true, data };
	} catch (error) {
		errorLogger({ error, path, body: options.body });
		return { success: false };
	}

	async function getFetchInit(): Promise<RequestInit> {
		const headers = new Headers({
			'Content-Type': 'application/json',
			Accept: 'application/json',
		});

		if (options.token) {
			headers.set('Authorization', `Bearer ${options.token}`);
		}

		return { headers, method: options.method, body: getBody() };
	}

	function getBody() {
		return options.method === 'GET' ? undefined : JSON.stringify(options.body);
	}
}

export const soenacApiUrl =
	'https://icag.apifacturacionelectronica.com/api/ubl2.1';

export const messages = {
	unavailable:
		'El servicio de facturación está temporalmente deshabilitado por mantenimiento de la DIAN, por favor intente más tarde.',
	dian_slow:
		'El servidor de la DIAN está presentando inconvenientes y Villing no puede conectarse en este momento. Por favor intente más tarde',
};
