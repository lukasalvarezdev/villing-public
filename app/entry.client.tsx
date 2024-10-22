import { RemixBrowser, useLocation, useMatches } from '@remix-run/react';
import { captureConsoleIntegration } from '@sentry/integrations';
import * as Sentry from '@sentry/remix';
import { startTransition, StrictMode, useEffect } from 'react';
import { hydrateRoot } from 'react-dom/client';

// Read deployEnv from HTML delivered from server before the app is booted up
const deployEnv =
	window.__remixContext.state.loaderData?.root.deployEnv || 'local';
const emailHashed =
	window.__remixContext.state.loaderData?.root.emailHashed || 'unknown';

Sentry.init({
	// Disable Sentry for local development
	enabled: process.env.NODE_ENV !== 'development',
	dsn: 'https://6b6067f16a59b918a99c3ca8fc70e1c0@o4506927291236352.ingest.us.sentry.io/4506927296479232',
	environment: deployEnv,
	integrations: [
		Sentry.browserTracingIntegration({
			useEffect,
			useLocation,
			useMatches,
		}),
		// Replay is only available in the client
		Sentry.replayIntegration(),
		captureConsoleIntegration({
			levels: ['error'],
		}),
	],
	initialScope: {
		user: { id: emailHashed },
	},

	// Set tracesSampleRate to 1.0 to capture 100%
	// of transactions for performance monitoring.
	// We recommend adjusting this value in production
	tracesSampleRate: 0.1,

	// Set `tracePropagationTargets` to control for which URLs distributed tracing should be enabled
	tracePropagationTargets: [
		'localhost',
		/https?:\/\/([^.]+.)?villing\.io[^\s]*/,
	],

	// Capture Replay for 10% of all sessions,
	// plus for 100% of sessions with an error
	replaysSessionSampleRate: 0.1,
	replaysOnErrorSampleRate: 1.0,
});

startTransition(() => {
	hydrateRoot(
		document,
		<StrictMode>
			<RemixBrowser />
		</StrictMode>,
	);
});
