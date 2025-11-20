import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './test/playwright',
	fullyParallel: true,
	retries: 0,
	use: {
		baseURL: 'http://localhost:5500',
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
		url: 'http://localhost:5500',
		reuseExistingServer: true,
		timeout: 120000
	}
});


