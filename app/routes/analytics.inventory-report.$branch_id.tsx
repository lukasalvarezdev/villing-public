import { Prisma } from '@prisma/client';
import { redirect, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import * as z from 'zod';
import { DateString } from '~/components/client-only';
import { SearchInput } from '~/components/filters';
import {
	Pagination,
	getLastPage,
	getQueryPositionData,
} from '~/components/pagination';
import {
	NonPrintableContent,
	PrintableContent,
} from '~/components/printable-content';
import {
	Table,
	TableHead,
	TableHeadCell,
	TableBody,
	TableRow,
	TableCell,
} from '~/components/ui-library';
import { PrintInvoiceButton } from '~/modules/invoice/invoice-page-components';
import {
	BillFooter,
	OrganizationInfo,
	Separator,
} from '~/modules/printing/narrow-bill';
import { getOrgDbClient } from '~/utils/db.server';
import {
	cn,
	formatCurrency,
	formatDate,
	getSearchParamsWithDefaultDateRange,
	stringToTsVector,
	toNumber,
} from '~/utils/misc';
import { queryBuilder } from '~/utils/query-builder.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId, userId } = await getOrgDbClient(request);
	const searchParams = getSearchParamsWithDefaultDateRange(request, true);
	const branchId = toNumber(params.branch_id);

	const user = await db.user.findUnique({
		where: { id: userId, allowedSubOrgs: { some: { id: branchId } } },
		select: {
			id: true,
			allowedSubOrgs: {
				where: { deletedAt: null },
				select: { id: true, name: true },
			},
		},
	});

	if (!user) return redirect('/analytics/inventory-report');

	const filters = queryBuilder(searchParams, ['createdAt']);
	const productFilters = queryBuilder(searchParams, [
		'name',
		'reference',
		'internalId',
	]);
	const queryPositionData = getQueryPositionData(request);
	const { skip, take } = queryPositionData;
	const search = searchParams.get('search') || '';
	const productSearch = search ? stringToTsVector(search) : null;

	const where = {
		organizationId: orgId,
		...productFilters,
		LegalInvoiceProduct: {
			some: {
				...filters,
				OR: [
					{ legalPosInvoice: { subOrganizationId: branchId } },
					{ legalInvoice: { subOrganizationId: branchId } },
					{ LegalInvoiceRemision: { subOrganizationId: branchId } },
				],
			},
		},
	};

	const prismaTsVectorSearch = Prisma.sql`to_tsvector(concat_ws(' ', p."reference", p."name")) @@ to_tsquery(${productSearch})`;
	const [totalsAndQuantities, count] = await db.$transaction([
		db.$queryRaw`
			SELECT
					subquery.name,
					subquery.reference,
					subquery."productId",
					subquery.quantity,
					subquery.sold,
					subquery.cost
			FROM (
					SELECT
							p."name",
							p."reference",
							lip."productId",
							CAST(SUM(lip.quantity) AS int) AS quantity,
							CAST(SUM(lip.price * lip.quantity) AS int) AS sold,
							lip.cost AS cost
					FROM public."LegalInvoiceProduct" lip
					LEFT JOIN public."LegalPosInvoice" lpi ON lip."legalPosInvoiceId" = lpi."id"
					LEFT JOIN public."LegalInvoice" li ON lip."legalInvoiceId" = li."id"
					LEFT JOIN public."LegalInvoiceRemision" lir ON lip."legalInvoiceRemisionId" = lir."id"
					LEFT JOIN public."Product" p ON lip."productId" = p."id"
					WHERE lip."createdAt" BETWEEN ${filters.createdAt.gte} AND ${filters.createdAt.lte}
							AND (
									lpi."subOrganizationId" = ${branchId}
									OR li."subOrganizationId" = ${branchId}
									OR lir."subOrganizationId" = ${branchId}
							)
							AND (lpi."canceledAt" IS NULL OR lpi."id" IS NULL)
							AND (lir."canceledAt" IS NULL OR lir."id" IS NULL)
							AND (li."cufe" IS NOT NULL OR li."id" IS NULL)
							AND (lip."productId" IS NOT NULL)
							AND ${productSearch ? prismaTsVectorSearch : Prisma.sql`TRUE`}
					GROUP BY p."name", p."reference", lip."productId", lip.cost
			) AS subquery
			ORDER BY subquery.quantity DESC
			OFFSET ${skip} LIMIT ${take}
		`,
		db.product.count({ where }),
	]);

	const products = productsSchema.parse(totalsAndQuantities);

	return {
		lastPage: getLastPage(queryPositionData, count),
		branch: user.allowedSubOrgs.find(x => x.id === branchId)!,
		products: reduceAndGroupProducts(products),
		startDate: searchParams.get('start'),
		endDate: searchParams.get('end'),
	};
}

