import { createRemixStub } from '@remix-run/testing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import {
	describe,
	it,
	expect,
	vi,
	afterEach,
	beforeAll,
	afterAll,
} from 'vitest';
import { useBuilderContext } from '../builder/context';
import { TestBuilderProvider } from '../test-utils';
import { ProductSearchCombobox } from './combobox';

vi.mock('use-debounce', () => ({ useDebouncedCallback: (fn: any) => fn }));
vi.mock('~/root', () => ({
	useOrganization: () => ({ data: { config: { retention: 0 } } }),
}));

const user = userEvent.setup();

const RemixStub = createRemixStub([
	{ path: '/builder/:type', Component },
	{ path: '/builder/products', loader },
]);

describe('products search', () => {
	beforeAll(() => {
		// Delete window.location before setting your mock to avoid Jest's read-only error
		delete (window as any).location;

		window.location = {
			href: 'https://example.com?query=123',
			pathname: '/builder/pos',
		} as any;
	});

	afterAll(() => {
		window.location = location;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should display "no results" if product does not exist', async () => {
		render(<RemixStub initialEntries={['/builder/pos']} />);

		expect(screen.queryByText(/no hay resultados/i)).not.toBeInTheDocument();

		const input = screen.getByRole('searchbox', {
			name: /presiona para agregar/i,
		});

		// Search for a product that doesn't exist
		await act(async () => {
			await user.type(input, 'Something');
		});

		expect(screen.getByText(/no hay resultados/i)).toBeInTheDocument();
	});

	it('should clean and close after adding a product', async () => {
		render(<RemixStub initialEntries={['/builder/pos']} />);
		const input = screen.getByRole('searchbox', {
			name: /presiona para agregar/i,
		});

		await act(async () => {
			await user.clear(input);
			await user.type(input, 'Producto');
		});

		expect(screen.getByText(/producto 1/i)).toBeInTheDocument();

		await act(async () => {
			await user.click(
				screen.getByRole('button', { name: /agregar producto 1/i }),
			);
		});

		expect(
			screen.queryByRole('button', { name: /producto 1/i }),
		).not.toBeInTheDocument();

		expect(input).toHaveValue('');
	});

	it('should handle keyboard navigation', async () => {
		render(<RemixStub initialEntries={['/builder/pos']} />);
		const input = screen.getByRole('searchbox', {
			name: /presiona para agregar/i,
		});

		await act(async () => {
			await user.type(input, 'Shampoo');
			await user.keyboard('{arrowdown}');
		});

		expect(
			screen.getByRole('button', { name: /agregar shampoo min/i }),
		).toHaveFocus();

		await act(async () => {
			await user.keyboard('{arrowdown}');
		});

		expect(
			screen.getByRole('button', { name: /agregar shampoo max/i }),
		).toHaveFocus();

		await act(async () => {
			await user.keyboard('{arrowup}');
		});

		expect(
			screen.getByRole('button', { name: /agregar shampoo min/i }),
		).toHaveFocus();

		await act(async () => {
			await user.keyboard('{enter}');
		});

		expect(
			screen.queryByRole('button', { name: /shampoo min/i }),
		).not.toBeInTheDocument();

		expect(input).toHaveValue('');
	});

	it('should search by ref and id', async () => {
		render(<RemixStub initialEntries={['/builder/pos']} />);
		const input = screen.getByRole('searchbox', {
			name: /presiona para agregar/i,
		});

		// search by reference
		await act(async () => {
			await user.type(input, 'Reference');
		});

		expect(
			screen.getByRole('button', { name: /common name/i }),
		).toBeInTheDocument();

		// search by id
		await act(async () => {
			await user.clear(input);
			await user.type(input, '12345');
		});

		expect(
			screen.getByRole('button', { name: /product by id/i }),
		).toBeInTheDocument();
	});

	it("should search by barcode and add automatically if there's only one result", async () => {
		render(<RemixStub initialEntries={['/builder/pos']} />);
		const input = screen.getByRole('searchbox', {
			name: /presiona para agregar/i,
		});

		await act(async () => {
			await user.type(input, '777222');
		});

		expect(screen.getByText(/common name/i)).toBeInTheDocument();
		expect(screen.getByText('$100')).toBeInTheDocument();
	});
});

function loader() {
	return [
		{ id: 1, name: 'Producto 1', prices: [], barCodes: [], tax: 0 },
		{ id: 2, name: 'Shampoo Min', prices: [], barCodes: [], tax: 0 },
		{ id: 3, name: 'Shampoo Max', prices: [], barCodes: [], tax: 0 },
		{
			id: 4,
			name: 'Common name',
			ref: 'Reference',
			prices: [{ id: 1, price: 100 }],
			barCodes: ['777222'],
			tax: 0,
		},
		{ id: 12345, name: 'Product by Id', prices: [], barCodes: [], tax: 0 },
	];
}

function Component() {
	return (
		<TestBuilderProvider builder={{ priceListId: 1 }}>
			<ProductSearchCombobox />
			<ProductsList />
		</TestBuilderProvider>
	);
}

function ProductsList() {
	const {
		state: { products },
	} = useBuilderContext();

	return (
		<div>
			{products.map(product => (
				<div key={product.id}>
					<p>{product.name}</p>
					<p>${product.price}</p>
				</div>
			))}
		</div>
	);
}
