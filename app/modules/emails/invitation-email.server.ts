import nodemailer from 'nodemailer';
import ses from 'nodemailer-ses-transport';
import { awsPool } from '~/utils/aws-pool.server';
import { errorLogger, logInfo } from '~/utils/logger';

type EmailArgs = { to: string; link: string; company: string; name: string };
export async function sendInvitationEmail(email: EmailArgs) {
	logInfo({
		message: `Sending invitation email to ${email.to}`,
		path: 'sendInvitationEmail',
	});

	const { to, company, link, name } = email;
	const transporter = nodemailer.createTransport(
		ses({
			accessKeyId: awsPool.accessKeyId,
			secretAccessKey: awsPool.secretAccessKey,
		} as any),
	);

	transporter.sendMail(
		{
			from: '"Villing" <facturas@villing.io>',
			to,
			subject: `Has sido invitado a unirte a ${company} - Villing`,
			html: `
			<!DOCTYPE html>
			<html>
			<head>
					<style>
							.email-container {
									max-width: 450px;
									margin: 0 auto;
									background-color: #fff !important;
									box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
									font-size: 16px !important;
									font-family: 'Helvetica Neue', Arial, sans-serif;
									color: #black;
									padding: 4px;
							}
							.header {
									background-color: #fff;
									padding-bottom: 15px;
									border-bottom: 1px solid #eee;
                  margin-bottom: 20px;
							}
              .confirm-link {
                display: block;
                width: 100%;
                margin-top: 20px;
                padding: 10px 0;
                background-color: #003DF5 !important;
                color: white !important;
                text-decoration: none;
                border-radius: 4px;
                font-weight: bold;
                text-align: center;
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
                <a href="https://villing.io" style="display: block;">
                  <img
                    src="https://villing.io/img/logo.png"
                    alt="Logo de Villing"
                    width="32"
                    height="32"
                  />
                </a>
							</div>
							<div style="color:black;">
									<p style="color:black;">Hola ${name},</p>
                  <p style="color:black;">Has sido invitado a unirte a ${company} en Villing. Si no esperabas esta invitación, puedes ignorar este correo.</p>
							</div>

							<a href="${link}" class="confirm-link" style="color:white;">Unirme a la empresa</a>

							<div class="footer">
									<p>Este email fue enviado por Villing. El software contable hecho por comerciantes para comerciantes</p>
							</div>
					</div>
			</body>
			</html>
			`,
		},
		error => {
			if (!error) {
				errorLogger({
					error,
					customMessage: `Error sending invitation email to ${to}`,
					path: 'sendInvitationEmail',
				});
			}

			logInfo({
				message: `Invitation email sent to ${to}`,
				path: 'sendInvitationEmail',
			});
		},
	);
}
