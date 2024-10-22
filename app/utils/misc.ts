import { useActionData, useFormAction, useNavigation } from '@remix-run/react';
import clsx, { type ClassValue } from 'clsx';
import * as React from 'react';
import { twMerge } from 'tailwind-merge';
import { parseNumber } from '~/modules/invoice/invoice-math';
import { getPercentageValue } from './math';
export { v4 as uuid } from 'uuid';

export function isMobileDevice(request: Request): boolean {
	const userAgent = request.headers.get('user-agent');
	return /Mobile|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
		userAgent || '',
	);
}

/**
 * A handy utility that makes constructing class names easier.
 * It also merges tailwind classes.
 */
export function cn(...inputs: Array<ClassValue>) {
	return twMerge(clsx(inputs));
}

/**
 * Returns true if the current navigation is submitting the current route's
 * form. Defaults to the current route's form action and method POST.
 */
export function useIsSubmitting(
	intent?: string,
	method: 'GET' | 'POST' = 'POST',
) {
	const navigation = useNavigation();
	const formAction = useFormAction();
	const isSubmitting =
		formAction === navigation.formAction && navigation.formMethod === method;
	const isSubmittingWithIntent = intent
		? intent === navigation.formData?.get('intent')?.toString()
		: true;

	return isSubmitting && isSubmittingWithIntent;
}

const MOUSEDOWN = 'mousedown';
const TOUCHSTART = 'touchstart';

type HandledEvents = [typeof MOUSEDOWN, typeof TOUCHSTART];
type HandledEventsType = HandledEvents[number];
type PossibleEvent = {
	[Type in HandledEventsType]: HTMLElementEventMap[Type];
}[HandledEventsType];
type Handler = (event: PossibleEvent) => void;
type Options = {
	preventOnDialog?: boolean;
};

export function useOnClickOutside(
	ref: React.RefObject<HTMLElement>,
	handler: Handler,
	options?: Options,
) {
	React.useEffect(() => {
		const listener = (event: PossibleEvent) => {
			// Do nothing if clicking ref's element or descendent elements
			if (!ref.current || ref.current.contains(event.target as Node)) {
				return;
			}

			// Do nothing if clicking inside a <dialog>
			if (
				options?.preventOnDialog &&
				event.target instanceof HTMLElement &&
				event.target.closest('dialog')
			) {
				return;
			}

			handler(event);
		};
		document.addEventListener('click', listener);

		return () => {
			document.removeEventListener('click', listener);
		};
	}, [ref, handler, options?.preventOnDialog]);
}

/**
 * Provide a condition and if that condition is falsey, this throws a 400
 * Response with the given message.
 *
 * inspired by invariant from 'tiny-invariant'
 *
 * @example
 * invariantResponse(typeof value === 'string', `value must be a string`)
 *
 * @param condition The condition to check
 * @param message The message to throw
 * @param responseInit Additional response init options if a response is thrown
 *
 * @throws {Response} if condition is falsey
 */
export function invariantResponse(
	condition: any,
	message?: string | (() => string),
	responseInit?: ResponseInit,
): asserts condition {
	if (!condition) {
		throw new Response(
			typeof message === 'function'
				? message()
				: message ||
					'An invariant failed, please provide a message to explain why.',
			{ status: 400, ...responseInit },
		);
	}
}

const DEFAULT_REDIRECT = '/';

/**
 * This should be used any time the redirect path is user-provided
 * (Like the query string on our login/signup pages). This avoids
 * open-redirect vulnerabilities.
 * @param {string} to The redirect destination
 * @param {string} defaultRedirect The redirect to use if the to is unsafe.
 */
export function safeRedirect(
	to: FormDataEntryValue | string | null | undefined,
	defaultRedirect: string = DEFAULT_REDIRECT,
) {
	if (!to || typeof to !== 'string') return defaultRedirect;

	if (!to.startsWith('/') || to.startsWith('//')) {
		return defaultRedirect;
	}

	return to;
}

export function getRequestSearchParams(request: Request) {
	const url = new URL(request.url);
	return url.searchParams;
}

export async function parseFormData(request: Request) {
	return new URLSearchParams(await request.text());
}

export function formatDate(date: Date | string) {
	try {
		const dateObj = typeof date === 'string' ? new Date(date) : date;

		const formatter = new Intl.DateTimeFormat('es-CO', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		});
		const [dayObj, , monthObj, , yearObj] = formatter.formatToParts(dateObj);
		invariant(dayObj && monthObj && yearObj, 'Invalid date');

		const { value: day } = dayObj;
		const { value: month } = monthObj;
		const { value: year } = yearObj;

		const firstLetter = month.charAt(0);
		const rest = month.slice(1);
		const formattedMonth = `${firstLetter.toUpperCase()}${rest}`;

		return `${formattedMonth} ${day}, ${year}`;
	} catch (error) {
		return '';
	}
}

