import { Container, PageWrapper } from '~/components/ui-library';
import { cn, formatCurrency, formatDate } from '~/utils/misc';
import { calculateConceptsTotals } from './concepts-context';
import { type Concept } from './definition';

type Receipt = {
	logo: string;
	name: string;
	number: string;
	startDate: string;
	endDate: string;
	paidAt: string;
	workedDays: number;
	idNumber: string;
	address: string;
	phone: string;
	employee: { name: string; idNumber: string; jobTitle: string };
	concepts: Array<Concept>;
};

export function PayrollReceiptPdf(props: Receipt) {
	const {
		logo,
		name,
		number,
		startDate,
		endDate,
		paidAt,
		workedDays,
		idNumber,
		address,
		phone,
		employee,
		concepts,
	} = props;
	const { total } = calculateConceptsTotals(concepts);
	const incomes = concepts.filter(c => c.type === 'income');
	const deductions = concepts.filter(c => c.type === 'deduction');

	return (
		<PageWrapper className="print:font-sans">
			<Container>
				<div className="mx-auto max-w-xl rounded-xl overflow-hidden shadow-sm border border-gray-100">
					<div
						className={cn(
							'flex bg-primary-600 text-white p-4',
							'justify-between items-center gap-4',
						)}
					>
						<div className="flex items-center gap-4">
							<div className="h-10 w-10 p-2 flex items-center justify-center bg-white rounded-full">
								<img
									src={logo}
									alt="Logo de Villing"
									className="max-h-full max-w-full"
								/>
							</div>
							<h4 className="text-base">{name}</h4>
						</div>

						<p className="font-medium text-sm">#{number}</p>
					</div>

					<div className="bg-white p-4 text-xs">
						<p className="mb-1 border-b border-gray-100 pb-1">
							<strong className="font-medium">Periodo:</strong>{' '}
							{formatDate(startDate)} - {formatDate(endDate)}
						</p>
						<p className="mb-1 border-b border-gray-100 pb-1">
							<strong className="font-medium">Fecha de pago:</strong>{' '}
							{formatDate(paidAt)}
						</p>
						<p className="mb-4 border-b border-gray-100 pb-1">
							<strong className="font-medium">Días laborados:</strong>{' '}
							{workedDays}
						</p>

						<div className="flex gap-4 children:flex-1 mb-4">
							<div>
								<p className="text-sm">
									<strong className="font-medium">{name}</strong>
								</p>
								<p className="text-gray-600">
									<strong className="font-medium">NIT: </strong>
									<span>{idNumber}</span>
								</p>
								<p className="text-gray-600">{address}</p>
								<p className="text-gray-600">{phone}</p>
							</div>
							<div>
								<p className="text-sm">
									<strong className="font-medium">{employee.name}</strong>
								</p>

								<p className="text-gray-600">
									<strong className="font-medium">CC: </strong>
									<span>{employee.idNumber}</span>
								</p>
								<p className="text-gray-600">
									<strong className="font-medium">Cargo: </strong>
									<span>{employee.jobTitle}</span>
								</p>
							</div>
						</div>

						<Concepts title="Ingresos" concepts={incomes} />
						<Concepts title="Deducciones" concepts={deductions} />

						<div className="flex justify-between items-center pt-4 border-t border-gray-200">
							<p>
								<strong className="font-medium">Neto a pagar:</strong>
							</p>
							<p className="text-sm font-bold">${formatCurrency(total)}</p>
						</div>
					</div>
				</div>
			</Container>
		</PageWrapper>
	);
}

function Concepts({
	title,
	concepts,
}: {
	title: string;
	concepts: Array<Concept>;
}) {
	const total = concepts.reduce((acc, c) => acc + c.amount, 0);

	return (
		<div className="mb-4">
			<p className="text-white font-bold bg-primary-600 py-1 px-2">{title}</p>

			<ul className="mb-2">
				{concepts.length ? (
					concepts.map((concept, index) => (
						<li
							className={cn(
								'flex justify-between items-center border-b border-gray-100',
								'pl-2 py-1',
							)}
							key={index}
						>
							<p>{concept.keyName}</p>
							<p>${formatCurrency(concept.amount)}</p>
						</li>
					))
				) : (
					<li
						className={cn(
							'flex justify-between items-center border-b border-gray-100',
							'pl-2 py-1',
						)}
					>
						<p>No hay novedades.</p>
					</li>
				)}
			</ul>

			<div className="flex justify-end items-center gap-1">
				<p>
					<strong className="font-medium">Total:</strong>
				</p>
				<p>${formatCurrency(total)}</p>
			</div>
		</div>
	);
}
