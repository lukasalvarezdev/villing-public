/* eslint-disable jsx-a11y/iframe-has-title */
import {
	json,
	type LoaderFunctionArgs,
	type LinksFunction,
	type MetaFunction,
} from '@remix-run/node';
import {
	Link,
	Links,
	Meta,
	Outlet,
	Scripts,
	ScrollRestoration,
	useLoaderData,
	useLocation,
	useNavigate,
	useNavigation,
	useRouteError,
	useRouteLoaderData,
} from '@remix-run/react';
import { captureRemixErrorBoundaryError, withSentry } from '@sentry/remix';
import { AnimatePresence, motion } from 'framer-motion';
import * as React from 'react';
import remix_icon from 'remixicon/fonts/remixicon.css?url';
import { useSpinDelay } from 'spin-delay';
import {
	invariant,
	getSearchParamsWithDefaultDateRange,
	isMobileDevice,
	toEndOfDay,
	toStartOfDay,
	addDays,
} from '~/utils/misc';

import { TeamCircle } from './assets/jsx-icons';
import { Toast } from './components/form-utils';
import { Header } from './components/header';
import { NotificationMessage } from './components/notification-message';
import { Container } from './components/ui-library';
import tailwind from './tailwind.css?url';
import { _getRootOrganization, getUser } from './utils/auth.server';
import { getHashedUserEmail } from './utils/misc.server';
import { getIsInvalidPath, getPlanStatus } from './utils/plan-protection';

export const meta: MetaFunction = () => [
	{ title: 'Villing Software Contable' },
	{
		description:
			'El software contable hecho por comerciantes para comerciantes.',
	},
	{ name: 'Author', content: 'Villing' },
	{ name: 'google', content: 'notranslate' },
];

export const links: LinksFunction = () => [
	{ rel: 'stylesheet', href: tailwind },
	{ rel: 'stylesheet', href: remix_icon },
	{ rel: 'preconnect', href: 'https://fonts.googleapis.com' },
	{
		rel: 'preconnect',
		href: 'https://fonts.gstatic.com',
		crossOrigin: 'anonymous',
	},
	{
		rel: 'stylesheet',
		href: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap',
		as: 'font',
	},
	{
		rel: 'stylesheet',
		href: 'https://fonts.googleapis.com/css2?family=Hepta+Slab:wght@400;500;700&display=swap',
		as: 'font',
	},
];

export async function loader({ request }: LoaderFunctionArgs) {
	const isMobile = isMobileDevice(request);
	const user = await getUser(request);

	const searchParams = getSearchParamsWithDefaultDateRange(request);
	const start = searchParams.get('start');
	const end = searchParams.get('end');
	const startDate = start ? toStartOfDay(start) : undefined;
	const endDate = end ? toEndOfDay(end) : undefined;

	let emailHashed = 'unknown';

	if (user) {
		emailHashed = getHashedUserEmail(user?.email);
		// eslint-disable-next-line no-console
		console.info(`Hashed id ${emailHashed} from email ${user?.email}`);
	}

	const baseData = {
		isMobile,
		user,
		deployEnv: process.env.VILLING_ENV,
		defaultDateRange: { start: startDate, end: endDate },
		emailHashed,
		isAdmin: user?.role === 'admin',
	};

	const organizationId = user?.organizations[0]?.organizationId;
	if (organizationId) {
		const organization = await _getRootOrganization(organizationId, user).catch(
			() => null,
		);

		return json({ ...baseData, organization });
	}

	return json({ ...baseData, organization: null });
}

function App() {
	const shouldSeeHeader = useShouldSeeHeader();
	useNotConfirmedUserProtection();
	usePlanProtection();

	return (
		<Document>
			<PageLoadingMessage />

			<div id="main-content">
				{shouldSeeHeader ? <Header /> : null}
				<Outlet />
			</div>

			<div id="modal-portal"></div>
			<div id="print-portal"></div>
			<ScrollRestoration />
			<Scripts />
		</Document>
	);
}

export default withSentry(App);

