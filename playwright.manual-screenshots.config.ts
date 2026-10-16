import { defineConfig, devices } from '@playwright/test'

/**
 * Captures the in-app manual's screenshots
 * (test/manual-screenshots/capture.spec.ts). Run through
 * `node scripts/capture-manual-screenshots.mjs [id…]`, not with the e2e suite.
 *
 * Captures run against a production build on port 5502, so they never depend
 * on, or disturb, a dev server on 5500. MANUAL_SCREENSHOT_URL points them at
 * a server that is already running instead.
 *
 * Commit images captured on Linux (the "Manual Screenshots" workflow):
 * fonts render differently on macOS, and mixing the two changes every image.
 */
const externalUrl = process.env.MANUAL_SCREENSHOT_URL || undefined
const port = 5502

export default defineConfig({
  testDir: './test/manual-screenshots',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 120_000,
  use: {
    baseURL: externalUrl ?? `http://localhost:${port}`,
    headless: true,
    ...devices['Desktop Chrome'],
  },
  webServer: externalUrl
    ? []
    : [
        {
          command: `npm run build && npx vite preview --port ${port} --strictPort`,
          url: `http://localhost:${port}`,
          reuseExistingServer: false,
          timeout: 300_000,
        },
      ],
})
