import { PassThrough } from 'node:stream';
import {
	type EntryContext,
	createReadableStreamFromReadable,
} from '@remix-run/node';
import { RemixServer } from '@remix-run/react';
import { captureConsoleIntegration } from '@sentry/integrations';
import * as Sentry from '@sentry/remix';
import * as isbotModule from 'isbot';
import { renderToPipeableStream } from 'react-dom/server';
import { getPrivateEnv } from './utils/env.server';

const ABORT_DELAY = 5_000;
global.ENV = getPrivateEnv();

Sentry.init({
	// Disable Sentry for local development
	enabled: process.env.NODE_ENV !== 'development',
	dsn: 'https://6b6067f16a59b918a99c3ca8fc70e1c0@o4506927291236352.ingest.us.sentry.io/4506927296479232',
	environment: process.env.VILLING_ENV || 'local',
	integrations: [captureConsoleIntegration({ levels: ['error'] })],

	// Set tracesSampleRate to 1.0 to capture 100%
	// of transactions for performance monitoring.
	// We recommend adjusting this value in production
	tracesSampleRate: 0.2,
});

export default function handleRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	remixContext: EntryContext,
) {
	return isBotRequest(request.headers.get('user-agent'))
		? handleBotRequest(
				request,
				responseStatusCode,
				responseHeaders,
				remixContext,
			)
		: handleBrowserRequest(
				request,
				responseStatusCode,
				responseHeaders,
				remixContext,
			);
}

// We have some Remix apps in the wild already running with isbot@3 so we need
// to maintain backwards compatibility even though we want new apps to use
// isbot@4.  That way, we can ship this as a minor Semver update to @remix-run/dev.
function isBotRequest(userAgent: string | null) {
	if (!userAgent) {
		return false;
	}

	// isbot >= 3.8.0, >4
	if ('isbot' in isbotModule && typeof isbotModule.isbot === 'function') {
		return isbotModule.isbot(userAgent);
	}

	// isbot < 3.8.0
	if ('default' in isbotModule && typeof isbotModule.default === 'function') {
		return isbotModule.default(userAgent);
	}

	return false;
}

function handleBotRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	remixContext: EntryContext,
) {
	return new Promise((resolve, reject) => {
		let shellRendered = false;
		const { pipe, abort } = renderToPipeableStream(
			<RemixServer
				context={remixContext}
				url={request.url}
				abortDelay={ABORT_DELAY}
			/>,
			{
				onAllReady() {
					shellRendered = true;
					const body = new PassThrough();
					const stream = createReadableStreamFromReadable(body);

					responseHeaders.set('Content-Type', 'text/html');

					resolve(
						new Response(stream, {
							headers: responseHeaders,
							status: responseStatusCode,
						}),
					);

					pipe(body);
				},
				onShellError(error: unknown) {
					reject(error);
				},
				onError(error: unknown) {
					responseStatusCode = 500;
					// Log streaming rendering errors from inside the shell.  Don't log
					// errors encountered during initial shell rendering since they'll
					// reject and get logged in handleDocumentRequest.
					if (shellRendered) {
						console.error(error);
					}
				},
			},
		);

		setTimeout(abort, ABORT_DELAY);
	});
}

function handleBrowserRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	remixContext: EntryContext,
) {
	return new Promise((resolve, reject) => {
		let shellRendered = false;
		const { pipe, abort } = renderToPipeableStream(
			<RemixServer
				context={remixContext}
				url={request.url}
				abortDelay={ABORT_DELAY}
			/>,
			{
				onShellReady() {
					shellRendered = true;
					const body = new PassThrough();
					const stream = createReadableStreamFromReadable(body);

					responseHeaders.set('Content-Type', 'text/html');

					resolve(
						new Response(stream, {
							headers: responseHeaders,
							status: responseStatusCode,
						}),
					);

					pipe(body);
				},
				onShellError(error: unknown) {
					reject(error);
				},
				onError(error: unknown) {
					responseStatusCode = 500;
					// Log streaming rendering errors from inside the shell.  Don't log
					// errors encountered during initial shell rendering since they'll
					// reject and get logged in handleDocumentRequest.
					if (shellRendered) console.error(error);
				},
			},
		);

		setTimeout(abort, ABORT_DELAY);
	});
}
