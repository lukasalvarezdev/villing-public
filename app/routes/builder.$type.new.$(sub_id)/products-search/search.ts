import FlexSearch from 'flexsearch';
import * as React from 'react';
import { toNumber } from '~/utils/misc';
import { type ProductType } from '../builder/schemas';

export function useFuseSearch(
	products: Array<ProductType>,
	defaultSearch: string,
) {
	const [items, setItems] = React.useState(products);
	const { searchFn } = getSearchFn(products);

	const onSearch = React.useCallback(
		(query: string) => {
			const result = getResult();
			setItems(result);
			return result;

			function getResult() {
				if (!query) return products;

				const numberSearch = toNumber(query);

				const isResultInTheBarCode = products.some(product => {
					return product.barCodes.includes(query);
				});

				if (isResultInTheBarCode) {
					const results = products.filter(product => {
						return product.barCodes.includes(query);
					});

					if (results.length >= 1) return results;
				}

				if (numberSearch) {
					const results = products.filter(
						product => product.id === numberSearch,
					);

					if (results.length === 1) return results;
				}

				return searchFn(query);
			}
		},
		[searchFn, products],
	);

	React.useEffect(() => {
		setItems(products);
		onSearch(defaultSearch);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [products.length]);

	return { items, onSearch };
}

function getSearchFn(products: Array<ProductType>) {
	const map = new Map(products.map(product => [product.id, product]));
	const searchIndex = new FlexSearch.Index({ tokenize: 'forward' });

	for (const product of products) {
		searchIndex.add(product.id, product.name + ' ' + product.ref);
	}

	return {
		searchFn: (query: string) => {
			return searchIndex.search(query).map(id => {
				const item = map.get(id as number);
				if (!item) throw new Error(`Product with id ${id} not found`);
				return item;
			});
		},
	};
}
