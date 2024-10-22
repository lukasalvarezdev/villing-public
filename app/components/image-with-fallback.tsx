import * as React from 'react';
import { cn } from '~/utils/misc';

export function ImageWithFallback({
	src: defaultSrc,
	alt,
	...props
}: {
	src: string;
	alt?: string;
} & React.ImgHTMLAttributes<HTMLImageElement>) {
	const imgRef = React.useRef<HTMLImageElement>(null);
	const src = defaultSrc ?? WHITE_IMAGE_URL;

	React.useEffect(() => {
		const img = new Image();
		img.onload = () => {
			if (imgRef.current) {
				imgRef.current.src = src;
			}
		};
		img.onerror = () => {
			if (imgRef.current) {
				imgRef.current.src = '/img/not-found.png';
			}
		};
		img.src = src;
	}, [src]);

	return (
		<img
			loading="lazy"
			width={150}
			height={150}
			ref={imgRef}
			src={src}
			alt={alt}
			{...props}
			className={cn(
				'object-cover w-full h-full rounded-md min-w-full min-h-full',
				'transition-all duration-300 ease-in-out group-hover:scale-110',
				props.className,
			)}
		/>
	);
}

const WHITE_IMAGE_URL =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAFUlEQVR4nGP8//8/A27AhEduBEsDAKXjAxF9kqZqAAAAAElFTkSuQmCC';
