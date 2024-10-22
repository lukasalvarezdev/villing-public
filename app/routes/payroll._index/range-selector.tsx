import { Form, useActionData } from '@remix-run/react';
import * as React from 'react';
import { Checkbox, CheckboxField } from '~/components/checkbox';
import {
	Button,
	IntentButton,
	Label,
	Select,
	Toast,
	getInputClasses,
} from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import { RadioGroup, RadioGroupItem } from '~/components/radio-group';
import { TwoColumnsDiv } from '~/components/ui-library';
import { type ConfigType } from '~/modules/payroll/payroll-schemas';
import { currentYear, frequencies, months } from '~/utils/dates-misc';
import {
	addTrailingCero,
	cn,
	formatDate,
	toEndOfDay,
	toNumber,
	toStartOfDay,
} from '~/utils/misc';

type ContextType = {
	config: ConfigType;
	range: ReturnType<typeof getConfigRange>;
	setCustomConfig: () => void;
	setMonth: (month: ConfigType['month']) => void;
	setFrequency: (frequency: ConfigType['frequency']) => void;
	setPeriod: (period: ConfigType['period']) => void;
};

const rangeContext = React.createContext<ContextType | undefined>(undefined);

function useRangeContext() {
	const context = React.useContext(rangeContext);
	if (!context) {
		throw new Error('useRangeContext must be used within a RangeProvider');
	}
	return context;
}

export function RangeSelector({
	onClose,
	defaultConfig,
}: {
	onClose: () => void;
	defaultConfig: ConfigType;
}) {
	const [config, setConfig] = React.useState(defaultConfig);
	const [isCustomConfig, setIsCustomConfig] = React.useState(false);
	const actionData = useActionData<any>();
	const error = actionData?.error;

	function setCustomConfig() {
		setIsCustomConfig(true);
	}

	function setMonth(month: ConfigType['month']) {
		setConfig(prev => ({ ...prev, month }));
	}

	function setFrequency(frequency: ConfigType['frequency']) {
		const period = getDefaultPeriod(frequency);

		setConfig(prev => {
			const newConfig = { ...prev, frequency, period };
			const range = getConfigRange(newConfig);
			const currentDate = new Date();

			const twoDaysBeforeEnd = new Date(range.end);
			twoDaysBeforeEnd.setDate(range.end.getDate() - 2);

			const daysDifference = getDay(currentDate) - getDay(twoDaysBeforeEnd);

			// check if the current date is 2 or less days close to the end of the range
			// if so, we should return the previous period. Because you normally pay the
			// last period of the month in the first days of the next month.
			if ((daysDifference > 2 || daysDifference < 0) && period >= 1) {
				newConfig.period = period - 1;
			}

			return newConfig;
		});
	}

	function setPeriod(period: ConfigType['period']) {
		setConfig(prev => ({ ...prev, period }));
	}

	function onClear() {
		setConfig({
			month: 'Enero',
			frequency: 'Mensual',
			period: 1,
		});
		setIsCustomConfig(false);
		onClose();
	}

	return (
		<rangeContext.Provider
			value={{
				config,
				range: getConfigRange(config),
				setCustomConfig,
				setMonth,
				setFrequency,
				setPeriod,
			}}
		>
			<Modal className="max-w-md">
				<ModalHeader onClick={onClear} className="mb-4">
					<h4>Crear una nómina</h4>
				</ModalHeader>

				<Form method="POST">
					{isCustomConfig ? <RangeSelectorForm /> : <DefaultConfigLayout />}

					<input type="hidden" name="month" value={config.month} />
					<input type="hidden" name="frequency" value={config.frequency} />
					<input type="hidden" name="period" value={config.period} />

					{error ? (
						<Toast variant="error" className="mb-4">
							{error}
						</Toast>
					) : null}

					<div className="flex gap-4 justify-end">
						<Button variant="secondary" type="button" onClick={onClear}>
							Cancelar
						</Button>
						<IntentButton intent="create">Crear nómina</IntentButton>
					</div>
				</Form>
			</Modal>
		</rangeContext.Provider>
	);
}

