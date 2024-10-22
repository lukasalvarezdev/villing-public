import { conform, useForm } from '@conform-to/react';
import { getFieldsetConstraint, parse } from '@conform-to/zod';
import { useFetcher } from '@remix-run/react';
import * as React from 'react';
import { z } from 'zod';
import {
	Input,
	CurrencyInput,
	Toast,
	IntentButton,
	Button,
	FormField,
	currencyTransformer,
} from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import { ButtonIcon, TwoColumnsDiv } from '~/components/ui-library';
import { useCurrentPriceList } from '../misc';
import { type productAction } from './action.server';

type CreateProductButtonProps = {
	onCreate: (product: any) => void;
	highlight?: boolean;
};
export function CreateProductButton(props: CreateProductButtonProps) {
	const { onCreate, highlight } = props;
	const [isOpen, setIsOpen] = React.useState(false);
	const { fetcher, Form, error, product } = useProductFetcher(isOpen);
	const [form, fields] = useForm({
		id: 'create-product-form',
		constraint: getFieldsetConstraint(schema),
		onValidate: ({ formData }) => parse(formData, { schema }),
	});
	const priceList = useCurrentPriceList();

	React.useEffect(() => {
		if (!product) return;

		setIsOpen(false);
		onCreate(product);
	}, [product, onCreate]);

	if (!priceList) return null;

	return (
		<div className="shrink-0">
			{highlight ? (
				<Button type="button" onClick={() => setIsOpen(true)} variant="black">
					<i className="ri-add-line"></i>
					<span className="hidden md:block">Crear producto</span>
					<span className="md:hidden">Crear</span>
				</Button>
			) : (
				<ButtonIcon
					className="bg-white"
					type="button"
					onClick={() => setIsOpen(true)}
				>
					<i className="ri-add-line"></i>
					<span className="sr-only">Crear producto rápido</span>
				</ButtonIcon>
			)}

			{isOpen ? (
				<Modal onClose={() => setIsOpen(false)} className="max-w-md">
					<ModalHeader onClick={() => setIsOpen(false)} className="mb-4">
						<h5>Crea un producto</h5>
					</ModalHeader>

					<Form
						method="POST"
						action="/builder/create-quick-product"
						{...form.props}
					>
						<FormField
							label="Nombre"
							field={fields.name}
							divProps={{ className: 'mb-4' }}
						>
							<Input
								autoFocus
								placeholder="Nombre del producto"
								{...conform.input(fields.name)}
							/>
						</FormField>

						<FormField
							label="Referencia o SKU (opcional)"
							field={fields.reference}
							divProps={{ className: 'mb-4' }}
						>
							<Input
								placeholder="Referencia o SKU del producto"
								{...conform.input(fields.reference)}
							/>
						</FormField>

						<TwoColumnsDiv className="mb-4">
							<FormField label="Costo" field={fields.cost}>
								<CurrencyInput
									placeholder="$0.00"
									{...conform.input(fields.cost)}
								/>
							</FormField>

							<FormField label={priceList.name} field={fields.price}>
								<CurrencyInput
									placeholder="$0.00"
									{...conform.input(fields.price)}
								/>
							</FormField>
						</TwoColumnsDiv>

						<FormField
							label="Código de barras (opcional)"
							field={fields.barCode}
							divProps={{ className: 'mb-4' }}
						>
							<Input
								placeholder="Código de barras"
								{...conform.input(fields.barCode)}
							/>
						</FormField>

						<Toast variant="error" className="mb-4">
							{error}
						</Toast>

						<div className="flex justify-end gap-4">
							<Button
								type="button"
								variant="secondary"
								onClick={() => setIsOpen(false)}
							>
								Cancelar
							</Button>
							<IntentButton type="submit" intent="primary" fetcher={fetcher}>
								Crear producto
							</IntentButton>
						</div>
					</Form>
				</Modal>
			) : null}
		</div>
	);
}

export const schema = z.object({
	name: z.string({ required_error: 'El nombre es requerido' }),
	cost: z
		.string({ required_error: 'El costo es requerido' })
		.min(1, {
			message: 'El costo debe ser mayor a 0',
		})
		.transform(currencyTransformer),
	price: z
		.string({ required_error: 'El precio es requerido' })
		.min(1, {
			message: 'El precio debe ser mayor a 0',
		})
		.transform(currencyTransformer),
	barCode: z.string().optional(),
	reference: z.string().optional(),
});

function useProductFetcher(isOpen: boolean) {
	const [key, setKey] = React.useState('1');
	const fetcher = useFetcher<typeof productAction>({ key });
	const product =
		fetcher.data && 'product' in fetcher.data ? fetcher.data.product : null;
	const error =
		fetcher.data && 'error' in fetcher.data ? fetcher.data.error : null;

	React.useEffect(() => {
		if (isOpen) return;

		setKey(Date.now().toString());
	}, [isOpen]);

	return { fetcher, Form: fetcher.Form, product, error };
}
