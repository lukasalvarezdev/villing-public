import * as React from 'react';
import { Button, Input, Label } from '~/components/form-utils';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/popover';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
} from '~/components/radix-command';
import { cn, match, toNumber } from '~/utils/misc';
import { useBuilderContext } from './builder/context';

export function RetentionSelect() {
	const {
		state: {
			config: { retention: retentionPercentage },
		},
		dispatch,
	} = useBuilderContext();

	const id = React.useId();
	const [search, setSearch] = React.useState('');
	const retentions = React.useMemo(
		() => match(allRetentions, search),
		[search],
	);
	const retention = React.useMemo(
		() => retentions.find(r => r.percentage === retentionPercentage),
		[retentionPercentage, retentions],
	);

	return (
		<Popover>
			<PopoverTrigger asChild>
				<div>
					<div className="flex justify-between mb-1 pr-2">
						<Label className="mb-0" htmlFor={id}>
							Retención
						</Label>
					</div>
					<Button
						variant="secondary"
						className="justify-between gap-4 w-full whitespace-nowrap overflow-ellipsis overflow-hidden"
						type="button"
					>
						{retention?.name || 'No aplica'}
						<i className="ri-expand-up-down-line"></i>
					</Button>
				</div>
			</PopoverTrigger>

			<PopoverContent className="p-0 bg-white w-80 PopoverContent" align="end">
				<div className="p-1 border-b border-gray-200">
					<Input
						placeholder="Busca una retención"
						id={id}
						className={cn(
							'border-none shadow-none border-transparent outline-none focus-visible:ring-0',
						)}
						autoFocus
						onChange={e => setSearch(e.target.value)}
						value={search}
					/>
				</div>

				<Command className="w-full">
					<CommandEmpty>No hay retenciones.</CommandEmpty>

					<CommandGroup className="max-h-60 w-full overflow-y-scroll">
						{retentions.map((r, index) => (
							<CommandItem
								key={index}
								value={String(r.id)}
								onSelect={value => {
									const selected = retentions.find(
										client => client.id === Number(value),
									);

									dispatch({
										type: 'setRetention',
										payload:
											selected?.percentage === retention?.percentage
												? 0
												: toNumber(selected?.percentage),
									});
								}}
							>
								<div className="flex justify-between items-center gap-4 w-full p-2">
									<p>{r.name}</p>

									{r.id === retention?.id ? (
										<i className="ri-check-line"></i>
									) : null}
								</div>
							</CommandItem>
						))}
					</CommandGroup>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

type RetentionType = { id: number; name: string; percentage: number };
const allRetentions: Array<RetentionType> = [
	{ id: 1, percentage: 0, name: 'No aplica' },
	{
		id: 2,
		percentage: 3,
		name: '3.000% Sobre base - Cuota de Fomento Cacaotero - Cuota de Fomento - Base mínima: $0',
	},
	{
		id: 3,
		percentage: 1,
		name: '1.000% Sobre base - Impuesto de Industria y Comercio ICA - RETEICA 10 X MIL - Base mínima: $0',
	},
	{
		id: 4,
		percentage: 0.9,
		name: '0.900% Sobre base - Impuesto de Industria y Comercio ICA - RETEICA 9 X MIL - Base mínima: $0',
	},
	{
		id: 5,
		percentage: 0.8,
		name: '0.800% Sobre base - Impuesto de Industria y Comercio ICA - RETEICA 8 X MIL - Base mínima: $0',
	},
	{
		id: 6,
		percentage: 0.7,
		name: '0.700% Sobre base - Impuesto de Industria y Comercio ICA - RETEICA 7 X MIL - Base mínima: $0',
	},
	{
		id: 7,
		percentage: 0.6,
		name: '0.600% Sobre base - Impuesto de Industria y Comercio ICA - RETEICA 6 X MIL - Base mínima: $0',
	},
	{
		id: 8,
		percentage: 0.5,
		name: '0.500% Sobre base - Impuesto de Industria y Comercio ICA - RETEICA 5 X MIL - Base mínima: $0',
	},
	{
		id: 9,
		percentage: 0.4,
		name: '0.400% Sobre base - Impuesto de Industria y Comercio ICA - RETEICA 4 X MIL - Base mínima: $0',
	},
	{
		id: 10,
		percentage: 0.3,
		name: '0.300% Sobre base - Impuesto de Industria y Comercio ICA - RETEICA 3 X MIL - Base mínima: $0',
	},
	{
		id: 11,
		percentage: 0.2,
		name: '0.200% Sobre base - Impuesto de Industria y Comercio ICA - RETEICA 2 X MIL - Base mínima: $0',
	},
	{
		id: 12,
		percentage: 33,
		name: '33.000% Sobre base - Retención por pagos al exterior - RETE FUENTE - Base mínima: $0',
	},
	{
		id: 13,
		percentage: 20,
		name: '20.000% Sobre base - Retención por pagos al exterior - RETE FUENTE - Base mínima: $0',
	},
	{
		id: 14,
		percentage: 15,
		name: '15.000% Sobre base - Retención por pagos al exterior - RETE FUENTE - Base mínima: $0',
	},
	{
		id: 15,
		percentage: 5,
		name: '5.000% Sobre base - Retención por pagos al exterior - RETE FUENTE - Base mínima: $0',
	},
	{
		id: 16,
		percentage: 1,
		name: '1.000% Sobre base - Retención por pagos al exterior - RETE FUENTE - Base mínima: $0',
	},
	{
		id: 17,
		percentage: 2,
		name: '2.000% Sobre base - Contratos de construcción y urbanización. - RETE FUENTE - Base mínima: $1,145,000',
	},
	{
		id: 18,
		percentage: 3,
		name: '3.000% Sobre base - Retención en colocación independiente de juegos de suerte y azar - RETE FUENTE - Base mínima: $212,000',
	},
	{
		id: 19,
		percentage: 20,
		name: '20.000% Sobre base - Loterías, rifas, apuestas y similares - RETE FUENTE - Base mínima: $2,036,000',
	},
	{
		id: 20,
		percentage: 4,
		name: '4.000% Sobre base - Rendimientos financieros provenientes de títulos de renta fija - RETE FUENTE - Base mínima: $0',
	},
	{
		id: 21,
		percentage: 3.5,
		name: '3.500% Sobre base - Otros ingresos tributarios (no declarantes) - RETE FUENTE - Base mínima: $1,145,000',
	},
	{
		id: 22,
		percentage: 2.5,
		name: '2.500% Sobre base - Otros ingresos tributarios (declarantes) - RETE FUENTE - Base mínima: $1,145,000',
	},
	{
		id: 23,
		percentage: 3.5,
		name: '3.500% Sobre base - Por emolumentos eclesiásticos (no declarantes) - RETE FUENTE - Base mínima: $1,145,000',
	},
	{
		id: 24,
		percentage: 4,
		name: '4.000% Sobre base - Por emolumentos eclesiásticos (declarantes) - RETE FUENTE - Base mínima: $1,145,000',
	},
	{
		id: 25,
		percentage: 2.5,
		name: '2.500% Sobre base - Compras de bienes raíces cuya destinación y uso sea distinto a viviend - RETE FUENTE - Base mínima: $0',
	},
	{
		id: 26,
		percentage: 2.5,
		name: '2.500% Sobre base - Compras de bienes raíces cuya destinación y uso sea vivienda de habita - RETE FUENTE - Base mínima: $848,240,000',
	},
	{
		id: 27,
		percentage: 1,
		name: '1.000% Sobre base - Compras de bienes raíces cuya destinación y uso sea vivienda de habita - RETE FUENTE - Base mínima: $0',
	},
	{
		id: 28,
		percentage: 1,
		name: '1.000% Sobre base - Compras de vehículos - RETE FUENTE - Base mínima: $0',
	},
	{
		id: 29,
		percentage: 1,
		name: '1.000% Sobre base - Enajenación de activos fijos de personas naturales (notarías y tránsit - RETE FUENTE - Base mínima: $0',
	},
	{
		id: 30,
		percentage: 0.5,
		name: '0.500% Sobre base - Compras de café pergamino o cereza - RETE FUENTE - Base mínima: $6,786,000',
	},
	{
		id: 31,
		percentage: 3.5,
		name: '3.500% Sobre base - Compras de bienes o productos agrícolas o pecuarios con procesamiento - RETE FUENTE - Base mínima: $1,145,000',
	},
	{
		id: 32,
		percentage: 2.5,
		name: '2.500% Sobre base - Compras de bienes o productos agrícolas o pecuarios con procesamiento - RETE FUENTE - Base mínima: $1,145,000',
	},
	{
		id: 33,
		percentage: 1.5,
		name: '1.500% Sobre base - Compras de bienes o productos agrícolas o pecuarios sin procesamiento - RETE FUENTE - Base mínima: $3,902,000',
	},
	{
		id: 34,
		percentage: 1.5,
		name: '1.500% Sobre base - Bienes o productos agrícolas o pecuarios - RETE FUENTE - Base mínima: $3,902,000',
	},
	{
		id: 35,
		percentage: 7,
		name: '7.000% Sobre base - Intereses o rendimientos financieros en general - RETE FUENTE - Base mínima: $0',
	},
	{
		id: 36,
		percentage: 3.5,
		name: '3.500% Sobre base - Servicios de licenciamiento o derecho de uso de software - RETE FUENTE - Base mínima: $0',
	},
	{
		id: 37,
		percentage: 10,
		name: '10.000% Sobre base - Honorarios y comisiones (no declarantes) - RETE FUENTE - Base mínima: $0',
	},
	{
		id: 38,
		percentage: 11,
		name: '11.000% Sobre base - Honorarios y comisiones (personas naturales con contrato o con pagos q - RETE FUENTE - Base mínima: $0',
	},
	{
		id: 39,
		percentage: 11,
		name: '11.000% Sobre base - Honorarios y comisiones (personas jurídicas) - RETE FUENTE - Base mínima: $0',
	},
	{
		id: 40,
		percentage: 3.5,
		name: '3.500% Sobre base - Arrendamiento de bienes inmuebles - RETE FUENTE - Base mínima: $1,145,000',
	},
	{
		id: 41,
		percentage: 4,
		name: '4.000% Sobre base - Arrendamiento de bienes muebles - RETE FUENTE - Base mínima: $0',
	},
	{
		id: 42,
		percentage: 3.5,
		name: '3.500% Sobre base - Servicios de hoteles y restaurantes - RETE FUENTE - Base mínima: $170,000',
	},
	{
		id: 43,
		percentage: 2,
		name: '2.000% Sobre base - Servicios integrales de salud prestados por IPS - RETE FUENTE - Base mínima: $170,000',
	},
	{
		id: 44,
		percentage: 2,
		name: '2.000% Sobre base - Servicios prestados por empresas de vigilancia y aseo - RETE FUENTE - Base mínima: $170,000',
	},
	{
		id: 45,
		percentage: 1,
		name: '1.000% Sobre base - Servicios prestados por empresas de servicios temporales - RETE FUENTE - Base mínima: $170,000',
	},
	{
		id: 46,
		percentage: 1,
		name: '1.000% Sobre base - Transporte nacional de pasajeros por vía aérea o marítima - RETE FUENTE - Base mínima: $170,000',
	},
	{
		id: 47,
		percentage: 3.5,
		name: '3.500% Sobre base - Transporte nacional de pasajeros por vía terrestre - RETE FUENTE - Base mínima: $1,145,000',
	},
	{
		id: 48,
		percentage: 1,
		name: '1.000% Sobre base - Transporte de carga - RETE FUENTE - Base mínima: $170,000',
	},
	{
		id: 49,
		percentage: 6,
		name: '6.000% Sobre base - Servicios generales (no declarantes) - RETE FUENTE - Base mínima: $170,000',
	},
	{
		id: 50,
		percentage: 4,
		name: '4.000% Sobre base - Servicios generales (declarantes) - RETE FUENTE - Base mínima: $170,000',
	},
	{
		id: 51,
		percentage: 0.1,
		name: '0.100% Sobre base - Compras de combustibles derivados del petróleo - RETE FUENTE - Base mínima: $0',
	},
	{
		id: 52,
		percentage: 1.5,
		name: '1.500% Sobre base - Compras con tarjeta débito o crédito - RETE FUENTE - Base mínima: $0',
	},
	{
		id: 53,
		percentage: 3.5,
		name: '3.500% Sobre base - Compras generales (no declarantes) - RETE FUENTE - Base mínima: $1,145,000',
	},
	{
		id: 54,
		percentage: 2.5,
		name: '2.500% Sobre base - Compras generales (declarantes) - RETE FUENTE - Base mínima: $1,145,000',
	},
	{
		id: 55,
		percentage: 15,
		name: '15.000% Sobre impuestos de tipo IVA - Retención en el IVA - RETEIVA - Base mínima: $0',
	},
];
