import { useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import {
	type LoaderFunctionArgs,
	type ActionFunctionArgs,
	json,
	redirect,
} from '@remix-run/node';
import {
	useLoaderData,
	type MetaFunction,
	useActionData,
	useSearchParams,
} from '@remix-run/react';
import * as React from 'react';
import { RouteErrorBoundary } from '~/components/error-boundary';
import {
	IntentButton,
	Toast,
	addCustomErrorToSubmission,
} from '~/components/form-utils';
import { Container, PageWrapper } from '~/components/ui-library';
import { useOrganization } from '~/root';
import { getOrgDbClient, logError } from '~/utils/db.server';
import { invariant } from '~/utils/misc';
import { legalActions } from '~/utils/permissions.server';
import { protectRoute } from '~/utils/session.server';
import {
	ProductForm,
	parseProductPrices,
	productSchema,
} from './_inventory.products/product-form';

export const meta: MetaFunction = () => [{ title: 'Nuevo producto - Villing' }];

const priceListOrder = { name: 'asc' } as const;
export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	const {
		PriceList: priceLists,
		Category: categories,
		Brand: brands,
	} = await db.organization.findUniqueOrThrow({
		where: { id: orgId },
		select: {
			PriceList: {
				where: { deletedAt: null },
				orderBy: priceListOrder,
				select: { id: true, name: true },
			},
			Category: { orderBy: { name: 'asc' }, select: { id: true, name: true } },
			Brand: { orderBy: { name: 'asc' }, select: { id: true, name: true } },
		},
	});

	return json({
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

export async function action({ request }: ActionFunctionArgs) {
	await protectRoute(request);

	const formData = await request.formData();
	const submission = parse(formData, { schema: productSchema });

	if (!submission.value || submission.intent !== 'submit') {
		return json({ submission, error: null, success: false }, 400);
	}

	const { db, orgId, userId } = await getOrgDbClient(request);

	const { error } = await legalActions.validate(db, userId, 'update_products');
	if (error) {
		return json(
			{ submission: addCustomErrorToSubmission(error, submission) },
			403,
		);
	}

	try {
		const prices = parseProductPrices(formData);

		if (prices.some(p => p.price <= 0)) {
			return json(
				{
					submission: addCustomErrorToSubmission(
						'Los precios no pueden ser menores o iguales a 0',
						submission,
					),
				},
				400,
			);
		}

		await db.$transaction(async tx => {
			invariant(submission.value, "intent must be 'submit'");

			const { initialStock, cost, ...product } = submission.value;

			const [
				{ productsCount: internalId },
				{ SubOrganization: subOrganizations },
			] = await Promise.all([
				tx.counts.update({
					where: { id: orgId },
					data: { productsCount: { increment: 1 } },
					select: { productsCount: true },
				}),
				tx.organization.findFirstOrThrow({
					where: { id: orgId },
					select: {
						SubOrganization: {
							where: { deletedAt: null },
							select: { id: true },
							orderBy: { id: 'asc' },
						},
					},
				}),
			]);

			const pricesToCreate = prices.map(p => ({
				organizationId: orgId,
				priceListId: p.id,
				value: p.price,
			}));
			const stocksToCreate = subOrganizations.map((s, index) => ({
				organizationId: orgId,
				subOrgId: s.id,
				value: index === 0 && initialStock ? initialStock : 0,
			}));

			await tx.product.create({
				data: {
					...product,
					price: cost,
					brandId: product.brandId || null,
					categoryId: product.categoryId || null,
					internalId,
					organizationId: orgId,
					prices: { create: pricesToCreate },
					stocks: { create: stocksToCreate },
				},
			});
		});

		return redirect(`/products/new?lastProductId=${Math.random()}`);
	} catch (error) {
		await logError({ request, error });

		return json(
			{
				submission: addCustomErrorToSubmission(
					'Hubo un error al crear el producto',
					submission,
				),
				success: false,
			},
			500,
		);
	}
}

export default function Component() {
	const [searchParams] = useSearchParams();
	const lastProductId = searchParams.get('lastProductId');

	return <Page key={lastProductId} />;
}

function Page() {
	const [showSuccess, setShowSuccess] = React.useState(false);
	const { typeRegime } = useOrganization();
	const defaultTax = typeRegime === 'iva' ? 19 : 0;
	const actionData = useActionData<typeof action>();
	const { priceLists, brands, categories } = useLoaderData<typeof loader>();
	const methods = useForm({
		id: 'create-product-form',
		constraint: getFieldsetConstraint(productSchema),
		onValidate: ({ formData }) => parse(formData, { schema: productSchema }),
		shouldValidate: 'onBlur',
		defaultValue: { tax: defaultTax, barCodes: [] },
		lastSubmission: actionData?.submission || undefined,
	});
	const [searchParams, setSearchParams] = useSearchParams();
	const lastProductId = searchParams.get('lastProductId');
	const success = Boolean(lastProductId);
	const [form] = methods;

	React.useEffect(() => {
		if (!success) return;

		form.ref.current?.reset();
		setShowSuccess(true);

		const timeout = setTimeout(() => {
			setShowSuccess(false);
			setSearchParams(s => {
				s.delete('lastProductId');
				return s;
			});
		}, 5000);
		return () => clearTimeout(timeout);
	}, [form.ref, setSearchParams, success]);

	return (
		<PageWrapper>
			<Container className="max-w-5xl">
				{showSuccess ? (
					<Toast className="mb-4" variant="success">
						El producto fue creado correctamente
					</Toast>
				) : null}

				<ProductForm
					brands={brands}
					categories={categories}
					priceLists={priceLists.map(p => ({ ...p, value: 0 }))}
					// @ts-expect-error
					methods={methods}
				>
					<IntentButton intent="submit" className="max-w-max">
						<i className="ri-instance-line mr-2"></i>
						Crear producto
					</IntentButton>
				</ProductForm>
			</Container>
		</PageWrapper>
	);
}

export function ErrorBoundary() {
	return (
		<RouteErrorBoundary message="Lo sentimos, hubo un error inesperado creando el producto. Por favor, vuelve a intentarlo o contacta con nosotros." />
	);
}
