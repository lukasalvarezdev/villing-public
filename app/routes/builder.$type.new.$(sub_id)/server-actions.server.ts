import { type Client, type Resolution } from '@prisma/client';
import { json, type ActionFunctionArgs } from '@remix-run/node';
import { v4 as uuid } from 'uuid';
import { z } from 'zod';
import { invoiceDianClient } from '~/modules/invoice/invoice-dian-client.server';
import { calculateProductsTotal } from '~/modules/invoice/invoice-math';
import { __prisma, getOrgDbClient } from '~/utils/db.server';
import { dianClient } from '~/utils/dian-client.server';
import { messages } from '~/utils/fetch-api.server';
import { errorLogger } from '~/utils/logger';
import {
	UVT_VALUE,
	formatCurrency,
	formatDate,
	getRequestSearchParams,
	parseFormData,
	safeNewDate,
	toNumber,
} from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';
import {
	generateCheckNegativeStockSql,
	generateUpdateProductsCostSql,
	generateUpdateProductsPharmaFieldsSql,
	generateUpdateProductsPricesSql,
	generateUpdateProductsStockSql,
	generateUpdateProductsStockSqlsForTotalSetting,
} from '~/utils/sql.server';
import { defaultConfig } from './builder/context';
import { type BuilderType, builderSchema } from './builder/schemas';
import {
	getBuilderType,
	getValidIdOrNoRecords,
	mapProductsWithStockCorrection,
} from './misc';

export type ActionData = {
	submissionId: string;
	intent: BuilderType;

	error?: string;
	referenceId?: string;
	redirectTo?: string;

	invoice?: {
		id: number;
		internalId: number;
		total: number;

		numeration?: number;

		name?: string;
		nit?: string;
		tel?: string;
		address?: string;
		city?: string;
		department?: string;
		qrCode?: string;
		cude?: string;
	};
};

