import { v4 as uuid } from 'uuid';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import { fetchApi } from '../fetch-api.server';

// Mocking fetch globally
global.fetch = vi.fn();

vi.mock('uuid', () => ({
	v4: vi.fn().mockReturnValue('mocked-uuid'),
}));

describe('fetchApi', () => {
	let consoleErrorMock: any;

	beforeEach(() => {
		vi.resetAllMocks();
		consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		consoleErrorMock.mockRestore();
	});

	it('successfully fetches data', async () => {
		const mockJsonResponse = { key: 'value' };
		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => mockJsonResponse,
			headers: new Headers({ 'Content-Type': 'application/json' }),
		} as any);

		const response = await fetchApi('http://example.com', { method: 'GET' });

		expect(response).toEqual({ success: true, data: mockJsonResponse });
	});

	it('handles API error response', async () => {
		const mockErrorResponse = { message: 'Error occurred' };
		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: false,
			json: async () => mockErrorResponse,
			text: async () => JSON.stringify(mockErrorResponse),
			headers: new Headers({ 'Content-Type': 'application/json' }),
		} as any);

		const response = await fetchApi('http://example.com', { method: 'GET' });

		expect(response.success).toBeFalsy();
		expect(consoleErrorMock).toHaveBeenCalledWith({
			customMessage: 'Error in fetchApi',
			data: undefined,
			error: { message: 'Error occurred' },
			message: 'Error with referenceId: undefined',
			path: 'http://example.com',
		});
	});

	it('handles network or unknown errors', async () => {
		const error = new Error('Network error');

		vi.mocked(global.fetch).mockRejectedValueOnce(error);

		const response = await fetchApi('http://example.com', { method: 'GET' });

		expect(response.success).toBeFalsy();
		expect(consoleErrorMock).toHaveBeenCalledWith({
			customMessage: undefined,
			data: undefined,
			error: error,
			message: 'Error with referenceId: undefined',
			path: 'http://example.com',
		});
	});

	it('correctly parses JSON response when schema is provided', async () => {
		const schema = z.object({ id: z.string(), name: z.string() });
		const mockData = { id: '123', name: 'Test' };
		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => mockData,
			headers: new Headers({ 'Content-Type': 'application/json' }),
		} as any);

		const response = await fetchApi('http://example.com', {
			method: 'GET',
			schema,
		});

		expect(response).toEqual({ success: true, data: mockData });
	});

	it('returns error when response does not match schema', async () => {
		const schema = z.object({
			id: z.string(),
			name: z.string(),
		});
		const invalidData = { id: '123' }; // Missing 'name'
		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => invalidData,
			headers: new Headers({ 'Content-Type': 'application/json' }),
		} as any);

		const response = await fetchApi('http://example.com', {
			method: 'GET',
			schema,
		});

		expect(response.success).toBeFalsy();
		expect(consoleErrorMock).toHaveBeenCalledWith({
			customMessage: 'Error parsing response from DIAN',
			data: JSON.stringify(invalidData, null, 2),
			error: {
				fieldErrors: { name: ['Required'] },
				formErrors: [],
			},
			message: 'Error with referenceId: undefined',
			path: 'http://example.com',
		});
	});

	it('handles missing Content-Type header gracefully', async () => {
		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: true,
			json: async () => ({}),
			headers: new Headers(), // No 'Content-Type'
		} as any);

		const response = await fetchApi('http://example.com', { method: 'GET' });

		expect(response).toEqual({ success: true, data: {} }); // Since it defaults to true if not JSON
	});

	it('logs error with referenceId on failure', async () => {
		vi.mocked(uuid).mockReturnValue('mocked-uuid');
		const mockErrorResponse = { message: 'Error occurred' };
		vi.mocked(global.fetch).mockResolvedValueOnce({
			ok: false,
			json: async () => mockErrorResponse,
			headers: new Headers({ 'Content-Type': 'application/json' }),
		} as any);

		await fetchApi('http://example.com', { method: 'GET' });

		expect(consoleErrorMock).toHaveBeenCalledWith({
			customMessage: 'Error in fetchApi',
			data: undefined,
			error: { message: 'Error occurred' },
			message: 'Error with referenceId: mocked-uuid',
			path: 'http://example.com',
		});
	});
});
