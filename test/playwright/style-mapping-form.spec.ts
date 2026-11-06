import { expect, gotoAndSeedNetwork, test } from './fixtures'

test.describe('Style mapping form', () => {
  test('names each column option by its column, not its tooltip', async ({
    page,
  }) => {
    // Regression: a Tooltip on each option's text set aria-label to
    // "Data type: <type>", so every option was announced as its data type.
    await gotoAndSeedNetwork(page)
    await page
      .locator('[data-testid="network-browser-panel-style-tab"]')
      .click()
    await page.locator('[data-testid="vizmapper-nodes-tab"]').click()
    // Rows have no test id: the Mapping box is the second box of the row
    // whose label is the property name.
    await page
      .locator(
        '[data-testid="vizmapper"] div:has(> :text-is("Fill Color")) > div',
      )
      .nth(1)
      .click()
    await page.locator('[data-testid="mapping-form-column-select"]').click()
    await expect(
      page.getByRole('option', { name: 'name', exact: true }),
    ).toBeVisible()
    await expect(page.getByRole('option', { name: /^Data type:/ })).toHaveCount(
      0,
    )
  })
})