function Document({ children }: { children: React.ReactNode }) {
	const location = useLocation();
	const isBuilder = location.pathname.includes('/builder/');

	React.useEffect(() => {
		if (document.getElementById('gtm')) return;

		const noscript = document.createElement('noscript');
		const iframe = document.createElement('iframe');
		iframe.src = 'https://www.googletagmanager.com/ns.html?id=GTM-T6VDWMLN';
		iframe.id = 'gtm';
		iframe.height = '0';
		iframe.width = '0';
		iframe.style.display = 'none';
		iframe.style.visibility = 'hidden';
		noscript.appendChild(iframe);
		document.body.prepend(noscript);
	}, []);

	React.useEffect(() => {
		const head = document.head;
		const comment = document.createComment('End Google Tag Manager');
		head.prepend(comment);

		// Create and append the GTM script
		const script = document.createElement('script');
		script.async = true;
		script.src = 'https://www.googletagmanager.com/gtag/js?id=G-VD9NEQG1YV';
		head.prepend(script);

		// Create and append the GTM inline script
		const inlineScript = document.createElement('script');
		inlineScript.innerHTML = `
	    window.dataLayer = window.dataLayer || [];
	    function gtag(){dataLayer.push(arguments);}
	    gtag('js', new Date());
	    gtag('config', 'G-VD9NEQG1YV', {
	      page_path: window.location.pathname,
	    });
	  `;
		head.appendChild(inlineScript);

		return () => {
			head.removeChild(comment);
			head.removeChild(inlineScript);
			head.removeChild(script);
		};
	}, []);

	React.useEffect(() => {
		const head = document.head;

		// Create and append the GTM comment
		const comment = document.createComment('Google Tag Manager');

		// Create and append the GTM script
		const script = document.createElement('script');
		script.innerHTML = `
	    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
	    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
	    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
	    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
	    })(window,document,'script','dataLayer','GTM-T6VDWMLN');
	  `;
		head.prepend(script);
		head.prepend(comment);

		// Clean up
		return () => {
			head.removeChild(script);
			head.removeChild(comment);
		};
	}, []);

	return (
		<html lang="en" translate="no">
			<head>
				<meta charSet="utf-8" />
				<meta
					name="viewport"
					content="width=device-width, initial-scale=1,maximum-scale=1"
				/>
				<Meta />
				<Links />
			</head>
			<body className={isBuilder ? 'md:overflow-hidden' : undefined}>
				{children}
				<p className='font-["Hepta_Slab"] sr-only'>Text to print</p>
			</body>
		</html>
	);
}

export function useOptionalUser() {
	const data = useRouteLoaderData<typeof loader>('root');
	return data?.user || null;
}

export function useUser() {
	const user = useOptionalUser();
	invariant(user, 'User must be logged in to access this page');
	return user;
}

export function useOrganization() {
	const data = useRouteLoaderData<typeof loader>('root');
	const organization = data?.organization || null;
	invariant(organization, 'Debes iniciar sesión para entrar aquí');
	return organization;
}

export function useOrganizationPrintInfo() {
	const organization = useOrganization();
	if (!organization.showCompanyInfoInRemision) {
		return {
			name: 'XXXX',
			address: 'Sin dirección',
			idNumber: 'Sin NIT',
			email: 'Sin email',
			phone: 'Sin teléfono',
			website: '',
		};
	}

	return {
		name: organization.name,
		address: organization.address || '',
		idNumber: organization.idNumber || '',
		email: organization.email || '',
		phone: organization.phone || '',
		website: organization.website || '',
	};
}

export function useIsForeignCountry() {
	const organization = useOrganization();
	return { isForeignCountry: organization?.country !== 'col' };
}

function useShouldSeeHeader() {
	const { pathname } = useLocation();
	const user = useOptionalUser();
	const guestPaths = [
		'/',
		'/login',
		'/join',
		'/confirm-email',
		'/start',
		'/resend-confirmation-email',
		'/pdf',
	];
	const partialPaths = [
		'/builder/pos/new',
		'/builder/electronic/new',
		'/builder/remision/new',
		'/builder/purchase/new',
		'/builder/purchaseRemision/new',
		'/builder/purchaseInvoice/new',
		'/builder/creditNote/new',
		'/builder/debitNote/new',
		'/builder/stockSetting/new',
		'/invitations',
	];

	return (
		!guestPaths.includes(pathname) &&
		user &&
		!partialPaths.some(p => pathname.startsWith(p))
	);
}

