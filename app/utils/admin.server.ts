import { Upload } from '@aws-sdk/lib-storage';
import { type PrismaClient } from '@prisma/client';
import { redirect } from '@remix-run/node';
import nodemailer from 'nodemailer';
import ses from 'nodemailer-ses-transport';
import { invariant, formatCurrency } from '~/utils/misc';
import { awsPool, s3Client } from './aws-pool.server';
import { dianClient } from './dian-client.server';
import { getFilePresignedUrlByKey } from './misc.server';

export type VillingUserRole = 'superadmin' | 'admin' | 'user';

type PlanStatus = 'inactive' | 'expiring' | 'expired' | 'active';
export function getPlanStatusByDate(date: string | Date | null): PlanStatus {
	const dateObject = date ? new Date(date) : null;
	if (!dateObject) return 'inactive';

	const daysLeftToExpire = Math.floor(
		(dateObject.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
	);

	if (dateObject.getTime() < Date.now()) return 'expired';
	if (daysLeftToExpire <= 5) return 'expiring';
	return 'active';
}

export function getFreePlanExpiration() {
	const todayPlus15Days = new Date();
	todayPlus15Days.setDate(todayPlus15Days.getDate() + 15);

	return todayPlus15Days;
}

export async function syncResolutions(db: PrismaClient, orgId: number) {
	const { Resolution: resolutions, soenacToken } =
		await db.organization.findFirstOrThrow({
			where: { id: orgId },
			select: {
				soenacToken: true,
				Resolution: {
					where: { organizationId: orgId, deletedAt: null },
					orderBy: { createdAt: 'desc' },
				},
			},
		});

	invariant(soenacToken, 'Missing soenacToken');

	const dianResolutions = await dianClient({
		action: 'getResolutionsByOrganization',
		body: null,
		accessToken: soenacToken,
	});

	const mappedResolutions = resolutions.map(r => r.soenacId);
	const nonExistentResolutions = dianResolutions.filter(
		res => !mappedResolutions.includes(`${orgId}-${res.id}`),
	);

	await db.$transaction(
		nonExistentResolutions.map(resolution => {
			return db.resolution.create({
				data: {
					organizationId: orgId,
					count: resolution.number,
					prefix: resolution.prefix,
					name: resolution.prefix,
					type: 'legalInvoice',
					soenacId: `${orgId}-${resolution.id}`,
					resolutionNumber: resolution.resolution,
					from: resolution.from,
					to: resolution.to,
					fromDate: new Date(resolution.date_from),
					toDate: new Date(resolution.date_to),
					resolutionDate: new Date(resolution.resolution_date),
					status: 'active',
					technicalKey: resolution.technical_key,
				},
				select: { id: true },
			});
		}),
	);

	throw redirect(`/admin/organizations/${orgId}/dian`);
}

export async function uploadCertificate(fileId: string, fileBuffer: Buffer) {
	const parallelUploads3 = new Upload({
		client: s3Client,
		params: { Bucket: awsPool.bucket, Key: fileId, Body: fileBuffer },
		queueSize: 4,
		partSize: 1024 * 1024 * 5, // 5MB
		leavePartsOnError: false,
	});

	await parallelUploads3.done();
}

type EmailArgs = {
	comprobanteKey: string;
	cedulaKey: string;
	rutKey: string;
	camaraKey?: string;
};
export async function scheduledEmail(args: EmailArgs) {
	const { comprobanteKey, cedulaKey, rutKey, camaraKey } = args;

	const [comprobanteUrl, cedulaUrl, rutUrl, camaraUrl] = await Promise.all([
		getFilePresignedUrlByKey(comprobanteKey),
		getFilePresignedUrlByKey(cedulaKey),
		getFilePresignedUrlByKey(rutKey),
		getFilePresignedUrlByKey(camaraKey),
	]);

	const transporter = nodemailer.createTransport(
		ses({
			accessKeyId: process.env.AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
		} as any),
	);

	const attachments = [
		{ filename: 'comprobate.jpeg', path: comprobanteUrl, cid: 'test' },
		{ filename: 'cedula.pdf', path: cedulaUrl, cid: 'test' },
		{ filename: 'rut.pdf', path: rutUrl, cid: 'test' },
	];

	if (camaraUrl) {
		attachments.push({ filename: 'camara.pdf', path: camaraUrl, cid: 'test' });
	}

	transporter.sendMail(
		{
			from: 'facturas@villing.io',
			to: 'facturas@villing.io',
			subject: 'Compra de certificado de firma digital - ${process.env.ADMIN_ID_NUMBER}',
			html: `
				<!DOCTYPE html>
				<html lang="en">
					<head>
						<meta charset="UTF-8" />
						<meta name="viewport" content="width=device-width, initial-scale=1.0" />
						<title>Document</title>
					</head>
					<body>
						<p>Buen día,</p>
						<p>Adjunto documentos requeridos para el certificado.</p>
						<p>Por favor facturar a nombre de <strong>${process.env.ADMIN_NAME}</strong> con NIT <strong>${process.env.ADMIN_ID_NUMBER}</strong>.</p>
					</body>
				</html>
			`,
			attachments,
		},
		function (error) {
			if (error) console.error(error);
		},
	);
}

type EmailOrderArgs = {
	to: string;
	storeName: string;
	orderId: number;
	items: Array<{ name: string; quantity: number; price: number }>;
	adminEmail: string;
	clientName: string;
	number: string;
};
export async function scheduledOrderEmail({
	to,
	storeName,
	items,
	orderId,
	adminEmail,
	clientName,
	number,
}: EmailOrderArgs) {
	const transporter = nodemailer.createTransport(
		ses({
			accessKeyId: process.env.AWS_ACCESS_KEY_ID,
			secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
		} as any),
	);
	const total = items.reduce(
		(acc, item) => acc + item.price * item.quantity,
		0,
	);

	transporter.sendMail(
		{
			from: '"Villing Tiendas" <facturas@villing.io>',
			to,
			subject: `Confirmación de compra en ${storeName}`,
			html: `
			<!DOCTYPE html>
			<html>
			<head>
					<style>
							body {
									font-family: 'Helvetica Neue', Arial, sans-serif;
									background-color: #f4f4f5;
									color: #333;
									line-height: 1.6;
							}
							.email-container {
									max-width: 600px;
									margin: 20px auto;
									padding: 20px;
									background-color: #fff;
									border-radius: 8px;
									box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
							}
							.header {
									background-color: #0070f3;
									color: white;
									padding: 20px;
									border-radius: 8px 8px 0 0;
									text-align: center;
							}
							.order-details, .invoice-details {
									padding: 20px;
							}
							.invoice-details table {
									width: 100%;
									border-collapse: collapse;
							}
							.invoice-details th, .invoice-details td {
									text-align: left;
									padding: 12px 8px;
									border-bottom: 1px solid #eee;
							}
							.total {
									text-align: right;
									font-size: 1.2em;
									font-weight: bold;
							}
							.footer {
									text-align: center;
									padding: 20px;
									font-size: 0.8em;
									color: #777;
									border-top: 1px solid #eee;
							}
					</style>
			</head>
			<body>
					<div class="email-container">
							<div class="header">
									<h1>Confirmación de compra</h1>
							</div>
							<div class="order-details">
									<h2>¡Gracias por tu compra!</h2>
									<p>Hola ${clientName}, queremos confirmarte tu compra en ${storeName} con número <strong>#${orderId}</strong>.</p>
									<p style="color: #000">Nos pondremos en contacto contigo cuando esta haya sido despachada.</p>
							</div>
							<div class="invoice-details">
									<h3>Detalles de la compra:</h3>
									<table>
											<tr>
													<th>Producto</th>
													<th>Cantidad</th>
													<th>Precio</th>
											</tr>
											${getProductsHTML(items)}
									</table>
									<p class="total">Total: $${formatCurrency(total)}</p>
							</div>
							<div class="footer">
									<p>Si tienes alguna pregunta, por favor contáctanos a nuestro correo ${adminEmail}. ${
										number ? `O a nuestro whatsapp ${number}` : ''
									}</p>
							</div>
					</div>
			</body>
			</html>
			`,
		},
		function (error) {
			if (error) console.error(error);
		},
	);
}

function getProductsHTML(
	products: Array<{ name: string; quantity: number; price: number }>,
) {
	return products
		.map(
			product =>
				`<tr>
					<td>${product.name}</td>
					<td>${product.quantity}</td>
					<td>$${formatCurrency(product.price)}</td>
				</tr>`,
		)
		.join('');
}