function DefaultConfigLayout() {
	const { range, setCustomConfig } = useRangeContext();

	return (
		<div>
			<Toast variant="info" className="mb-4">
				<span>Vas a crear una nómina con el periodo:</span>
				<span className="font-bold block">
					{formatDate(range.start)} - {formatDate(range.end)}
				</span>
			</Toast>

			<TwoColumnsDiv className="mb-4">
				<div>
					<Label>Desde</Label>
					<p className={cn(getInputClasses(), 'items-center pl-3')}>
						{formatDate(range.start)}
					</p>
				</div>
				<div>
					<Label>Hasta</Label>
					<p className={cn(getInputClasses(), 'items-center pl-3')}>
						{formatDate(range.end)}
					</p>
				</div>
			</TwoColumnsDiv>

			<CheckboxField label="Deseo usar un periodo diferente" className="mb-4">
				<Checkbox onCheckedChange={setCustomConfig} />
			</CheckboxField>
		</div>
	);
}

function RangeSelectorForm() {
	return (
		<div>
			<MonthField />
			<FrequencyField />
			<PeriodField />
		</div>
	);
}

function MonthField() {
	const {
		setMonth,
		config: { month },
	} = useRangeContext();

	return (
		<div className="mb-4">
			<Label htmlFor="month">Mes</Label>
			<Select
				id="month"
				name="month"
				options={months.map(m => ({ value: m, label: m }))}
				value={month}
				onChange={e => setMonth(e.target.value as ConfigType['month'])}
			/>
		</div>
	);
}

function FrequencyField() {
	const {
		config: { frequency },
		setFrequency,
	} = useRangeContext();

	return (
		<fieldset>
			<legend className="mb-2 text-sm font-medium">Frecuencia</legend>
			<RadioGroup
				name="frequency"
				value={frequency}
				className="text-sm mb-4"
				onValueChange={value => {
					setFrequency(value as ConfigType['frequency']);
				}}
			>
				{frequencies.map(period => (
					<div className="flex items-center space-x-2" key={period}>
						<RadioGroupItem value={period} id={period} />
						<label htmlFor={period} className="tex">
							{period}
						</label>
					</div>
				))}
			</RadioGroup>
		</fieldset>
	);
}

function PeriodField() {
	const { config, setPeriod } = useRangeContext();
	const options = getRangeOptions(config);

	return (
		<fieldset>
			<legend className="mb-2 text-sm font-medium">Periodo</legend>
			<RadioGroup
				className="text-sm mb-4"
				onValueChange={value => setPeriod(toNumber(value))}
				value={String(config.period)}
				name="period"
			>
				{options.map((period, index) => {
					const value = String(index);
					return (
						<div className="flex items-center space-x-2" key={index}>
							<RadioGroupItem value={value} id={value} />
							<label htmlFor={value}>{period}</label>
						</div>
					);
				})}
			</RadioGroup>
		</fieldset>
	);
}

