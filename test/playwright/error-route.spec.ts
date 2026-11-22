import { expect, test } from './fixtures'

/**
 * The error page (/error) is a top-level route, a sibling of "/" (#886).
 *
 * Under "/" it mounted AppShell, whose boot loads the workspace. An error on
 * /manual — whose tab uses the manual's sandbox database — then ran the
 * workspace boot against that database.
 */
test.describe('error route', () => {
  test('renders the error page without mounting the editor', async ({
    page,
  }) => {
    await page.goto('/error')

    await expect(
      page.locator('[data-testid="error-reset-workspace-button"]'),
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('[data-testid="app-shell"]')).toHaveCount(0)
    // The workspace boot's route phase would navigate to /<workspaceId>.
    await expect(page).toHaveURL(/\/error$/)
  })

  test('shows the Clear Local Cache text and button', async ({ page }) => {
    await page.goto('/error')

    const button = page.locator('[data-testid="error-reset-workspace-button"]')
    await expect(button).toHaveText('Clear Cache and Reload Cytoscape', {
      timeout: 30_000,
    })
    const message = page.getByTestId('error-clear-cache-message')
    await expect(message).toContainText(
      'Your local cache might contain outdated data and it can be the cause of this error.',
    )
    await expect(message).toContainText(
      'Please clear your local cache and restart the app using the button below.',
    )
    // The two sentences sit on separate lines.
    await expect(message.locator('br')).toHaveCount(1)
  })

  test('Clear Cache and Reload leaves the error page for a clean editor', async ({
    page,
  }) => {
    await page.goto('/error')
    await page.evaluate(() => {
      localStorage.setItem('cyweb-network-search', '{}')
      localStorage.setItem('another-app-on-this-origin', 'keep me')
    })
    await page
      .locator('[data-testid="error-reset-workspace-button"]')
      .click({ timeout: 30_000 })

    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({
      timeout: 30_000,
    })
    await expect(page).not.toHaveURL(/\/error$/)
    // The same clear as Help › Developer › Clear Local Cache.
    const storage = await page.evaluate(() => ({
      search: localStorage.getItem('cyweb-network-search'),
      foreign: localStorage.getItem('another-app-on-this-origin'),
    }))
    expect(storage).toEqual({ search: null, foreign: 'keep me' })
  })
})
