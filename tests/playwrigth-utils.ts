import { type Page, test as base } from '@playwright/test';
import { type Builder } from '~/routes/builder.$type.new.$(sub_id)/builder/schemas';
import { cleanupUserSetup, setupUser } from './setup-user';

type Fixtures = {
	login: () => ReturnType<typeof setupUser>;
	fillLocalForageValue: (invoice: Builder, key: string) => Promise<void>;
};
export const test = base.extend<Fixtures>({
	login: async ({ page }, use) => {
		let user: User | undefined;

		await use(async () => {
			const data = await setupUser();
			user = data.user;

			await page.context().addCookies(data.cookie);

			return data;
		});

		await cleanupUserSetup(user);
	},
	fillLocalForageValue: async ({ page }, use) => {
		await use(async (invoice, key) => {
			await page.evaluate(
				([invoice, key]) => {
					fillLocalForageValue(invoice, key);

					/**
					 * We do this because we can't use localforage in Playwright as it uses
					 * node.js and localforage only works in the browser. With page.evaluate
					 * you cannot access any variable outside of the function, so we have to
					 * define the function inside the evaluate.
					 */
					async function fillLocalForageValue(invoice: Builder, key: string) {
						type StoredValue = string | number | boolean | object | null;

						class SimpleStorage {
							private dbPromise: Promise<IDBDatabase>;

							constructor(
								private dbName: string,
								private storeName: string,
							) {
								this.dbPromise = new Promise((resolve, reject) => {
									const openRequest = indexedDB.open(this.dbName);
									openRequest.onupgradeneeded = () => {
										const db = openRequest.result;
										if (!db.objectStoreNames.contains(this.storeName)) {
											db.createObjectStore(this.storeName);
										}
									};
									openRequest.onsuccess = () => resolve(openRequest.result);
									openRequest.onerror = () => reject(openRequest.error);
								});
							}

							async setItem(key: string, value: StoredValue): Promise<void> {
								const db = await this.dbPromise;
								return new Promise((resolve, reject) => {
									const transaction = db.transaction(
										this.storeName,
										'readwrite',
									);
									const store = transaction.objectStore(this.storeName);
									const request = store.put(value, key);
									request.onsuccess = () => resolve();
									request.onerror = () => reject(request.error);
								});
							}

							async getItem(key: string): Promise<StoredValue> {
								const db = await this.dbPromise;
								return new Promise((resolve, reject) => {
									const transaction = db.transaction(
										this.storeName,
										'readonly',
									);
									const store = transaction.objectStore(this.storeName);
									const request = store.get(key);
									request.onsuccess = () => resolve(request.result);
									request.onerror = () => reject(request.error);
								});
							}

							async removeItem(key: string): Promise<void> {
								const db = await this.dbPromise;
								return new Promise((resolve, reject) => {
									const transaction = db.transaction(
										this.storeName,
										'readwrite',
									);
									const store = transaction.objectStore(this.storeName);
									const request = store.delete(key);
									request.onsuccess = () => resolve();
									request.onerror = () => reject(request.error);
								});
							}

							async clear(): Promise<void> {
								const db = await this.dbPromise;
								return new Promise((resolve, reject) => {
									const transaction = db.transaction(
										this.storeName,
										'readwrite',
									);
									const store = transaction.objectStore(this.storeName);
									const request = store.clear();
									request.onsuccess = () => resolve();
									request.onerror = () => reject(request.error);
								});
							}
						}

						const storage = new SimpleStorage('localforage', 'keyvaluepairs');
						await storage.setItem(key, invoice);
					}
				},
				[invoice, key] as const,
			);
		});
	},
});
type User = { id: number; email: string; organizationId: number };

export const { expect } = test;

/**
 * Asserts that an option is selected. Playwright does not have a built-in method to do this
 * withouth knowing the value of the option.
 * @param page Page
 * @param label string - Label of the option to assert
 */
export function assertOptionIsSelected(page: Page, label: string | RegExp) {
	return expect(page.getByText(label)).toHaveAttribute('selected', '');
}