export async function baseAction({ request }: ActionFunctionArgs) {
	await protectRoute(request);
	const formData = await parseFormData(request);
	const submissionId = uuid();

	const intent = getBuilderType(formData.get('intent') || '');
	const searchParams = getRequestSearchParams(request);

	try {
		const { db, orgId, userId } = await getOrgDbClient(request);
		const { invoice, totals } = parseInvoice(formData);
		const query = getSQLQueries();

		const { invoiceToPrintGetter } = await validateOwnership();

		const actions = {
			pos,
			remision,
			quote,
			electronic,
			purchase,
			purchaseRemision,
			purchaseInvoice,
			creditNote,
			debitNote,
			stockSetting,
		};

		const result = await actions[intent]();

		return json<ActionData>({
			submissionId,
			invoice: result,
			intent,
			redirectTo: result.redirectTo,
		});

		async function validateOwnership() {
			const [client, products, branch] = await db.$transaction([
				db.client.findFirst({
					where: { id: invoice.client?.id, organizationId: orgId },
				}),
				db.product.findMany({
					where: {
						organizationId: orgId,
						id: { in: invoice.products.map(p => p.id) },
					},
					select: { id: true },
				}),
				db.subOrganization.findFirst({
					where: { id: invoice.subId, organizationId: orgId },
				}),
			]);

			if (!branch) {
				const referenceId = errorLogger({
					error: `La sucursal con id ${invoice.subId} para la org: ${orgId} no existe`,
					path: request.url,
					body: Object.fromEntries(formData),
				});

				throw `La sucursal no existe. Por favor envía esta referencia a soporte: ${referenceId}`;
			}

			if (!client) {
				const referenceId = errorLogger({
					error: `El cliente con id ${invoice.client?.id} para la org: ${orgId} no existe`,
					path: request.url,
					body: Object.fromEntries(formData),
				});

				throw `El cliente no existe. Por favor envía esta referencia a soporte: ${referenceId}`;
			}

			const notFoundProducts = invoice.products.filter(
				p => !products.some(product => product.id === p.id),
			);
			if (notFoundProducts.length > 0) {
				throw `
					No se puede crear la venta porque los siguientes 
					productos han sido eliminados: 
					${notFoundProducts.map(p => p.name).join(', ')}
				`;
			}

			type GetterArgs = {
				id: number;
				internalId: number;
				total: number;
				numeration?: number;
				redirectTo?: string;
				qrCode?: string;
				cude?: string;
			};
			function invoiceToPrintGetter(args: GetterArgs) {
				if (!client) throw 'No hay cliente en la venta';

				return {
					...args,
					name: client.name,
					nit: client.idNumber,
					tel: client.tel,
					address: client.simpleAddress,
					city: client.city || 'Sin ciudad',
					department: client.department || 'Sin departamento',
					email: client.email,
				};
			}

			return { invoiceToPrintGetter };
		}

		function getSQLQueries() {
			return {
				stock: generateUpdateProductsStockSql(
					invoice.products,
					invoice.subId,
					'subtract',
				),
				stockAdd: generateUpdateProductsStockSql(
					invoice.products,
					invoice.subId,
					'add',
				),
				getCountParams: (table: CountTable) => {
					return {
						where: { id: orgId },
						data: { [table]: { increment: 1 } },
						select: { [table]: true },
					} as const;
				},
				pharma: generateUpdateProductsPharmaFieldsSql(invoice.products, orgId),
				prices: generateUpdateProductsPricesSql(invoice.products),
				cost: generateUpdateProductsCostSql(invoice.products),
			};
		}

		function pos() {
			return db.$transaction(
				async tx => {
					const [resolution, internalId, cashierId, client] = await Promise.all(
						[
							getResolutionData(),
							getInternalId(),
							getCashierId(),
							tx.client.findUniqueOrThrow({
								where: { id: invoice.client?.id },
								select: { idNumber: true },
							}),
							updateStock(),
						],
					);

					const sale = saleMapper({ invoice, totals });

					const { id } = await tx.legalPosInvoice.create({
						data: {
							...sale,
							userId,
							cashierId,
							internalId,
							organizationId: orgId,
							dianId: resolution.enabledInDian ? resolution.dianId : undefined,
							resolutionId: resolution.id,
							numeration: resolution.numeration,

							totalRefunded: totals.totalRefunds,
							totalCollected: invoice.totalCollected,
						},
					});

					let qrCode = '';
					let cude = '';
					if (resolution.enabledInDian) {
						if (totals.total > UVT_VALUE * 5) {
							throw `
								La venta supera el límite de 5 UVT ($${formatCurrency(UVT_VALUE * 5)})
								para pos electrónico. Por favor, crea una factura electrónica
							`;
						}

						const jsonData = await electronicPosFlow();
						if (jsonData.cude && jsonData.qrCode) {
							qrCode = jsonData.qrCode;
							cude = jsonData.cude;
						}
					}

					return invoiceToPrintGetter({
						id,
						internalId,
						total: totals.total,
						numeration: resolution.numeration,
						qrCode,
						cude,
					});

					async function electronicPosFlow() {
						if (!invoice.client) throw 'No se ha especificado un cliente';
						if (client.idNumber.length < 6) {
							throw `El cliente tiene un NIT inválido: ${client.idNumber}. Debe tener al menos 6 caracteres`;
						}

						const result = await invoiceDianClient.createPosInvoice({
							orgId,
							totals,
							subId: invoice.subId,
							clientId: invoice.client.id,
							products: invoice.products,
							numeration: resolution.numeration,
							resolutionId: resolution.id,
						});

						if (!result.success) {
							throw new Error(`Error with DIAN: ${result.referenceId}`);
						}

						const jsonData = getJsonData();
						await tx.legalPosInvoice.update({
							where: { id },
							data: jsonData,
							select: { id: true },
						});

						return jsonData;

						function getJsonData() {
							if (!result.success) throw '';

							const schema = z.object({
								is_valid: z.boolean().nullable(),
								zip_key: z.string().nullable(),
								uuid: z.string().nullable(),
								number: z.string().nullable(),
								qr_code: z.string().nullable(),
							});

							const res = schema.safeParse(result.data);

							if (!res.success) return { legalJson: result.data };

							return {
								cude: res.data.uuid,
								legalJson: result.data,
								qrCode: res.data.qr_code,
							};
						}
					}

					async function getResolutionData() {
						if (!invoice.resolutionId) {
							throw 'No se ha especificado una resolución';
						}

						const resolution = await tx.resolution.update({
							where: {
								id: invoice.resolutionId,
								organizationId: orgId,
								type: 'posInvoice',
							},
							data: { count: { increment: 1 } },
						});
						const id = resolution.id;
						const { numeration } = validateResolution(resolution);
						const dianId = `${resolution.prefix}${numeration}`;
						const enabledInDian = resolution.enabledInDian;

						return { id, numeration, dianId, enabledInDian };
					}

					async function getInternalId() {
						const { legalPosInvoicesCount } = await tx.counts.update(
							query.getCountParams('legalPosInvoicesCount'),
						);
						return toNumber(legalPosInvoicesCount);
					}

					function updateStock() {
						return tx.$executeRawUnsafe(query.stock);
					}

					async function getCashierId() {
						const [cashier] = await tx.cashier.findMany({
							where: { subOrganizationId: invoice.subId, closedAt: null },
							orderBy: { createdAt: 'asc' },
							take: -1,
							select: { id: true, closedAt: true, rateOfTheDay: true },
						});
						if (!cashier) {
							throw 'No tienes un cajero abierto, por favor abre uno';
						}
						return cashier.id;
					}
				},
				{ timeout: DIAN_TIMEOUT },
			);
		}

		function remision() {
			return db.$transaction(async tx => {
				const [internalId] = await Promise.all([
					getInternalId(),
					updateStock(),
				]);

				const sale = saleMapper({ invoice, totals });

				const { id } = await tx.legalInvoiceRemision.create({
					data: {
						...sale,
						userId,
						internalId,
						organizationId: orgId,
					},
				});

				return invoiceToPrintGetter({
					id,
					internalId,
					total: totals.total,
					redirectTo: `/invoice-remisions/${id}?print=true`,
				});

				async function getInternalId() {
					const { invoiceRemisionsCount } = await tx.counts.update(
						query.getCountParams('invoiceRemisionsCount'),
					);
					return toNumber(invoiceRemisionsCount);
				}

				function updateStock() {
					return tx.$executeRawUnsafe(query.stock);
				}
			});
		}

		function quote() {
			return db.$transaction(async tx => {
				const [internalId, cashierId] = await Promise.all([
					getInternalId(),
					getCashierId(),
					updateStock(),
				]);

				const { paymentForms, ...sale } = saleMapper({ invoice, totals });

				const { id } = await tx.quoteInvoice.create({
					data: {
						...sale,
						userId,
						cashierId,
						internalId,
						organizationId: orgId,
					},
				});

				return invoiceToPrintGetter({ id, internalId, total: totals.total });

				async function getInternalId() {
					const { quotesCount } = await tx.counts.update(
						query.getCountParams('quotesCount'),
					);
					return toNumber(quotesCount);
				}

				function updateStock() {
					return tx.$executeRawUnsafe(query.stock);
				}

				async function getCashierId() {
					const [cashier] = await tx.cashier.findMany({
						where: { subOrganizationId: invoice.subId, closedAt: null },
						orderBy: { createdAt: 'asc' },
						take: -1,
						select: { id: true, closedAt: true, rateOfTheDay: true },
					});
					if (!cashier) throw 'No tienes un cajero abierto, por favor abre uno';
					return cashier.id;
				}
			});
		}

		async function electronic() {
			const { data, dianData, email, token } = await db.$transaction(
				async tx => {
					const [resolution, internalId, { token, email }, client] =
						await Promise.all([
							getResolutionData(),
							getInternalId(),
							getSoenacToken(),
							getClient(),
							updateStock(),
						]);

					const sale = saleMapper({ invoice, totals });

					const { id } = await tx.legalInvoice.create({
						data: {
							...sale,
							userId,
							internalId,
							organizationId: orgId,
							dianId: resolution.dianId,
							resolutionId: resolution.id,
						},
					});

					const data = invoiceToPrintGetter({
						id,
						internalId,
						total: totals.total,
						numeration: resolution.numeration,
						redirectTo: `/invoices/${id}?print=true`,
					});

					if (data.nit.length < 6) {
						throw `El cliente tiene un NIT inválido: ${data.nit}. Debe tener al menos 6 caracteres`;
					}

					if (!resolution.soenacId) {
						throw 'La resolución no tiene id de la DIAN';
					}

					const result = await invoiceDianClient.createInvoice(
						token,
						toDianMapper({
							invoice,
							totals,
							numeration: resolution.numeration,
							soenacId: resolution.soenacId,
							client,
						}),
					);

					if (!result.success) {
						throw new Error(`Error with DIAN: ${result.referenceId}`);
					}

					await tx.legalInvoice.update({
						where: { id },
						data: { legalInvoiceJson: result.data },
						select: { id: true },
					});

					return { data, dianData: result.data, token, email };

					function getClient() {
						return tx.client.findFirstOrThrow({
							where: { id: invoice.client?.id, organizationId: orgId },
						});
					}

					async function getSoenacToken() {
						const organization = await tx.organization.findFirst({
							where: { id: orgId },
							select: { soenacToken: true, email: true },
						});
						if (!organization?.soenacToken) {
							throw 'La organización no tiene firma electrónica';
						}

						return {
							token: organization.soenacToken,
							email: organization.email,
						};
					}

					async function getResolutionData() {
						if (!invoice.resolutionId) {
							throw 'No se ha especificado una resolución';
						}

						const resolution = await tx.resolution.update({
							where: {
								id: invoice.resolutionId,
								organizationId: orgId,
								type: 'legalInvoice',
							},
							data: { count: { increment: 1 } },
						});
						const { numeration } = validateResolution(resolution);
						const dianId = `${resolution.id}-${numeration}`;

						return {
							id: resolution.id,
							numeration,
							dianId,
							soenacId: getSoenacId(resolution),
						};
					}

					async function getInternalId() {
						const { invoicesCount } = await tx.counts.update(
							query.getCountParams('invoicesCount'),
						);
						return toNumber(invoicesCount);
					}

					function updateStock() {
						return tx.$executeRawUnsafe(query.stock);
					}
				},
				{ timeout: DIAN_TIMEOUT },
			);

			await sendElectronicInvoiceEmail({
				dianData,
				id: data.id,
				token,
				clientEmail: data.email,
				organizationEmail: email,
			});

			return data;
		}

		function creditNote() {
			return db.$transaction(async tx => {
				if (!invoice.creditNoteReason) {
					throw 'Debes especificar una razón para la nota crédito';
				}
				const invoiceId = toNumber(searchParams.get('origin_invoice'));

				const [internalId, { invoice: originInvoice, token }, client] =
					await Promise.all([
						getInternalId(),
						getOriginInvoice({ orgId, invoiceId }),
						getClient(),
					]);

				await tx.$executeRawUnsafe(
					generateUpdateProductsStockSql(
						mapProductsWithStockCorrection(
							invoice.products,
							originInvoice.products,
						),
						invoice.subId,
						'subtract',
					),
				);

				const sale = noteMapper({ invoice, totals });

				const { id } = await tx.creditNote.create({
					data: {
						...sale,
						internalId,
						organizationId: orgId,
						invoiceId: invoiceId,
						reason: invoice.creditNoteReason,
					},
				});

				const data = await dianClient({
					action: 'createCreditNote',
					accessToken: token,
					body: {
						relatedInvoice: {
							cufe: originInvoice.json.uuid,
							createdAt: originInvoice.json.issue_date,
							numeration: originInvoice.json.number,
						},
						reason: invoice.creditNoteReason,
						...toDianMapper({
							invoice,
							totals,
							numeration: internalId,
							soenacId: originInvoice.soenacId,
							client,
						}),
					} as any,
				});

				await tx.creditNote.update({
					where: { id },
					data: { legalInvoiceJson: data, cude: data.uuid },
					select: { id: true },
				});

				return invoiceToPrintGetter({
					id,
					internalId,
					total: totals.total,
					redirectTo: `/credit-notes/${id}`,
				});

				function getClient() {
					return tx.client.findFirstOrThrow({
						where: { id: invoice.client?.id, organizationId: orgId },
					});
				}

				async function getInternalId() {
					const { creditNotesCount } = await tx.counts.update(
						query.getCountParams('creditNotesCount'),
					);
					return toNumber(creditNotesCount);
				}
			});
		}

		function debitNote() {
			return db.$transaction(async tx => {
				if (!invoice.debitNoteReason) {
					throw 'Debes especificar una razón para la nota crédito';
				}
				const invoiceId = toNumber(searchParams.get('origin_invoice'));

				const [internalId, { token, invoice: originInvoice }, client] =
					await Promise.all([
						getInternalId(),
						getOriginInvoice({ orgId, invoiceId }),
						getClient(),
					]);

				await tx.$executeRawUnsafe(
					generateUpdateProductsStockSql(
						mapProductsWithStockCorrection(
							invoice.products,
							originInvoice.products,
						),
						invoice.subId,
						'subtract',
					),
				);

				const sale = noteMapper({ invoice, totals });

				const { id } = await tx.debitNote.create({
					data: {
						...sale,
						internalId,
						organizationId: orgId,
						invoiceId: invoiceId,
						reason: invoice.debitNoteReason,
					},
				});

				const data = await dianClient({
					action: 'createDebitNote',
					accessToken: token,
					body: {
						relatedInvoice: {
							cufe: originInvoice.json.uuid,
							createdAt: originInvoice.json.issue_date,
							numeration: originInvoice.json.number,
						},
						reason: invoice.debitNoteReason,
						...toDianMapper({
							invoice,
							totals,
							numeration: internalId,
							soenacId: originInvoice.soenacId,
							client,
						}),
					} as any,
				});

				await tx.debitNote.update({
					where: { id },
					data: { legalInvoiceJson: data, cude: data.uuid },
					select: { id: true },
				});

				return invoiceToPrintGetter({
					id,
					internalId,
					total: totals.total,
					redirectTo: `/debit-notes/${id}`,
				});

				function getClient() {
					return tx.client.findFirstOrThrow({
						where: { id: invoice.client?.id, organizationId: orgId },
					});
				}

				async function getInternalId() {
					const { debitNotesCount } = await tx.counts.update(
						query.getCountParams('debitNotesCount'),
					);
					return toNumber(debitNotesCount);
				}
			});
		}

		function purchase() {
			return db.$transaction(async tx => {
				const [internalId] = await Promise.all([
					getInternalId(),
					updatePharma(),
				]);

				const { type, pending, expiresAt, ...purchase } = purchaseMapper({
					invoice,
					totals,
				});

				const { id } = await tx.purchase.create({
					data: {
						...purchase,
						userId,
						internalId,
						organizationId: orgId,
					},
				});

				return invoiceToPrintGetter({
					id,
					internalId,
					total: totals.total,
					redirectTo: `/purchases/${id}?print=true`,
				});

				async function getInternalId() {
					const { purchasesCount } = await tx.counts.update(
						query.getCountParams('purchasesCount'),
					);
					return toNumber(purchasesCount);
				}

				function updatePharma() {
					return tx.$executeRawUnsafe(query.pharma);
				}
			});
		}

		function purchaseRemision() {
			return db.$transaction(async tx => {
				const purchase_id = getValidIdOrNoRecords(
					searchParams.get('origin_purchase'),
				);

				const [internalId] = await Promise.all([
					getInternalId(),
					updateStock(),
					updateCost(),
					updatePrices(),
					updatePharma(),
					validateRelations(),
				]);

				const remision = purchaseMapper({ invoice, totals });

				if (!invoice.externalInvoiceId) {
					throw 'No se ha especificado el número de factura externa';
				}

				const { id } = await tx.purchaseRemision.create({
					data: {
						...remision,
						userId,
						internalId,
						organizationId: orgId,
						externalInvoiceId: invoice.externalInvoiceId,
						purchaseId: purchase_id || undefined,
					},
				});

				return invoiceToPrintGetter({
					id,
					internalId,
					total: totals.total,
					redirectTo: `/remisions/${id}?print=true`,
				});

				async function getInternalId() {
					const { purchaseRemisionsCount } = await tx.counts.update(
						query.getCountParams('purchaseRemisionsCount'),
					);
					return toNumber(purchaseRemisionsCount);
				}

				function updateStock() {
					return tx.$executeRawUnsafe(query.stockAdd);
				}

				function updateCost() {
					return tx.$executeRawUnsafe(query.cost);
				}

				function updatePrices() {
					if (!invoice.updatePrices) return;
					return tx.$executeRawUnsafe(query.prices);
				}

				function updatePharma() {
					return tx.$executeRawUnsafe(query.pharma);
				}

				async function validateRelations() {
					const purchase = await tx.purchase.findFirst({
						where: { id: purchase_id, organizationId: orgId },
						select: {
							purchaseInvoice: true,
							purchaseRemision: true,
							internalId: true,
						},
					});

					if (purchase?.purchaseInvoice || purchase?.purchaseRemision) {
						throw `La orden de compra No. ${purchase.internalId} ya tiene una factura o remisión`;
					}
				}
			});
		}

		function purchaseInvoice() {
			return db.$transaction(async tx => {
				const purchase_id = getValidIdOrNoRecords(
					searchParams.get('origin_purchase'),
				);
				const remision_id = getValidIdOrNoRecords(
					searchParams.get('origin_purchase_remision'),
				);

				const [internalId] = await Promise.all([
					getInternalId(),
					updateStock(),
					validateRelations(),
					updateCost(),
					updatePrices(),
					updatePharma(),
				]);

				const purchaseInvoice = purchaseMapper({ invoice, totals });

				if (!invoice.externalInvoiceId) {
					throw 'No se ha especificado el número de factura externa';
				}

				const { id } = await tx.purchaseInvoice.create({
					data: {
						...purchaseInvoice,
						userId,
						internalId,
						organizationId: orgId,
						externalInvoiceId: invoice.externalInvoiceId,
						purchaseId: purchase_id || undefined,
						purchaseRemisionId: remision_id || undefined,
					},
				});

				return invoiceToPrintGetter({
					id,
					internalId,
					total: totals.total,
					redirectTo: `/purchase-invoices/${id}?print=true`,
				});

				async function getInternalId() {
					const { purchasesCount } = await tx.counts.update(
						query.getCountParams('purchasesCount'),
					);
					return toNumber(purchasesCount);
				}

				function updateStock() {
					return tx.$executeRawUnsafe(query.stockAdd);
				}

				function updateCost() {
					return tx.$executeRawUnsafe(query.cost);
				}

				function updatePrices() {
					if (!invoice.updatePrices) return;
					return tx.$executeRawUnsafe(query.prices);
				}

				function updatePharma() {
					return tx.$executeRawUnsafe(query.pharma);
				}

				async function validateRelations() {
					if (purchase_id && remision_id) {
						throw 'No puedes crear una factura con una remisión y una orden de compra';
					}

					const [purchase, remision] = await Promise.all([
						tx.purchase.findFirst({
							where: { id: purchase_id, organizationId: orgId },
							select: {
								purchaseInvoice: true,
								internalId: true,
							},
						}),
						tx.purchaseRemision.findFirst({
							where: { id: remision_id, organizationId: orgId },
							select: {
								purchaseInvoice: true,
								internalId: true,
							},
						}),
					]);

					if (purchase?.purchaseInvoice) {
						throw `La orden de compra No. ${purchase.internalId} ya tiene una factura o remisión`;
					}

					if (remision?.purchaseInvoice) {
						throw `La remisión No. ${remision.internalId} ya tiene una factura asociada`;
					}
				}
			});
		}

		function stockSetting() {
			return db.$transaction(async tx => {
				if (invoice.stockIncomeOrExit === 'exit') {
					invoice.products = makeAllProductsQuantityNegative();
				}

				const [internalId, ...results] = await Promise.all([
					getInternalId(),
					...getStockQueries(),
				]);

				if (results.some(r => r > 0) && invoice.transferToBranchId) {
					throw 'No puedes transferir productos con stock negativo, verifica las cantidades';
				}

				const { id } = await tx.inventorySetting.create({
					data: {
						count: internalId,
						organizationId: orgId,
						subOrganizationId: invoice.subId,
						transferToId: invoice.transferToBranchId,
						products: {
							create: invoice.products.map(product => {
								const stockInTarget = toNumber(
									product.stocks?.find(
										s => s.branchId === invoice.transferToBranchId,
									)?.quantity,
								);

								return {
									productId: product.id,
									internalId: product.internalId,

									name: product.name,
									quantity: product.quantity,
									cost: product.cost,
									type: 'entry',
									price: 0,
									lastStock: product.stock,
									newStock:
										invoice.stockType === 'total'
											? product.quantity
											: invoice.transferToBranchId
												? product.stock - product.quantity
												: product.stock + product.quantity,
									lastStockInTarget: stockInTarget,
									newStockInTarget: stockInTarget + product.quantity,
									prices: product.prices,
								};
							}),
						},
						type: invoice.transferToBranchId ? 'transfer' : 'setting',
						settingType: invoice.transferToBranchId
							? 'partial'
							: invoice.stockType,
						incomeOrExit: invoice.transferToBranchId
							? 'income'
							: invoice.stockIncomeOrExit,
					},
				});

				return {
					id,
					internalId,
					total: 0,
					redirectTo: `/stock-settings/${id}?print=true`,
				};

				async function getInternalId() {
					const { inventorySettingsCount } = await tx.counts.update(
						query.getCountParams('inventorySettingsCount'),
					);
					return toNumber(inventorySettingsCount);
				}

				function getStockQueries() {
					const queries: Array<string> = [];

					if (invoice.stockType === 'total' && !invoice.transferToBranchId) {
						queries.push(
							...generateUpdateProductsStockSqlsForTotalSetting(
								invoice.products,
								invoice.subId,
							),
						);
					} else {
						const action = invoice.transferToBranchId ? 'subtract' : 'add';

						queries.push(
							generateUpdateProductsStockSql(
								invoice.products,
								invoice.subId,
								action,
							),
						);

						if (invoice.transferToBranchId) {
							queries.push(
								...[
									generateUpdateProductsStockSql(
										invoice.products,
										invoice.transferToBranchId,
										'add',
									),
									generateCheckNegativeStockSql(
										invoice.products,
										invoice.subId,
									),
								],
							);
						}
					}

					return queries.map(q => tx.$executeRawUnsafe(q));
				}

				function makeAllProductsQuantityNegative() {
					return invoice.products.map(p => ({
						...p,
						quantity: -p.quantity,
					}));
				}
			});
		}
	} catch (error) {
		const slowError = getIsTransactionClosedError(error);

		if (slowError) {
			return json<ActionData>({ error: slowError, submissionId, intent }, 400);
		}

		if (typeof error === 'string') {
			return json<ActionData>({ error, submissionId, intent }, 400);
		}

		const body = Object.fromEntries(formData);
		const referenceId = errorLogger({ error, path: request.url, body });
		const message = 'Hubo un error creando la factura';

		return json<ActionData>(
			{ error: message, submissionId, referenceId, intent },
			500,
		);
	}
}

