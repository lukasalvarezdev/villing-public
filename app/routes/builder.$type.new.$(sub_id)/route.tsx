import {
	type MetaFunction,
	type LoaderFunctionArgs,
	redirect,
	type ActionFunctionArgs,
} from '@remix-run/node';
import {
	type ClientActionFunctionArgs,
	useLoaderData,
	type ClientLoaderFunctionArgs,
	useSearchParams,
} from '@remix-run/react';
import * as React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import QRCode from 'react-qr-code';
import { Button, LinkButton, Toast } from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import {
	NonPrintableContent,
	PrintableContent,
} from '~/components/printable-content';
import {
	BillFooter,
	DateMetadataInfo,
	NotesInfo,
	OrganizationInfo,
	OrganizationLogo,
	PaymentInfo,
	ProductsTable,
	RecipientInfo,
	ResolutionInfo,
	Separator,
	TotalsInfo,
} from '~/modules/printing/narrow-bill';
import { useIsMobile, useOrganization, useUser } from '~/root';
import { getOrgDbClient } from '~/utils/db.server';
import { cn, getRequestSearchParams, uuid } from '~/utils/misc';
import { getFilePresignedUrlByKey } from '~/utils/misc.server';
import { protectRoute } from '~/utils/session.server';
import { DesktopLayout, MobileLayout } from './blocks';
import {
	BuilderProvider,
	defaultConfig,
	useBuilderContext,
	useBuilderTotals,
} from './builder/context';
import { type Builder, builderSchema } from './builder/schemas';
import { getLoaderData, getValidationsByModule } from './builder-loader.server';
import { getCurrentBuilder } from './builder-session';
import {
	getBuilderType,
	getValidIdOrNoRecords,
	useBuilderFetcher,
	useCurrentBranch,
	useCurrentResolution,
} from './misc';
import { baseAction } from './server-actions.server';

export const meta: MetaFunction = ({ params }) => {
	const builderType = params.type;
	let title = 'Venta pos - Villing';

	switch (builderType) {
		case 'remision':
			title = 'Remisión de venta - Villing';
			break;
		case 'electronic':
			title = 'Factura electrónica - Villing';
			break;
		case 'purchase':
			title = 'Órden de compra - Villing';
			break;
		case 'purchaseRemision':
			title = 'Remisión de compra - Villing';
			break;
		case 'purchaseInvoice':
			title = 'Factura de compra - Villing';
			break;
		case 'creditNote':
			title = 'Nota crédito - Villing';
			break;
		case 'debitNote':
			title = 'Nota débito - Villing';
		case 'stockSetting':
			title = 'Ajuste de inventario - Villing';
			break;
	}

	return [{ title }];
};

export async function loader({ request, params }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId, userId } = await getOrgDbClient(request);
	const builderType = getBuilderType(params.type);
	const searchParams = getRequestSearchParams(request);

	if (builderType === 'pos' && !params.sub_id) {
		throw redirect('/invoices/pos/new');
	}

	const { loaderData } = await db.$transaction(async tx => {
		const invoice_id = getValidIdOrNoRecords(
			searchParams.get('origin_invoice') || undefined,
		);

		const [{ branch_id, ...loaderData }, user, originInvoice] =
			await Promise.all([
				getLoaderData({
					db: tx as typeof db,
					orgId,
					sub_id: params.sub_id,
				}),
				tx.user.findFirstOrThrow({
					where: { id: userId },
					select: {
						allowedSubOrgs: {
							where: { deletedAt: null },
							select: { id: true },
						},
					},
				}),
				tx.legalInvoice.findUnique({
					where: { id: invoice_id, cufe: { not: null } },
					select: { id: true, legalInvoiceJson: true },
				}),
			]);
		const allowedBranches = user.allowedSubOrgs.map(s => s.id);
		const validations = getValidationsByModule(builderType);

		if (
			branch_id &&
			!allowedBranches.includes(branch_id) &&
			builderType === 'pos'
		) {
			throw redirect('/invoices/pos/new?denied=true');
		}

		if (validations.requiresCashier && !loaderData.cashier) {
			throw redirect(
				`/invoices/pos/new?message=open_cashier&sub_id=${params.sub_id}`,
			);
		}

		if (
			validations.requiresResolution &&
			!loaderData.resolutions.mapped.length
		) {
			throw redirect('/resolutions/new?from=pos');
		}

		return {
			loaderData: {
				...loaderData,
				branches: loaderData.branches.filter(br => {
					return allowedBranches.includes(br.id);
				}),
				originInvoice: mapOriginInvoice(),
			},
		};

		function mapOriginInvoice() {
			if (!originInvoice) return undefined;
			const json = originInvoice.legalInvoiceJson as any;

			try {
				return { id: originInvoice.id, number: json?.number };
			} catch (error) {
				return undefined;
			}
		}
	});

	return {
		...loaderData,
		builderType,
		logo: await getFilePresignedUrlByKey(loaderData.logoKey),
	};
}

