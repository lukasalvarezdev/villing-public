import * as React from 'react';
import { formatDate } from '~/utils/misc';

/**
 * @deprecated Pass a function as children to avoid issues with client only
 * imported components
 */
type DeprecatedProps = {
	children: React.ReactNode;
	fallback?: React.ReactNode;
};

type Props =
	| DeprecatedProps
	| {
			/**
			 * You are encouraged to add a fallback that is the same dimensions
			 * as the client rendered children. This will avoid content layout
			 * shift which is disgusting
			 */
			children: () => React.ReactNode;
			fallback?: React.ReactNode;
	  };

/**
 * Render the children only after the JS has loaded client-side. Use an optional
 * fallback component if the JS is not yet loaded.
 *
 * Example: Render a Chart component if JS loads, renders a simple FakeChart
 * component server-side or if there is no JS. The FakeChart can have only the
 * UI without the behavior or be a loading spinner or skeleton.
 * ```tsx
 * return (
 *   <ClientOnly fallback={<FakeChart />}>
 *     {() => <Chart />}
 *   </ClientOnly>
 * );
 * ```
 */
export function ClientOnly({ children, fallback = null }: Props) {
	if (typeof children !== 'function') {
		// eslint-disable-next-line no-console
		console.warn(
			'[remix-utils] ClientOnly: Pass a function as children to avoid issues with client-only imported components',
		);
	}
	const isHydrated = useHydrated();

	if (!isHydrated) return fallback;
	return typeof children === 'function' ? children() : children;
}

/**
 *  This component is used to wrap a date string that is generated on the client
 *  side to avoid a mismatch between the server and client dates.
 */
export function DateString({ children }: { children: React.ReactNode }) {
	return (
		<ClientOnly fallback={formatDate(new Date())}>{() => children}</ClientOnly>
	);
}

let hydrating = true;

/**
 * Return a boolean indicating if the JS has been hydrated already.
 * When doing Server-Side Rendering, the result will always be false.
 * When doing Client-Side Rendering, the result will always be false on the
 * first render and true from then on. Even if a new component renders it will
 * always start with true.
 *
 * Example: Disable a button that needs JS to work.
 * ```tsx
 * let hydrated = useHydrated();
 * return (
 *   <button type="button" disabled={!hydrated} onClick={doSomethingCustom}>
 *     Click me
 *   </button>
 * );
 * ```
 */
function useHydrated() {
	const [hydrated, setHydrated] = React.useState(() => !hydrating);

	React.useEffect(function hydrate() {
		hydrating = false;
		setHydrated(true);
	}, []);

	return hydrated;
}
