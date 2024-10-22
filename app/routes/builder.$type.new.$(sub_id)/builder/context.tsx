import * as React from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { calculateProductsTotal } from '~/modules/invoice/invoice-math';
import { useOrganization } from '~/root';
import { toNumber, type PartialWithMandatory } from '~/utils/misc';
import { setCurrentBuilder } from '../builder-session';
import { useBuilderType } from '../misc';
import {
	type BuilderType,
	type Builder,
	type ProductType,
	type BuilderClient,
	type PaymentFormType,
	type BuilderSupplier,
} from './schemas';

type ContextType = {
	state: Builder;
	dispatch: React.Dispatch<BuilderAction>;
};
const builderContext = React.createContext<ContextType | null>(null);

type BuilderProviderProps = { children: React.ReactNode; builder: Builder };
export function BuilderProvider({ children, builder }: BuilderProviderProps) {
	const [state, dispatch] = React.useReducer(reducer, builder);
	const type = useBuilderType();
	const organization = useOrganization();
	const debouncedSave = useDebouncedCallback(
		async (state: Builder, type: BuilderType) => {
			await setCurrentBuilder(state, type);
		},
		500,
	);

	React.useEffect(() => {
		debouncedSave(state, type);
	}, [debouncedSave, state, type]);

	React.useEffect(() => {
		async function flush() {
			await setCurrentBuilder(state, type);
		}

		window.addEventListener('beforeunload', flush);

		return () => {
			window.removeEventListener('beforeunload', flush);
		};
	}, [state, type]);

	React.useEffect(() => {
		dispatch({
			type: 'updatePrices',
			payload: organization.updatePricesOnPurchases,
		});
	}, [organization.updatePricesOnPurchases]);

	return (
		<builderContext.Provider value={{ state, dispatch }}>
			{children}
		</builderContext.Provider>
	);
}

export function useBuilderContext() {
	const context = React.useContext(builderContext);
	if (!context) {
		throw new Error('useBuilderContext must be used within a InvoiceProvider');
	}
	return context;
}

export function useBuilderTotals() {
	const { state } = useBuilderContext();
	return calculateProductsTotal(state.products, state.config);
}

type BuilderAction =
	| { type: 'addProduct'; payload: ProductType }
	| { type: 'updateProduct'; payload: PartialWithMandatory<ProductType, 'id'> }
	| { type: 'removeProduct'; payload: number }
	| { type: 'setResolutionId'; payload: number | undefined }
	| { type: 'setClient'; payload: BuilderClient | undefined }
	| { type: 'setPriceListId'; payload: number }
	| { type: 'resetSale' }
	| { type: 'addPaymentForm' }
	| { type: 'removePaymentForm'; payload: number }
	| {
			type: 'updatePaymentForm';
			payload: PartialWithMandatory<PaymentFormType, 'id'>;
	  }
	| { type: 'updateTotalCollected'; payload: number }
	| { type: 'setNotes'; payload: string }
	| { type: 'setPrint'; payload: boolean }
	| { type: 'setPaysInDays'; payload: number }
	| { type: 'setBranchId'; payload: number }
	| { type: 'setRetention'; payload: number }
	| { type: 'setSupplier'; payload: BuilderSupplier | undefined }
	| { type: 'setReceivedAt'; payload: Builder['receivedAt'] }
	| { type: 'setExternalInvoiceId'; payload: Builder['externalInvoiceId'] }
	| { type: 'setCreditNoteReason'; payload: Builder['creditNoteReason'] }
	| { type: 'setDebitNoteReason'; payload: Builder['debitNoteReason'] }
	| { type: 'setStockType'; payload: Builder['stockType'] }
	| { type: 'setStockIncomeOrExit'; payload: Builder['stockIncomeOrExit'] }
	| { type: 'setGlobalDiscount'; payload: number }
	| { type: 'updatePrices'; payload: boolean }
	| { type: 'setTarget'; payload: BuilderType | undefined }
	| { type: 'setTransferToBranchId'; payload: number | undefined };

