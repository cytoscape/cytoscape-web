import { defineConfig, devices } from '@playwright/test';

// Base-path URL derivation is shared with the tests (test/playwright/fixtures.ts)
// via this module so the webServer readiness URL and `page.goto` targets can't
// drift. The app is served under `urlBaseName` (e.g. "/cytoscape/"), not root.
import { APP_URL, ORIGIN } from './test/playwright/support/appUrl';

export default defineConfig({
	testDir: './test/playwright',
	fullyParallel: true,
	retries: 0,
	use: {
		baseURL: ORIGIN,
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
	webServer: {
		command: 'npm run dev',
		url: APP_URL,
		reuseExistingServer: true,
		timeout: 240000
	}
});


