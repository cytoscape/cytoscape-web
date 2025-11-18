// spec: test/playwright/comprehensive-test-plan.md
// seed: tests/seed.spec.ts

import { test, expect } from './fixtures'

test.describe('Application Initialization and UI Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
  })

  test('1.1 Initial Page Load', async ({ page }) => {
    // 1. Navigate to http://localhost:5500/
    // Already done in beforeEach

    // 2. Wait for DOM content to load
    await page.waitForLoadState('domcontentloaded')

    // 3. Accept cookie consent banner if present
    const acceptCookiesButton = page.getByRole('button', {
      name: /accept cookies/i,
    })
    if (await acceptCookiesButton.isVisible().catch(() => false)) {
      await acceptCookiesButton.click()
    }

    // Expected Results:
    // - Application loads without fatal errors
    // - Page title displays "Cytoscape Web"
    await expect(page).toHaveTitle('Cytoscape Web')

    // - Main application shell is visible
    await expect(page.getByTestId('workspace-editor')).toBeVisible()

    // - URL redirects to /:workspaceId/networks/ format
    await expect(page).toHaveURL(/\/[a-f0-9-]+\/networks/)

    // - No console errors (except expected warnings about disabled buttons)
    // Note: Console errors are checked via Playwright's console event handling
  })

  test('1.2 Main UI Components Visibility', async ({ page }) => {
    // 1. After initial load, verify all main UI components are present

    // Expected Results:
    // - Top Toolbar: Contains menu buttons (Data, Edit, Layout, Analysis, Tools, Apps, Help, License)
    await expect(page.getByTestId('toolbar-data-menu-button')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Edit' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Layout' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Analysis' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tools' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Apps' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Help' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'License' })).toBeVisible()

    // - Search Bar: Visible with placeholder "Search current network"
    const searchInput = page.getByPlaceholder('Search current network')
    await expect(searchInput).toBeVisible()

    // - Login Button: "Click to login" button visible in top right
    await expect(
      page.getByRole('button', { name: /click to login/i }),
    ).toBeVisible()

    // - Left Panel: Workspace panel with WORKSPACE and STYLE tabs visible
    await expect(page.getByRole('tab', { name: 'WORKSPACE' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'STYLE' })).toBeVisible()

    // - Center Panel: Network view area (initially shows "No network selected")
    // Check for workspace editor which contains the network view
    await expect(page.getByTestId('workspace-editor')).toBeVisible()

    // - Bottom Panel: Table browser with Nodes, Edges, and Network tabs
    await expect(page.getByRole('tab', { name: 'Nodes' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Edges' })).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Network' })).toBeVisible()

    // - Workspace Info: Displays "Untitled Workspace" and creation timestamp
    await expect(
      page.getByRole('heading', { name: /untitled workspace/i }),
    ).toBeVisible()
  })

  test('1.3 Cookie Consent Banner', async ({ page, context }) => {
    // 1. Navigate to application
    // Already done in beforeEach

    // 2. Observe cookie consent banner
    // 3. Click "Accept cookies" button
    const acceptButton = page.getByRole('button', { name: /accept cookies/i })
    const declineButton = page.getByRole('button', { name: /decline cookies/i })

    if (await acceptButton.isVisible().catch(() => false)) {
      // Expected Results:
      // - Cookie consent banner appears on first visit
      await expect(acceptButton).toBeVisible()
      await expect(declineButton).toBeVisible()

      // - Banner contains "Learn more" link to privacy policy
      const learnMoreLink = page.getByRole('link', { name: /learn more/i })
      await expect(learnMoreLink).toBeVisible()

      // - Clicking "Accept" dismisses banner
      await acceptButton.click()
      await expect(acceptButton).not.toBeVisible({ timeout: 2000 })

      // 4. Refresh page
      await page.reload()
      await page.waitForLoadState('domcontentloaded')

      // - Banner does not reappear after acceptance (cookie persisted)
      await expect(acceptButton).not.toBeVisible({ timeout: 2000 })
    }
  })

  test('1.3 Cookie Consent Banner - Decline', async ({ page }) => {
    // Negative Test: Click "Decline cookies" and verify banner behavior
    const declineButton = page.getByRole('button', { name: /decline cookies/i })

    if (await declineButton.isVisible().catch(() => false)) {
      // - Clicking "Decline" also dismisses banner
      await declineButton.click()
      await expect(declineButton).not.toBeVisible({ timeout: 2000 })
    }
  })
})