export function formatHours(date: string | Date) {
	return new Intl.DateTimeFormat('en-US', {
		hour: 'numeric',
		minute: 'numeric',
		hour12: true,
	}).format(new Date(date));
}

export function rawRemoveComas(x: string) {
	return Number(String(x)?.replace(/,/g, ''));
}

export function toNumber(value: unknown): number {
	if (typeof value === 'string' && value.includes(',')) {
		return toNumber(rawRemoveComas(value));
	}
	const num = Number(value);

	return isNaN(num) ? 0 : num;
}

export function formatCurrency(number: number) {
	return new Intl.NumberFormat('en-US', {
		signDisplay: 'auto',
		currency: 'USD',
		maximumFractionDigits: 2,
	}).format(parseFloatValue(number));
}

function parseFloatValue(value: unknown): number {
	return Number(toNumber(value).toFixed(2));
}

export function toStartOfDay(date: string) {
	const startOfDay = new Date(date);
	startOfDay.setUTCHours(0, 0, 0, 0);

	return addLocalOffset(startOfDay);
}

function addLocalOffset(date: Date) {
	const localOffset = 18000000;
	return new Date(date.getTime() + localOffset);
}

export function getTodayInColombia(defaultDate?: Date) {
	const date = defaultDate || getColombiaDate();
	const colombiaDate = date.toLocaleDateString();
	const month = colombiaDate.split('/')[0];
	const day = colombiaDate.split('/')[1];
	const year = colombiaDate.split('/')[2];

	return `${year}-${addLeftCero(month)}-${addLeftCero(day)}`;

	function addLeftCero(str?: string) {
		return str?.length === 1 ? `0${str}` : str;
	}
}

export function getColombiaDate(defaultDate?: Date) {
	const date = defaultDate || new Date();

	const offset = date.getTimezoneOffset();
	const colombiaOffset = -300; // UTC-5
	const localTime =
		date.getTime() + offset * 60 * 1000 + colombiaOffset * 60 * 1000;
	return new Date(localTime);
}

