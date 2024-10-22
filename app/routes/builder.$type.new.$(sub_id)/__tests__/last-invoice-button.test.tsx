import { createRemixStub } from '@remix-run/testing';
import { render, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SeeLastInvoiceButton } from '../last-invoice-button';
import { useBuilderFetcher } from '../misc';
import { TestBuilderProvider } from '../test-utils';

const value = {
	data: {
		invoice: { internalId: '123', total: 100 },
		intent: 'pos',
		submissionId: 'sub123',
	},
} as any;
vi.mock('../misc');

vi.mock('~/root', () => ({
	useOrganization: () => ({ data: { config: { retention: 0 } } }),
}));

const RemixStub = createRemixStub([{ path: '/builder/:type/new', Component }]);

function Component() {
	return (
		<TestBuilderProvider>
			<SeeLastInvoiceButton />
		</TestBuilderProvider>
	);
}

describe('SeeLastInvoiceButton', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders null when there is no invoice or intent', () => {
		vi.mocked(useBuilderFetcher).mockReturnValue({ data: {} } as any);

		const { container } = render(
			<RemixStub initialEntries={['/builder/pos/new']} />,
		);
		expect(container.firstChild).toBeNull();
	});

	it('should render button and handle toggle', () => {
		vi.mocked(useBuilderFetcher).mockReturnValue(value);

		render(<RemixStub initialEntries={['/builder/pos/new']} />);
		const button = screen.getByLabelText('Ver última factura');
		expect(button).toBeInTheDocument();

		// Open the invoice details
		fireEvent.click(button);
		const box = screen.getByText(/No. 123/);
		expect(box).toBeInTheDocument();

		// Close the invoice details
		fireEvent.click(button);
		expect(box).not.toBeVisible();
	});

	it('should show the notification span with animate-bounce when submissionId has not been opened', () => {
		vi.mocked(useBuilderFetcher).mockReturnValue(value);

		render(<RemixStub initialEntries={['/builder/pos/new']} />);
		const notificationSpan = screen.getByText('1');
		expect(notificationSpan).toHaveClass('animate-bounce');
	});

	it('should remove animate-bounce from notification span after opening', () => {
		vi.mocked(useBuilderFetcher).mockReturnValue(value);

		render(<RemixStub initialEntries={['/builder/pos/new']} />);
		const button = screen.getByLabelText('Ver última factura');
		fireEvent.click(button);
		const notificationSpan = screen.getByText('1');
		expect(notificationSpan).not.toHaveClass('animate-bounce');
	});
});
