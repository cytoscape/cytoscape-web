import type { Page, Route } from '@playwright/test'

import { expect, gotoAndWaitReady, test } from './fixtures'

// "New filter from description" end to end: the LLM settings of the options
// dialog, the popover, the request the browser sends, and the filter the
// answer becomes. The LLM endpoint is faked with page.route, so nothing
// leaves the machine. Unit tests cover the prompt, the answer checks and the
// repairs. See docs/specifications/LLM_FILTER_GENERATION_SPEC.md.

type ApiWindow = { CyWebApi?: any }

// A custom endpoint on a reserved test domain: never a real host
const ENDPOINT = 'https://llm.example.test/v1'
const MODEL = 'e2e-model'

const seedNetwork = async (page: Page): Promise<string> => {
  const networkId = await page.evaluate(() => {
    const api = (window as unknown as ApiWindow).CyWebApi
    api.network.createNetworkFromEdgeList({
      name: 'Filter generation network',
      edgeList: [
        ['alpha', 'beta'],
        ['beta', 'gamma'],
        ['gamma', 'delta'],
      ],
      addToWorkspace: true,
    })
    return api.workspace.getCurrentNetworkId().data.networkId as string
  })
  expect(networkId).toBeTruthy()
  return networkId
}

const selectedNodeNames = (page: Page, networkId: string) =>
  page.evaluate((id) => {
    const api = (window as unknown as ApiWindow).CyWebApi
    const nodeIds: string[] = api.selection.getSelection(id).data.selectedNodes
    const rows: { id: string; name: string }[] = api.table.getTable(id, 'node')
      .data.rows
    return rows
      .filter((row) => nodeIds.includes(String(row.id)))
      .map((row) => row.name)
      .sort()
  }, networkId)

const hiddenNodeCount = (page: Page, networkId: string) =>
  page.evaluate((id) => {
    const api = (window as unknown as ApiWindow).CyWebApi
    const result = api.visualStyle.getBypasses(id, 'nodeVisibility')
    return Object.keys(result.data.bypasses).length
  }, networkId)

// "name contains ta": beta and delta
const answer = (mode: 'select' | 'hide'): string =>
  JSON.stringify({
    outcome: 'filter',
    mode,
    name: mode === 'select' ? 'Names with ta' : 'Hide names with ta',
    explanation: `${mode === 'select' ? 'Selects' : 'Hides'} nodes whose name contains "ta".`,
    reason: null,
    transformers: [
      {
        id: 'org.cytoscape.CompositeFilter',
        parameters: { type: 'ALL' },
        transformers: [
          {
            id: 'org.cytoscape.ColumnFilter',
            parameters: {
              columnName: 'name',
              type: 'nodes',
              predicate: 'CONTAINS',
              criterion: 'ta',
              caseSensitive: false,
              anyMatch: true,
            },
          },
        ],
      },
    ],
  })

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, GET, OPTIONS',
  // Authorization is never covered by "*"
  'access-control-allow-headers': 'authorization, content-type, *',
}

/**
 * Fake the chat completions endpoint: every request gets `content` as the
 * model's answer. Returns the request bodies it received.
 */
const fakeEndpoint = async (
  page: Page,
  content: string,
): Promise<Record<string, any>[]> => {
  const bodies: Record<string, any>[] = []
  await page.route(`${ENDPOINT}/**`, async (route: Route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS_HEADERS })
      return
    }
    bodies.push(route.request().postDataJSON())
    await route.fulfill({
      status: 200,
      headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
      body: JSON.stringify({
        id: 'chatcmpl-e2e',
        object: 'chat.completion',
        created: 0,
        model: MODEL,
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content },
            finish_reason: 'stop',
          },
        ],
      }),
    })
  })
  return bodies
}

const configureCustomEndpoint = async (page: Page): Promise<void> => {
  await page
    .locator('[data-testid="toolbar-analysis-menu-menu-button"]')
    .click()
  await page.getByText('LLM Query Options...').click()
  await expect(
    page.locator('[data-testid="llm-query-options-dialog"]'),
  ).toBeVisible()
  await page
    .locator('[data-testid="llm-query-options-provider-select"]')
    .getByRole('combobox')
    .click()
  await page
    .locator('[data-testid="llm-query-options-provider-custom"]')
    .click()
  await page
    .locator('[data-testid="llm-query-options-base-url-input"]')
    .getByRole('textbox')
    .fill(ENDPOINT)
  const model = page.locator('[data-testid="llm-query-options-model-input"]')
  await model.fill(MODEL)
  // Leave the field so the suggestion popup closes, as a user would
  await model.press('Tab')
  await page.locator('[data-testid="llm-query-options-confirm-button"]').click()
  await expect(
    page.locator('[data-testid="llm-query-options-dialog"]'),
  ).not.toBeVisible()
}

