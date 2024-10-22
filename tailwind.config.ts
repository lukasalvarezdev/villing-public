import { type Config } from 'tailwindcss';

module.exports = {
	mode: 'jit',
	content: ['./app/**/*.{js,ts,jsx,tsx}'],
	future: { hoverOnlyWhenSupported: true },
	theme: {
		extend: {
			gridTemplateColumns: {
				'fit-40': 'repeat(auto-fit, minmax(10rem, 1fr))',
				'fit-56': 'repeat(auto-fit, minmax(14.5rem, 1fr))',
				'fit-72': 'repeat(auto-fit, minmax(18rem, 1fr))',
				'60/40': '3fr 2fr',
				'70/30': '4fr 2fr',
				'75/25': '3fr 1fr',

				'fill-96': 'repeat(auto-fill, minmax(24rem, 1fr))',
			},
			colors: {
				primary: {
					25: '#EBF0FF',
					50: '#C2D1FF',
					600: '#003DF5',
					700: '#0028B0',
				},
				success: {
					50: '#f0ffeb',
					100: '#d9f9d6',
					200: '#8ce9a3',
					600: '#54B86D',
				},
				error: {
					50: '#FEF7F8',
					100: '#ffd6de',
					200: '#ff8ea4',
					600: '#F33F63',
				},
			},
			gradientColorStops: {
				'gradient-1-start': '#007CF0',
				'gradient-1-end': '#00DFD8',
				'gradient-2-start': '#7928CA',
				'gradient-2-end': '#FF0080',
			},
			boxShadow: {
				'negative-sm': '0 -2px 5px 1px rgba(0, 0, 0, 0.05)',
			},
		},
	},
	variants: {
		display: [
			'children',
			'default',
			'children-first',
			'children-last',
			'children-odd',
			'children-even',
			'children-not-first',
			'children-not-last',
			'children-hover',
			'hover',
			'children-focus',
			'focus',
			'children-focus-within',
			'focus-within',
			'children-active',
			'active',
			'children-visited',
			'visited',
			'children-disabled',
			'disabled',
			'responsive',
		],
	},
	plugins: [require('tailwind-children')],
} satisfies Config;
