import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Node server: SQLite file, uploaded media and the hourly forecast job need a long-running process.
			adapter: adapter(),
			// Reports and SMS webhooks are posted from other origins (the phone simulator, SMS gateways).
			csrf: { trustedOrigins: ['*'] }
		})
	]
});
