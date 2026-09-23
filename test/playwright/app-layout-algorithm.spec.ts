import { expect, test } from './fixtures'
import { gotoAndSeedNetwork } from './fixtures'

// The 'layout-algorithm' resource slot (#734). The federated fixture remote
// (test/fixtures/remote-app/, served on :4191) registers "Fixture Row Layout"
// in mount(). The host adapts it into its own layout engine, so this spec
// asserts the four places that adaptation must surface:
//   - the Layout menu, in the app block between the core algorithms and
//     "Layout Tools";
//   - the Layout Settings dialog, with the `spacing` parameter editable;
//   - the public Layout API (`getAvailableLayouts` / `applyLayout` by the
//     qualified name `testRemoteApp::fixture-layout`);
//   - removal when the app is disabled.

const FIXTURE_MANIFEST_URL = 'http://localhost:4191/manifest.json'
const APP_ID = 'testRemoteApp'
const QUALIFIED_NAME = `${APP_ID}::fixture-layout`
const MENU_ROW = `layout-menu-item-${APP_ID}-fixture-layout`

type PositionRecord = Record<string, [number, number, number?]>

/** The current network's id and node positions, through window.CyWebApi. */
const readPositions = async (
  page: import('@playwright/test').Page,
): Promise<{ networkId: string; positions: PositionRecord }> =>
  page.evaluate(() => {
    const api = (window as any).CyWebApi
    const networkId: string =
      api.workspace.getWorkspaceInfo().data.currentNetworkId
    const positions = api.viewport.getNodePositions(networkId)
    return { networkId, positions: positions.data.positions }
  })

const installFixtureApp = async (
  page: import('@playwright/test').Page,
): Promise<void> => {
  await page.locator('[data-testid="toolbar-apps-menu-menu-button"]').click()
  await page.getByRole('menuitem', { name: 'Manage Apps...' }).click()
  await expect(
    page.locator('[data-testid="app-settings-dialog"]'),
  ).toBeVisible()
  await page.getByTestId('app-settings-advanced-button').click()
  await page.getByLabel('Custom manifest URL').fill(FIXTURE_MANIFEST_URL)
  await page.getByRole('button', { name: 'Apply' }).click()
  const toggle = page.locator(`[data-testid="app-toggle-${APP_ID}"]`)
  await expect(toggle).toBeVisible({ timeout: 15_000 })
  await toggle.click()
  // mount() ran: the remote rendered its marker.
  await expect(page.locator('[data-testid="remote-app-marker"]')).toBeVisible({
    timeout: 15_000,
  })
  await page.getByTestId('app-settings-dialog-close-button').click()
}

