import { expect, gotoAndSeedNetwork, test } from './fixtures'

/**
 * A lazily loaded dialog whose code fails to load must not take the workspace
 * down (#785 review). That happens on a stale tab after a redeploy, when the
 * chunk hash it asks for no longer exists, or when the connection drops
 * before the first open. Without a local boundary the failure reached the
 * app-level ErrorBoundary, which replaced the whole workspace with its error
 * page.
 */
test.describe('lazy dialog load failure', () => {
  test('Export Network to Image reports the failure and keeps the workspace', async ({
    page,
  }) => {
    // The built chunk (`ExportImage-<hash>.js`) and the dev server's module
    // (`ExportImage.tsx`) both match.
    await page.route(/\/ExportImage[-.][^/]*$/, (route) => route.abort())
    await gotoAndSeedNetwork(page)

    await page.getByTestId('toolbar-data-menu-menu-button').click()
    await page.getByRole('menuitem', { name: 'Export' }).click()
    await page.getByText('Network to Image...', { exact: true }).click()

    await expect(
      page.getByText(
        'Could not open Export Network to Image. Reload the page and try again.',
      ),
    ).toBeVisible()
    await expect(page.getByTestId('error-boundary')).toHaveCount(0)
    await expect(
      page.getByTestId('toolbar-data-menu-menu-button'),
    ).toBeVisible()
    await expect(
      page.getByTestId('export-network-to-image-dialog'),
    ).toHaveCount(0)
  })
})
