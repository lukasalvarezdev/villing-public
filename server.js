/* eslint-disable no-console */
import { createRequestHandler } from '@remix-run/express';
import { installGlobals } from '@remix-run/node';
import { wrapExpressCreateRequestHandler } from '@sentry/remix';
import compression from 'compression';
import express from 'express';
import morgan from 'morgan';

const sentryCreateRequestHandler =
	wrapExpressCreateRequestHandler(createRequestHandler);

installGlobals();

const viteDevServer =
	process.env.NODE_ENV === 'production'
		? undefined
		: await import('vite').then(vite => {
				return vite.createServer({
					server: { middlewareMode: true },
				});
			});

const remixHandler = sentryCreateRequestHandler({
	build: viteDevServer
		? () => viteDevServer.ssrLoadModule('virtual:remix/server-build')
		: await import('./build/server/index.js'),
});

const app = express();

app.use(compression());

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable('x-powered-by');

// handle asset requests
if (viteDevServer) {
	app.use(viteDevServer.middlewares);
} else {
	// Vite fingerprints its assets so we can cache forever.
	app.use(
		'/assets',
		express.static('build/client/assets', {
			immutable: true,
			maxAge: '1y',
			setHeaders(res, resourcePath) {
				const relativePath = resourcePath.replace('build/client/assets', '');
				if (relativePath.startsWith('build/info.json')) {
					res.setHeader('cache-control', 'no-cache');
					return;
				}
				// If we ever change our font (which we quite possibly never will)
				// then we'll just want to change the filename or something...
				// Remix fingerprints its assets so we can cache forever
				if (
					relativePath.startsWith('fonts') ||
					relativePath.startsWith('build')
				) {
					res.setHeader('cache-control', 'public, max-age=31536000, immutable');
				}
			},
		}),
	);
}

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static('build/client', { maxAge: '1h' }));

app.use(morgan('tiny'));

// handle SSR requests
app.all('*', remixHandler);

const port = process.env.PORT || 3000;
app.listen(port, () => {
	console.log(`Express server listening at http://localhost:${port}`);
});
app.listen(3001, '0.0.0.0', () => {
	console.log(`Express server listening at http://localhost:${port}`);
});
