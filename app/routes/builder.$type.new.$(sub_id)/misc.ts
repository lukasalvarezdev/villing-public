import {
	type Resolution,
	type Client,
	type SubOrganization,
} from '@prisma/client';
import { type SerializeFrom } from '@remix-run/node';
import {
	type Fetcher,
	useFetchers,
	useLoaderData,
	useParams,
} from '@remix-run/react';
import * as React from 'react';
import { useOrganization } from '~/root';
import { UVT_VALUE } from '~/utils/misc';
import { useBuilderContext, useBuilderTotals } from './builder/context';
import {
	type Builder,
	builderTypeSchema,
	type BuilderType,
} from './builder/schemas';
import { type clientAction, type clientLoader } from './route';

export function useBuilderTexts() {
	const type = useBuilderType();
	const {
		state: { target },
	} = useBuilderContext();
	return texts[target || type] || texts.pos;
}

export function getBuilderType(type?: string) {
	return builderTypeSchema.parse(type);
}

const texts = {
	pos: {
		title: 'Venta pos',
		modalTitle: 'Confirmar venta pos',
		modalDescription: 'Revisa los datos de la venta antes de terminar.',
	},
	quote: {
		title: 'Cotización',
		modalTitle: 'Confirmar cotización',
		modalDescription: 'Revisa los datos de la cotización antes de terminar.',
	},
	electronic: {
		title: 'Factura electrónica',
		modalTitle: 'Confirmar factura electrónica',
		modalDescription:
			'Revisa los datos de la factura electrónica antes de terminar.',
	},
	remision: {
		title: 'Remisión de venta',
		modalTitle: 'Confirmar remisión de venta',
		modalDescription:
			'Revisa los datos de la remisión de venta antes de terminar.',
	},
	purchase: {
		title: 'Órden de compra',
		modalTitle: 'Confirmar órden de compra',
		modalDescription:
			'Revisa los datos de la órden de compra antes de terminar.',
	},
	purchaseRemision: {
		title: 'Remisión de compra',
		modalTitle: 'Confirmar remisión de compra',
		modalDescription:
			'Revisa los datos de la remisión de compra antes de terminar.',
	},
	purchaseInvoice: {
		title: 'Factura de compra',
		modalTitle: 'Confirmar factura de compra',
		modalDescription:
			'Revisa los datos de la factura de compra antes de terminar.',
	},
	creditNote: {
		title: 'Nota crédito',
		modalTitle: 'Confirmar nota crédito',
		modalDescription: 'Revisa los datos de la nota crédito antes de terminar.',
	},
	debitNote: {
		title: 'Nota débito',
		modalTitle: 'Confirmar nota débito',
		modalDescription: 'Revisa los datos de la nota débito antes de terminar.',
	},
	stockSetting: {
		title: 'Ajuste de inventario',
		modalTitle: 'Confirmar ajuste de inventario',
		modalDescription:
			'Revisa los datos del ajuste de inventario antes de terminar.',
	},
};

export function mapBranch(branch?: BranchArgType) {
	if (!branch) return undefined;

	return {
		id: branch.id,
		name: branch.name,
		client: getClient(),
		resolutionId: branch.defaultResolution?.id || undefined,
		priceListId: branch.defaultPriceListId || undefined,
	};

	function getClient() {
		if (!branch?.defaultClient) return undefined;

		return {
			id: branch.defaultClient.id,
			name: branch.defaultClient.name,
			address: branch.defaultClient.simpleAddress,
		};
	}
}

type BranchArgType = Pick<
	SubOrganization,
	'id' | 'name' | 'address' | 'nit' | 'tel' | 'defaultPriceListId'
> & {
	defaultClient: Client | null;
	defaultResolution: Resolution | null;
};

export function getValidIdOrNoRecords(id?: string | null) {
	// We return 0 to get no records
	if (!id) return 0;
	const subId = parseInt(id);
	if (isNaN(subId)) return 0;
	return subId;
}

