import * as React from 'react';

type NavigationProps = {
	listId: string;
	inputId: string;
	initialIndex?: number;
};
export function useUpDownNavigation({
	inputId,
	listId,
	initialIndex,
}: NavigationProps) {
	const [activeIndex, setActiveIndex] = React.useState<number | null>(
		initialIndex ?? null,
	);

	React.useEffect(() => {
		if (activeIndex === null) return;

		const list = document.getElementById(listId);
		if (!list) return;

		const activeItem = list.children[activeIndex] as HTMLLIElement;
		if (!activeItem) return;

		const button = activeItem.children[0] as HTMLButtonElement;

		button?.focus();
	}, [activeIndex, listId]);

	const onClose = React.useCallback(() => {
		setActiveIndex(null);
	}, []);

	const inputProps = {
		onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => {
			const listLength = getListLength(listId);

			if (e.key === 'ArrowDown') {
				e.preventDefault();
				setActiveIndex(0);
			}

			if (e.key === 'ArrowUp') {
				e.preventDefault();
				setActiveIndex(listLength);
			}

			if (e.key === 'Enter') {
				e.preventDefault();
				setActiveIndex(0);
			}

			if (e.key === 'Escape') {
				e.preventDefault();
				onClose();
			}
		},
	};

	function getListItemButtonProps(
		props?: React.ButtonHTMLAttributes<HTMLButtonElement>,
	): React.ButtonHTMLAttributes<HTMLButtonElement> {
		return {
			...props,
			onKeyDown: (e: React.KeyboardEvent<HTMLButtonElement>) => {
				props?.onKeyDown?.(e);

				const listLength = getListLength(listId);
				if (e.key === 'ArrowDown') {
					e.preventDefault();
					// focus next item
					setActiveIndex(prev => {
						if (prev === null) return 0;
						if (prev === listLength - 1) return 0;
						return prev + 1;
					});
				}
				if (e.key === 'ArrowUp') {
					e.preventDefault();
					// focus previous item
					setActiveIndex(prev => {
						if (prev === null) return listLength - 1;
						if (prev === 0) {
							document.getElementById(inputId)?.focus();
							return null;
						}
						return prev - 1;
					});
				}
			},
		};
	}

	return { activeIndex, inputProps, onClose, getListItemButtonProps };
}

function getListLength(listId: string) {
	const list = document.getElementById(listId);
	if (!list) return 0;

	return list.children.length;
}
