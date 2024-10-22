import { type useForm, conform } from '@conform-to/react';
import { Form } from '@remix-run/react';
import { type z } from 'zod';
import {
	Label,
	Input,
	ErrorText,
	Select,
	LinkButton,
	Toast,
} from '~/components/form-utils';
import { TwoColumnsDiv } from '~/components/ui-library';
import { retentions } from '~/utils/legal-values';
import { type supplierSchema } from '~/utils/schemas';

type SupplierFormProps = {
	methods: ReturnType<typeof useForm<z.infer<typeof supplierSchema>>>;
	children: React.ReactNode;
};
export function SupplierForm({ methods, children }: SupplierFormProps) {
	const [form, fields] = methods;

	return (
		<Form method="POST" {...form.props}>
			<div>
				<fieldset className="pb-4 border-b border-gray-200 mb-4 flex flex-col gap-4">
					<legend className="font-medium mb-4">
						Información del proveedor
					</legend>

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
								placeholder='Ej. "hola@villing.io"'
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
				</fieldset>

				<Toast variant="error" className="mb-4">
					{form.error}
				</Toast>

				<div className="flex gap-4">
					{children}
					<LinkButton to="/suppliers" variant="secondary">
						Cancelar
					</LinkButton>
				</div>
			</div>
		</Form>
	);
}
