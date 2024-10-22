import { type LoaderFunctionArgs, type MetaFunction } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { nanoid } from 'nanoid';
import * as React from 'react';
import { Button, Input, Toast } from '~/components/form-utils';
import {
	Box,
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeadCell,
	TableRow,
} from '~/components/ui-library';
import { getOrgDbClient } from '~/utils/db.server';
import { cn, formatDate } from '~/utils/misc';
import { protectRoute } from '~/utils/session.server';

export const meta: MetaFunction = () => [{ title: 'Referidos - Villing' }];

export async function loader({ request }: LoaderFunctionArgs) {
	await protectRoute(request);

	const { db, orgId } = await getOrgDbClient(request);

	let [{ affiliateId, planExpiresAt }, companies] = await db.$transaction([
		db.organization.findFirstOrThrow({
			where: { id: orgId },
			select: { affiliateId: true, planExpiresAt: true },
		}),
		db.organization.findMany({
			where: { affiliateOrganizationId: orgId, planType: { not: 'free' } },
			select: { id: true, name: true, createdAt: true },
		}),
	]);

	if (!affiliateId) {
		const company = await db.organization.update({
			where: { id: orgId },
			data: { affiliateId: nanoid() },
			select: { affiliateId: true },
		});

		affiliateId = company.affiliateId;
	}

	return {
		companies,
		link: `https://villing.io/join/${affiliateId}`,
		planExpiresAt,
	};
}

export default function Component() {
	const { companies, link, planExpiresAt } = useLoaderData<typeof loader>();

	return (
		<div>
			<div className="pb-4 border-b border-gray-200 mb-6">
				<h3>Referidos</h3>
				<p className="text-gray-500 text-sm">
					Consulta las empresas referidas por tu organización y tus beneficios.
				</p>
			</div>

			<div className="flex flex-col lg:flex-row gap-4 mb-6">
				<Box className="flex-1">
					<h5>Usa Villing gratis con cada empresa referida</h5>
					<p className="text-sm text-gray-500 mb-4">
						Comparte tu link de referido
					</p>

					<div className="relative pb-4 border-b border-gray-200 mb-4">
						<Input defaultValue={link} className="h-12" readOnly />
						<CopyLinkButton link={link} />
					</div>

					<h5 className="mb-4">¿Cómo funciona?</h5>

					<Steps />
				</Box>

				<div className="flex-1 lg:max-w-xs">
					<Box className="p-0 overflow-hidden">
						<div className="bg-success-600 text-white text-center p-4">
							<h4>Tus beneficios</h4>
						</div>
						<div className="p-4 flex items-center gap-4 border-b border-gray-200">
							<span
								className={cn(
									'bg-success-600 w-12 h-12 text-white rounded-full',
									'flex items-center justify-center',
								)}
							>
								<i className="ri-gift-line text-xl"></i>
							</span>

							<div>
								<p className="text-gray-500 text-sm">Meses gratis recibidos</p>
								<p className="text-xl font-bold">{companies.length} meses</p>
							</div>
						</div>

						{planExpiresAt ? (
							<p className="p-4 text-sm text-gray-500">
								Tu plan de Villing vence en {formatDate(planExpiresAt)}
							</p>
						) : null}
					</Box>
				</div>
			</div>

			<h4>Empresas referidas</h4>
			<p className="text-gray-500 text-sm mb-4">
				Detalle de las empresas referidas por tu organización
			</p>

			{companies.length ? (
				<div className="rounded border border-gray-200 shadow-sm">
					<Table>
						<TableHead>
							<TableHeadCell>Empresa</TableHeadCell>
							<TableHeadCell className="whitespace-nowrap">
								Fecha de registro
							</TableHeadCell>
						</TableHead>
						<TableBody>
							{companies.map(company => (
								<TableRow key={company.id}>
									<TableCell className="whitespace-nowrap text-sm">
										{company.name}
									</TableCell>
									<TableCell className="whitespace-nowrap text-sm">
										{formatDate(company.createdAt)}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			) : (
				<Toast variant="warning">
					No has referido a ninguna empresa aún. Comparte tu link para empezar.
				</Toast>
			)}
		</div>
	);
}

function StepIcon({ children }: { children: React.ReactNode }) {
	return (
		<span
			className={cn(
				'bg-primary-600 w-8 h-8 text-white p-2 rounded-full',
				'flex items-center justify-center',
			)}
		>
			{children}
		</span>
	);
}

function Steps() {
	return (
		<div className="mx-auto">
			<div className="flex items-center">
				<div className="flex flex-col items-center mr-4">
					<StepIcon>
						<i className="ri-group-line"></i>
					</StepIcon>
				</div>

				<div>
					<p className="font-medium">Invita a una empresa</p>
					<p className="text-gray-600 text-sm">
						Ellos se registran con tu link de referido
					</p>
				</div>
			</div>

			<div className="pl-3.5 my-1">
				<div className="border-l border-gray-300 h-6" />
			</div>

			<div className="flex items-center">
				<div className="flex flex-col items-center mr-4">
					<StepIcon>
						<i className="ri-time-line"></i>
					</StepIcon>
				</div>

				<div>
					<p className="font-medium">Espera por la compra</p>
					<p className="text-gray-600 text-sm">
						Asegúrate de que la empresa compre un plan
					</p>
				</div>
			</div>

			<div className="pl-3.5 my-1">
				<div className="border-l border-gray-300 h-6" />
			</div>

			<div className="flex items-center">
				<div className="flex flex-col items-center mr-4">
					<StepIcon>
						<i className="ri-gift-line"></i>
					</StepIcon>
				</div>

				<div>
					<p className="font-medium">Usa Villing gratis</p>
					<p className="text-gray-600 text-sm">
						Cada empresa referida te da un mes gratis
					</p>
				</div>
			</div>
		</div>
	);
}

function CopyLinkButton({ link }: { link: string }) {
	const [copied, setCopied] = React.useState(false);

	React.useEffect(() => {
		if (copied) {
			const timeout = setTimeout(() => {
				setCopied(false);
			}, 2000);

			return () => clearTimeout(timeout);
		}
	}, [copied]);

	return (
		<Button
			size="sm"
			className="absolute right-2 top-2 text-sm"
			variant={copied ? 'black' : 'primary'}
			onClick={() => {
				navigator.clipboard.writeText(link);
				setCopied(true);
			}}
		>
			{copied ? (
				<div>
					<i className="ri-link-unlink"></i>
					Copiado!
				</div>
			) : (
				<div>
					<i className="ri-link"></i>
					Copiar link
				</div>
			)}
		</Button>
	);
}
