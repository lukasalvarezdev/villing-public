/// <reference types="vitest" />
/// <reference types="vite/client" />

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type UserConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default ({ mode }: UserConfig) => {
	// Load app-level env vars to node-level env vars.
	Object.assign(process.env, loadEnv(mode ?? 'test', process.cwd(), ''));

	return defineConfig({
		plugins: [react(), tsconfigPaths()],
		test: {
			watch: false,
			globals: true,
			environment: 'jsdom',
			setupFiles: ['./test/setup-test-env.ts', './test/setup.ts'],
			include: ['app/**/*.test.ts', 'app/**/*.test.tsx'],
		},
	});
};
