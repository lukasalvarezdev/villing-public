import { type PlanType } from '@prisma/client';

export function planTranslator(plan: PlanType): string {
	switch (plan) {
		case 'free':
			return 'Gratis';
		case 'entrepreneur':
			return 'Emprendedor';
		case 'max':
			return 'Pro';
		case 'proMax':
			return 'Pro Max';
		case 'custom':
			return 'Personalizado';
		default:
			return 'Gratis';
	}
}

type PlanStatus = 'inactive' | 'expiring' | 'expired' | 'active';
export function getPlanStatus(date: string | Date | null): PlanStatus {
	const dateObject = date ? new Date(date) : null;
	if (!dateObject) return 'inactive';

	const daysLeftToExpire = Math.floor(
		(dateObject.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
	);

	if (dateObject.getTime() < Date.now()) return 'expired';
	if (daysLeftToExpire <= 5) return 'expiring';
	return 'active';
}

export function planStatusTranslator(
	date: string | null,
	defaultPlan?: PlanType,
): string {
	switch (defaultPlan || getPlanStatus(date)) {
		case 'active':
			return 'Activo';
		case 'expiring':
			return 'Expirando';
		case 'expired':
			return 'Expirado';
		case 'inactive':
			return 'Inactivo';
		default:
			return 'Inactivo';
	}
}

export function getAmountByPlan(plan: PlanType): number {
	switch (plan) {
		case 'free':
			return 0;
		case 'entrepreneur':
			return 69900;
		case 'max':
			return 129900;
		case 'proMax':
			return 159900;
		default:
			return 0;
	}
}

export const allowedNonConfirmedPaths = [
	'/home',
	'/builder/pos/',
	'/builder/create-quick-product',
	'/builder/products',
	'/builder/settings',
	'/products',
	'/invoices',
	'/settings',
	'/all-recipients',
	'/api/organization-relations',
	'/api/invoices/pos',
	'/api/create-quick-product',
	'/resend-confirmation',
	'/reset-password',
	'/confirm',
	'/forgot',
	'/login',
	'/logout',
	'/join',
	'/log',
	'/clients',
	'/start',
];

export function getIsInvalidPath(path: string): boolean {
	if (!path.startsWith('/')) return true;

	const isInvalid = allowedNonConfirmedPaths.every(allowedPath => {
		return !path.includes(allowedPath);
	});

	return isInvalid && !path.includes('/home');
}
