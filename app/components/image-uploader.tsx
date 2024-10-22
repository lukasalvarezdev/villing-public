import { useFetcher } from '@remix-run/react';
import React from 'react';
import { EmptyUserIcon } from '~/assets/jsx-icons';
import { MAX_FILE_SIZE, cn } from '~/utils/misc';
import { Button, ErrorText, Label } from './form-utils';

export function ImageUploader({
	url,
	label,
	formAction,
}: {
	url?: string;
	label: string;
	formAction: string;
}) {
	const inputRef = React.useRef<HTMLInputElement>(null);
	const fetcher = useFetcher();
	const isLoading = fetcher.state !== 'idle';
	const [error, setError] = React.useState<string | null>(null);

	function resetInput() {
		if (!inputRef.current) return;
		inputRef.current.value = '';
	}

	function handleSubmit() {
		const file = inputRef.current?.files?.[0];

		if (file && file.size > MAX_FILE_SIZE) {
			setError('El archivo es demasiado grande, el tamaño máximo es 1MB');
			return;
		}

		if (!file) {
			resetInput();
			return;
		}

		const formData = new FormData();
		formData.append('file', file);

		fetcher.submit(formData, {
			method: 'POST',
			action: formAction,
			encType: 'multipart/form-data',
		});
		resetInput();
	}

	return (
		<div>
			<input
				type="file"
				name="file"
				ref={inputRef}
				className="hidden"
				accept=".png, .jpeg, .jpg, .webp, .svg"
				onChange={handleSubmit}
			/>

			<Label>{label}</Label>
			<div className="flex gap-4 items-center">
				<div className="w-14 h-14">
					{url ? (
						<div
							className={cn(
								'h-full w-full max-h-full max-w-full rounded-full',
								'bg-contain bg-center bg-no-repeat',
							)}
							style={{ backgroundImage: `url(${url})` }}
						></div>
					) : (
						<EmptyUserIcon className="text-gray-300 w-full h-full" />
					)}
				</div>

				<Button
					variant="secondary"
					type="button"
					onClick={() => inputRef.current?.click()}
				>
					{isLoading ? `Subiendo ${label}...` : 'Cambiar'}
				</Button>

				{error ? <ErrorText>{error}</ErrorText> : null}
			</div>
		</div>
	);
}
