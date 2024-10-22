export function StatusBadge({
	status,
	expiresAt,
}: {
	status: 'paid' | 'pending';
	expiresAt: string | null;
}) {
	const isExpired = expiresAt ? new Date(expiresAt) < new Date() : false;

	if (status === 'pending' && isExpired) {
		return (
			<div className="whitespace-nowrap text-gray-600 text-sm items-center gap-2 flex">
				<i className="ri-time-line text-error-600"></i>
				<p>Vencida</p>
			</div>
		);
	}

	if (status === 'paid') {
		return (
			<div className="whitespace-nowrap text-gray-600 text-sm items-center gap-2 flex">
				<i className="ri-check-line text-success-600"></i>
				<p>Pagada</p>
			</div>
		);
	}

	return (
		<div className="whitespace-nowrap text-gray-600 text-sm items-center gap-2 flex">
			<i className="ri-time-line text-warning-600"></i>
			<p>Pendiente</p>
		</div>
	);
}
