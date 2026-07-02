# Cytoscape Web - Playwright Test Suite

This directory contains comprehensive Playwright end-to-end tests for Cytoscape Web, generated from the test plan in `comprehensive-test-plan.md`.

## ⚠️ App Base Path (`urlBaseName`) — read before writing URLs

The app is **not** always served at the site root. The base path is defined by `urlBaseName` in `src/assets/config.json` (e.g. `/cytoscape/`) and can change per environment (different server / different root). It maps to webpack `output.publicPath` and the React Router basename, so **deep links only resolve under the base path** (e.g. `http://localhost:5500/cytoscape/<workspace>/networks/<id>`); requesting them at root 404s and the bundle scripts fail to load.

**Rule:** never hardcode the path. Derive it from config, e.g.:

```ts
import config from '../../src/assets/config.json'
const BASE_PATH = `/${String(config.urlBaseName ?? '/').replace(/^\/+|\/+$/g, '')}`
const appPath = (p: string) => `${BASE_PATH === '/' ? '' : BASE_PATH}/${p.replace(/^\/+/, '')}`
// await page.goto(appPath(`some/route`))
```

`playwright.config.ts` also derives its `webServer.url` readiness probe from `urlBaseName` for the same reason. See `hierarchy-subnetwork.spec.ts` for a working example.

## Test lanes: default (hermetic UI) vs. acceptance (live NDEx)

Tests are split into two lanes so the everyday run is fast and deterministic, while live-integration checks are opt-in:

| Lane                       | Contains                                                              | Default? | Command                                             |
| -------------------------- | -------------------------------------------------------------------- | -------- | --------------------------------------------------- |
| **Default (hermetic UI)**  | Basic UI / flows that need no external server (stubbed or local data) | ✅ yes    | `playwright test --grep-invert @ndex`               |
| **Acceptance (live NDEx)** | End-to-end tests that hit a real NDEx server                          | ❌ opt-in | `RUN_NDEX_E2E=1 playwright test --grep @ndex`        |

**How the split is enforced**

- Live-NDEx specs are **tagged `@ndex`** (Playwright `{ tag: '@ndex' }`). The default lane excludes them (`--grep-invert @ndex`); the acceptance lane selects them (`--grep @ndex`).
- They are **also** guarded at runtime with `test.skip(!process.env.RUN_NDEX_E2E, …)` — belt-and-suspenders, so even a direct run won't hit the network without the flag.
- **Rule:** any spec that touches a live external server MUST be **tagged `@ndex` and gated by `RUN_NDEX_E2E`**. Everything else stays in the default lane and MUST be hermetic — no external calls (stub them, or use local fixtures).

**npm scripts** (defined in `package.json`):

| Command                       | Runs                                                        |
| ----------------------------- | ----------------------------------------------------------- |
| `npm run test:e2e`            | Default (hermetic) lane — `playwright test --grep-invert @ndex` |
| `npm run test:e2e:acceptance` | Acceptance lane — `RUN_NDEX_E2E=1 playwright test --grep @ndex` |
| `npm run test:e2e:all`        | Everything (UI + live) — `RUN_NDEX_E2E=1 playwright test`    |

**Hermetic UI tests must boot the app without external servers.** On startup the app calls NDEx (Keycloak silent SSO + 3rd-party-cookie check + `v2/batch/network/summary`), Google Analytics, and probes a local Cytoscape Desktop (`127.0.0.1:1234`) — if these aren't neutralized, `keycloak.init()` fails and the shell shows an init error instead of rendering.

Use the shared **offline fixture** in [`fixtures.ts`](fixtures.ts): import `offlineTest` (which auto-stubs those boot calls) instead of `test`, and build URLs with the shared `appPath()`:

```ts
import { appPath, expect, offlineTest as test } from './fixtures'

test('…', async ({ page }) => {
  await page.goto(appPath('/')) // app boots with no external server
  // …
})
```

See [`app-smoke.spec.ts`](app-smoke.spec.ts) for a working example. (Under the hood the fixture stubs Keycloak → not-logged-in, the 3rd-party-cookie iframe, and NDEx summaries → `[]`, and blocks all other non-localhost traffic. Need finer control in one spec? Call `installOfflineAppRoutes(page)` directly.) You can also load networks from local fixtures under `test/fixtures/`.

## Live-NDEx acceptance tests (opt-in)

Some specs are **end-to-end acceptance tests that hit a real NDEx server** (the one in `src/assets/config.json` → `ndexBaseUrl`) rather than mocking it. Example: `hierarchy-subnetwork.spec.ts`, which loads a hierarchy network, clicks a subsystem, and verifies the subnetwork is fetched (via the CX2 / v3 interconnect API) and rendered.

