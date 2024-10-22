import { getFloatParts } from '~/modules/invoice/invoice-math';
import { cn, formatCurrency } from '~/utils/misc';

type FloatFormatterProps = {
	value: number;
	className?: string;
	floatClassName?: string;
};
export function FloatFormatter(props: FloatFormatterProps) {
	const { value, className, floatClassName } = props;
	const { integer, decimal } = getFloatParts(value);
	const fullValue = formatCurrency(value);
	const hasDecimal = decimal !== '00';

	return (
		<p
			className={cn('font-bold text-2xl', className)}
			arial-label={`$${fullValue}`}
		>
			$
			<span>
				{formatCurrency(integer)}
				{hasDecimal ? '.' : null}
			</span>
			{hasDecimal ? (
				<span className={cn('text-base', floatClassName)}>{decimal}</span>
			) : null}
		</p>
	);
}