export function useCurrentBranch() {
	const { branches } = useLoaderData<typeof clientLoader>();
	const {
		state: { subId },
	} = useBuilderContext();

	return branches.find(b => b.id === subId);
}

export function useBranches() {
	const { branches } = useLoaderData<typeof clientLoader>();
	return branches;
}

export function useResolutions(target: BuilderType) {
	const { resolutions } = useLoaderData<typeof clientLoader>();
	const builderType = useBuilderType();
	const type = target || builderType;

	return resolutions.mapped.filter(r => {
		return type === 'electronic'
			? r.type === 'legalInvoice'
			: r.type === 'posInvoice';
	});
}

export function useCurrentResolution() {
	const {
		state: { resolutionId },
	} = useBuilderContext();
	const {
		resolutions: { raw },
	} = useLoaderData<typeof clientLoader>();

	return raw.find(r => r.id === resolutionId);
}

export function useFilterResolutions() {
	const { resolutions } = useLoaderData<typeof clientLoader>();

	return React.useCallback(
		(target: BuilderType) => {
			return resolutions.mapped.filter(r => {
				return target === 'electronic'
					? r.type === 'legalInvoice'
					: r.type === 'posInvoice';
			});
		},
		[resolutions.mapped],
	);
}

export function useBuilderFetcher() {
	return useFetchers().find(f => f.key === 'builder') as
		| Fetcher<SerializeFrom<typeof clientAction>>
		| undefined;
}

export function getBuilderTypeFromPath() {
	const path = window.location.pathname;
	const type = path.split('/')[2];
	return getBuilderType(type);
}

export function mapProductsWithStockCorrection(
	products: Builder['products'],
	originProducts: Array<{ productId: number | null; quantity: number }>,
) {
	return products.map(p => {
		const originProduct = originProducts.find(op => op.productId === p.id);
		const originQuantity = originProduct?.quantity || 0;

		return {
			id: p.id,
			quantity: originProduct ? p.quantity - originQuantity : p.quantity,
		};
	});
}

export function useTargetSetter() {
	const { dispatch } = useBuilderContext();
	const getResolutions = useFilterResolutions();
	const isValueAboveUvt = useIsPosAboveMaxUvt();

	return React.useCallback(
		(target: BuilderType | undefined) => {
			if (!target) return dispatch({ type: 'setTarget', payload: undefined });

			if (isValueAboveUvt && target === 'pos') {
				const resolutions = getResolutions('electronic');
				dispatch({ type: 'setResolutionId', payload: resolutions[0]?.value });
				dispatch({ type: 'setTarget', payload: 'electronic' });
				return;
			}

			const resolutions = getResolutions(target);
			dispatch({ type: 'setResolutionId', payload: resolutions[0]?.value });
			dispatch({ type: 'setTarget', payload: target });
		},
		[dispatch, getResolutions, isValueAboveUvt],
	);
}

export function useOriginInvoice() {
	const { originInvoice } = useLoaderData<typeof clientLoader>();
	return originInvoice;
}

export function useBuilderPriceList() {
	const { priceLists } = useLoaderData<typeof clientLoader>();

	return { priceLists };
}

export function useCurrentPriceList() {
	const {
		state: { priceListId },
	} = useBuilderContext();
	const { priceLists } = useBuilderPriceList();

	return priceLists.find(p => p.id === priceListId);
}

export function useIsPosAboveMaxUvt() {
	const { total } = useBuilderTotals();
	const { legalActions } = useLegalActions();
	const type = useBuilderType();

	return (
		type === 'pos' &&
		getIsValueAboveMaxUvt(total) &&
		legalActions.includes('update dianConfirmationWarning')
	);
}

export function getIsValueAboveMaxUvt(value: number) {
	return value > UVT_VALUE * 5;
}

