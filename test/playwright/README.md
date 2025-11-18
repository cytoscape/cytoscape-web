# Cytoscape Web - Playwright Test Suite

This directory contains comprehensive Playwright end-to-end tests for Cytoscape Web, generated from the test plan in `comprehensive-test-plan.md`.

## Generating and designing tests

- playwright prompts rae in docs/prompts
- use docs/prompts/playwright-test-planner, docs/props/playwright-test-generator to plan and generate the tests
- use docs/prompts/playwright-test-healer to fix the tests

## Component Testability: Using `data-id` Attributes

To make components in `src/` easier to select and interact with in Playwright tests, UI elements are consistently annotated with `data-id` attributes. This approach allows tests to reliably locate elements regardless of DOM structure or styling changes.

### Guidelines

- **Every interactive or dynamic element (buttons, panels, dialogs, form fields, menus, etc.) in the app should be given a unique `data-id`.**
- The `data-id` should be stable and descriptive, reflecting the element's purpose or function.
- Use the following pattern in your React components:

  ```jsx
  <button data-id="main-save-button">Save</button>
  <input data-id="network-search-input" />
  <div data-id="sidebar-panel" />
  ```

- Avoid using dynamically generated or index-based `data-id` values unless there are no alternatives.

### Benefits for Playwright Testing

- **Robust targeting:** Playwright selectors like `[data-id="..."]` are not affected by class name or structural changes.
- **Readability:** Test code stays more readable and maintainable because selectors reflect UI intent.
- **Reduced flakiness:** Tests remain stable even as underlying implementation details or CSS evolve.

### Example Playwright Selector

```ts
await page.getByTestId('main-save-button').click()
// or, using CSS selector:
await page.locator('[data-id="main-save-button"]').click()
```

> **Note:** If you add new UI elements, especially those with user interactions, always include a descriptive `data-id` for seamless E2E testing.

## Test Files

### Core Functionality Tests

- **`application-initialization.spec.ts`** - Tests for app boot, UI structure, and cookie consent
- **`data-menu-operations.spec.ts`** - Tests for Data menu including NDEx, import, export, and download operations
- **`edit-menu-operations.spec.ts`** - Tests for Edit menu including delete, undo, and redo operations
- **`layout-menu-operations.spec.ts`** - Tests for Layout menu and layout algorithm application
- **`panel-management.spec.ts`** - Tests for panel toggling, resizing, and tab navigation
- **`search-functionality.spec.ts`** - Tests for search bar and search operations
- **`table-browser-operations.spec.ts`** - Tests for table browser, column management, and data operations
- **`url-routing.spec.ts`** - Tests for URL routing, redirects, and direct navigation
- **`help-documentation.spec.ts`** - Tests for Help and License menus
- **`authentication.spec.ts`** - Tests for login button and authentication flow
- **`error-handling.spec.ts`** - Tests for error handling and graceful failure scenarios

## Running Tests

### Prerequisites

1. Ensure the development server is running:

   ```bash
   npm run dev
   ```

2. The server should be available at `http://localhost:5500`

### Run All Tests

```bash
npx playwright test test/playwright
```

### Run Specific Test File

```bash
npx playwright test test/playwright/application-initialization.spec.ts
```

### Run Tests in UI Mode

```bash
npx playwright test test/playwright --ui
```

### Run Tests in Debug Mode

```bash
npx playwright test test/playwright --debug
```

## Test Structure

Each test file follows this structure:

```typescript
import { test, expect } from './fixtures'

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Common setup
  })

  test('Test Scenario Name', async ({ page }) => {
    // Test steps with comments from test plan
  })
})
```

## Test Plan Reference

All tests are based on scenarios defined in `comprehensive-test-plan.md`. Each test includes:

- Step-by-step instructions from the test plan
- Expected results verification
- Comments referencing the original test plan section

## Test Data

Test fixtures are available in `test/fixtures/`:

- Valid CX2 files: `test/fixtures/cx2/valid/`
- Invalid CX2 files: `test/fixtures/cx2/invalid/`
- Table files: `test/fixtures/tables/`
- NDEx networks: `test/fixtures/ndex/`

## Notes

- Tests assume fresh browser state unless otherwise specified
- Cookie consent is handled automatically in beforeEach hooks
- Some tests may require network connectivity for NDEx operations
- Authentication tests may require mock Keycloak setup for full functionality
- File upload tests may need adjustment based on file picker implementation

## Future Enhancements

Additional test scenarios that may require special setup:

- File import workflows with all supported formats
- Complete authentication flow with mock Keycloak
- Service apps integration testing
- Hierarchical/cell view features
- Visual regression testing
- Performance testing with large networks
- Cross-browser testing