function getIsTransactionClosedError(error: unknown) {
	const string = String(error);
	if (string.includes('Transaction already closed')) {
		return messages.dian_slow;
	}
}

function parseInvoice(
	formData: URLSearchParams,
	canHaveNegativeQuantities?: boolean,
) {
	const data = JSON.parse(formData.get('invoice')!);
	const config = data.config || defaultConfig;

	if (!data.subId) {
		throw 'No se ha seleccionado una sucursal, seleccione una sucursal';
	}

	const invoice = finalInvoiceSchema.parse({ ...data, config });
	const totals = calculateProductsTotal(invoice.products, invoice.config);

	validateQuantity();
	validatePaymentMethods();

	return { invoice, totals };

	function validateQuantity() {
		const hasNoProducts = invoice.products.length <= 0;

		const invalidProducts = invoice.products.filter(p => p.quantity === 0);
		const invalidQuantities = invalidProducts.length > 0;

		if (hasNoProducts) throw 'No puedes crear una factura sin productos';
		if (invalidQuantities && !canHaveNegativeQuantities) {
			throw `El producto ${invalidProducts[0]?.name} no puede tener cantidad 0`;
		}
	}

	function validatePaymentMethods() {
		const totalPayments = invoice.paymentForms.reduce(
			(total, { amount }) => total + amount,
			0,
		);
		if (totalPayments != totals.total) {
			throw `
				El valor pagado no puede ser diferente al total de la factura. 
				Pagado: $${formatCurrency(totalPayments)}, 
				Total: $${formatCurrency(totals.total)}
			`;
		}
	}
}

