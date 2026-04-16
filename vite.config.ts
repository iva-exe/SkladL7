import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { writeFileSync } from 'fs';

const BUILD_ID = Date.now().toString();

export default defineConfig({
	plugins: [
		{
			name: 'generate-version',
			buildStart() {
				writeFileSync('static/version.txt', BUILD_ID);
			},
		},
		sveltekit(),
	],
	define: {
		__BUILD_ID__: JSON.stringify(BUILD_ID),
	},
});
