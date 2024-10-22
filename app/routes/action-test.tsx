import { type SerializeFrom, type ActionFunctionArgs } from '@remix-run/node';
import { type ClientActionFunctionArgs } from '@remix-run/react';
import * as React from 'react';
import { useFetcher } from 'react-router-dom';
import { Button } from '~/components/form-utils';
import { PageWrapper } from '~/components/ui-library';

export async function action({ request }: ActionFunctionArgs) {
	return { ok: true };
}

export async function clientAction({ serverAction }: ClientActionFunctionArgs) {
	await serverAction<typeof action>();

	window.print();

	return { reset: true, submissionId: Math.random().toString(36).substring(7) };
}

type SerializedClientAction = SerializeFrom<typeof clientAction>;
export default function Component() {
	const fetcher = useFetcher<SerializedClientAction>();
	const [count, setCount] = React.useState(0);
	const reset = fetcher.data?.reset;
	const submissionId = fetcher.data?.submissionId;

	React.useEffect(() => {
		if (reset) setCount(0);
	}, [reset, submissionId]);

	return (
		<PageWrapper>
			<p className="mb-4">You clicked {count} times</p>
			<fetcher.Form method="POST" className="flex gap-4">
				<Button
					type="button"
					variant="secondary"
					onClick={() => setCount(count + 1)}
				>
					Count
				</Button>
				<Button type="submit">Submit</Button>
			</fetcher.Form>
		</PageWrapper>
	);
}
