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

  test('Reset Workspace leaves the error page for the editor', async ({
    page,
  }) => {
    await page.goto('/error')
    await page
      .locator('[data-testid="error-reset-workspace-button"]')
      .click({ timeout: 30_000 })

    await expect(page.locator('[data-testid="app-shell"]')).toBeVisible({
      timeout: 30_000,
    })
    await expect(page).not.toHaveURL(/\/error$/)
  })
})