const resolutionSchema = z.object({
	count: z.number(),
	to: z.number(),
	toDate: z.date(),
});
function validateResolution(base: Resolution) {
	const resolution = resolutionSchema.parse(base);

	const numeration = resolution.count;
	if (numeration > resolution.to) {
		throw `La numeración de la resolución ha sido superada. (Actual: ${numeration}, Máximo: ${resolution.to})`;
	}
	if (new Date() > resolution.toDate) {
		throw `La resolución ha vencido. (Fecha de vencimiento: ${formatDate(
			resolution.toDate,
		)})`;
	}

	return { numeration };
}

const finalInvoiceSchema = builderSchema.omit({ subId: true }).extend({
	subId: z.number({
		required_error: 'No se ha seleccionado una sucursal',
	}),
});

type MapperArgs = {
	invoice: z.infer<typeof finalInvoiceSchema>;
	totals: ReturnType<typeof calculateProductsTotal>;
	validateClient?: boolean;
};

function saleMapper({ invoice, totals, validateClient = true }: MapperArgs) {
	if (!invoice.client && validateClient) throw 'No hay cliente en la venta';

	return {
		clientId: invoice.client?.id as number,
		subOrganizationId: invoice.subId,

		total: totals.total,
		subtotal: totals.subtotal,
		totalDiscount: totals.totalDiscount,
		totalTax: totals.totalTax,
		isTaxIncluded: true,

		type: invoice.paysInDays ? 'loan' : 'cash',
		pending: invoice.paysInDays ? totals.total : 0,
		expiresAt: invoice.paysInDays
			? new Date(Date.now() + invoice.paysInDays * 24 * 60 * 60 * 1000)
			: undefined,

		notes: invoice.notes,
		paymentForms: {
			create: invoice.paymentForms.map(({ id, ...p }) => ({ ...p })),
		},
		products: {
			create: invoice.products.map(p => ({
				name: p.name,
				notes: p.notes,
				productId: p.id,
				quantity: p.quantity,
				price: p.price,
				cost: p.cost,
				discount: p.discount,
				tax: p.tax,
				batch: p.batch,
				expirationDate: safeNewDate(p.expirationDate),
				invimaRegistry: p.invimaRegistry,
				oldStock: p.stock,
				newStock: p.stock - p.quantity,
			})),
		},
	} as const;
}

