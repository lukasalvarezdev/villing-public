import { type LoaderFunctionArgs } from '@remix-run/node';
import { useFetcher } from '@remix-run/react';
import * as React from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { errorLogger } from '~/utils/logger';
import { protectRoute } from '~/utils/session.server';
import { type ProductType } from '../builder.$type.new.$(sub_id)/builder/schemas';
import { productsLoader } from '../builder.$type.new.$(sub_id)/products-search/loader.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	try {
		const products = await productsLoader(request);
		return products;
	} catch (error) {
		errorLogger({ error, path: request.url });
		return [];
	}
}

export function useBuilderProducts() {
	const fetcher = useFetcher<typeof loader>();
	const products = fetcher.data ?? ([] as Array<ProductType>);
	const isLoading = fetcher.state != 'idle';

	const load = useDebouncedCallback(fetcher.load, 500);

	React.useEffect(() => {
		load('/builder/products');
	}, [load]);

	return { products, isLoading };
}