function reducer(state: Builder, action: BuilderAction): Builder {
	switch (action.type) {
		case 'addProduct': {
			const alreadyExists = state.products.find(
				product => product.id === action.payload.id,
			);
			const products = alreadyExists
				? state.products.map(product => {
						if (product.id === action.payload.id) {
							return { ...product, quantity: product.quantity + 1 };
						}
						return product;
					})
				: [action.payload, ...state.products];
			const { total } = calculateProductsTotal(products, state.config);

			return {
				...state,
				products,
				paymentForms: updatePaymentForms(state.paymentForms, total),
			};
		}
		case 'updateProduct': {
			const products = state.products.map(product => {
				if (product.id === action.payload.id) {
					return { ...product, ...action.payload };
				}
				return product;
			});

			const { total } = calculateProductsTotal(products, state.config);

			return {
				...state,
				products,
				paymentForms: updatePaymentForms(state.paymentForms, total),
			};
		}
		case 'removeProduct':
			const products = state.products.filter(
				product => product.id !== action.payload,
			);

			return {
				...state,
				products,
				paymentForms: updatePaymentForms(
					state.paymentForms,
					calculateProductsTotal(products, state.config).total,
				),
			};
		case 'setResolutionId':
			return { ...state, resolutionId: action.payload };
		case 'setClient':
			return { ...state, client: action.payload };
		case 'setPriceListId': {
			const products = state.products.map(product => {
				const price =
					product.prices.find(price => price.id === action.payload)?.price ?? 0;
				return { ...product, price };
			});

			return {
				...state,
				priceListId: action.payload,
				products,
				paymentForms: updatePaymentForms(
					state.paymentForms,
					calculateProductsTotal(products, state.config).total,
				),
			};
		}
		case 'addPaymentForm':
			return {
				...state,
				paymentForms: [
					...state.paymentForms,
					{ id: state.paymentForms.length + 1, amount: 0, type: 'cash' },
				],
			};
		case 'removePaymentForm':
			const paymentForms = state.paymentForms.filter(
				paymentForm => paymentForm.id !== action.payload,
			);
			const { total } = calculateProductsTotal(state.products, state.config);

			return {
				...state,
				paymentForms:
					paymentForms.length === 1
						? updatePaymentForms(paymentForms, total)
						: paymentForms,
			};
		case 'updatePaymentForm': {
			const paymentForms = state.paymentForms.map(paymentForm => {
				if (paymentForm.id === action.payload.id) {
					return { ...paymentForm, ...action.payload };
				}
				return paymentForm;
			});

			return { ...state, paymentForms };
		}
		case 'updateTotalCollected':
			return { ...state, totalCollected: action.payload };
		case 'resetSale':
			return {
				...state,
				products: [],
				paymentForms: [{ id: 1, amount: 0, type: 'cash' }],
				totalCollected: 0,
				notes: '',
				paysInDays: 0,
				externalInvoiceId: '',
				supplier: undefined,
				receivedAt: new Date().toISOString(),
				config: {
					...state.config,
					retention: 0,
					taxIncluded: true,
				},
				transferToBranchId: undefined,
				stockType: 'partial',
				stockIncomeOrExit: 'income',
				...state.preferences,
			};
		case 'setNotes':
			return { ...state, notes: action.payload };
		case 'setPrint':
			return { ...state, shouldPrint: action.payload };
		case 'setPaysInDays':
			return { ...state, paysInDays: action.payload };
		case 'setBranchId': {
			const products = state.products.map(product => {
				const stock = toNumber(
					product.stocks?.find(stock => stock.branchId === action.payload)
						?.quantity,
				);

				return { ...product, stock };
			});

			return {
				...state,
				products,
				subId: action.payload,
				transferToBranchId:
					action.payload === state.transferToBranchId
						? undefined
						: state.transferToBranchId,
			};
		}
		case 'setRetention': {
			const config = { ...state.config, retention: action.payload };
			const { total } = calculateProductsTotal(state.products, config);

			return {
				...state,
				paymentForms: updatePaymentForms(state.paymentForms, total),
				config,
			};
		}
		case 'setSupplier':
			return { ...state, supplier: action.payload };
		case 'setReceivedAt':
			return { ...state, receivedAt: action.payload };
		case 'setExternalInvoiceId':
			return { ...state, externalInvoiceId: action.payload };
		case 'setCreditNoteReason':
			return { ...state, creditNoteReason: action.payload };
		case 'setDebitNoteReason':
			return { ...state, debitNoteReason: action.payload };
		case 'setStockType':
			return {
				...state,
				stockType: action.payload,
				stockIncomeOrExit:
					action.payload === 'total' ? 'income' : state.stockIncomeOrExit,
			};
		case 'setStockIncomeOrExit':
			return { ...state, stockIncomeOrExit: action.payload };
		case 'setGlobalDiscount': {
			const products = state.products.map(product => {
				return { ...product, discount: action.payload };
			});

			return {
				...state,
				products,
				paymentForms: updatePaymentForms(
					state.paymentForms,
					calculateProductsTotal(products, state.config).total,
				),
			};
		}
		case 'updatePrices':
			return { ...state, updatePrices: action.payload };
		case 'setTarget':
			return { ...state, target: action.payload };
		case 'setTransferToBranchId':
			return { ...state, transferToBranchId: action.payload };
		default:
			return state;
	}
}

function updatePaymentForms(
	paymentForms: Array<PaymentFormType>,
	total: number,
): Array<PaymentFormType> {
	const paymentForm = paymentForms[0];
	if (paymentForms.length === 1 && paymentForm) {
		return [{ ...paymentForm, amount: total }];
	}
	return paymentForms;
}

export const defaultConfig = { taxIncluded: true, retention: 0 };