function purchaseMapper({ invoice, totals }: MapperArgs) {
	const { clientId, paymentForms, ...sale } = saleMapper({
		invoice,
		totals,
		validateClient: false,
	});

	if (!invoice.supplier) throw 'No hay proveedor en la compra';

	return {
		...sale,
		supplierId: invoice.supplier.id,
		retention: invoice.config.retention,
		updatePrices: invoice.updatePrices,
		products: {
			create: invoice.products.map(p => ({
				name: p.name,
				notes: p.notes,
				productId: p.id,
				quantity: p.quantity,
				price: p.price,
				cost: p.cost,
				discount: p.discount,
				tax: p.tax,
				batch: p.batch,
				expirationDate: safeNewDate(p.expirationDate),
				invimaRegistry: p.invimaRegistry,
				oldStock: p.stock,
				newStock: p.stock + p.quantity,
			})),
		},
	} as const;
}

function noteMapper(args: MapperArgs) {
	const {
		clientId,
		subOrganizationId,
		expiresAt,
		pending,
		type: _,
		...sale
	} = saleMapper(args);

	return sale;
}

type CountTable =
	| 'legalPosInvoicesCount'
	| 'invoicesCount'
	| 'invoiceRemisionsCount'
	| 'quotesCount'
	| 'purchaseRemisionsCount'
	| 'purchaseInvoicesCount'
	| 'purchasesCount'
	| 'inventorySettingsCount'
	| 'creditNotesCount'
	| 'debitNotesCount';

