import localForage from 'localforage';
import {
	builderSchema,
	builderSessions,
	type Builder,
	type BuilderType,
} from './builder/schemas';

export async function getCurrentBuilder(
	base: Builder,
	type: BuilderType,
	overrides?: Partial<Builder>,
) {
	switch (type) {
		case 'pos':
			return getPosInvoice(base, overrides);
		case 'electronic':
			return getElectronicInvoice(base);
		case 'remision':
			return getRemisionInvoice(base);
		case 'purchase':
			return getPurchase(base);
		case 'purchaseRemision':
			return getPurchaseRemision(base);
		case 'purchaseInvoice':
			return getPurchaseInvoice(base);
		case 'creditNote':
			return getCreditNote(base);
		case 'debitNote':
			return getDebitNote(base);
		case 'stockSetting':
			return getStockSetting(base);
		default:
			throw new Error('Invalid module');
	}
}

export async function setCurrentBuilder(base: Builder, type: BuilderType) {
	switch (type) {
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
			throw new Error('Invalid module');
	}
}

export async function removeCurrentBuilder(module: BuilderType) {
	switch (module) {
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
			throw new Error('Invalid module');
	}
}

async function getPosInvoice(base: Builder, overrides?: Partial<Builder>) {
	try {
		const value = (await localForage.getItem(
			builderSessions.legalPosInvoice,
		)) as Builder;
		const data = { ...value, ...overrides };
		base = builderSchema.parse(value ? data : base);
	} catch (error) {
		console.error('getPosInvoice', JSON.stringify(error, null, 2), base);
	}

	return base;
}

export async function setPosInvoice(invoice: Builder) {
	try {
		await localForage.setItem(builderSessions.legalPosInvoice, invoice);
	} catch (error) {
		console.error(JSON.stringify(error, null, 2));
	}
}

async function getElectronicInvoice(base: Builder) {
	try {
		const value = await localForage.getItem(builderSessions.legalInvoice);
		base = builderSchema.parse(value || base);
	} catch (error) {
		console.error('getElectronicInvoice', JSON.stringify(error, null, 2));
	}
	return base;
}

export async function setElectronicInvoice(invoice: Builder) {
	try {
		await localForage.setItem(builderSessions.legalInvoice, invoice);
	} catch (error) {
		console.error(JSON.stringify(error, null, 2));
	}
}

async function getCreditNote(base: Builder) {
	try {
		const value = await localForage.getItem(builderSessions.creditNote);
		base = builderSchema.parse(value || base);
	} catch (error) {
		console.error('getCreditNote', JSON.stringify(error, null, 2));
	}
	return base;
}

export async function setCreditNote(invoice: Builder) {
	try {
		await localForage.setItem(builderSessions.creditNote, invoice);
	} catch (error) {
		console.error(JSON.stringify(error, null, 2));
	}
}

async function getDebitNote(base: Builder) {
	try {
		const value = await localForage.getItem(builderSessions.debitNote);
		base = builderSchema.parse(value || base);
	} catch (error) {
		console.error('getDebitNote', JSON.stringify(error, null, 2), base);
	}
	return base;
}

export async function setDebitNote(invoice: Builder) {
	try {
		await localForage.setItem(builderSessions.debitNote, invoice);
	} catch (error) {
		console.error(JSON.stringify(error, null, 2));
	}
}

async function getRemisionInvoice(base: Builder) {
	try {
		const value = await localForage.getItem(
			builderSessions.legalInvoiceRemision,
		);
		base = builderSchema.parse(value || base);
	} catch (error) {
		console.error('getRemisionInvoice', JSON.stringify(error, null, 2), base);
	}
	return base;
}

export async function setRemisionInvoice(invoice: Builder) {
	try {
		await localForage.setItem(builderSessions.legalInvoiceRemision, invoice);
	} catch (error) {
		console.error(JSON.stringify(error, null, 2));
	}
}

async function getPurchase(base: Builder) {
	try {
		const value = await localForage.getItem(builderSessions.purchase);
		base = builderSchema.parse(value || base);
	} catch (error) {
		console.error('getPurchase', JSON.stringify(error, null, 2), base);
	}
	return base;
}

export async function setPurchase(invoice: Builder) {
	try {
		await localForage.setItem(builderSessions.purchase, invoice);
	} catch (error) {
		console.error(JSON.stringify(error, null, 2));
	}
}

async function getPurchaseRemision(base: Builder) {
	try {
		const value = await localForage.getItem(builderSessions.purchaseRemision);
		base = builderSchema.parse(value || base);
	} catch (error) {
		console.error('getPurchaseRemision', JSON.stringify(error, null, 2), base);
	}
	return base;
}

export async function setPurchaseRemision(invoice: Builder) {
	try {
		await localForage.setItem(builderSessions.purchaseRemision, invoice);
	} catch (error) {
		console.error(JSON.stringify(error, null, 2));
	}
}

async function getPurchaseInvoice(base: Builder) {
	try {
		const value = await localForage.getItem(builderSessions.purchaseInvoice);
		base = builderSchema.parse(value || base);
	} catch (error) {
		console.error('getPurchaseInvoice', JSON.stringify(error, null, 2), base);
	}
	return base;
}

export async function setPurchaseInvoice(invoice: Builder) {
	try {
		await localForage.setItem(builderSessions.purchaseInvoice, invoice);
	} catch (error) {
		console.error(JSON.stringify(error, null, 2));
	}
}

async function getStockSetting(base: Builder) {
	try {
		const value = await localForage.getItem(builderSessions.stockSetting);
		base = builderSchema.parse(value || base);
	} catch (error) {
		console.error('getStockSetting', JSON.stringify(error, null, 2), base);
	}

	return base;
}

export async function setStockSetting(invoice: Builder) {
	try {
		await localForage.setItem(builderSessions.stockSetting, invoice);
	} catch (error) {
		console.error(JSON.stringify(error, null, 2));
	}
}
