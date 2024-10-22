import * as React from 'react';
import { flushSync } from 'react-dom';
import { ShorcutIcon } from '~/assets/jsx-icons';
import { Label } from '~/components/form-utils';
import { useBuilderProducts } from '~/routes/builder.products/route';
import { formatCurrency, toNumber } from '~/utils/misc';
import { useBuilderContext } from '../builder/context';
import { type ProductType, type BuilderType } from '../builder/schemas';
import { useBuilderType } from '../misc';
import {
	Popover,
	PopoverContent,
	PopoverItem,
	PopoverList,
	PopoverTriggerInput,
} from './components';
import { useFuseSearch } from './search';

export function ProductSearchCombobox() {
	const [open, setOpen] = React.useState(false);
	const [search, setSearch] = React.useState('');
	const builderType = useBuilderType();
	const {
		dispatch,
		state: { priceListId, subId },
	} = useBuilderContext();
	const { havePrice } = getPriceConfig(builderType);

	const { products: allProducts, isLoading } = useBuilderProducts();
	const { onSearch, items } = useFuseSearch(allProducts, search);

	const productMapper = React.useCallback(
		(product: ProductType) => {
			const price = havePrice
				? toNumber(
						product.prices.find(price => price.id === priceListId)?.price,
					)
				: product.cost;
			const stock = toNumber(
				product.stocks?.find(stock => stock.branchId === subId)?.quantity,
			);

			return { ...product, price, stock };
		},
		[havePrice, priceListId, subId],
	);

	const products = React.useMemo(() => {
		return items.slice(0, 50).map(productMapper);
	}, [productMapper, items]);

	// so the popover doesn't open when the user clicks on the input
	const isOpen = open && search.length > 0;

	const handleOnSelect = React.useCallback(
		(product: ProductType) => {
			Promise.resolve()
				.then(() => {
					flushSync(() => {
						dispatch({ type: 'addProduct', payload: product });
						setSearch('');
						setOpen(false);
						// Your code here
					});
				})
				.then(() => {
					const [input] = document.getElementsByName('quantity');
					input?.focus();
				});
		},
		[dispatch],
	);

	React.useEffect(() => {
		const isResultInTheBarCode = products.some(product =>
			product.barCodes.includes(search),
		);

		if (products.length === 1 && products[0] && isResultInTheBarCode) {
			const product = productMapper(products[0]);
			handleOnSelect(product);
		}
	}, [handleOnSelect, productMapper, products, search]);

	function handleSearch(search: string) {
		setSearch(search);
		if (search.length > 0) setOpen(true);
		onSearch(search);
	}

	function getPopoverItemProps(product: ProductType, index: number) {
		return {
			item: product,
			index,
			onSelect: handleOnSelect,
			ariaLabel: `Agregar ${product.name}`,
		};
	}

	return (
		<Popover
			open={isOpen}
			onOpenChange={setOpen}
			search={search}
			setSearch={handleSearch}
			listLength={products.length}
		>
			<div className="flex items-end gap-2">
				<div className="flex-1">
					<Label htmlFor={id} className="sr-only lg:not-sr-only lg:mb-1">
						Presiona para agregar un producto a la venta
					</Label>
					<div className="relative">
						<PopoverTriggerInput
							placeholder="Busca por nombre, código de barras o referencia"
							id={id}
						/>
						<ShorcutIcon>/</ShorcutIcon>
					</div>
				</div>
			</div>

			<PopoverContent className="z-20">
				<PopoverList isLoading={isLoading}>
					{products.map((product, index) => (
						<PopoverItem key={index} {...getPopoverItemProps(product, index)}>
							<div className="flex justify-between items-center w-full">
								<p className="flex-1">
									{product.name}
									<span className="ml-1 text-xs text-gray-600">
										{product.ref}
									</span>
								</p>

								<div className="flex items-center gap-2">
									<span className="font-medium">
										${formatCurrency(product.price)}
									</span>

									<span>x{product.stock}</span>
								</div>
							</div>
						</PopoverItem>
					))}
				</PopoverList>
			</PopoverContent>
		</Popover>
	);
}

const id = 'product-search-combobox';

function getPriceConfig(type: BuilderType) {
	const havePrice = ![
		'purchase',
		'purchaseInvoice',
		'purchaseRemision',
	].includes(type);

	return { havePrice };
}