type DianMapperArgs = {
	invoice: z.infer<typeof finalInvoiceSchema>;
	totals: ReturnType<typeof calculateProductsTotal>;
	numeration: number;
	soenacId: number;
	client: Client;
};
function toDianMapper(args: DianMapperArgs) {
	const { invoice, client, numeration, totals, soenacId } = args;

	return {
		id: numeration,
		resolutionId: soenacId,
		client: {
			email: client.email,
			idNumber: client.idNumber,
			name: client.name,
			phone: client.tel,
			municipalityId: 1,
			address: client.simpleAddress,
			merchantRegistration: '1',
			typeDocumentIdentification: client.typeDocumentIdentification,
			typeLiability: client.typeLiability,
			typeOrganization: client.typeOrganization,
		},
		products: invoice.products.map(p => ({
			id: p.id,
			quantity: p.quantity,
			tax: p.tax,
			price: p.price,
			name: p.name,
			discount: p.discount,
		})),
		subtotal: totals.subtotal,
		totalTax: totals.totalTax,
		taxIncluded: true,
	};
}

type EmailArgs = {
	id: number;
	dianData: any;
	token: string;
	clientEmail: string;
	organizationEmail: string;
};
async function sendElectronicInvoiceEmail(args: EmailArgs) {
	const { dianData, id, token, clientEmail, organizationEmail } = args;
	if (!dianData.is_valid) return;

	await __prisma.$transaction(async tx => {
		await tx.legalInvoice.update({
			where: { id },
			data: {
				legalInvoiceJson: dianData,
				cufe: dianData.uuid,
				wasEmailSent: true,
			},
			select: { id: true },
		});

		const wasEmailSent = await dianClient({
			action: 'sendInvoiceEmail',
			accessToken: token,
			body: {
				cufe: dianData.uuid,
				email: clientEmail,
				organizationEmail,
			},
		});

		if (!wasEmailSent) {
			throw 'No se pudo enviar el correo electrónico';
		}
	});
}

