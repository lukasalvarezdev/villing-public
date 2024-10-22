declare global {
	interface Window {
		gtag: (
			option: string,
			gaTrackingId: string,
			options: Record<string, unknown>,
		) => void;
	}
}

/**
 * @example
 * https://developers.google.com/analytics/devguides/collection/gtagjs/pages
 */
export const pageview = (url: string, trackingId: string) => {
	if (!window.gtag) {
		console.warn(
			'window.gtag is not defined. This could mean your google analytics script has not loaded on the page yet.',
		);
		return;
	}
	window.gtag('config', trackingId, {
		page_path: url,
	});
};

/**
 * @example
 * https://developers.google.com/analytics/devguides/collection/gtagjs/events
 */
export const event = ({
	action,
	category,
	label,
	value,
	event_timeout,
}: Record<string, string | number>) => {
	if (!window.gtag) {
		console.warn(
			'window.gtag is not defined. This could mean your google analytics script has not loaded on the page yet.',
		);
		return;
	}
	window.gtag('event', action as string, {
		value,
		event_timeout,
		event_label: label,
		event_category: category,
	});
};
