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
			name: 'webkit',
			use: { ...devices['Desktop Safari'] }
		}
	],
	webServer: {
		command: 'npm run dev -- --no-open',
		url: 'http://localhost:5500',
		reuseExistingServer: true,
		timeout: 300000
	}
});


