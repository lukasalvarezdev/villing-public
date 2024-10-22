/* eslint-disable @typescript-eslint/consistent-type-imports */
import { createRemixStub } from '@remix-run/testing';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { matchMediaMock } from 'test/setup';
import { useBuilderFetcher, useBuilderType } from '../misc';
import { InvoicePrinter } from '../route';
import { TestBuilderProvider } from '../test-utils';

vi.mock('../misc');
vi.mock('~/root', () => ({
	useOrganization: () => ({ name: 'EMPRESA' }),
	useUser: () => ({ name: 'USUARIO' }),
}));

vi.mock('../builder/context', async importOriginal => {
	const mod = await importOriginal<typeof import('../builder/context')>();
	return {
		...mod,
		useBuilderContext: () => ({
			state: { shouldPrint: true },
			dispatch: vi.fn(),
		}),
	};
});

const RemixStub = createRemixStub([{ path: '/builder/:type/new', Component }]);

function Component() {
	return (
		<TestBuilderProvider>
			<InvoicePrinter />
		</TestBuilderProvider>
	);
}

const originalPrint = window.print;
const originalOpen = window.open;

describe('InvoicePrinter', () => {
	beforeEach(() => {
		window.print = vi.fn();
		window.open = vi.fn();
		vi.mocked(window.matchMedia).mockReturnValue(matchMediaMock('print'));
	});

	afterEach(() => {
		vi.restoreAllMocks();
		window.print = originalPrint;
		window.open = originalOpen;
	});

	it('should not render <BillContent /> nor call print window', async () => {
		vi.mocked(useBuilderType).mockReturnValue('pos');

		render(<RemixStub initialEntries={['/builder/pos/new']} />);

		expect(screen.queryByText(/empresa/i)).not.toBeInTheDocument();
		expect(window.print).not.toHaveBeenCalled();
		expect(window.open).not.toHaveBeenCalled();
	});

	it('should call open window', async () => {
		vi.mocked(useBuilderType).mockReturnValue('pos');
		vi.mocked(useBuilderFetcher).mockReturnValue({
			data: {
				submissionId: 'sub123',
				reset: true,
				redirectTo: '/invoice/pos/1?print=true',
			},
		} as any);

		render(<RemixStub initialEntries={['/builder/pos/new']} />);

		expect(screen.queryByText(/empresa/i)).not.toBeInTheDocument();
		expect(window.print).not.toHaveBeenCalled();
		expect(window.open).toHaveBeenCalledOnce();
		expect(window.open).toHaveBeenCalledWith(
			'/invoice/pos/1?print=true',
			'_blank',
		);
	});

	it('should render <BillContent /> and call print window', async () => {
		vi.mocked(useBuilderType).mockReturnValue('pos');
		vi.mocked(useBuilderFetcher).mockReturnValue({
			data: { submissionId: 'sub123', reset: true, intent: 'pos' },
		} as any);

		render(<RemixStub initialEntries={['/builder/pos/new']} />);

		expect(window.print).toHaveBeenCalledOnce();
		expect(window.open).not.toHaveBeenCalled();
	});
});