export async function clientLoader({
	serverLoader,
	params,
}: ClientLoaderFunctionArgs) {
	const loaderData = await serverLoader<typeof loader>();
	const { branch, resolutions, priceLists, builderType } = loaderData;
	const forcedBranchId = getValidIdOrNoRecords(params.sub_id);

	const defaultPreferences = getDefaultPreferences();
	let invoice = getDefaultInvoice();

	try {
		const value = await getCurrentBuilder(invoice, builderType, {
			resolutionId: defaultPreferences.resolutionId,
			config: defaultConfig,
			target: undefined,
			receivedAt: new Date().toISOString(),
		});
		invoice = builderSchema.parse(value);

		invoice.preferences = defaultPreferences;

		if (forcedBranchId) invoice.subId = forcedBranchId;

		const selectedBranchId = invoice.subId;
		const allBranchesIds = loaderData.branches.map(b => b.id);
		const branchExists = selectedBranchId
			? allBranchesIds.includes(selectedBranchId)
			: false;
		if (!branchExists) invoice.subId = undefined;
		if (allBranchesIds.length === 1) invoice.subId = allBranchesIds[0];

		const priceListExists = priceLists.some(
			pl => pl.id === invoice.priceListId,
		);

		if (!priceListExists) {
			invoice.priceListId = defaultPreferences.priceListId;
		}

		const resolutionExists = resolutions.mapped.some(
			r => r.value === invoice.resolutionId,
		);

		if (!resolutionExists) {
			invoice.resolutionId = defaultPreferences.resolutionId;
		}
	} catch (error) {
		console.error('parseInvoiceError', error);
	}

	return { ...loaderData, builder: invoice };

	function getDefaultPreferences() {
		const client = getDefaultClient();
		const resolutionId = getDefaultResolutionId();
		const priceListId = getDefaultPriceListId();

		return { client, resolutionId, priceListId };
	}

	function getDefaultResolutionId() {
		const firstResolution = resolutions.raw.filter(r => {
			if (builderType === 'pos') return r.type === 'posInvoice';
			if (builderType === 'electronic') return r.type === 'legalInvoice';
			return false;
		})[0]?.id;

		return branch?.resolutionId ?? firstResolution;
	}

	function getDefaultClient() {
		return branch?.client;
	}

	function getDefaultPriceListId() {
		const firstPriceList = priceLists[0]?.id;

		return branch?.priceListId ?? firstPriceList;
	}

	function getDefaultInvoice(): Builder {
		const { priceListId, client, resolutionId } = getDefaultPreferences();

		return {
			products: [],
			paymentForms: [{ id: 1, amount: 0, type: 'cash' }],
			priceListId,
			totalCollected: 0,
			client,
			resolutionId,
			shouldPrint: true,
			receivedAt: new Date().toISOString(),
			config: defaultConfig,
			subId: branch?.id,
			preferences: { client, resolutionId, priceListId },
		};
	}
}
clientLoader.hydrate = true;

export async function action(args: ActionFunctionArgs) {
	return baseAction(args);
}

export async function clientAction({ serverAction }: ClientActionFunctionArgs) {
	try {
		const result = await serverAction<typeof action>();

		const base = {
			submissionId: result.submissionId,
			intent: result.intent,

			reset: false,
			error: null,
			referenceId: null,
			invoice: null,
			redirectTo: null,
		};

		if (result.error) {
			return { ...base, error: result.error, referenceId: result.referenceId };
		}

		if (result.invoice) {
			return {
				...base,
				reset: true,
				invoice: result.invoice,
				redirectTo: result.redirectTo,
			};
		}

		return base;
	} catch (error) {
		return {
			submissionId: uuid(),
			intent: 'pos',

			reset: false,
			error: null,
			referenceId: null,
			invoice: null,
			redirectTo: null,
		} as const;
	}
}