export function stringToTsVector(text: string) {
	const sanitizedText = text.replace(/[&|!@#$%^&*(),.?":{}]/g, ' ');
	const words = sanitizedText.split(/\s+/);
	const tsVector = words
		.filter(word => word.trim() !== '')
		.map(word => `${word}:*`)
		.join(' & ');

	return tsVector;
}

export function getLastDayOfMonth() {
	const date = getColombiaDate();
	const year = date.getFullYear();
	const month = parseInt(date.toISOString().split('-')[1]!);

	const lastDayOfMonth = new Date(
		date.getFullYear(),
		date.getMonth() + 1,
		0,
	).getDate();

	return `${year}-${month < 10 ? '0' + month : month}-${
		lastDayOfMonth < 10 ? '0' + lastDayOfMonth : lastDayOfMonth
	}`;
}

export function getFirstDayOfMonth() {
	const date = getColombiaDate();
	const month = parseInt(date.toISOString().split('-')[1]!);
	const year = date.getFullYear();

	return `${year}-${month < 10 ? '0' + month : month}-01`;
}

export function getSearchParamsWithDefaultDateRange(
	request: Request,
	alwayKeep?: boolean,
) {
	const searchParams = getRequestSearchParams(request);

	const start = searchParams.get('start');
	const end = searchParams.get('end');

	if (!start) {
		searchParams.set('start', getFirstDayOfMonth());
	}

	if (!end) {
		searchParams.set('end', getLastDayOfMonth());
	}

	// TODO: add a dynamic way to exclude params
	const searchParamsEntriesLength = Array.from(searchParams.entries()).length;
	const page = searchParams.get('page');
	const month = searchParams.get('month');

	// Remove the start and end params if there are more than 3 params
	// because the user might have added a filter, but exclude the page param
	const shouldRemove =
		searchParamsEntriesLength > 2 && !start && !end && !page && !month;

	if (shouldRemove && !alwayKeep) {
		searchParams.delete('start');
		searchParams.delete('end');
	}

	return searchParams;
}

export function safeNewDate(date: unknown) {
	try {
		if (date instanceof Date) return date;
		if (!date || typeof date !== 'string') return undefined;
		return new Date(date);
	} catch (error) {
		return undefined;
	}
}

export function safeNewDateUTC(ISOString: string) {
	try {
		const date = new Date(ISOString);
		return new Date(date.toISOString().slice(0, -1));
	} catch (error) {
		return undefined;
	}
}

export function deepCopy<T>(obj: T): T {
	return JSON.parse(JSON.stringify(obj));
}

export function addTax(value: number, tax: number) {
	return value + (value * tax) / 100;
}

export function compareStrings(a?: string, b?: string) {
	return Boolean(a?.toLowerCase().trim() === b?.toLowerCase().trim());
}

export function isNumber(value: unknown) {
	const strValue = String(value);

	// Remove all "," "." and "$" characters
	const cleanedValue = strValue.replace(/[$,.]/g, '');

	if (!/^\d+(\.\d+)?$/.test(cleanedValue)) {
		return false;
	}

	return true;
}

export type PartialWithMandatory<T, K extends keyof T> = Pick<T, K> &
	Partial<Omit<T, K>>;

export function waitForElm(selector: string): Promise<HTMLElement> {
	return new Promise(resolve => {
		const element = document.querySelector(selector);

		if (
			element instanceof HTMLElement &&
			!(element instanceof HTMLImageElement)
		) {
			resolve(element);
		}

		if (element instanceof HTMLElement) {
			// Save the original display value
			const originalDisplay = element.style.display;
			element.style.display = 'block'; // Change it to 'block' or appropriate value

			// Wait for the image to load (optional, if it's an image)
			if (element instanceof HTMLImageElement) {
				element.onload = () => {
					resolve(element);
				};
			} else {
				resolve(element);
			}

			// Revert the display property after a short delay (e.g., 100ms) to ensure it doesn't affect printing
			setTimeout(() => {
				element.style.display = originalDisplay;
			}, 100);
		} else {
			const observer = new MutationObserver(() => {
				const target = document.querySelector(selector);
				if (target instanceof HTMLElement) {
					// Save the original display value
					const originalDisplay = target.style.display;
					target.style.display = 'block'; // Change it to 'block' or appropriate value

					// Wait for the image to load (optional, if it's an image)
					if (target instanceof HTMLImageElement) {
						target.onload = () => {
							resolve(target);
						};
					} else {
						resolve(target);
					}

					// Revert the display property after a short delay (e.g., 100ms) to ensure it doesn't affect printing
					setTimeout(() => {
						target.style.display = originalDisplay;
					}, 100);

					observer.disconnect();
				}
			});

			observer.observe(document.body, { childList: true, subtree: true });
		}
	});
}

export function parsePaymentMethod(
	method: 'cash' | 'card' | 'transfer' | 'loan',
) {
	switch (method) {
		case 'cash':
			return 'Efectivo';
		case 'transfer':
			return 'Transferencia bancaria';
		case 'card':
			return 'Datáfono';
		case 'loan':
			return 'Entidad crediticia';
		default:
			return 'Efectivo';
	}
}

export function parseDateToYYYYMMDD(date: Date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

export function getTaxValueFromPriceWithoutTax(price: number, tax: number) {
	return price * (tax / 100);
}

export function getTaxValueFromPriceWithTax({
	price,
	tax,
}: {
	price: number;
	tax: number;
}) {
	return price - price / Number(`1.${tax}`);
}

export function getFirstAndLastDayOfMonth() {
	return {
		firstDay: getFirstDayOfMonth(),
		lastDay: getLastDayOfMonth(),
	};
}

export function toEndOfDay(date: string) {
	const endOfDay = new Date(date);
	endOfDay.setUTCHours(23, 59, 59, 999);

	return addLocalOffset(endOfDay);
}

export const MAX_FILE_SIZE = 1024 * 1024 * 1; // 1MB

export function isDate(value: unknown): value is Date {
	return value instanceof Date;
}

type BaseItem = { id: number | string; name: string };
export function match<TItem extends BaseItem>(
	items: Array<TItem>,
	search: string,
) {
	return items.filter(item =>
		item.name.toLowerCase().includes(search.toLowerCase()),
	);
}

export function useContextMenuState() {
	const menuId = React.useId();
	const [menuState, setMenuState] = React.useState({
		isOpen: false,
		top: 0,
		left: 0,
	});
	const containerRef = React.useRef<HTMLDivElement>(null);
	useOnClickOutside(containerRef, () =>
		setMenuState({ isOpen: false, top: 0, left: 0 }),
	);

	React.useEffect(() => {
		const originalStyle = window.getComputedStyle(document.body).overflow;
		if (menuState.isOpen) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = originalStyle;
		}

		return () => {
			document.body.style.overflow = originalStyle;
		};
	}, [menuState.isOpen]);

	function toggleMenu() {
		if (containerRef.current) {
			const rect = containerRef.current.getBoundingClientRect();
			const windowHeight =
				window.innerHeight || document.documentElement.clientHeight;
			const spaceAbove = rect.top;
			const spaceBelow = windowHeight - rect.bottom;
			const threshold = 100; // Adjust this threshold as needed

			const openUpwards = spaceAbove > spaceBelow + threshold;

			// calculate the top and left position for the menu
			const top = openUpwards ? rect.top - 120 : rect.bottom + 5;

			const menuElement = document.getElementById(menuId);
			const menuWidth = menuElement?.offsetWidth || 0;
			const left = rect.left - menuWidth;

			setMenuState({ isOpen: !menuState.isOpen, left, top });
		}
	}

	return { menuId, menuState, containerRef, toggleMenu };
}

export function getDaysLeft(date: Date) {
	const today = getColombiaDate();
	const diffTime = date.getTime() - today.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	return diffDays;
}

export function stringifyError(error: Error): string {
	return `Error Name: ${error.name}\nError Message: ${error.message}\nStack Trace: ${error.stack}`;
}

export type NullableFieldsOptional<T extends Record<string, any>> = {
	[K in keyof T]: null extends T[K] ? NonNullable<T[K]> | undefined : T[K];
};

export type MakeNullableFieldsOptional<T> = {
	[P in keyof T as null extends T[P] ? P : never]?: T[P];
} & {
	[P in keyof T as null extends T[P] ? never : P]: T[P];
};

export function invariant(
	condition: any,
	message?: string | (() => string),
): asserts condition {
	if (!condition) {
		throw new Error(
			typeof message === 'function'
				? message()
				: message ||
					'An invariant failed, please provide a message to explain why.',
		);
	}
}

export function getDaysDiff(date1: Date, date2: Date) {
	return Math.floor(
		(date1.getTime() - date2.getTime()) / (1000 * 60 * 60 * 24),
	);
}

export function getTo({
	pathname,
	search,
}: {
	pathname: string;
	search: string;
}) {
	try {
		const urlPathname = pathname.startsWith('/') ? pathname : `/${pathname}`;
		const url = new URL(`http://localhost:3000${urlPathname}`);

		const urlSearchParams = url.searchParams;
		const searchParams = new URLSearchParams(search);

		searchParams.forEach((value, key) => {
			urlSearchParams.delete(key);
			urlSearchParams.set(key, value);
		});

		// This is to keep the relative path of the URL
		const pathnameWithoutSearch = pathname.split('?')[0];
		return `${pathnameWithoutSearch}?${urlSearchParams.toString()}`;
	} catch (error) {
		return '';
	}
}

export function desNullify<T extends Record<string, any>>(
	obj: T,
): NullableFieldsOptional<T> {
	return Object.fromEntries(
		Object.entries(obj).map(([key, value]) => {
			if (value === null) {
				return [key, undefined] as const;
			}
			return [key, value] as const;
		}),
	) as NullableFieldsOptional<T>;
}

export function parseRecordToZodEnum<T extends Record<string, any>>(obj: T) {
	return Object.values(obj) as [(typeof obj)[keyof T]];
}

export function addTrailingCero(value: number) {
	return String(value).padStart(2, '0');
}

/**
 A hook to show a success message when an action is successful. The message
 will be shown for 5 seconds.
 */
export function useActionSuccess() {
	const [success, setSuccess] = React.useState(false);
	const actionData = useActionData<{ success?: boolean }>();

	React.useEffect(() => {
		if (actionData?.success) {
			setSuccess(true);

			setTimeout(() => {
				setSuccess(false);
			}, 5000);
		}
	}, [actionData?.success]);

	return success;
}

export function useActionError() {
	const actionData = useActionData<{ error?: string }>();
	return actionData?.error;
}

export function addDays(date: Date, days: number): Date {
	let result = new Date(date);
	result.setDate(result.getDate() + days);
	return result;
}

export const baseWhatsappUrl = 'https://wa.me/3123164029';

export function addTaxToPrice(price: number, tax: number) {
	return parseNumber(price + getPercentageValue(price, tax));
}

export function getMidnightExpirySeconds() {
	const now = new Date();
	const midnightTonight = new Date();
	midnightTonight.setHours(24, 0, 0, 0);
	// add 5 hours to the current time
	midnightTonight.setHours(midnightTonight.getHours() + 5);
	return Math.floor((midnightTonight.getTime() - now.getTime()) / 1000);
}

export const UVT_VALUE = 47065;
