import {
	type ActionFunctionArgs,
	type LoaderFunctionArgs,
	json,
	redirect,
} from '@remix-run/node';
import { Form, Link, useLoaderData } from '@remix-run/react';
import * as React from 'react';
import { DatePicker } from '~/components/date-picker';
import { Button, Input, IntentButton, Label } from '~/components/form-utils';
import { Modal, ModalHeader } from '~/components/modal';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
	PopoverClose,
} from '~/components/popover';
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandItem,
} from '~/components/radix-command';
import { getUser } from '~/utils/auth.server';
import { getOrgDbClient } from '~/utils/db.server';
import { cn, parseFormData, toNumber } from '~/utils/misc';
import { getAmountByPlan } from '~/utils/plan-protection';
import { protectAdminRoute } from '~/utils/plan-protection.server';
import { protectRoute } from '~/utils/session.server';

export async function loader({ request }: LoaderFunctionArgs) {
	await Promise.all([protectRoute(request), protectAdminRoute(request)]);

	const { db } = await getOrgDbClient(request);
	const user = await getUser(request);
	const organizations = await db.organization.findMany({
		select: {
			id: true,
			name: true,
			email: true,
			planType: true,
			planExpiresAt: true,
		},
		where: {
			OR:
				user?.role === 'superadmin'
					? [{ id: { lte: 98 } }, { id: { equals: 109 } }]
					: undefined,
		},
	});

	return json({ organizations });
}

export async function action({ request }: ActionFunctionArgs) {
	await Promise.all([protectRoute(request), protectAdminRoute(request)]);

	const { db } = await getOrgDbClient(request);

	const form = await parseFormData(request);
	const date = form.get('date');
	const orgId = form.get('orgId');
	const description = form.get('description');

	await db.$transaction(async tx => {
		const nextPayment = new Date(form.get('nextPayment')!);

		const organization = await tx.organization.update({
			where: { id: Number(orgId) },
			data: { planExpiresAt: nextPayment },
		});

		const amount =
			organization.planType === 'custom'
				? toNumber(organization.customPlanAmount)
				: getAmountByPlan(organization.planType);

		await tx.paymentPlan.create({
			data: {
				type: organization.planType,
				amount: amount,
				nextPayment,
				createdAt: new Date(date!),
				organization: { connect: { id: Number(orgId) } },
				description: description || '',
			},
			select: { id: true },
		});
	});

	return redirect('/admin/payments');
}

export default function Component() {
	return (
		<Modal className="max-w-md">
			<ModalHeader className="mb-4" href="/admin/payments">
				<h4 className="font-bold">Agregar pago</h4>
			</ModalHeader>

			<Form method="POST">
				<ClientSearch />

				<Label htmlFor="description">Descripción</Label>
				<Input
					id="description"
					name="description"
					className="mb-2"
					placeholder="Descripción"
				/>

				<Label htmlFor="date">Fecha de pago</Label>
				<DatePicker name="date" className="mb-2" defaultDate={new Date()} />

				<Label htmlFor="nextPayment">Fecha del próximo pago</Label>
				<DatePicker
					name="nextPayment"
					className="mb-4"
					defaultDate={new Date()}
				/>

				<div className="flex gap-2">
					<IntentButton intent="create">Crear pago</IntentButton>
					<Link to="/admin/payments">
						<Button variant="secondary" type="button">
							Cancelar
						</Button>
					</Link>
				</div>
			</Form>
		</Modal>
	);
}

function ClientSearch() {
	const { organizations } = useLoaderData<typeof loader>();
	const [value, setValue] = React.useState('');
	const organization = organizations.find(c => c.id === Number(value));
	const [search, setSearch] = React.useState('');
	const [list, setList] = React.useState(
		organizations.map(c => ({ value: String(c.id), label: c.name })),
	);
	const id = React.useId();

	React.useEffect(() => {
		setList(organizations.map(c => ({ value: String(c.id), label: c.name })));
	}, [organizations]);

	return (
		<Popover>
			<div className="mb-2">
				<Label className="mb-0" htmlFor={id}>
					Empresa
				</Label>
				<input type="hidden" name="orgId" defaultValue={value} />

				<PopoverTrigger asChild>
					<Button
						variant="secondary"
						className="justify-between gap-4 w-full text-left"
						type="button"
					>
						<p className="whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px]">
							{organization?.name || 'Selecciona una empresa'}
						</p>
						<i className="ri-expand-up-down-line"></i>
					</Button>
				</PopoverTrigger>
			</div>

			<PopoverContent className="p-0 bg-white w-72" align="end">
				<div className="p-2 border-b border-gray-200">
					<Input
						placeholder="Busca por nombre"
						className={cn('border-none shadow-none')}
						autoFocus
						id={id}
						value={search}
						onChange={e => {
							setSearch(e.target.value);
							const newList = organizations
								.filter(item =>
									item.name
										.toLowerCase()
										.includes(e.target.value.toLowerCase()),
								)
								.map(c => ({ value: String(c.id), label: c.name }));

							setList(
								search
									? newList
									: organizations.map(c => ({
											value: String(c.id),
											label: c.name,
										})),
							);
						}}
					/>
				</div>

				<Command className="w-full">
					<CommandEmpty>No hay clientes.</CommandEmpty>

					<CommandGroup className="max-h-96 overflow-y-scroll" value="">
						{list.map(item => (
							<CommandItem
								key={item.value}
								value={item.value}
								onSelect={setValue}
								className="p-0"
							>
								<PopoverClose className="w-full h-full px-2 py-1.5 text-left">
									<div className="flex justify-between w-full">
										<p>{item.label}</p>

										{Number(item.value) === organization?.id ? (
											<i className="ri-check-line"></i>
										) : null}
									</div>
								</PopoverClose>
							</CommandItem>
						))}
					</CommandGroup>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
