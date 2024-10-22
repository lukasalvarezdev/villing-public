import { cn } from '~/utils/misc';

export function AbsoluteSlashIcon() {
	return (
		<span
			className={cn(
				'text-[10px] text-gray-500 bg-gray-100/90 border border-gray-200 rounded h-5 px-2',
				'hidden md:flex items-center justify-center',
				'absolute right-3 top-1/2 transform -translate-y-1/2',
			)}
		>
			/
		</span>
	);
}

export function ShorcutIcon({ children }: { children: React.ReactNode }) {
	return (
		<span
			className={cn(
				'text-xs text-gray-500 bg-gray-100/60 border border-gray-200 rounded h-5 px-2',
				'hidden md:flex items-center justify-center',
				'absolute right-3 top-1/2 transform -translate-y-1/2',
			)}
		>
			{children}
		</span>
	);
}

export function EmptyUserIcon({ className }: { className: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="currentColor"
			aria-hidden="true"
			className={className}
		>
			<path
				fillRule="evenodd"
				d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
				clipRule="evenodd"
			></path>
		</svg>
	);
}

export function CircleDotsIcon({ className }: { className?: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className={cn('w-5 h-5', className)}
			data-id="21"
		>
			<circle cx="12" cy="12" r="10"></circle>
			<path d="M17 12h.01"></path>
			<path d="M12 12h.01"></path>
			<path d="M7 12h.01"></path>
		</svg>
	);
}

function polarToCartesian(x: number, y: number, r: number, degrees: number) {
	const radians = (degrees * Math.PI) / 180.0;
	return [x + r * Math.cos(radians), y + r * Math.sin(radians)];
}

function getSegmentPath(
	{
		size,
		margin = 0.1,
		segments,
		radius = size / 2,
		width = 1,
	}: {
		size: number;
		margin?: number;
		segments: number;
		radius?: number;
		width?: number;
	},
	segment: number,
	span = 1,
) {
	const center = size / 2;
	const degrees = 360 / segments;
	const shift = margin === 0 ? -90 : -90 + (degrees * margin) / 2;
	const start = shift + degrees * segment;
	const end =
		shift + degrees * (segment + span - margin) + (margin == 0 ? 1 : 0);
	const innerRadius = radius - width;

	const arc = Math.abs(start - end) > 180 ? 1 : 0;
	const point = (rad: number, deg: number) =>
		polarToCartesian(center, center, rad, deg)
			.map(n => n.toPrecision(5))
			.join(',');

	return [
		`M${point(radius, start)}`,
		`A${radius},${radius},0,${arc},1,${point(radius, end)}`,
		`L${point(radius - width, end)}`,
		`A${innerRadius},${innerRadius},0,${arc},0,${point(innerRadius, start)}`,
		'Z',
	].join('');
}

export function TeamCircle({
	size,
	width = 2,
}: {
	size: number;
	width?: number;
}) {
	let options = { size, width, margin: 0.05, segments: 3 };

	return (
		<svg height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
			<path
				d={getSegmentPath(options, 0)}
				className="text-[#007CF0]"
				fill="currentColor"
			/>
			<path
				d={getSegmentPath(options, 1)}
				className="text-error-600"
				fill="currentColor"
			/>
			<path
				d={getSegmentPath(options, 2)}
				className="text-success-600"
				fill="currentColor"
			/>
		</svg>
	);
}

export function ChartIcon({ className }: { className: string }) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-linecap="round"
			stroke-linejoin="round"
			stroke-width="2"
			className={cn('h-4 w-4 text-muted-foreground', className)}
		>
			<path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
		</svg>
	);
}
