import { createRemixStub } from '@remix-run/testing';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SettingsButton } from '../blocks';
import {
	useBuilderType,
	getBuilderTypeFromPath,
	useLegalActions,
} from '../misc';
import { TestBuilderProvider } from '../test-utils';

const user = userEvent.setup();

vi.mock('~/root', () => ({
	useOrganization: () => ({ data: { config: { retention: 0 } } }),
}));

vi.mock('../misc', () => {
	return {
		useBuilderType: vi.fn(),
		getBuilderTypeFromPath: vi.fn(),
		useLegalActions: vi.fn(),
	};
});

const RemixStub = createRemixStub([{ path: '/builder/:type/new', Component }]);

function Component() {
	return (
		<TestBuilderProvider>
			<SettingsButton>
				<button>Ajustes</button>
			</SettingsButton>
		</TestBuilderProvider>
	);
}

describe('SettingsButton', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('should render pos settings items', async () => {
		vi.mocked(useBuilderType).mockReturnValue('pos');
		vi.mocked(getBuilderTypeFromPath).mockReturnValue('pos');
		vi.mocked(useLegalActions).mockReturnValue({
			legalActions: ['close cashier', 'update config'],
		});

		render(<RemixStub initialEntries={['/builder/pos/new']} />);

		const button = screen.getByRole('button', { name: /Ajustes/ });
		expect(button).toBeInTheDocument();

		await act(async () => {
			await user.click(button);
		});

		expect(
			screen.getByRole('menuitem', { name: /Cerrar el cajero/ }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('menuitem', { name: /Limpiar la venta/ }),
		).toBeInTheDocument();
		expect(
			screen.getByRole('menuitem', { name: /Ajustes de sucursal/ }),
		).toBeInTheDocument();
	});

	it('should purchase remision/invoice settings items', async () => {
		vi.mocked(useBuilderType).mockReturnValue('purchaseRemision');
		vi.mocked(getBuilderTypeFromPath).mockReturnValue('purchaseRemision');
		vi.mocked(useLegalActions).mockReturnValue({
			legalActions: ['update general config'],
		});

		render(<RemixStub initialEntries={['/builder/purchaseRemision/new']} />);

		const button = screen.getByRole('button', { name: /Ajustes/ });
		expect(button).toBeInTheDocument();

		await act(async () => {
			await user.click(button);
		});

		expect(
			screen.queryByRole('menuitem', { name: /Cerrar el cajero/ }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole('menuitem', { name: /Limpiar la venta/ }),
		).toBeInTheDocument();
		expect(
			screen.queryByRole('menuitem', { name: /Ajustes de sucursal/ }),
		).not.toBeInTheDocument();
		expect(
			screen.getByRole('button', { name: /Ajustes generales/ }),
		).toBeInTheDocument();
	});
});
