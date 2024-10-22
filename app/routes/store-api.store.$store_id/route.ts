import { type LoaderFunctionArgs, json } from '@remix-run/node';
import { getRequestSearchParams, invariant } from '~/utils/misc';
import {
	createOrder,
	getProduct,
	getProducts,
	getProductsImages,
	getStoreById,
	proceduresSchema,
} from './endpoints';

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.store_id, 'store_id is required');

	const apiKey = request.headers.get('x-api-key');

	if (apiKey !== process.env.STORE_API_KEY) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const searchParams = getRequestSearchParams(request);
	const procedure = proceduresSchema.parse(searchParams.get('procedure'));

	switch (procedure) {
		case 'getStoreById':
			return getStoreById(params.store_id);
		case 'getProducts':
			return getProducts(params.store_id, request);
		case 'getProductsImages':
			return getProductsImages(params.store_id, request);
		case 'getProduct': {
			const productId = searchParams.get('product_id');
			invariant(productId, 'product_id is required');
			return getProduct(params.store_id, productId);
		}
		case 'createOrder':
			return createOrder(params.store_id, request);
		default:
			throw new Error(`Unknown procedure: ${procedure}`);
	}
}

export async function action({ request, params }: LoaderFunctionArgs) {
	invariant(params.store_id, 'store_id is required');

	const apiKey = request.headers.get('x-api-key');

	if (apiKey !== process.env.STORE_API_KEY) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const searchParams = getRequestSearchParams(request);
	const procedure = proceduresSchema.parse(searchParams.get('procedure'));

	switch (procedure) {
		case 'createOrder':
			return createOrder(params.store_id, request);
		default:
			throw new Error(`Unknown procedure: ${procedure}`);
	}
}
