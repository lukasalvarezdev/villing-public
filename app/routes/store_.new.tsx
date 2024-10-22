import { Outlet, useLocation } from '@remix-run/react';
import {
	Container,
	PageWrapper,
	Step,
	StepSeparatorLine,
	StepsContainer,
} from '~/components/ui-library';

export default function Component() {
	const { pathname } = useLocation();
	const step = pathname.split('/').pop();
	const activeStep = stepsNumbers[step as string] || 1;

	return (
		<PageWrapper>
			<Container className="max-w-2xl mx-auto">
				<StepsContainer>
					<Step
						icon="ri-store-line"
						title="Nombre de la tienda"
						step={1}
						activeStep={activeStep}
						totalSteps={3}
						href="/store/new/name"
					/>

					<StepSeparatorLine activeStep={activeStep} step={1} />

					<Step
						icon="ri-pencil-ruler-2-line"
						title="Crea tu identidad de marca"
						step={3}
						activeStep={activeStep}
						totalSteps={3}
						href="/store/new/identity"
						disabled={activeStep < 3}
					/>
				</StepsContainer>

				<div>
					<Outlet />
				</div>
			</Container>
		</PageWrapper>
	);
}

const stepsNumbers = { name: 1, products: 2, identity: 3 } as Record<
	string,
	number
>;
