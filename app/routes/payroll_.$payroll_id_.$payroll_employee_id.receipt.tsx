import { type SerializeFrom } from '@remix-run/node';
import { useNavigate, useOutletContext, useParams } from '@remix-run/react';
import * as React from 'react';
import { PrintableContent } from '~/components/printable-content';
import { PageWrapper, Container } from '~/components/ui-library';
import { PayrollReceiptPdf } from '~/modules/payroll/payroll-receipt';
import { useOrganization } from '~/root';
import { type loader } from './payroll_.$payroll_id_.$payroll_employee_id';

const irrelevantConcepts = [
	'prima',
	'cesantías',
	'intereses a las cesantías',
	'salud',
	'pensión',
	'auxilio de transporte',
];

export default function Component() {
	const { payroll_employee_id, payroll_id } = useParams();
	const {
		payrollEmployee: { employee, concepts: allConcepts, number },
		payroll,
		daysWorked,
		logoUrl,
	} = useOutletContext<SerializeFrom<typeof loader>>();
	const concepts = allConcepts.filter(c => {
		if (irrelevantConcepts.includes(c.keyName.toLowerCase())) return false;
		return true;
	});
	const navigate = useNavigate();
	const organization = useOrganization();

	React.useEffect(() => {
		window.print();
		navigate(`/payroll/${payroll_id}/${payroll_employee_id}`);
	}, [navigate, payroll_employee_id, payroll_id]);

	if (!payroll.paidAt) return null;

	return (
		<PrintableContent>
			<PageWrapper className="print:font-sans">
				<Container>
					<PayrollReceiptPdf
						name={organization.name}
						idNumber={organization.idNumber || ''}
						address={organization.address || ''}
						phone={organization.phone || ''}
						number={number}
						startDate={payroll.startDate}
						endDate={payroll.endDate}
						paidAt={payroll.paidAt}
						workedDays={daysWorked}
						logo={logoUrl || ''}
						employee={employee}
						concepts={concepts}
					/>
				</Container>
			</PageWrapper>
		</PrintableContent>
	);
}
