import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PrintableContent } from '../printable-content';

describe('PrintableContent', () => {
	// When using position:fixed, the print dialog will not show many pages
	it('should render with absolute position, not fixed', () => {
		render(<PrintableContent>Test</PrintableContent>);

		expect(screen.getByText('Test')).toHaveClass('sr-only');
	});
});
