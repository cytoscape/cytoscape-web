import { test as base, expect } from '@playwright/test'

type Fixtures = {
  /**
   * When false (the default), first-run onboarding is suppressed by seeding
   * `cyweb.onboarding` in localStorage so the welcome modal never blocks a
   * test. Opt in with `test.use({ onboarding: true })` to exercise first-run.
   */
  onboarding: boolean
}

export const test = base.extend<Fixtures>({
  onboarding: [false, { option: true }],
  page: async ({ page, onboarding }, use) => {
    if (!onboarding) {
      await page.addInitScript(() => {
        try {
          window.localStorage.setItem(
            'cyweb.onboarding',
            JSON.stringify({
              hasSeenWelcome: true,
              completedTours: [],
              dismissedHints: [],
            }),
          )
        } catch {
          // Ignore — onboarding will simply show; tests that care opt in.
        }
      })
    }
    await use(page)
  },
})

export { expect }
