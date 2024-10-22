import { test, expect } from '../playwrigth-utils';

test('Create product', async ({ page, login }) => {
	await login();

	await page.goto('/products/new');

	// 1. Fill product data
	await page
		.getByRole('textbox', { name: /nombre/i })
		.fill('Producto de pruebas');
	await page
		.getByRole('textbox', { name: /descripción/i })
		.fill('Producto de prueba descripción');

	// 2. Fill cost
	await page.getByRole('textbox', { name: 'Costo', exact: true }).fill('100');
	await expect(
		page.getByRole('textbox', { name: /costo \(mas impuestos\)/i }),
	).toHaveValue('119');

	// 3. Fill first price
	await page
		.getByRole('textbox', { name: /precio: precio de venta/i })
		.fill('150');
	await expect(
		page.getByRole('textbox', {
			name: /precio \(mas impuestos\): precio de venta/i,
		}),
	).toHaveValue('178.5');
	expect(page.getByText('%50')).toBeVisible();

	await page.getByRole('textbox', { name: /stock inicial/i }).fill('10');
	await page.getByRole('button', { name: /crear producto/i }).click();

	// 4. Check empty prices error
	expect(
		page.getByText('Los precios no pueden ser menores o iguales a 0'),
	).toBeVisible();

	// 5. Fill second price
	await page
		.getByRole('textbox', { name: /precio: precio mayorista/i })
		.fill('200');

	await page.getByRole('button', { name: /crear producto/i }).click();
	await expect(
		page.getByText(/El producto fue creado correctamente/i),
	).toBeVisible();

	await page.goto('/products');

	await expect(page.getByText(/principal: 10/i)).toBeVisible();
	await page.getByRole('link', { name: /producto de pruebas/i }).click();
	await page.waitForURL(/products\/\d+/);

	// 6. Check product data and update
	await expect(
		page.getByRole('textbox', { name: /costo \(mas impuestos\)/i }),
	).toHaveValue('119');

	await expect(
		page.getByRole('textbox', {
			name: /precio \(mas impuestos\): precio de venta/i,
		}),
	).toHaveValue('178.5');

	await page.getByRole('button', { name: /guardar cambios/i }).click();

	await expect(
		page.getByText(/El producto fue actualizado correctamente/i),
	).toBeVisible();
});
