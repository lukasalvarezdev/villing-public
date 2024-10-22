import {
	createPos,
	createRemisionInvoice,
	createPurchase,
	createPurchaseRemision,
	createPurchaseInvoice,
} from 'tests/db-seed-utils';
import { formatCurrency } from '~/utils/misc';
import { test, expect } from '../playwrigth-utils';

test('Duplicate POS', async ({ page, login }) => {
	const seedProps = await login();
	const { total, client } = await createPos(seedProps);

	await page.goto('/invoices');
	await page
		.getByRole('button', { name: /abrir opciones de acciones/i })
		.click();
	await page.getByRole('link', { name: /duplicar/i }).click();
	await page.waitForURL(
		`/builder/pos/new/${seedProps.branchId}?duplicate=true`,
	);
	await expect(page.getByText(/factura de venta pos/i)).toBeVisible();
	await expect(page.getByText(`Total:$${formatCurrency(total)}`)).toBeVisible();
	await expect(page.getByText(client)).toBeVisible();
});

test('Duplicate remision', async ({ page, login }) => {
	const seedProps = await login();
	const { total, client } = await createRemisionInvoice(seedProps);

	await page.goto('/invoice-remisions');
	await page
		.getByRole('button', { name: /abrir opciones de acciones/i })
		.click();
	await page.getByRole('link', { name: /duplicar/i }).click();
	await page.waitForURL('/builder/remision/new?duplicate=true');
	await expect(page.getByText(/remisión de venta/i)).toBeVisible();
	await expect(page.getByText(`Total:$${formatCurrency(total)}`)).toBeVisible();
	await expect(page.getByText(client)).toBeVisible();
});

test('Duplicate purchase', async ({ page, login }) => {
	const seedProps = await login();
	const { total, supplier } = await createPurchase(seedProps);

	await page.goto('/purchases');
	await page
		.getByRole('button', { name: /abrir opciones de acciones/i })
		.click();
	await page.getByRole('link', { name: /duplicar/i }).click();
	await page.waitForURL('/builder/purchase/new?duplicate=true');

	await expect(
		page.getByRole('heading', { name: /órden de compra/i }),
	).toBeVisible();
	await expect(page.getByText(`Total:$${formatCurrency(total)}`)).toBeVisible();
	await expect(page.getByText(supplier)).toBeVisible();
});

test('Duplicate purchase remision', async ({ page, login }) => {
	const seedProps = await login();
	const { total, supplier } = await createPurchaseRemision(seedProps);

	await page.goto('/remisions');
	await page
		.getByRole('button', { name: /abrir opciones de acciones/i })
		.click();
	await page.getByRole('link', { name: /duplicar/i }).click();
	await page.waitForURL('/builder/purchaseRemision/new?duplicate=true&');

	await expect(
		page.getByRole('heading', { name: /remisión de compra/i }),
	).toBeVisible();
	await expect(page.getByText(`Total:$${formatCurrency(total)}`)).toBeVisible();
	await expect(page.getByText(supplier)).toBeVisible();
});

test('Duplicate purchase invoice', async ({ page, login }) => {
	const seedProps = await login();
	const { total, supplier } = await createPurchaseInvoice(seedProps);

	await page.goto('/purchase-invoices');
	await page
		.getByRole('button', { name: /abrir opciones de acciones/i })
		.click();
	await page.getByRole('link', { name: /duplicar/i }).click();
	await page.waitForURL('/builder/purchaseInvoice/new?duplicate=true&');

	await expect(
		page.getByRole('heading', { name: /factura de compra/i }),
	).toBeVisible();
	await expect(page.getByText(`Total:$${formatCurrency(total)}`)).toBeVisible();
	await expect(page.getByText(supplier)).toBeVisible();
});
