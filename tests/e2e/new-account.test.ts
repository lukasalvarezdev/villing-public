import { faker } from '@faker-js/faker';
import { test as base } from '@playwright/test';
import { assertOptionIsSelected } from 'tests/playwrigth-utils';

const test = base.extend({});
const { expect } = test;

test.afterEach('Cleanup organization', async ({ page }) => {
	await page.goto('/cleanup');
});

test('Should create a new account and organization', async ({ page }) => {
	await page.goto('/join');

	await page
		.getByRole('textbox', { name: /correo/i })
		.fill(faker.internet.email());
	await page.getByRole('textbox', { name: /contraseña/i }).fill(
		faker.internet.password({
			prefix: '!123A',
		}),
	);

	await page.getByRole('button', { name: /crear mi cuenta/i }).click();

	await page.waitForURL('/start');

	await page
		.getByRole('textbox', { name: /nombre de usuario/i })
		.fill(faker.company.name());

	await page
		.getByRole('textbox', { name: /nombre de la empresa/i })
		.fill(faker.company.name());

	await page
		.getByRole('button', { name: /crear empresa y continuar/i })
		.click();

	await page.waitForURL(/builder\/pos/);

	await expect(
		page.getByRole('button', { name: /confirmar venta pos/i }),
	).toBeVisible();
	await assertOptionIsSelected(page, 'Precio de venta');

	await page.goto('/home');

	await page.goto('/analytics');
	await page.waitForURL('/home?msg=confirm_email');
	await page.waitForLoadState('networkidle');
	await expect(page.getByText('Para acceder a el resto de la')).toBeVisible();
});
