import { defineConfig, devices } from '@playwright/test';

// The suite runs against a production build by default.
//
// The dev server hands the app to the browser as thousands of unbundled ES
// modules, transformed on demand. With fullyParallel workers (cpus/2, so 5 on a
// 10-core machine) every test cold-boots the whole module graph at once through
// one Vite process, and the app can take longer than the first assertion's
// timeout to appear. Every local failure observed that way was the same one --
// `app-shell` not visible -- with a screenshot showing the app booted fine, just
// late. A built bundle turns that into a handful of hashed chunks per page load,
// and has the side benefit of exercising what actually ships (minified, with
// console.* stripped).
//
// Set E2E_DEV=1 to run against the dev server instead, for HMR and readable
// stack traces while debugging a spec.
const useDevServer = process.env.E2E_DEV === '1';

export default defineConfig({
	testDir: './test/playwright',
	fullyParallel: true,
	// Local cap only; CI keeps Playwright's default so it adapts to the runner.
	//
	// Every test boots the whole app, and each boot is CPU-hungry (Chromium plus
	// the renderer). The default cpus/2 -- 5 on a 10-core machine -- oversubscribes
	// badly: measured, 5 workers took 3m06s with 3-10 unstable tests, while 3
	// workers took 55s with none. Fewer workers is both faster and steadier here.
	workers: process.env.CI ? undefined : 3,
	// Above Playwright's 30s default, which a single slow boot can consume on its
	// own now that the shared helper allows 30s for one. Specs that import a file
	// and wait for a network to register need room beyond that; this is a ceiling
	// for stuck tests, not a budget anything normally approaches.
	timeout: 60000,
	// One local retry so a single slow boot does not fail the whole run; CI keeps
	// two, where the machine is slower and a rerun is cheaper than a red build.
	retries: process.env.CI ? 2 : 1,
	use: {
		baseURL: 'http://localhost:5500',
		headless: true,
		trace: 'on-first-retry',
		video: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		},
		{
			name: 'firefox',
			use: { ...devices['Desktop Firefox'] }
		},
		{
			name: 'webkit',
			use: { ...devices['Desktop Safari'] }
		}
	],
	webServer: [
		{
			// `vite preview` serves build.outDir at the configured base ('/'), so the
			// baseURL above is unchanged either way.
			command: useDevServer
				? 'npm run dev -- --no-open'
				: 'npm run build && npx vite preview --port 5500 --strictPort',
			url: 'http://localhost:5500',
			// Only reuse a server already on 5500 in dev mode, where that is the point.
			// In build mode reuse would silently hand the suite whatever happens to be
			// listening -- a stale dev server from an earlier run, say -- so the run
			// would quietly not test the build at all. Failing on the busy port is the
			// clearer outcome.
			reuseExistingServer: useDevServer,
			// Generous enough to cover a cold production build before serving.
			timeout: 300000
		},
		{
			// Tier-3.2 fixture remote: builds + serves a separate Module
			// Federation bundle that the host loads via a custom manifest URL.
			command: 'node test/fixtures/remote-app/serve.mjs',
			url: 'http://localhost:4191/manifest.json',
			reuseExistingServer: true,
			timeout: 120000
		}
	]
});