function usePlanProtection() {
	const { organization, isAdmin } = useLoaderData<typeof loader>();
	const navigate = useNavigate();
	const location = useLocation();
	const isExpired = getIsExpired();
	const isPaymentPath = location.pathname.includes('/settings/payments');

	React.useEffect(() => {
		if (!isExpired || isPaymentPath) return;

		navigate('/settings/payments?msg=expired_plan');
	}, [isExpired, isPaymentPath, navigate]);

	function getIsExpired() {
		if (
			!organization ||
			!organization.planExpiresAt ||
			!organization.planType ||
			isAdmin
		) {
			return false;
		}

		const expiryPlusFiveDays = addDays(new Date(organization.planExpiresAt), 5);
		return getPlanStatus(expiryPlusFiveDays) === 'expired';
	}
}

export function useIsMobile() {
	const data = useRouteLoaderData<typeof loader>('root');
	return data?.isMobile || false;
}

export function useDefaultDateRange() {
	const data = useRouteLoaderData<typeof loader>('root');

	return data?.defaultDateRange || { start: undefined, end: undefined };
}

export function ErrorBoundary() {
	const error = useRouteError();
	console.error(error);

	if (
		typeof navigator !== 'undefined' &&
		!navigator.onLine &&
		error instanceof Error &&
		error.message.includes('Failed to fetch')
	) {
		console.error('Navigator online status: ', navigator.onLine);
		window.location.reload();
	}

	captureRemixErrorBoundaryError(error);

	return (
		<Document>
			<Container className="py-6">
				<Toast variant="error" className="w-full max-w-full">
					<span className="block mb-2">
						Lo sentimos, hubo un error inesperado, estamos trabajando para
						resolverlo.
					</span>

					<div className="flex gap-4">
						<Link to="" className="font-medium">
							<span className="underline">Volver a intentar</span>
						</Link>

						<Link to="/" className="font-medium">
							<span className="underline">Ir al inicio</span>
						</Link>
					</div>
				</Toast>
			</Container>
		</Document>
	);
}

// we don't want to show the loading indicator on page load
let firstRender = true;

function PageLoadingMessage() {
	const navigation = useNavigation();
	const [words, setWords] = React.useState<Array<string>>([]);
	const [pendingPath, setPendingPath] = React.useState('');
	const showLoader = useSpinDelay(Boolean(navigation.state !== 'idle'), {
		delay: 600,
		minDuration: 1000,
	});

	React.useEffect(() => {
		if (firstRender) return;
		if (navigation.state === 'idle') return;
		if (navigation.state === 'loading')
			setWords(['Cargando', 'Trayendo tus datos']);

		const interval = setInterval(() => {
			setWords(([first, ...rest]) => [...rest, first] as Array<string>);
		}, 2000);

		return () => clearInterval(interval);
	}, [pendingPath, navigation.state]);

	React.useEffect(() => {
		if (firstRender) return;
		if (navigation.state === 'idle') return;
		setPendingPath(navigation.location.pathname);
	}, [navigation]);

	React.useEffect(() => {
		firstRender = false;
	}, []);

	const action = words[0];

	return (
		<NotificationMessage position="bottom-right" visible={showLoader}>
			<div className="flex w-64 items-center text-sm">
				<motion.div
					transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
					animate={{ rotate: 360 }}
				>
					<TeamCircle size={48} />
				</motion.div>
				<div className="ml-4 inline-grid">
					<AnimatePresence>
						<div className="col-start-1 row-start-1 flex overflow-hidden">
							<motion.span
								key={action}
								initial={{ y: 15, opacity: 0 }}
								animate={{ y: 0, opacity: 1 }}
								exit={{ y: -15, opacity: 0 }}
								transition={{ duration: 0.25 }}
								className="flex-none"
							>
								{action}
							</motion.span>
						</div>
					</AnimatePresence>
					<span className="text-secondary truncate">
						Navegando a: {pendingPath}
					</span>
				</div>
			</div>
		</NotificationMessage>
	);
}

function useNotConfirmedUserProtection() {
	const user = useOptionalUser();
	const navigate = useNavigate();
	const location = useLocation();

	const isNotConfirmed = user && !user.confirmedAt;
	const isInvalidPath = getIsInvalidPath(location.pathname);

	React.useEffect(() => {
		if (isNotConfirmed && isInvalidPath && navigator.onLine) {
			navigate('/home?msg=confirm_email');
		}
	}, [isInvalidPath, isNotConfirmed, navigate]);
}