function getSoenacId(resolution: { soenacId: string | null }) {
	const id = resolution.soenacId?.split('-')[1];
	if (!id) throw 'No se encontró el id de la resolución';
	return parseInt(id);
}

type OriginInvoiceArgs = { orgId: number; invoiceId: number };
async function getOriginInvoice({ invoiceId, orgId }: OriginInvoiceArgs) {
	const [invoice, organization] = await __prisma.$transaction([
		__prisma.legalInvoice.findFirstOrThrow({
			where: {
				id: invoiceId,
				organizationId: orgId,
				cufe: { not: null },
			},
			select: {
				id: true,
				products: { select: { productId: true, quantity: true } },
				legalInvoiceJson: true,
				resolution: { select: { soenacId: true } },
			},
		}),
		__prisma.organization.findFirst({
			where: { id: orgId },
			select: { soenacToken: true, email: true },
		}),
	]);

	if (!organization?.soenacToken) {
		throw 'La empresa no tiene firma electrónica';
	}

	return {
		invoice: {
			products: invoice.products,
			json: originInvoiceSchema.parse(invoice.legalInvoiceJson),
			soenacId: getSoenacId(invoice.resolution),
		},
		token: organization.soenacToken,
	};
}

const originInvoiceSchema = z.object({
	uuid: z.string(),
	issue_date: z.string(),
	number: z.string(),
});

const DIAN_TIMEOUT = 40_000;
