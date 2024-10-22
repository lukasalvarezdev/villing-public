import nodemailer from 'nodemailer';
import ses from 'nodemailer-ses-transport';
import { awsPool } from '~/utils/aws-pool.server';
import { errorLogger, logInfo } from '~/utils/logger';

type EmailArgs = { to: string; link: string };
export async function sendConfirmationEmail(email: EmailArgs) {
	logInfo({
		message: `Sending confirmation email to ${email.to}`,
		path: 'sendConfirmationEmail',
	});

	const { to } = email;
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
			subject: 'Confirma tu correo electrónico en Villing',
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
									<p style="color:black;">Hola,</p>
                  <p style="color:black;">
                    Nos alegra que te hayas unido a Villing. Para confirmar tu correo electrónico, haz clic en el siguiente enlace. Si no has solicitado este correo, ignóralo.
                  </p>
							</div>

							<div><!--[if mso]>
								<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${email.link}" style="height:44px;v-text-anchor:middle;width:100%;" arcsize="10%" stroke="f" fillcolor="#003df5">
									<w:anchorlock/>
									<center>
								<![endif]-->
										<a href="${email.link}"
							style="background-color:#003df5;border-radius:4px;color:#ffffff;display:inline-block;font-family:sans-serif;font-size:13px;font-weight:bold;line-height:44px;text-align:center;text-decoration:none;width:100%;-webkit-text-size-adjust:none;">Confirmar mi cuenta</a>
								<!--[if mso]>
									</center>
								</v:roundrect>
							<![endif]--></div>

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
				logInfo({
					message: `Confirmation email sent to ${to}`,
					path: 'sendConfirmationEmail',
				});
				return;
			}

			errorLogger({
				error,
				customMessage: `Error sending confirmation email to ${to}`,
				path: 'sendConfirmationEmail',
			});

			throw error;
		},
	);
}
