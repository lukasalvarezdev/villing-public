import { type useForm, conform } from '@conform-to/react';
import { Form } from '@remix-run/react';
import { type z } from 'zod';
import { Combobox } from '~/components/combobox';
import {
	Label,
	Input,
	ErrorText,
	Select,
	LinkButton,
	Toast,
} from '~/components/form-utils';
import { TwoColumnsDiv } from '~/components/ui-library';
import {
	retentions,
	typeOrganizations,
	typeRegimes,
	typeLiabilities,
	taxDetails,
	departments,
	municipalitiesValues,
} from '~/utils/legal-values';
import { type clientSchema } from '~/utils/schemas';

type ClientFormProps = {
	methods: ReturnType<typeof useForm<z.infer<typeof clientSchema>>>;
	priceLists: Array<{ label: string; value: number }>;
	children: React.ReactNode;
};
export function ClientForm({ methods, priceLists, children }: ClientFormProps) {
	const [form, fields] = methods;

	return (
		<Form method="POST" {...form.props}>
			<div>
				<fieldset className="pb-4 border-b border-gray-200 mb-4 flex flex-col gap-4">
					<legend className="font-medium mb-4">Información del cliente</legend>

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.name.id}>Nombre - Razón social</Label>
							<Input
								placeholder='Ej. "Villing SAS"'
								{...conform.input(fields.name)}
							/>
							<ErrorText id={fields.name.errorId}>
								{fields.name.error}
							</ErrorText>
						</div>

						<div className="flex-1">
							<Label htmlFor={fields.email.id}>Correo electrónico</Label>
							<Input
								placeholder='Ej. "hola@villing.io"'
								{...conform.input(fields.email)}
							/>
							<ErrorText id={fields.email.errorId}>
								{fields.email.error}
							</ErrorText>
						</div>
					</TwoColumnsDiv>

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.idNumber.id}>
								NIT (sin dígito de verificación)
							</Label>
							<Input
								placeholder='Ej. "123456789"'
								{...conform.input(fields.idNumber)}
							/>
							<ErrorText id={fields.idNumber.errorId}>
								{fields.idNumber.error}
							</ErrorText>
						</div>

						<div className="flex-1">
							<Label htmlFor={fields.tel.id}>Teléfono</Label>
							<Input
								placeholder='Ej. "12345678"'
								{...conform.input(fields.tel)}
							/>
							<ErrorText id={fields.tel.errorId}>{fields.tel.error}</ErrorText>
						</div>
					</TwoColumnsDiv>

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.address.id}>Dirección</Label>
							<Input
								placeholder='Ej. "Calle 54 #45 - 55"'
								{...conform.input(fields.address)}
							/>
							<ErrorText id={fields.address.errorId}>
								{fields.address.error}
							</ErrorText>
						</div>

						<div className="flex-1">
							<Label htmlFor={fields.department.id}>Departamento</Label>
							<Combobox
								items={departments}
								{...conform.select(fields.department)}
							/>
							<ErrorText id={fields.department.errorId}>
								{fields.department.error}
							</ErrorText>
						</div>
					</TwoColumnsDiv>

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.city.id}>Ciudad</Label>
							<Combobox
								items={municipalitiesValues}
								{...conform.select(fields.city)}
							/>
							<ErrorText id={fields.city.errorId}>
								{fields.city.error}
							</ErrorText>
						</div>

						<div className="flex-1">
							<Label htmlFor={fields.retention.id}>Retención</Label>
							<Select
								options={retentions}
								{...conform.select(fields.retention)}
							/>
							<ErrorText id={fields.retention.errorId}>
								{fields.retention.error}
							</ErrorText>
						</div>
					</TwoColumnsDiv>

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.priceListId.id}>Lista de precios</Label>
							<Select
								options={priceLists}
								{...conform.select(fields.priceListId)}
							/>
							<ErrorText id={fields.priceListId.errorId}>
								{fields.priceListId.error}
							</ErrorText>
						</div>
						<div className="flex-1"></div>
					</TwoColumnsDiv>
				</fieldset>

				<fieldset className="mb-6 flex flex-col gap-4">
					<legend className="font-medium mb-4">Información tributaria</legend>

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.typeOrganization.id}>
								Tipo de persona
							</Label>
							<Select
								options={typeOrganizations}
								{...conform.select(fields.typeOrganization)}
							/>
							<ErrorText id={fields.typeOrganization.errorId}>
								{fields.typeOrganization.error}
							</ErrorText>
						</div>

						<div className="flex-1">
							<Label htmlFor={fields.typeRegime.id}>Tipo de régimen</Label>
							<Select
								options={typeRegimes}
								{...conform.select(fields.typeRegime)}
							/>
							<ErrorText id={fields.typeRegime.errorId}>
								{fields.typeRegime.error}
							</ErrorText>
						</div>
					</TwoColumnsDiv>

					<TwoColumnsDiv>
						<div className="flex-1">
							<Label htmlFor={fields.typeLiability.id}>
								Tipo de responsabilidad
							</Label>
							<Select
								options={typeLiabilities}
								{...conform.select(fields.typeLiability)}
							/>
							<ErrorText id={fields.typeLiability.errorId}>
								{fields.typeLiability.error}
							</ErrorText>
						</div>

						<div className="flex-1">
							<Label htmlFor={fields.taxDetail.id}>Detalle de impuestos</Label>
							<Select
								options={taxDetails}
								{...conform.select(fields.taxDetail)}
							/>
							<ErrorText id={fields.taxDetail.errorId}>
								{fields.taxDetail.error}
							</ErrorText>
						</div>
					</TwoColumnsDiv>
				</fieldset>

				<Toast variant="error" className="mb-4">
					{form.error}
				</Toast>

				<div className="flex gap-4">
					{children}
					<LinkButton to="/clients" variant="secondary">
						Cancelar
					</LinkButton>
				</div>
			</div>
		</Form>
	);
}
