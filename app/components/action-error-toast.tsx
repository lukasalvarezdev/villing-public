import { baseWhatsappUrl } from '~/utils/misc';
import { Toast } from './form-utils';

type ActionErrorToastProps = {
	error?: string | null;
	referenceId?: string | null;
};
export function ActionErrorToast({
	error,
	referenceId,
}: ActionErrorToastProps) {
	if (!error) return null;

	const search = `text=Hola, tengo un problema con Villing. Referencia: \`${referenceId}\``;

	return (
		<Toast variant="error" className="mb-4">
			<i className="ri-error-warning-line mr-2"></i>
			{error}.{' '}
			{referenceId ? (
				<span>
					Ref: {referenceId}{' '}
					<a
						href={`${baseWhatsappUrl}?${search}`}
						target="_blank"
						className="underline font-bold"
						rel="noreferrer"
					>
						Contacta soporte
					</a>
				</span>
			) : null}
		</Toast>
	);
}