export default function Component() {
	return (
		<div>
			<NarrowBillToPrint />
			<NonPrintableContent>
				<Report />
			</NonPrintableContent>
		</div>
	);
}

function Report() {
	const { products, branch, lastPage } = useLoaderData<typeof loader>();

	return (
		<div className="flex-1">
			<div
				className={cn(
					'flex justify-between flex-col gap-2 md:flex-row',
					'md:items-center mb-4 flex-1',
				)}
			>
				<div>
					<h3>Reporte de inventario detallado</h3>
					<p className="text-gray-500">
						Detalle de los productos vendidos en el periodo seleccionado en la
						sucursal <strong>{branch.name}</strong>
					</p>
				</div>
				<PrintInvoiceButton text="Imprimir reporte" />
			</div>

			<SearchInput
				className="mb-4"
				placeholder="Busca por nombre, referencia o código interno"
			/>

			{products.length >= 50 ? (
				<div className="mb-4">
					<Pagination lastPage={lastPage} />{' '}
				</div>
			) : null}

			<div className="rounded border border-gray-200 shadow-sm">
				<Table>
					<TableHead>
						<TableHeadCell>Artículo</TableHeadCell>
						<TableHeadCell className="whitespace-nowrap">
							Cantidad vendida
						</TableHeadCell>
						<TableHeadCell className="whitespace-nowrap">
							Costo unidad
						</TableHeadCell>
						<TableHeadCell className="whitespace-nowrap">
							Total vendido
						</TableHeadCell>
						<TableHeadCell className="whitespace-nowrap">
							Precio promedio
						</TableHeadCell>
					</TableHead>
					<TableBody>
						{products.map(product => (
							<TableRow key={product.id}>
								<TableCell className="whitespace-nowrap text-sm">
									<p>{product.name}</p>
									<span className="text-xs text-gray-500">
										{product.reference}
									</span>
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									{product.quantity}
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									${formatCurrency(product.cost)}
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									${formatCurrency(product.sold)}
								</TableCell>
								<TableCell className="whitespace-nowrap text-sm">
									${formatCurrency(product.average)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<div className="mt-4">
				<Pagination lastPage={lastPage} />
			</div>
		</div>
	);
}

function NarrowBillToPrint() {
	const { products, startDate, endDate, branch } =
		useLoaderData<typeof loader>();

	return (
		<PrintableContent>
			<div className="bg-white">
				<OrganizationInfo text={`Reporte de inventario de ${branch.name}`} />

				<Separator />

				<div className="text-xs children:leading-4">
					<DateString>
						<p>Desde: {formatDate(startDate!)}</p>
						<p>Hasta: {formatDate(endDate!)}</p>
					</DateString>
				</div>

				<Separator />

				<section className="text-sm leading-4">
					<table className="mx-auto w-full table-auto">
						<thead>
							<tr className="text-left children:pb-1">
								<th className="pl-1">Artículo</th>
								<th className="pl-1 whitespace-nowrap">Cantidad vendida</th>
								<th className="pl-1 whitespace-nowrap">Total vendido</th>
								<th className="pl-1 whitespace-nowrap">Precio promedio</th>
							</tr>
						</thead>

						<tbody>
							{products.map((branch, index) => (
								<tr className="text-left align-top" key={index}>
									<td className="pl-1">{branch.name}</td>
									<td className="pl-1">{branch.quantity}</td>
									<td className="pl-1">${formatCurrency(branch.sold)}</td>
									<td className="pl-1">${formatCurrency(branch.average)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</section>

				<BillFooter text="Reporte generado por Villing" />
			</div>
		</PrintableContent>
	);
}

const productsSchema = z.array(
	z.object({
		productId: z.number(),
		name: z.string(),
		reference: z.string().nullable(),
		quantity: z.number(),
		sold: z.number(),
		cost: z.number().nullable().optional(),
	}),
);
type Product = z.infer<typeof productsSchema>[number];

type ReducedProduct = {
	id: number;
	name: string | null;
	reference: string | null;
	quantity: number;
	sold: number;
	average: number;
	cost: number;
};

function reduceAndGroupProducts(
	products: Array<Product>,
): Array<ReducedProduct> {
	const productMap = new Map<number, ReducedProduct>();

	for (const product of products) {
		let existingProduct = productMap.get(product.productId);

		if (existingProduct) {
			existingProduct.quantity += product.quantity;
			existingProduct.sold += product.sold;
			existingProduct.cost = toNumber(product.cost); // Assuming cost may need updating
		} else {
			existingProduct = {
				id: product.productId,
				name: product.name,
				reference: product.reference,
				quantity: product.quantity,
				sold: product.sold,
				average: 0, // Will be calculated later
				cost: toNumber(product.cost),
			};
			productMap.set(product.productId, existingProduct);
		}
	}

	return Array.from(productMap.values()).map(product => {
		product.average = product.quantity ? product.sold / product.quantity : 0;
		return product;
	});
}