export function HydrateFallback() {
	return (
		<div className="flex h-[100svh] bg-slate-100 mx-auto max-w-7xl">
			<div className="flex flex-col gap-4 w-2/3 p-8"></div>
			<div
				className={cn(
					'w-1/3 p-8 bg-white border-l flex flex-col justify-between',
					'min-w-[420px]',
				)}
			></div>
		</div>
	);
}

export default function Component() {
	const { builder } = useLoaderData<typeof clientLoader>();
	const isMobile = useIsMobile();

	return (
		<BuilderProvider builder={builder}>
			<InvoicePrinter />

			<NonPrintableContent>
				{isMobile ? (
					<MobileLayout>
						<MobileLayout.Heading />
						<MobileLayout.ProductsList />
						<MobileLayout.Footer />
					</MobileLayout>
				) : (
					<DesktopLayout>
						<DesktopLayout.ProductsColumn />
						<DesktopLayout.SummaryColumn />
					</DesktopLayout>
				)}
			</NonPrintableContent>
		</BuilderProvider>
	);
}

export function InvoicePrinter() {
	const fetcher = useBuilderFetcher();
	const {
		dispatch,
		state: { shouldPrint },
	} = useBuilderContext();
	const loaderData = useLoaderData<typeof clientLoader>();
	const logo = loaderData?.logo;
	const [searchParams, setSearchParams] = useSearchParams();
	const printedSubmissions = React.useRef<Array<string>>([]);
	const [didNotRedirect, setDidNotRedirect] = React.useState(false);
	const hasSearchParams = searchParams.size > 0;

	const reset = fetcher?.data?.reset;
	const submissionId = fetcher?.data?.submissionId;
	const intent = fetcher?.data?.intent;
	const redirectTo = fetcher?.data?.redirectTo;

	const canPrint = intent === 'pos' || intent === 'quote';
	const print = canPrint && shouldPrint;

	React.useEffect(() => {
		const continueReset = shouldContinue();
		if (!reset || !continueReset) return;

		const mediaQueryList = window.matchMedia('print');

		function handleAfterPrint() {
			const checkPrintStatus = setInterval(() => {
				if (!window.matchMedia('print').matches) {
					clearInterval(checkPrintStatus);
					dispatch({ type: 'resetSale' });
				}
			}, 100);

			return () => {
				clearInterval(checkPrintStatus);
			};
		}

		mediaQueryList.addEventListener('change', handleAfterPrint);

		if (print) {
			window.print();
		} else {
			dispatch({ type: 'resetSale' });
		}

		if (redirectTo) {
			const passedTest = window.open(redirectTo, '_blank');
			if (!passedTest) setDidNotRedirect(true);
		} else if (hasSearchParams) {
			setSearchParams({});
		}

		return () => {
			mediaQueryList.removeEventListener('change', handleAfterPrint);
		};

		function shouldContinue() {
			if (!submissionId) return false;

			if (printedSubmissions.current.includes(submissionId)) {
				return false;
			}

			printedSubmissions.current.push(submissionId);
			return true;
		}
	}, [
		dispatch,
		print,
		reset,
		setSearchParams,
		submissionId,
		redirectTo,
		hasSearchParams,
	]);

	return (
		<div>
			{redirectTo && didNotRedirect ? (
				<PopupBlockedModal
					redirectTo={redirectTo}
					onClose={() => setDidNotRedirect(false)}
				/>
			) : null}

			<PrintableContent>
				<div className="bg-white px-2">
					{logo ? (
						<header className="text-center mx-auto text-sm">
							<OrganizationLogo logoUrl={logo} />
						</header>
					) : null}

					{canPrint && intent ? <BillContent /> : null}
				</div>
			</PrintableContent>
		</div>
	);
}

