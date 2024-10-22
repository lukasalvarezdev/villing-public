import { z } from 'zod';
import { getHeaders, soenacApiUrl } from '~/utils/dian-client.server';
import { errorLogger, logInfo } from '~/utils/logger';
import { adjustement_payroll_example, payroll_example } from './example';

async function createPayroll(accessToken: string, payroll: unknown) {
	const path = `api/payroll/102/a77c496d-02b2-489a-a4f2-c183dea8c880`;
	logInfo({ message: 'Creating payroll', data: payroll, path });

	const response = await fetch(
		`https://icag.apifacturacionelectronica.com/${path}`,
		{
			method: 'POST',
			body: JSON.stringify(payroll),
			headers: getHeaders(accessToken),
		},
	);

	if (response.status !== 200) {
		const data = await response.json();
		const referenceId = errorLogger({ error: data, path, body: payroll });
		return { referenceId, success: false } as const;
	}

	const data = await response.json();
	const result = getSchema().safeParse(data);

	if (!result.success) {
		const referenceId = errorLogger({
			body: result.error.flatten(),
			error: data,
			path,
			customMessage: 'Error parsing response from DIAN in createPayroll',
		});
		return { referenceId, success: false } as const;
	}

	return { success: true, data: data as Record<string, any> } as const;

	function getSchema() {
		return z.object({ is_valid: z.boolean().nullable() });
	}
}

async function getPayrollByZip(accessToken: string, zip_key: string) {
	const path = `status/zip/${zip_key}`;
	logInfo({ message: 'Consulting zip', path });

	const response = await fetch(`${soenacApiUrl}/${path}`, {
		method: 'POST',
		body: JSON.stringify({ environment: { type_environment_id: 2 } }),
		headers: getHeaders(accessToken),
	});

	if (response.status !== 200) {
		const data = await response.json();
		const referenceId = errorLogger({ error: data, path });
		return { referenceId, success: false } as const;
	}

	const data = await response.json();
	const result = getSchema().safeParse(data);

	if (!result.success) {
		const referenceId = errorLogger({
			body: result.error.flatten(),
			error: data,
			path,
			customMessage: 'Error parsing response from DIAN',
		});
		return { referenceId, success: false } as const;
	}

	return { success: true, data: data as Record<string, any> } as const;

	function getSchema() {
		return z.object({ is_valid: z.boolean() });
	}
}

type TestPayrollConfig = {
	testSetId: string;
	softwareId: string;
	pin: string;
	number: number;
	idNumber: number;
};
async function createTestPayroll(
	accessToken: string,
	config: TestPayrollConfig,
) {
	const zip_key = await createPayroll();

	await sleep(5000);

	const result = await getPayrollByZip(accessToken, zip_key);

	if (!result.success) throw { referenceId: result.referenceId };

	await createAdjustement(result.data);

	return true;

	async function createAdjustement(data: Record<string, any>) {
		const adjustement_path = `api/payroll/103/${config.testSetId}`;
		const adjustement_payroll = mapAdjustement(data);

		logInfo({
			message: 'Creating test payroll adjustement',
			data: adjustement_payroll,
			path: adjustement_path,
		});

		const response = await fetch(
			`https://icag.apifacturacionelectronica.com/${adjustement_path}`,
			{
				method: 'POST',
				body: JSON.stringify(adjustement_payroll),
				headers: getHeaders(accessToken),
			},
		);

		if (response.status !== 200) {
			const data = await response.json();

			const referenceId = errorLogger({
				error: data,
				path: adjustement_path,
				body: adjustement_payroll,
			});
			return { referenceId, success: false } as const;
		}
	}

	async function createPayroll() {
		const path = `api/payroll/102/${config.testSetId}`;

		const payroll = {
			...payroll_example,
			sync: false,
			xml_sequence_number: { prefix: 'TEST', number: config.number },
			employer: {
				...payroll_example.employer,
				identification_number: config.idNumber,
			},
			environment: {
				type_environment_id: 2,
				id: config.softwareId,
				pin: config.pin,
			},
		};

		logInfo({ message: 'Creating test payroll', data: payroll, path });

		const response = await fetch(
			`https://icag.apifacturacionelectronica.com/${path}`,
			{
				method: 'POST',
				body: JSON.stringify(payroll),
				headers: getHeaders(accessToken),
			},
		);

		if (response.status !== 200) {
			const data = await response.json();
			const referenceId = errorLogger({ error: data, path, body: payroll });
			throw { referenceId };
		}

		const data = await response.json();
		const result = z.object({ zip_key: z.string() }).safeParse(data);

		if (!result.success) {
			const referenceId = errorLogger({
				body: result.error.flatten(),
				error: data,
				path,
				customMessage: 'Error parsing response from DIAN in createTestPayroll',
			});

			throw { referenceId };
		}

		return result.data.zip_key;
	}

	function mapAdjustement(payroll_reference: Record<string, any>) {
		return {
			...adjustement_payroll_example,
			sync: false,
			payroll_reference,
			xml_sequence_number: {
				prefix: 'CORR',
				number: config.number + 1,
			},
			employer: {
				...payroll_example.employer,
				identification_number: config.idNumber,
			},
			environment: {
				type_environment_id: 2,
				id: config.softwareId,
				pin: config.pin,
			},
		};
	}

	async function sleep(ms: number) {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

export const payrollDianClient = {
	createPayroll,
	getPayrollByZip,
	createTestPayroll,
};