const openPopover = async (page: Page): Promise<void> => {
  await page.locator('[data-testid="network-browser-panel-filter-tab"]').click()
  await expect(page.locator('[data-testid="filter-tab"]')).toBeVisible()
  await page.locator('[data-testid="filter-options-button"]').click()
  await page.locator('[data-testid="filter-describe-menu-item"]').click()
  // The menu fades out over the page while already aria-hidden
  await expect(page.getByRole('menu', { includeHidden: true })).toHaveCount(0)
  await expect(
    page.locator('[data-testid="filter-describe-popover"]'),
  ).toBeVisible()
}

const shownFilterName = (page: Page) =>
  page
    .locator('[data-testid="filter-select"]')
    .locator('xpath=..')
    .getByRole('combobox')

test.describe('New filter from description', () => {
  test('builds and applies a select filter from a description', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)
    const networkId = await seedNetwork(page)
    const bodies = await fakeEndpoint(page, answer('select'))
    await configureCustomEndpoint(page)
    await openPopover(page)

    await expect(
      page.locator('[data-testid="filter-describe-disclosure"]'),
    ).toContainText('Sent to llm.example.test:')
    await page
      .locator('[data-testid="filter-describe-input"]')
      .fill('select nodes whose name contains ta')
    await page.locator('[data-testid="filter-describe-generate"]').click()

    await expect(
      page.locator('[data-testid="filter-describe-popover"]'),
    ).not.toBeVisible()
    await expect(shownFilterName(page)).toHaveText('Names with ta')
    // "Apply when filter changes" is on for a small network
    await expect
      .poll(() => selectedNodeNames(page, networkId))
      .toEqual(['beta', 'delta'])

    expect(bodies).toHaveLength(1)
    const [body] = bodies
    expect(body.model).toBe(MODEL)
    expect(body.response_format).toMatchObject({
      type: 'json_schema',
      json_schema: { name: 'filter_answer', strict: true },
    })
    expect(body.messages.map((m: { role: string }) => m.role)).toEqual([
      'system',
      'user',
      'user',
    ])
    expect(body.messages[1].content).toContain('"name":"name"')
    expect(body.messages[2].content).toBe(
      'Request:\nselect nodes whose name contains ta',
    )
  })

  test('hides what a "hide" description names', async ({ page }) => {
    await gotoAndWaitReady(page)
    const networkId = await seedNetwork(page)
    await fakeEndpoint(page, answer('hide'))
    await configureCustomEndpoint(page)
    await openPopover(page)

    await page
      .locator('[data-testid="filter-describe-input"]')
      .fill('hide nodes whose name contains ta')
    await page.locator('[data-testid="filter-describe-generate"]').click()

    await expect(shownFilterName(page)).toHaveText('Hide names with ta')
    // Show mode, keeping alpha and gamma: beta and delta are hidden
    await expect.poll(() => hiddenNodeCount(page, networkId)).toBe(2)
    await expect.poll(() => selectedNodeNames(page, networkId)).toEqual([])
  })

  test('reports a request filters cannot express and stays open', async ({
    page,
  }) => {
    await gotoAndWaitReady(page)
    await seedNetwork(page)
    await fakeEndpoint(
      page,
      JSON.stringify({
        outcome: 'unsupported',
        mode: null,
        name: null,
        explanation: null,
        reason: 'Filters cannot rank nodes.',
        transformers: null,
      }),
    )
    await configureCustomEndpoint(page)
    await openPopover(page)

    await page
      .locator('[data-testid="filter-describe-input"]')
      .fill('select the top 2 nodes')
    await page.locator('[data-testid="filter-describe-generate"]').click()

    await expect(
      page.locator('[data-testid="filter-describe-status"]'),
    ).toHaveText(
      "This can't be expressed as a filter: Filters cannot rank nodes.",
    )
    await expect(
      page.locator('[data-testid="filter-describe-input"]'),
    ).toHaveValue('select the top 2 nodes')
  })

  test('closes by its buttons only', async ({ page }) => {
    await gotoAndWaitReady(page)
    await seedNetwork(page)
    await openPopover(page)
    const popover = page.locator('[data-testid="filter-describe-popover"]')

    // No LLM is set up yet
    await expect(
      page.locator('[data-testid="filter-describe-status"]'),
    ).toHaveText('Set up an LLM in Analysis › LLM Query Options.')

    await page.keyboard.press('Escape')
    await expect(popover).toBeVisible()
    await page.mouse.click(4, 4)
    await expect(popover).toBeVisible()

    await page.locator('[data-testid="filter-describe-cancel"]').click()
    await expect(popover).not.toBeVisible()
  })
})