Because they depend on an external server, they are **opt-in** (see [Test lanes](#test-lanes-default-hermetic-ui-vs-acceptance-live-ndex)):

- They are **tagged `@ndex`** and gated with `test.skip(!process.env.RUN_NDEX_E2E, …)` → excluded from the default lane and skipped unless `RUN_NDEX_E2E` is set.
- Run them explicitly:

  ```bash
  # the whole acceptance lane:
  RUN_NDEX_E2E=1 npx playwright test --grep @ndex
  # or one spec / one browser:
  RUN_NDEX_E2E=1 npx playwright test hierarchy-subnetwork.spec.ts --project=chromium
  ```

### Parameterizing for a different server / network

Network-specific identifiers live in `fixtures/*.data.ts` (e.g. `fixtures/hierarchySubnetwork.data.ts`), **not** inline in the spec, so you can retarget without editing test logic. Each field has an `E2E_*` env override:

```bash
RUN_NDEX_E2E=1 \
E2E_HIERARCHY_UUID=<network-uuid> \
E2E_SUBSYSTEM_CX_ID=<node-cx-id> \
E2E_SUBSYSTEM_NAME="<subsystem name>" \
E2E_EXPECTED_NODE_COUNT=<n> \
npx playwright test hierarchy-subnetwork.spec.ts
```

> The **server** comes from `config.json` (`ndexBaseUrl`); the **uuid/ids** in the fixture must match that server. If you switch servers, override the `E2E_*` values (or edit the fixture defaults) to a network that exists there.

## Adding a case to a data-driven test

Acceptance specs are **data-driven**: the spec loops over a list of cases in its `fixtures/*.data.ts` file and generates one `test(...)` per entry. **To add a case you edit only the data file — never the spec.**

For `hierarchy-subnetwork.spec.ts`, append an object to `hierarchySubnetworkCases` in [`fixtures/hierarchySubnetwork.data.ts`](fixtures/hierarchySubnetwork.data.ts):

```ts
export const hierarchySubnetworkCases: HierarchySubnetworkCase[] = [
  musicRnaProcessingCase,
  {
    name: 'music1 / Ribosome',        // shows up in the test title
    uuid: '1366ba85-9acc-11ef-9702-005056ae6f73',
    subsystemCxId: '88',              // CX id of the subsystem node to click
    subsystemName: 'Ribosome',        // label shown in the sub network viewer
    numberOfProteinsColumn: 'Number of proteins',
    expectedNodeCount: 80,            // interconnect node count for that subsystem
  },
]
```

**Finding the values from the running app** (don't guess): open the network, switch to the **CELL VIEW** tab, and in DevTools inspect a subsystem circle — d3 binds the datum to `circle.__data__.data`, which has `id` (the `subsystemCxId`), `name` (the `subsystemName`), and `size`/`members.length` (the `expectedNodeCount` / "Number of proteins"). You can also read the hierarchy node table.

## Adding a new feature/flow test (styling, NDEx search, …)

A different user flow is a **new spec file** (e.g. `network-styling.spec.ts`, `ndex-search.spec.ts`). Follow this recipe so new specs stay consistent with the existing one:

1. **Create `test/playwright/<feature>.spec.ts`** and import `{ expect, test } from './fixtures'`.
2. **Never hardcode the app path** — derive it from `config.json` `urlBaseName` (see the ⚠️ section above) via an `appPath()` helper, then `page.goto(appPath('<route>'))`.
3. **Decide the lane** (see [Test lanes](#test-lanes-default-hermetic-ui-vs-acceptance-live-ndex)):
   - If the flow needs a **live NDEx server** (searching/opening remote networks, remote styling), it belongs in the **acceptance lane**: **tag it `{ tag: '@ndex' }`**, gate it with `test.skip(!process.env.RUN_NDEX_E2E, …)`, and put all identifiers/queries/expected values in a `fixtures/<feature>.data.ts` with `E2E_*` overrides (mirror `hierarchySubnetwork.data.ts`).
   - Otherwise keep it in the **default (hermetic) lane** — no tag, no gate — and make it self-contained: import `offlineTest as test` from `./fixtures` (auto-stubs the boot calls), and load data from a **local fixture** (a CX2/SIF/table file under `test/fixtures/`, or `?import=<local-url>`). This is preferred.
4. **Select via `data-testid`** (see the guidelines below). If the element you need has no stable hook, **add a descriptive `data-testid` to the component** rather than relying on brittle text/CSS selectors. Do NOT add test-only attributes to hot render paths (e.g. per-element canvas/d3 draws) — read d3 `__data__` or a store/API instead.
5. **Assert the user-visible outcome** (DOM text, panel visibility, or a non-blank canvas). Where a DOM check isn't enough, cross-check via `window.CyWebApi` (see below) — it exposes `network`, `table`, `selection`, `visualStyle`, `viewport`, `layout`, `workspace`, `element` for reliable, framework-agnostic assertions.
6. **Reuse, then extract.** Base-path URL building already lives in `test/playwright/support/appUrl.ts` (shared by `playwright.config.ts` and the tests) — always build app URLs via `appPath` from there, never hardcode. Other common steps still live inline in `hierarchy-subnetwork.spec.ts` (cookie-consent dismissal, load-network, D3 node activation, CyWebApi polling reads, canvas render-stats, interconnect response observation). When you write the second flow, **extract these into `test/playwright/helpers/`** (suggested homes: `helpers/app.ts` for shell/cookie steps, `helpers/hierarchy.ts` for cell-view/subsystem activation, `helpers/cywebApi.ts` for polling reads, `helpers/canvas.ts` for non-blank sampling) and import them from both specs instead of copy-pasting. Don't pre-extract against a single caller — let the second spec reveal the right seams.

### Verifying via `window.CyWebApi`

The app assigns its public API to `window.CyWebApi` (see `src/app-api/`). In a test, read it inside `page.evaluate`, e.g.:

```ts
const value = await page.evaluate(() =>
  window.CyWebApi.table.getValue(networkId, 'node', nodeId, 'Number of proteins'),
)
// visual style: window.CyWebApi.visualStyle.*  |  selection: window.CyWebApi.selection.*
```

Every method returns an `ApiResult<T>` (`{ success, data | error }`) — check `success` before reading `data`.

### Example: styling a network

- Load a network (prefer a **local** CX2/SIF fixture so it runs in the default lane).
- Open the style UI (the **STYLE** tab / Vizmapper — find its `data-testid`s by grepping `src/features/Vizmapper/`), change a visual property (e.g. node fill), and apply.
- **Verify** with `window.CyWebApi.visualStyle.*` that the property/mapping changed, and/or that the Vizmapper UI reflects it. (Canvas pixels can corroborate but won't identify the exact color.)

### Example: search a network from NDEx

- This **hits live NDEx** → gate with `RUN_NDEX_E2E` and parameterize the search query + expected result in `fixtures/ndexSearch.data.ts`.
- Open the NDEx open/search dialog (from the **Data** menu — grep `src/features/ToolBar/DataMenu/` for its `data-testid`s), type the query, submit.
- **Verify structural outcomes** (results list appears, count > 0, a known network title is present) rather than exact ordering/counts, since NDEx results are dynamic. Optionally open a result and assert it loads via `window.CyWebApi.network.*`.

> **Missing `data-testid`?** Many dialogs/menus may not have hooks yet. Add descriptive `data-testid`s to those components as part of writing the test (see the guidelines below) — this is expected and encouraged.

## Generating and designing tests

- playwright prompts rae in docs/prompts
- use docs/prompts/playwright-test-planner, docs/props/playwright-test-generator to plan and generate the tests
- use docs/prompts/playwright-test-healer to fix the tests

## Component Testability: Using `data-testid` Attributes

To make components in `src/` easier to select and interact with in Playwright tests, UI elements are consistently annotated with `data-testid` attributes. This approach allows tests to reliably locate elements regardless of DOM structure or styling changes.

### Guidelines

- **Every interactive or dynamic element (buttons, panels, dialogs, form fields, menus, etc.) in the app should be given a unique `data-testid`.**
- The `data-testid` should be stable and descriptive, reflecting the element's purpose or function.
- Use the following pattern in your React components:

  ```jsx
  <button data-testid="main-save-button">Save</button>
  <input data-testid="network-search-input" />
  <div data-testid="sidebar-panel" />
  ```

- Avoid using dynamically generated or index-based `data-testid` values unless there are no alternatives.

### Benefits for Playwright Testing

- **Robust targeting:** Playwright selectors like `[data-testid="..."]` are not affected by class name or structural changes.
- **Readability:** Test code stays more readable and maintainable because selectors reflect UI intent.
- **Reduced flakiness:** Tests remain stable even as underlying implementation details or CSS evolve.

### Example Playwright Selector

```ts
await page.getByTestId('main-save-button').click()
// or, using CSS selector:
await page.locator('[data-testid="main-save-button"]').click()
```

> **Note:** If you add new UI elements, especially those with user interactions, always include a descriptive `data-testid` for seamless E2E testing.

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
