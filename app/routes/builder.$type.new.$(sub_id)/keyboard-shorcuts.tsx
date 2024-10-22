import { useHotkeys } from 'react-hotkeys-hook';
import { useBuilderContext } from './builder/context';
import { useBuilderType, useTargetSetter } from './misc';

export function useBuilderKeyboardShorcuts() {
	const builderType = useBuilderType();
	const {
		dispatch,
		state: { target },
	} = useBuilderContext();
	const setTarget = useTargetSetter();

	const isOpen = Boolean(target);
	const canUseShorcuts = builderType === 'pos';

	useHotkeys(
		'esc',
		() => {
			setTarget(undefined);
		},
		{ enableOnFormTags: true },
		[setTarget],
	);
	useHotkeys(
		shortcuts.confirm,
		e => {
			if (isOpen) return;

			e.preventDefault();
			setTarget(builderType);
			dispatch({ type: 'setPrint', payload: true });
		},
		[isOpen, setTarget, builderType],
		{ enableOnFormTags: true },
	);
	useHotkeys(
		shortcuts.confirmNoPrint,
		e => {
			if (isOpen || !canUseShorcuts) return;

			e.preventDefault();
			setTarget('pos');
			dispatch({ type: 'setPrint', payload: false });
		},
		[isOpen, setTarget, canUseShorcuts],
		{ enableOnFormTags: true },
	);

	useHotkeys(
		shortcuts.quote,
		e => {
			if (isOpen || !canUseShorcuts) return;
			e.preventDefault();
			setTarget('quote');
		},
		[isOpen, canUseShorcuts, setTarget],
		{ enableOnFormTags: true },
	);
	useHotkeys(
		shortcuts.remision,
		e => {
			if (isOpen || !canUseShorcuts) return;

			e.preventDefault();
			setTarget('remision');
		},
		[isOpen, canUseShorcuts, setTarget],
		{ enableOnFormTags: true },
	);

	useHotkeys(
		shortcuts.electronic,
		e => {
			if (isOpen || !canUseShorcuts) return;

			e.preventDefault();
			setTarget('electronic');
		},
		[isOpen, canUseShorcuts, setTarget],
		{ enableOnFormTags: true },
	);
}

const shortcuts = {
	confirm: ['Meta+m', 'ctrl+m'],
	confirmNoPrint: ['Meta+u', 'ctrl+u'],
	quote: ['Meta+k', 'ctrl+k'],
	remision: ['Meta+j', 'ctrl+j'],
	electronic: ['Meta+i', 'ctrl+i'],
};
