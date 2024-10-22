import { useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	json,
	redirect,
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
} from '@remix-run/node';
import {
	useLoaderData,
	type MetaFunction,
	useActionData,
	Outlet,
} from '@remix-run/react';
import { RouteErrorBoundary } from '~/components/error-boundary';
import {
	IntentButton,
	LinkButton,
	addCustomErrorToSubmission,
} from '~/components/form-utils';
import { Container, PageWrapper } from '~/components/ui-library';
import { getOrgDbClient, logError } from '~/utils/db.server';
import {
	getRequestSearchParams,
	invariantResponse,
	invariant,
	toNumber,
} from '~/utils/misc';
import { getFilePresignedUrlByKey } from '~/utils/misc.server';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';
import {
	ProductForm,
	parseProductPrices,
	productSchema,
} from './_inventory.products/product-form';

export const meta: MetaFunction<typeof loader> = ({ data }) => [
	{ title: `Actualizar ${data?.product.name} - Villing` },
];

const priceListOrder = { name: 'asc' } as const;
export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.product_id, 'params.product_id must be defined');

	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const [
		{ PriceList: priceLists, Category: categories, Brand: brands },
		product,
	] = await db.$transaction([
		db.organization.findUniqueOrThrow({
			where: { id: orgId },
			select: {
				PriceList: {
					where: { deletedAt: null },
					orderBy: priceListOrder,
					select: { id: true, name: true },
				},
				Category: {
					orderBy: { name: 'asc' },
					select: { id: true, name: true },
				},
				Brand: { orderBy: { name: 'asc' }, select: { id: true, name: true } },
			},
		}),
		db.product.findUnique({
			where: { id: parseInt(params.product_id), organizationId: orgId },
			include: {
				prices: { orderBy: { priceList: priceListOrder } },
				stocks: true,
			},
		}),
	]);

	invariantResponse(product, 'No se encontró el producto', { status: 404 });

	const imagesUrls = (
		await Promise.allSettled(
			product.imagesUrl.map(objectId => getFilePresignedUrlByKey(objectId)),
		)
	)
		.map((r, i) =>
			r.status === 'fulfilled'
				? { url: r.value, objectId: product.imagesUrl[i] }
				: null,
		)
		.filter(Boolean) as Array<{ url: string; objectId: string }>;

	return json({
		imagesUrls,
		product: {
			...product,
			prices: priceLists.map(p => {
				const price = product.prices.find(price => price.priceListId === p.id);

				return {
					id: p.id,
					price: price?.value.toFixed(2) ?? 0,
					priceWithTax: ((price?.value || 0) * 1.19).toFixed(2),
				};
			}),
		},
		priceLists,
		categories: [
			{ value: 0, label: 'Sin categoría' },
			...categories.map(c => ({ label: c.name, value: c.id })),
		],
		brands: [
			{ value: 0, label: 'Sin marca' },
			...brands.map(b => ({ label: b.name, value: b.id })),
		],
	});
}

export async function action({ request, params }: ActionFunctionArgs) {
	invariant(params.product_id, 'params.product_id must be defined');
	const productId = parseInt(params.product_id);

	await protectRoute(request);

	const searchParams = getRequestSearchParams(request);
	const formData = await request.formData();
	const submission = parse(formData, { schema: productSchema });

	if (!submission.value || submission.intent !== 'submit') {
		return json(submission, 400);
	}

	const { db, orgId, userId } = await getOrgDbClient(request);

	const { error } = await legalActions.validate(db, userId, 'update_products');
	if (error) {
		return json(addCustomErrorToSubmission(error, submission), 403);
	}

	try {
		const prices = parseProductPrices(formData);

		if (prices.some(p => p.price <= 0)) {
			return json(
				addCustomErrorToSubmission(
					'Los precios no pueden ser menores o iguales a 0',
					submission,
				),
				400,
			);
		}

		await db.$transaction(async tx => {
			invariant(submission.value, "intent must be 'submit'");

			const { cost, ...product } = submission.value;

			const pricesListToUpsert = prices.map(p => ({
				where: { priceListId: p.id, organizationId: orgId, productId },
				data: { value: p.price },
			}));

			const priceValues = await tx.priceValue.findMany({
				where: { productId, organizationId: orgId },
			});

			const priceListsToCreate = prices
				.filter(p => {
					const priceValue = priceValues.find(
						priceValue => priceValue.priceListId === p.id,
					);
					return !priceValue;
				})
				.map(p => ({
					priceListId: p.id,
					value: p.price,
					organizationId: orgId,
				}));

			await tx.product.update({
				where: { id: productId, organizationId: orgId },
				data: {
					...product,
					price: cost,
					brandId: product.brandId || null,
					categoryId: product.categoryId || null,
					prices: {
						updateMany: pricesListToUpsert,
						createMany: { data: priceListsToCreate },
					},
				},
			});
		});

		return redirect(`/products?updated=true&${searchParams.toString()}`);
	} catch (error) {
		await logError({ request, error });

		return json(
			addCustomErrorToSubmission(
				'Hubo un error al actualizar el producto',
				submission,
			),
			500,
		);
	}
}

export default function Component() {
	const lastSubmission = useActionData<typeof action>();
	const loaderData = useLoaderData<typeof loader>();
	const { priceLists, brands, categories, product } = loaderData;
	const methods = useForm({
		id: 'update-product-form',
		constraint: getFieldsetConstraint(productSchema),
		onValidate: ({ formData }) => parse(formData, { schema: productSchema }),
		shouldValidate: 'onBlur',
		lastSubmission,
		defaultValue: { ...product, cost: product.price },
	});

	return (
		<PageWrapper>
			<Outlet />

			<Container className="max-w-5xl">
				<ProductForm
					brands={brands}
					categories={categories}
					priceLists={priceLists.map(p => ({
						...p,
						value: toNumber(
							product.prices.find(price => price.id === p.id)?.price,
						),
					}))}
					title={`Editar ${product.name}`}
					methods={methods as any}
					hideInitialStock
					imagesUrls={loaderData.imagesUrls}
				>
					<IntentButton intent="submit" className="max-w-max">
						<i className="ri-instance-line mr-2"></i>
						Guardar cambios
					</IntentButton>
				</ProductForm>

				<LinkButton to="delete" variant="destructive" className="max-w-max">
					<i className="ri-delete-bin-line mr-2"></i> Eliminar producto
				</LinkButton>
			</Container>
		</PageWrapper>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado con el producto. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}