export function getConfigRange(config: ConfigType) {
	const { month, frequency, period } = config;

	const monthNumber = months.indexOf(month) + 1;
	const monthString = addTrailingCero(months.indexOf(month) + 1);
	const daysInMonth = new Date(currentYear, monthNumber, 0).getDate();
	const daysInMonthString = addTrailingCero(daysInMonth);

	const periodDates = getPeriodDates();

	let start = periodDates[period]?.start || periodDates[0]?.start;
	let end = periodDates[period]?.end || periodDates[0]?.end;

	if (!start || !end) {
		throw new Error(`No se encontraron fechas para el periodo ${period}`);
	}

	return { start: toStartOfDay(start), end: toEndOfDay(end) };

	function getPeriodDates() {
		switch (frequency) {
			case 'Semanal': {
				return [
					{
						start: `${currentYear}-${monthString}-01`,
						end: `${currentYear}-${monthString}-07`,
					},
					{
						start: `${currentYear}-${monthString}-08`,
						end: `${currentYear}-${monthString}-14`,
					},
					{
						start: `${currentYear}-${monthString}-15`,
						end: `${currentYear}-${monthString}-21`,
					},
					{
						start: `${currentYear}-${monthString}-22`,
						end: `${currentYear}-${monthString}-${daysInMonthString}`,
					},
				];
			}
			case 'Decadal': {
				return [
					{
						start: `${currentYear}-${monthString}-01`,
						end: `${currentYear}-${monthString}-10`,
					},
					{
						start: `${currentYear}-${monthString}-11`,
						end: `${currentYear}-${monthString}-20`,
					},
					{
						start: `${currentYear}-${monthString}-21`,
						end: `${currentYear}-${monthString}-${daysInMonthString}`,
					},
				];
			}
			case 'Quincenal': {
				return [
					{
						start: `${currentYear}-${monthString}-01`,
						end: `${currentYear}-${monthString}-15`,
					},
					{
						start: `${currentYear}-${monthString}-16`,
						end: `${currentYear}-${monthString}-${daysInMonthString}`,
					},
				];
			}
			case 'Mensual': {
				return [
					{
						start: `${currentYear}-${monthString}-01`,
						end: `${currentYear}-${monthString}-${daysInMonthString}`,
					},
				];
			}
		}
	}
}

function getRangeOptions({ frequency, month }: ConfigType) {
	const monthNumber = months.indexOf(month) + 1;
	const monthString = addTrailingCero(months.indexOf(month) + 1);
	const daysInMonth = new Date(currentYear, monthNumber, 0).getDate();
	const daysInMonthString = addTrailingCero(daysInMonth);

	switch (frequency) {
		case 'Semanal': {
			return [
				`Semana 1 (01/${monthString} - 07/${monthString})`,
				`Semana 2 (08/${monthString} - 14/${monthString})`,
				`Semana 3 (15/${monthString} - 21/${monthString})`,
				`Semana 4 (22/${monthString} - ${daysInMonthString}/${monthString})`,
			];
		}
		case 'Decadal': {
			return [
				`Decena 1 (01/${monthString} - 10/${monthString})`,
				`Decena 2 (11/${monthString} - 20/${monthString})`,
				`Decena 3 (21/${monthString} - ${daysInMonthString}/${monthString})`,
			];
		}
		case 'Quincenal': {
			return [
				`Quincena 1 (01/${monthString} - 15/${monthString})`,
				`Quincena 2 (16/${monthString} - ${daysInMonthString}/${monthString})`,
			];
		}
		case 'Mensual': {
			return [
				`Mes completo (01/${monthString} - ${daysInMonthString}/${monthString})`,
			];
		}
		default:
			return [];
	}
}

export function getDefaultPeriod(frequency: ConfigType['frequency']) {
	const currentDate = new Date();
	const currentDay = currentDate.getDate();
	const currentMonth = currentDate.getMonth() + 1;
	const currentYear = currentDate.getFullYear();
	const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

	let period = 0;

	switch (frequency) {
		case 'Semanal': {
			if (currentDay <= 7) {
				period = 0;
				break;
			}
			if (currentDay <= 14) {
				period = 1;
				break;
			}
			if (currentDay <= 21) {
				period = 2;
				break;
			}
			if (currentDay <= daysInMonth) {
				period = 3;
				break;
			}
			break;
		}
		case 'Decadal': {
			if (currentDay <= 10) {
				period = 0;
				break;
			}
			if (currentDay <= 20) {
				period = 1;
				break;
			}
			if (currentDay <= daysInMonth) {
				period = 2;
				break;
			}
			break;
		}
		case 'Quincenal': {
			if (currentDay <= 15) {
				period = 0;
				break;
			}
			if (currentDay <= daysInMonth) {
				period = 1;
				break;
			}
		}
	}

	return period;
}

function getDay(date: Date) {
	return date.getDate();
}
