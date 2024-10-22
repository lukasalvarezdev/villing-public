import { createRemixStub } from '@remix-run/testing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import { PriceListSelect } from '../price-list-selector';
import { TestBuilderProvider } from '../test-utils';

const user = userEvent.setup();

vi.mock('~/root', () => ({
	useOrganization: () => ({ data: { config: { retention: 0 } } }),
}));

vi.mock('@remix-run/react', async importOriginal => {
	// eslint-disable-next-line @typescript-eslint/consistent-type-imports
	const mod = await importOriginal<typeof import('@remix-run/react')>();
	return {
		...mod,
		useLoaderData: () => ({
			priceLists: [
				{ id: '1', name: 'Price List 1' },
				{ id: '2', name: 'Price List 2' },
			],
		}),
		useParams: () => ({ type: 'pos' }),
	};
});

const RemixStub = createRemixStub([{ path: '/builder/:type/new', Component }]);

function Component() {
	return (
		<TestBuilderProvider builder={{ priceListId: undefined }}>
			<PriceListSelect />
		</TestBuilderProvider>
	);
}

describe('builder price list', () => {
	beforeAll(() => {
		// Delete window.location before setting your mock to avoid Jest's read-only error
		delete (window as any).location;

		window.location = { pathname: '/builder/pos/new' } as any;
	});

	afterAll(() => {
		window.location = location;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should show a warning before changing the price list', async () => {
		render(<RemixStub initialEntries={['/builder/pos/new']} />);

		const select = screen.getByRole('combobox', { name: /lista de precios/i });

		expect(select).toHaveValue('');

		await act(async () => {
			await user.selectOptions(select, '1');
		});

		expect(screen.getByText(/cambiar lista de precios/i)).toBeInTheDocument();

		await act(async () => {
			await user.click(screen.getByRole('button', { name: /si, cambiar/i }));
		});

		expect(
			screen.queryByText(/cambiar lista de precios/i),
		).not.toBeInTheDocument();
		expect(select).toHaveValue('1');
	});
});
