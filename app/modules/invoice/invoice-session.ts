import localForage from 'localforage';
import {
	type BuilderType,
	type Builder,
	builderSessions,
} from '~/routes/builder.$type.new.$(sub_id)/builder/schemas';

export async function setCurrentBuilder(
	base: Builder,
	invoicebuilderType: BuilderType,
) {
	switch (invoicebuilderType) {
		case 'pos':
			return setPosInvoice(base);
		case 'electronic':
			return setElectronicInvoice(base);
		case 'remision':
			return setRemisionInvoice(base);
		case 'purchase':
			return setPurchase(base);
		case 'purchaseRemision':
			return setPurchaseRemision(base);
		case 'purchaseInvoice':
			return setPurchaseInvoice(base);
		case 'creditNote':
			return setCreditNote(base);
		case 'debitNote':
			return setDebitNote(base);
		case 'stockSetting':
			return setStockSetting(base);
		default:
			throw new Error('Invalid builderType');
	}
}

export async function removeCurrentBuilder(builderType: BuilderType) {
	switch (builderType) {
		case 'pos':
			return localForage.removeItem(builderSessions.legalPosInvoice);
		case 'electronic':
			return localForage.removeItem(builderSessions.legalInvoice);
		case 'remision':
			return localForage.removeItem(builderSessions.legalInvoiceRemision);
		case 'purchase':
			return localForage.removeItem(builderSessions.purchase);
		case 'purchaseRemision':
			return localForage.removeItem(builderSessions.purchaseRemision);
		case 'purchaseInvoice':
			return localForage.removeItem(builderSessions.purchaseInvoice);
		case 'creditNote':
			return localForage.removeItem(builderSessions.creditNote);
		case 'debitNote':
			return localForage.removeItem(builderSessions.debitNote);
		case 'stockSetting':
			return localForage.removeItem(builderSessions.stockSetting);
		default:
			throw new Error('Invalid builderType');
	}
}

export async function setPosInvoice(invoice: Builder) {
	try {
		await localForage.setItem(builderSessions.legalPosInvoice, invoice);
	} catch (error) {
		console.error(JSON.stringify(error, null, 2));
	}
}

export async function setElectronicInvoice(invoice: Builder) {
	try {
		await localForage.setItem(builderSessions.legalInvoice, invoice);
	} catch (error) {
		console.error(JSON.stringify(error, null, 2));
	}
}

export async function setCreditNote(invoice: Builder) {
	try {
		await localForage.setItem(builderSessions.creditNote, invoice);
	} catch (error) {
		console.error(JSON.stringify(error, null, 2));
	}
}

export async function setDebitNote(invoice: Builder) {
	try {
		await localForage.setItem(builderSessions.debitNote, invoice);
	} catch (error) {
		console.error(JSON.stringify(error, null, 2));
	}
}

export async function setRemisionInvoice(invoice: Builder) {
	try {
		await localForage.setItem(builderSessions.legalInvoiceRemision, invoice);
	} catch (error) {
		console.error(JSON.stringify(error, null, 2));
	}
}

export async function setPurchase(invoice: Builder) {
	try {
		await localForage.setItem(builderSessions.purchase, invoice);
	} catch (error) {
		console.error(JSON.stringify(error, null, 2));
	}
}

export async function setPurchaseRemision(invoice: Builder) {
	try {
		await localForage.setItem(builderSessions.purchaseRemision, invoice);
	} catch (error) {
		console.error(JSON.stringify(error, null, 2));
	}
}

export async function setPurchaseInvoice(invoice: Builder) {
	try {
		await localForage.setItem(builderSessions.purchaseInvoice, invoice);
	} catch (error) {
		console.error(JSON.stringify(error, null, 2));
	}
}

export async function setStockSetting(invoice: Builder) {
	try {
		await localForage.setItem(builderSessions.stockSetting, invoice);
	} catch (error) {
		console.error(JSON.stringify(error, null, 2));
	}
}
