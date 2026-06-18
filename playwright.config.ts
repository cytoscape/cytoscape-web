import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './test/playwright',
	fullyParallel: true,
	retries: 0,
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
			command: 'npm run dev -- --no-open',
			url: 'http://localhost:5500',
			reuseExistingServer: true,
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