function PopupBlockedModal({
	redirectTo,
	onClose,
}: {
	redirectTo: string;
	onClose: () => void;
}) {
	useHotkeys('esc', onClose);
	useHotkeys(
		'enter',
		() => {
			window.open(
				redirectTo,
				'_blank',
				'resizable,scrollbars,status,toolbar,menubar,location,fullscreen',
			);
			onClose();
		},
		[redirectTo],
	);

	return (
		<Modal className="max-w-md">
			<ModalHeader onClick={onClose} className="mb-4">
				<h5>Autoriza a Villing para continuar</h5>
			</ModalHeader>

			<Toast variant="error" className="flex gap-2 mb-4">
				<i className="ri-error-warning-line text-lg text-red-500"></i>
				<p>
					Tu navegador bloqueó la apertura de una nueva ventana para imprimir la
					factura.
				</p>
			</Toast>
			<p className="mb-4 text-sm">
				Por favor, presiona en la parte superior derecha de tu navegador para
				permitir la apertura de ventanas emergentes y así evitar que esto vuelva
				a suceder.
			</p>

			<div className="flex justify-end gap-4 flex-col lg:flex-row">
				<Button variant="secondary" type="button" onClick={onClose}>
					Quedarme
				</Button>
				<LinkButton
					to={redirectTo}
					target="_blank"
					referrerPolicy="no-referrer"
					className="whitespace-nowrap"
					onClick={onClose}
				>
					Ir a la factura (presiona Enter)
				</LinkButton>
			</div>
		</Modal>
	);
}

function BillContent() {
	const user = useUser();
	const totals = useBuilderTotals();
	const branch = useCurrentBranch();
	const { state } = useBuilderContext();
	const organization = useOrganization();
	const resolution = useCurrentResolution();
	const fetcher = useBuilderFetcher();

	const invoice = fetcher?.data?.invoice;
	const intent = fetcher?.data?.intent;

	if (!invoice || !branch || !resolution) return null;

	const texts = {
		pos: 'Factura de venta POS',
		quote: 'Cotización de venta',
	} as Record<string, string>;

	const text = texts[intent || 'pos'];

	return (
		<div>
			<OrganizationInfo
				name={branch.name}
				address={branch.address}
				tel={branch.tel}
				nit={branch.nit}
				text={`${text} No. ${invoice.internalId}`}
			/>

			<Separator />

			<RecipientInfo
				address={invoice.address || ''}
				name={invoice.name || ''}
				nit={invoice.nit || ''}
				tel={invoice.tel || ''}
				city={invoice.city || ''}
				department={invoice.department}
				title="Cliente"
			/>

			<Separator />
			<DateMetadataInfo createdAt={new Date().toISOString()} />
			<Separator className="border-solid mb-2" />

			<ProductsTable
				products={state.products.map(p => ({ ...p, reference: p.ref }))}
			/>
			<Separator />

			<TotalsInfo
				subtotal={totals.subtotal}
				total={totals.total}
				totalCollected={state.totalCollected}
				totalDiscount={totals.totalDiscount}
				totalTax={totals.totalTax}
				totalRefunds={totals.totalRefunds}
			/>
			<NotesInfo notes={state.notes ?? null} />

			<Separator className="border-solid mb-2" />

			<PaymentInfo
				payment_forms={state.paymentForms}
				subOrgName={branch.name}
				userName={user.name}
			/>

			<Separator className="mb-2" />

			{invoice.numeration ? (
				<ResolutionInfo
					number={invoice.numeration.toString()}
					from_date={resolution.fromDate || ''}
					to_date={resolution.toDate || ''}
					prefix={resolution.prefix || ''}
					from={resolution.from || 0}
					to={resolution.to || 0}
					hide={!resolution.enabledInDian}
				/>
			) : null}

			{invoice.qrCode && invoice.cude ? (
				<InvoiceQR url={invoice.qrCode} cude={invoice.cude} />
			) : null}

			<BillFooter text_in_invoice={organization.textInInvoice || undefined} />
		</div>
	);
}

function InvoiceQR({ url, cude }: { url: string; cude: string }) {
	return (
		<div className="flex items-center justify-center flex-col gap-2">
			<div className="w-[150px]">
				<QRCode value={url} size={150} />
			</div>
			<p className="text-wrap break-all leading-3 text-center">{cude}</p>
		</div>
	);
}