test.describe('app-registered layout algorithm', () => {
  test('is listed by the Layout API, runs by qualified name, and appears in the menu block', async ({
    page,
  }) => {
    await gotoAndSeedNetwork(page)
    await installFixtureApp(page)

    // ── Layout API: listed with appId, runnable by qualified name ──────
    const listed = await page.evaluate(() => {
      const api = (window as any).CyWebApi
      return api.layout.getAvailableLayouts().data.layouts
    })
    expect(listed).toContainEqual(
      expect.objectContaining({
        engineName: APP_ID,
        algorithmName: QUALIFIED_NAME,
        displayName: 'Fixture Row Layout',
        type: 'geometric',
        appId: APP_ID,
      }),
    )

    const before = await readPositions(page)
    const applied = await page.evaluate(
      async ({ networkId, algorithmName }) => {
        const api = (window as any).CyWebApi
        return api.layout.applyLayout(networkId, { algorithmName })
      },
      { networkId: before.networkId, algorithmName: QUALIFIED_NAME },
    )
    expect(applied.success).toBe(true)

    // The fixture puts the two nodes on one row, 60 apart (its default).
    const afterApi = await readPositions(page)
    const ids = Object.keys(afterApi.positions).sort()
    expect(ids).toHaveLength(2)
    const [p0, p1] = ids.map((id) => afterApi.positions[id])
    expect(p0[1]).toBeCloseTo(p1[1], 5)
    expect(Math.abs(p0[0] - p1[0])).toBeCloseTo(60, 5)

    // ── Layout menu: app block after the core rows, before Layout Tools ──
    await page
      .locator('[data-testid="toolbar-layout-menu-menu-button"]')
      .click()
    const row = page.getByTestId(MENU_ROW)
    await expect(row).toBeVisible()
    await expect(row).toHaveText('Fixture Row Layout')

    const order = await page.evaluate(
      ({ rowId }) => {
        const rows = Array.from(
          document.querySelectorAll('[data-testid^="layout-menu-"]'),
        ).map((el) => el.getAttribute('data-testid') ?? '')
        const appIndex = rows.indexOf(rowId)
        const toolsIndex = rows.indexOf('layout-menu-layout-tools')
        const lastCoreIndex = rows.reduce(
          (last, id, index) =>
            id.startsWith('layout-menu-item-') && id !== rowId ? index : last,
          -1,
        )
        return { appIndex, toolsIndex, lastCoreIndex }
      },
      { rowId: MENU_ROW },
    )
    expect(order.appIndex).toBeGreaterThan(order.lastCoreIndex)
    expect(order.toolsIndex).toBe(order.appIndex + 1)

    // Clicking the row runs the layout through the host path (undo entry,
    // running flag, fit). Move the nodes apart first so the click has a
    // visible effect to assert on.
    await page.keyboard.press('Escape')
    const scattered = await page.evaluate(
      ({ networkId, nodeIds }) => {
        const api = (window as any).CyWebApi
        return api.viewport.updateNodePositions(networkId, {
          [nodeIds[0]]: [0, 0],
          [nodeIds[1]]: [500, 500],
        })
      },
      { networkId: before.networkId, nodeIds: ids },
    )
    expect(scattered.success).toBe(true)
    await page
      .locator('[data-testid="toolbar-layout-menu-menu-button"]')
      .click()
    await page.getByTestId(MENU_ROW).click()
    await expect
      .poll(async () => {
        const { positions } = await readPositions(page)
        const [q0, q1] = Object.keys(positions)
          .sort()
          .map((id) => positions[id])
        return (
          Math.abs(q0[1] - q1[1]) < 1e-6 &&
          Math.abs(Math.abs(q0[0] - q1[0]) - 60) < 1e-6
        )
      })
      .toBe(true)

    // ── Layout Settings: listed, `spacing` editable, can become default ──
    await page
      .locator('[data-testid="toolbar-layout-menu-menu-button"]')
      .click()
    await page.getByTestId('layout-menu-settings').click()
    const dialog = page.getByTestId('layout-option-dialog')
    await expect(dialog).toBeVisible()
    // Not getByRole('combobox'): a dropDown parameter is a combobox too.
    await dialog.getByTestId('layout-selector-combobox').click()
    await page.getByRole('option', { name: 'Fixture Row Layout' }).click()

    // The parameters render through the shared ParameterForm: the "Spacing"
    // group is a fieldset with a legend, its field is keyed by displayName.
    const group = dialog.getByTestId('layout-parameter-group-Spacing')
    await expect(group).toBeVisible()
    // .first(): an outlined MUI TextField carries its own <legend>.
    await expect(group.locator('legend').first()).toHaveText('Spacing')
    const spacingInput = group.getByTestId(
      'layout-parameter-field-Node Spacing',
    )
    await expect(spacingInput).toHaveValue('60')
    await expect(
      dialog.getByText('Node Spacing', { exact: true }),
    ).toBeVisible()

    // Edit the parameter, apply from the dialog, and check the new spacing.
    await spacingInput.fill('120')
    await dialog.getByTestId('layout-option-dialog-apply-button').click()
    await expect
      .poll(async () => {
        const { positions } = await readPositions(page)
        const [q0, q1] = Object.keys(positions)
          .sort()
          .map((id) => positions[id])
        return Math.abs(Math.abs(q0[0] - q1[0]) - 120) < 1e-6
      })
      .toBe(true)
    // ... and a checkBox parameter flips the order (the fixture reverses).
    const reverse = dialog.getByTestId('layout-parameter-field-Reverse')
    await reverse.click()
    await expect(reverse).toBeChecked()
    await dialog.getByTestId('layout-option-dialog-apply-button').click()
    await expect
      .poll(async () => {
        const { positions } = await readPositions(page)
        const [q0, q1] = Object.keys(positions)
          .sort()
          .map((id) => positions[id])
        return q0[0] - q1[0] // sorted ids: first node now sits to the right
      })
      .toBeCloseTo(120, 5)
    await reverse.click()
    await spacingInput.fill('60')

    const setDefault = dialog.getByTestId(
      'layout-option-dialog-set-default-checkbox',
    )
    await setDefault.click()
    // Once it is the default the box stays checked and locks (the dialog
    // offers no "unset"); the store resolved the app algorithm by name.
    await expect(setDefault).toBeChecked()
    await expect(setDefault).toBeDisabled()
    await dialog.getByTestId('layout-option-dialog-close-button').click()

    // Apply Default Layout now runs the app algorithm: scatter, apply, check.
    await page.evaluate(
      ({ networkId, nodeIds }) => {
        const api = (window as any).CyWebApi
        api.viewport.updateNodePositions(networkId, {
          [nodeIds[0]]: [0, 0],
          [nodeIds[1]]: [500, 500],
        })
      },
      { networkId: before.networkId, nodeIds: ids },
    )
    await page
      .locator('[data-testid="toolbar-layout-menu-menu-button"]')
      .click()
    await page.getByRole('menuitem', { name: 'Apply Default Layout' }).click()
    await expect
      .poll(async () => {
        const { positions } = await readPositions(page)
        const [q0, q1] = Object.keys(positions)
          .sort()
          .map((id) => positions[id])
        return (
          Math.abs(q0[1] - q1[1]) < 1e-6 &&
          Math.abs(Math.abs(q0[0] - q1[0]) - 60) < 1e-6
        )
      })
      .toBe(true)

    // ── Disabling the app removes the row ─────────────────────────────
    await page.locator('[data-testid="toolbar-apps-menu-menu-button"]').click()
    await page.getByRole('menuitem', { name: 'Manage Apps...' }).click()
    await page.locator(`[data-testid="app-toggle-${APP_ID}"]`).click()
    await page.getByTestId('app-settings-dialog-close-button').click()

    await page
      .locator('[data-testid="toolbar-layout-menu-menu-button"]')
      .click()
    await expect(page.getByTestId(MENU_ROW)).toHaveCount(0)
    await expect(page.getByTestId('layout-menu-layout-tools')).toBeVisible()
    const listedAfter = await page.evaluate(() => {
      const api = (window as any).CyWebApi
      return api.layout
        .getAvailableLayouts()
        .data.layouts.map((l: { algorithmName: string }) => l.algorithmName)
    })
    expect(listedAfter).not.toContain(QUALIFIED_NAME)
  })
})
