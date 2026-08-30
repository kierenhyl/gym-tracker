import { execSync } from 'node:child_process';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Stamp the build into the bundle so the running app can say which commit it
// came from. Working out what was actually live previously meant reading the
// Vercel dashboard and guessing; this makes it a glance.
//
// On Vercel these come from the build environment, so they cannot drift from
// what was deployed. Locally we fall back to git, then to 'dev'.
function localGit(args) {
	try {
		return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] })
			.toString()
			.trim();
	} catch {
		return '';
	}
}

const build = {
	sha: process.env.VERCEL_GIT_COMMIT_SHA || localGit('rev-parse HEAD') || '',
	ref: process.env.VERCEL_GIT_COMMIT_REF || localGit('rev-parse --abbrev-ref HEAD') || 'dev',
	at: new Date().toISOString()
};

export default defineConfig({
	define: { __BUILD__: JSON.stringify(build) },
	plugins: [tailwindcss(), sveltekit()]
});
