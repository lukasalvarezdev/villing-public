import { BuilderProvider, defaultConfig } from './builder/context';
import { type Builder } from './builder/schemas';

export function TestBuilderProvider({
	builder,
	children,
}: {
	builder?: Partial<Builder>;
	children: React.ReactNode;
}) {
	return (
		<BuilderProvider builder={{ ...defaultBuilder, ...builder }}>
			{children}
		</BuilderProvider>
	);
}

const defaultBuilder = {
	products: [],
	paymentForms: [{ id: 1, amount: 0, type: 'cash' }],
	priceListId: 1,
	totalCollected: 0,
	currency: 'COP',
	client: undefined,
	resolutionId: undefined,
	shouldPrint: true,
	receivedAt: new Date().toISOString(),
	config: defaultConfig,
	subId: 1,
} as Builder;
