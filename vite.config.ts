/* eslint-disable no-console */
import { vitePlugin as remix } from '@remix-run/dev';
import { installGlobals } from '@remix-run/node';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

installGlobals();

export default defineConfig({
	server: { port: 3000 },

	plugins: [
		remix({
			ignoredRouteFiles: ['**/.*'],
			routes(defineRoutes) {
				return defineRoutes(route => {
					if (process.env.NODE_ENV === 'test') {
						console.log('Setup test route ✅', 'test-routes/test-login.ts');
						route('test-login', 'test-routes/test-login.ts');

						console.log('Setup test route ✅', 'test-routes/cleanup.ts');
						route('cleanup', 'test-routes/cleanup.ts');
					}
				});
			},
		}),
		tsconfigPaths(),
		sentryVitePlugin({
			org: 'villing',
			project: 'dashboard',
			authToken: process.env.SENTRY_AUTH_TOKEN,
		}),
	],

	resolve: {
		alias: { '~': '/app' },
	},

	build: {
		sourcemap: true,
	},
});
