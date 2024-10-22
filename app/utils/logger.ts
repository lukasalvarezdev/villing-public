/* eslint-disable no-console */
import { v4 as uuid } from 'uuid';

export function errorLogger({
	error,
	path,
	body,
	customMessage,
}: {
	path: string;
	body?: any;
	error: any;
	customMessage?: string;
}) {
	const refId = uuid();

	console.error({
		message: `Error with referenceId: ${refId}`,
		error,
		path,
		data: JSON.stringify(body, null, 2),
		customMessage,
	});

	return refId;
}

export function logInfo({
	message,
	data,
	path,
}: {
	message: string;
	data?: any;
	path: string;
}) {
	console.info({ path, message, data: JSON.stringify(data, null, 2) });
}
