import { faker } from '@faker-js/faker';
import { getProductsData } from 'tests/db-seed-utils';
import { test, expect, assertOptionIsSelected } from '../playwrigth-utils';

test('Should go through the builder flow and create a POS invoice', async ({
	page,
	login,
}) => {
	const { branchId, resolutionId, orgId } = await login();
	const [product1, product2] = await getProductsData(orgId);

	await page.goto(`/builder/pos/new/${branchId}`);

	// 1. Make sure we have all default values
	await assertOptionIsSelected(page, 'Precio de venta');
	await expect(page.getByRole('button', { name: /mostrador/i })).toBeVisible();
	await page.getByRole('button', { name: /confirmar venta pos/i }).click();
	await expect(page.getByRole('combobox', { name: /resolución/i })).toHaveValue(
		String(resolutionId),
	);
	await page.getByRole('button', { name: /cerrar confirmación/i }).click();

	// 1. Add products by searching
	await page
		.getByRole('searchbox', { name: /busca un artículo/i })
		.fill(product1.name);
	await page
		.getByRole('button', { name: `Agregar ${product1.name}`, exact: true })
		.click();
	await expect(
		page.getByRole('cell', { name: product1.name, exact: true }),
	).toBeVisible();

	// 2. Add products with barcode
	await page
		.getByRole('searchbox', { name: /busca un artículo/i })
		.fill(product2.barCodes[0] || '');
	await expect(
		page.getByRole('cell', { name: product2.name, exact: true }),
	).toBeVisible();

	// 3. Create quick product
	const quickProduct = getQuickProduct();
	await page.getByRole('button', { name: /crear producto rápido/i }).click();
	await page.getByRole('textbox', { name: /nombre/i }).fill(quickProduct.name);
	await page.getByRole('textbox', { name: /costo/i }).fill(quickProduct.cost);
	await page
		.getByRole('textbox', { name: /precio de venta/i })
		.fill(quickProduct.price);
	await page.getByRole('button', { name: /agregar/i }).click();

	await expect(
		page.getByRole('cell', { name: quickProduct.name, exact: true }),
	).toBeVisible();

	// 4. Change price list
	await page
		.getByRole('combobox', { name: /lista de precios/i })
		.selectOption('Precio mayorista');
	await page.getByRole('button', { name: /si, cambiar/i }).click();

	// 5. Change client
	await page.getByRole('button', { name: /mostrador/i }).click();
	await page.getByRole('button', { name: /cliente de prueba/i }).click();

	// 6. Create temporary client
	await page.getByRole('button', { name: 'Crear', exact: true }).click();
	await page.getByRole('textbox', { name: /nombre/i }).fill('CLIENTE TEMPORAL');
	await page.getByRole('button', { name: /crear cliente temporal/i }).click();
	await expect(
		page.getByRole('button', { name: /cliente temporal/i }),
	).toBeVisible();

	// 7. Global discount
	await page.getByRole('textbox', { name: /descuento global/i }).fill('10');
	await expect(page.getByText('10%').first()).toBeVisible();

	// 8. Create sale
	await page.getByRole('button', { name: /confirmar venta pos/i }).click();
	await page
		.getByRole('checkbox', { name: /deseo imprimir esta venta pos/i })
		.uncheck();

	await page.getByRole('button', { name: /crear venta pos/i }).click();

	// 9. Check that the sale is empty
	await expect(
		page.getByRole('cell', { name: product1.name, exact: true }),
	).not.toBeVisible();
});

test('Should create a remision', async ({
	page,
	login,
	fillLocalForageValue,
}) => {
	const { invoice, branchId, orgId } = await login();
	const [product1, product2] = await getProductsData(orgId);

	await page.goto('/home');
	await fillLocalForageValue(
		{ ...invoice, products: [product1, product2] },
		'remision',
	);
	await page.goto(`/builder/remision/new/${branchId}`);

	await expect(
		page.getByRole('cell', { name: product1.name, exact: true }),
	).toBeVisible();

	await page.getByRole('button', { name: /confirmar remisión/i }).click();
	await page.getByRole('button', { name: /crear remisión/i }).click();
	await page.waitForURL(/invoice-remisions\/\d+/);
	await expect(page.getByText(/totales discriminados/i)).toBeVisible();
});

test('Should create a purchase order', async ({
	page,
	login,
	fillLocalForageValue,
}) => {
	const { invoice, branchId, orgId } = await login();
	const [product1, product2] = await getProductsData(orgId);

	await page.goto('/home');
	await fillLocalForageValue(
		{ ...invoice, products: [product1, product2] },
		'purchase',
	);
	await page.goto(`/builder/purchase/new/${branchId}`);

	await expect(
		page.getByRole('cell', { name: product1.name, exact: true }),
	).toBeVisible();

	await page
		.getByRole('button', { name: /confirmar órden de compra/i })
		.click();
	await page.getByRole('button', { name: /crear órden de compra/i }).click();
	await page.waitForURL(/purchases\/\d+/);
	await expect(page.getByText(/totales discriminados/i)).toBeVisible();
});

test('Should create a purchase remision', async ({
	page,
	login,
	fillLocalForageValue,
}) => {
	const { invoice, branchId, orgId } = await login();
	const [product1, product2] = await getProductsData(orgId);

	await page.goto('/home');
	await fillLocalForageValue(
		{ ...invoice, products: [product1, product2] },
		'purchase-remision',
	);
	await page.goto(`/builder/purchaseRemision/new/${branchId}`);

	await expect(
		page.getByRole('cell', { name: product1.name, exact: true }),
	).toBeVisible();

	await page
		.getByRole('textbox', {
			name: /no. de factura externa/i,
		})
		.fill(faker.number.int({ min: 1, max: 10 }).toString());

	await page
		.getByRole('button', { name: /confirmar remisión de compra/i })
		.click();
	await page.getByRole('button', { name: /crear remisión de compra/i }).click();
	await page.waitForURL(/remisions\/\d+/);
	await expect(page.getByText(/totales discriminados/i)).toBeVisible();
});

test('Should create a purchase invoice', async ({
	page,
	login,
	fillLocalForageValue,
}) => {
	const { invoice, branchId, orgId } = await login();
	const [product1, product2] = await getProductsData(orgId);

	await page.goto('/home');
	await fillLocalForageValue(
		{ ...invoice, products: [product1, product2] },
		'purchase-invoice',
	);
	await page.goto(`/builder/purchaseInvoice/new/${branchId}`);

	await expect(
		page.getByRole('cell', { name: product1.name, exact: true }),
	).toBeVisible();

	await page
		.getByRole('textbox', {
			name: /no. de factura externa/i,
		})
		.fill(faker.number.int({ min: 1, max: 10 }).toString());

	await page
		.getByRole('button', { name: /confirmar factura de compra/i })
		.click();
	await page.getByRole('button', { name: /crear factura de compra/i }).click();
	await page.waitForURL(/purchase-invoices\/\d+/);
	await expect(page.getByText(/totales discriminados/i)).toBeVisible();
});

function getQuickProduct() {
	return {
		name: faker.commerce.productName(),
		cost: faker.commerce.price(),
		price: faker.commerce.price(),
	};
}
