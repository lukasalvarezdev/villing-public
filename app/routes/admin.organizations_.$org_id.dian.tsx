import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { Link, useLoaderData } from '@remix-run/react';
import { getOrgDbClient } from '~/utils/db.server';
import { invariant } from '~/utils/misc';
import { protectAdminRoute } from '~/utils/plan-protection.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request, params }: LoaderFunctionArgs) {
	invariant(params.org_id, 'Missing org_id param');

	await Promise.all([protectRoute(request), protectAdminRoute(request)]);
	const { db } = await getOrgDbClient(request);

	const {
		soenacToken,
		OrganizationDianData: [dianData],
		Resolution: [resolution],
	} = await db.organization.findFirstOrThrow({
		where: { id: parseInt(params.org_id) },
		select: {
			soenacToken: true,
			name: true,
			OrganizationDianData: {
				select: {
					certificateInBase64: true,
					rutFileKey: true,
					cedulaFileKey: true,
					comprobanteFileKey: true,
				},
			},
			Resolution: {
				where: {
					type: 'legalInvoice',
					soenacId: { not: null },
				},
			},
		},
	});
	const hasDocuments = Boolean(
		dianData?.rutFileKey &&
			dianData?.cedulaFileKey &&
			dianData?.comprobanteFileKey,
	);
	const hasCertificate = Boolean(dianData?.certificateInBase64);
	const hasSoenacAcount = Boolean(soenacToken);
	const isEnabledToBill = Boolean(resolution);

	return json({
		hasSoenacAcount,
		hasDocuments,
		hasCertificate,
		isEnabledToBill,
	});
}

export default function Component() {
	const { hasSoenacAcount, hasCertificate, hasDocuments, isEnabledToBill } =
		useLoaderData<typeof loader>();

	return (
		<div>
			<div className="pb-4 border-b border-gray-200 mb-4">
				<h3 className="font-medium">
					Sincronización de facturación electrónica
				</h3>
				<p className="text-gray-500 text-sm">
					Consulta si el cliente está habilitado para facturar electrónicamente.
				</p>
			</div>

			<ul className="flex flex-col gap-2">
				<li className="flex gap-2 font-medium">
					{isEnabledToBill ? (
						<div className="flex gap-2 items-center">
							<i className="ri-checkbox-circle-line text-success-600"></i>
							<p>Está habilitado para facturar electrónicamente.</p>
						</div>
					) : (
						<div className="flex gap-2 items-center">
							<i className="ri-close-circle-line text-gray-600"></i>
							<p>
								No está habilitado para facturar electrónicamente.{' '}
								<Link
									to="authorization"
									className="underline text-primary-600 text-sm"
									prefetch="intent"
								>
									Habilitar
								</Link>
							</p>
						</div>
					)}
				</li>

				<li className="flex gap-2">
					{hasSoenacAcount ? (
						<div className="flex gap-2 items-center">
							<i className="ri-checkbox-circle-line text-success-600"></i>
							<p>Está registrado en Soenac.</p>
						</div>
					) : (
						<div className="flex gap-2 items-center">
							<i className="ri-close-circle-line text-gray-600"></i>
							<p>Está registrado en Soenac.</p>
						</div>
					)}
				</li>

				<li className="flex gap-2">
					{hasCertificate ? (
						<div className="flex gap-2 items-center">
							<i className="ri-checkbox-circle-line text-success-600"></i>
							<p>Tiene certificado de firma digital.</p>
						</div>
					) : (
						<div className="flex gap-2 items-center">
							<i className="ri-close-circle-line text-gray-600"></i>
							<p>
								No tiene certificado de firma digital.{' '}
								<Link
									to="certificate"
									className="underline text-primary-600 text-sm"
									prefetch="intent"
								>
									Solicitar
								</Link>
							</p>
						</div>
					)}
				</li>

				<li className="flex gap-2">
					{hasDocuments ? (
						<div className="flex gap-2 items-center">
							<i className="ri-checkbox-circle-line text-success-600"></i>
							<p>
								Ya tiene los documentos para el certificado de firma digital.
							</p>
							{!hasCertificate ? (
								<Link
									to="documents"
									className="underline text-primary-600 text-sm"
								>
									Comprar certificado
								</Link>
							) : null}
						</div>
					) : (
						<div className="flex gap-2 items-center">
							<i className="ri-close-circle-line text-gray-600"></i>
							<p>
								No tiene los documentos para el certificado de firma digital.
							</p>
						</div>
					)}
				</li>
			</ul>
		</div>
	);
}
