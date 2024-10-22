import { Link, useLoaderData } from '@remix-run/react';
import { PageWrapper } from '~/components/ui-library';
import { __prisma } from '~/utils/db.server';

export async function loader() {
	let time = new Date().getTime();
	const invoices = await __prisma.legalInvoice.findMany({
		take: 500,
		select: { id: true, subtotal: true },
	});
	time = new Date().getTime() - time;

	return { time, invoices };
}

export default function Index() {
	const { time, invoices } = useLoaderData<typeof loader>();

	return (
		<PageWrapper style={{ fontFamily: 'system-ui, sans-serif' }}>
			<h1>Welcome to Invoices</h1>
			<p>Prisma query time: {time}ms</p>
			<Link to="/">Home</Link>

			{invoices.map(invoice => (
				<div key={invoice.id} style={{ display: 'flex', gap: '10px' }}>
					<p>{invoice.id}. </p>
					<p>${invoice.subtotal}</p>
				</div>
			))}
		</PageWrapper>
	);
}