type LegalActions =
	| 'update totalCollected'
	| 'update resolution'
	| 'update client'
	| 'update supplier'
	| 'update paymentForms'
	| 'update retention'
	| 'update externalInvoiceId'
	| 'update receivedAt'
	| 'update priceList'
	| 'close cashier'
	| 'update config'
	| 'update creditNoteReason'
	| 'update debitNoteReason'
	| 'see originInvoice'
	| 'see priceColumn'
	| 'see totalColumn'
	| 'see stockColumn'
	| 'update stockType'
	| 'update textConfirmationWarning'
	| 'update dianConfirmationWarning'
	| 'update paymentTerm'
	| 'see totals'
	| 'update globalDiscount'
	| 'update product prices'
	| 'update tax'
	| 'update markForRefund'
	| 'update pharma fields'
	| 'update general config'
	| 'see branchToTransfer';

export function useLegalActions() {
	const builderType = useBuilderType();
	const organization = useOrganization();
	const resolution = useCurrentResolution();
	const {
		state: { target },
	} = useBuilderContext();

	const legalActions = React.useMemo<Array<LegalActions>>(() => {
		const actions = legalActionsByModule[target || builderType] ?? [];
		return actions.filter(action => {
			if (action === 'update pharma fields') {
				return organization.type === 'pharmacy';
			}

			if (action === 'update dianConfirmationWarning') {
				return resolution?.type === 'legalInvoice' || resolution?.enabledInDian;
			}
			return true;
		});
	}, [
		target,
		builderType,
		organization.type,
		resolution?.type,
		resolution?.enabledInDian,
	]);

	return { legalActions };
}

const legalActionsByModule: Record<BuilderType, Array<LegalActions>> = {
	pos: [
		'see priceColumn',
		'see totalColumn',
		'see totals',

		'update client',
		'update resolution',
		'update paymentForms',
		'update priceList',

		'update globalDiscount',
		'update markForRefund',
		'update totalCollected',

		'close cashier',
		'update config',
		'update dianConfirmationWarning',
	],
	quote: [],
	electronic: [
		'see priceColumn',
		'see totalColumn',
		'see totals',

		'update client',
		'update resolution',
		'update paymentTerm',
		'update paymentForms',
		'update priceList',
		'update dianConfirmationWarning',
		'update tax',
		'update globalDiscount',
	],
	remision: [
		'see priceColumn',
		'see totalColumn',
		'see totals',

		'update client',
		'update paymentTerm',
		'update paymentForms',
		'update priceList',
		'update tax',
		'update globalDiscount',
	],
	purchase: [
		'see priceColumn',
		'see totalColumn',
		'see totals',

		'update supplier',
		'update pharma fields',
		'update retention',
		'update tax',
		'update globalDiscount',
	],
	purchaseRemision: [
		'see priceColumn',
		'see totalColumn',
		'see totals',

		'update supplier',
		'update receivedAt',
		'update externalInvoiceId',
		'update paymentTerm',
		'update pharma fields',
		'update product prices',
		'update retention',
		'update tax',
		'update globalDiscount',
		'update general config',
	],
	purchaseInvoice: [
		'see priceColumn',
		'see totalColumn',
		'see totals',

		'update supplier',
		'update externalInvoiceId',
		'update paymentTerm',
		'update receivedAt',
		'update pharma fields',
		'update product prices',
		'update retention',
		'update tax',
		'update globalDiscount',
		'update general config',
	],
	creditNote: [
		'see priceColumn',
		'see totalColumn',
		'see totals',

		'update tax',
		'update globalDiscount',
		'see originInvoice',
		'update creditNoteReason',
	],
	debitNote: [
		'see priceColumn',
		'see totalColumn',
		'see totals',

		'update tax',
		'update globalDiscount',
		'see originInvoice',
		'update debitNoteReason',
	],
	stockSetting: [
		'see stockColumn',
		'update stockType',
		'update textConfirmationWarning',
		'see branchToTransfer',
	],
};

export function useBuilderType() {
	const { type } = useParams();
	return builderTypeSchema.parse(type);
}
