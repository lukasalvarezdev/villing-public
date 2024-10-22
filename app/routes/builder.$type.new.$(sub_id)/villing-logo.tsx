import { Link } from '@remix-run/react';

export function VillingLogo() {
	// const currentModule = useBuilderModule();

	return (
		<Link
			to="/home"
			className="h-7 w-7"
			prefetch="intent"
			onClick={() => {
				// setCurrentBuilder(state, currentModule).then(() => {
				// 	// eslint-disable-next-line no-console
				// 	console.info('saved');
				// });
			}}
		>
			<img
				src="/img/villing-logo.svg"
				alt="Logo de Villing"
				className="max-h-full max-w-full h-7 w-7"
			/>
		</Link>
	);
}
