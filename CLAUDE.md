# CLAUDE.md

> Source of truth for agent context in this repository.
> `AGENTS.md` is auto-generated from this file via `npm run sync:agents`.

## Development Commands

**Building & Development:**

- `npm install` - Install dependencies
- `npm run dev` - Start dev server (opens browser at localhost:5500)
- `npm run build` - Build for production
- `npm run build:netlify` - Build for Netlify deployment
- `npm run build:analyze` - Build with Webpack bundle analyzer
- `npm run clean` - Remove dist folder

**Testing:**

- `npm run test:unit` - Run Jest unit tests
- `npm run test:e2e` - Run Playwright end-to-end tests

**Code Quality:**

- `npm run lint` - Lint TypeScript/JavaScript files in src/
- `npm run lint:fix` - Auto-fix lint errors
- `npm run format` - Format code with Prettier

> **Note:** There is no unified `npm test` command. Use `test:unit` or `test:e2e` separately.

---

## Code Style & Conventions

**Formatting (enforced by Prettier):**

- No semicolons
- Single quotes
- Trailing commas (all positions)
- 2-space indentation, 80-char line width

**Linting (enforced by ESLint):**

- Import sorting via `eslint-plugin-simple-import-sort` (error level — builds will fail)
- `@typescript-eslint/no-explicit-any` is OFF — `any` is permitted
- Functional components only — no class components
- New JSX transform (`react-jsx`) — do NOT add `import React from 'react'` in component files

**Logging:**
Use the structured `debug` logger from `src/debug.ts`, not `console.log`. Production builds strip all `console.log` calls via Terser.

Available loggers (each has `.info`, `.warn`, `.error`):

- `logDb` — Database operations
- `logStore` — Store operations
- `logApi` — API calls
- `logApp` — Application lifecycle
- `logUi` — UI events
- `logStartup` — Initialization sequence
- `logPerformance` — Performance metrics
- `logHistory` — Undo/redo history
- `logModel` — Model operations

See `docs/specifications/DEBUG_GUIDE.MD` for the full logging policy.

---

## Architecture Overview

### Three-Layer Architecture

Cytoscape Web is a React-based network visualization and analysis app with a strict three-layer separation:

```
1. Models    (src/models/)                → Pure TypeScript interfaces + implementation functions
2. Stores    (src/data/hooks/stores/)     → Zustand stores with Immer, wrapping model operations
3. Features  (src/features/)              → React components consuming stores via hooks
```

**Rules:** Models must NOT import from React or Zustand. Stores must NOT import React components. Features consume stores through hooks.

### Naming Conventions

| Artifact               | Location                                      | Naming Pattern                 |
| ---------------------- | --------------------------------------------- | ------------------------------ |
| Model interfaces       | `src/models/<Domain>Model/`                   | `<Domain>.ts`, `Edge.ts`, etc. |
| Model implementations  | `src/models/<Domain>Model/impl/`              | `<domain>Impl.ts`              |
| Model barrel export    | `src/models/<Domain>Model/index.ts`           | Default export: `<Domain>Fn`   |
| Store model interfaces | `src/models/StoreModel/<Domain>StoreModel.ts` | `<Domain>Store` (type)         |
| Store implementations  | `src/data/hooks/stores/<Domain>Store.ts`      | `use<Domain>Store` (hook)      |
| Feature modules        | `src/features/<Feature>/`                     | PascalCase directory           |
| Feature documentation  | `src/features/<Feature>/<Feature>_docs/`      | Behavioral markdown            |

### Key Directories

- `src/models/` — Source of truth for current model domains.
- `src/data/hooks/stores/` — Source of truth for current store modules.
- `src/data/hooks/` — Hooks that compose stores for complex workflows.
- `src/data/db/` — IndexedDB layer. DB name and current version are defined in `src/data/db/index.ts`.
- `src/data/db/migrations.ts` — Source of truth for DB migrations.
- `src/data/external-api/` — External service clients (NDEx, Cytoscape Desktop, error reporting).
- `src/data/task/` — Task hooks exposed via Module Federation to external apps.
- `src/features/` — Source of truth for current feature modules.
- `src/assets/` — Static assets and runtime config files.

### Feature Module Pattern

Feature modules are self-contained. Larger features follow this structure:

```
Feature/
├── Feature_docs/      # Behavioral documentation (markdown)
├── components/        # React components
├── models/            # Feature-specific models
├── store/             # Feature-specific Zustand store (if needed)
├── tests/             # Feature-specific tests
└── utils/             # Feature-specific utilities
```

Key feature modules:

- `AppShell` — Main container, initialization, URL parameter processing
- `NetworkPanel/CyjsRenderer` — Cytoscape.js rendering engine
- `Vizmapper` — Visual style mapping interface
- `TableBrowser` — Node/edge data table browsing
- `HierarchyViewer` — Hierarchical network viewer (uses web workers)
- `MergeNetworks` — Multi-network merge operations
- `ServiceApps` — External Module Federation app integration
- `Workspace` — Workspace editor and management

---

## Model Patterns

### Structure

Each model directory exports a `<Domain>Fn` default object with pure implementation functions:

```typescript
// src/models/NetworkModel/index.ts
import * as NetworkFn from './impl/networkImpl'
export { Network } from './Network'
export { Edge } from './Edge'
export { NetworkFn as default }
```

**Key rules:**

- Interfaces use `readonly` properties
- Implementation functions in `impl/` are pure TypeScript — no React, no Zustand
- `IdType = string` (defined in `src/models/IdType.ts`) is used universally for nodes, edges, networks
- All external CX2 data must be validated with `validateCX2()` before processing (see `docs/specifications/EXTERNAL_INPUT_VALIDATION_POLICY.md`)

### All Model Directories

See `src/models/` for the current model directory set.

---

## Zustand Store Patterns

### Middleware Stack

All stores use Immer middleware. Persisted stores with subscriptions use:

```
create(subscribeWithSelector(immer<StoreType>(persist((set, get) => ({ ... })))))
```

**Critical:** `enableMapSet()` from Immer must be called before stores initialize. This happens in `src/init.tsx` (app) and `jest-setup.ts` (tests).

### IndexedDB Persistence

- Stores use a custom `persist` wrapper that auto-saves to IndexedDB
- Before saving to IndexedDB, proxy objects must be converted with `toPlainObject()` from `src/data/db/serialization/`
- Specialized serializers exist: `serializeTable`, `serializeVisualStyle`, `serializeNetworkView` for Map-based data
- DB name and current version are defined in `src/data/db/index.ts`.
- Migrations are defined in `src/data/db/migrations.ts`.

### Cross-Store Communication

Inside store actions, access other stores via `useXxxStore.getState()` — not hooks. Hooks are for React components only.

### Store Inventory

See `src/data/hooks/stores/*.ts` for current store implementations.
See `src/models/StoreModel/` for store model interfaces.

---

## Data Layer

- `src/data/db/` — Dexie IndexedDB layer. DB name and current version are defined in `src/data/db/index.ts`. Includes `migrations.ts`, `serialization/`, `snapshot/`, `validator.ts`
- `src/data/external-api/ndex/` — NDEx (Network Data Exchange) API client
- `src/data/external-api/cytoscape/` — Cytoscape Desktop integration API
- `src/data/hooks/` — Integration layer: hooks compose stores for complex workflows (load workspace, save network, create/delete nodes/edges)
- `src/data/task/` — Task hooks exposed via Module Federation for external apps

---

## Routing

URL-as-state pattern with React Router. Search parameters are consumed on initial load, then removed from URL.

**Route structure:**

```
/                                       → Root (AppShell)
/:workspaceId                           → Workspace Editor
/:workspaceId/networks                  → Workspace with no network
/:workspaceId/networks/:networkId       → Network viewer
/error                                  → Error page
```

See `docs/specifications/ROUTING_SPECIFICATION.md` for full navigation rules and search parameter behavior.

---

## Testing

### Unit Tests (Jest)

- Environment: jsdom with `ts-jest`
- Setup: `jest-setup.ts` loads `@testing-library/jest-dom`, `fake-indexeddb/auto`, and calls `enableMapSet()`
- Timeout: 100 seconds (global)
- **Tests are co-located with source files**, not in a separate directory
- Convention: `.test.ts` for utilities/hooks/APIs; `.spec.ts` for stores and feature modules
- Store tests: `renderHook(() => useXxxStore())` + `act()` pattern from `@testing-library/react`
- Common mocks: `jest.mock('../../db', ...)` for DB operations, `jest.mock('./WorkspaceStore', ...)` for `currentNetworkId`

### E2E Tests (Playwright)

- Test directory: `test/playwright/`
- Browsers: Chromium, Firefox, WebKit
- Base URL: `http://localhost:5500` (auto-starts dev server)
- Element selection: `data-testid` attributes
- Artifacts: trace on first retry, video on failure, screenshot on failure
- Test workflow templates in `docs/prompts/`: planner → generator → healer

### Test Fixtures

- Location: `test/fixtures/` (CX2, HCX, SIF, table files, DB snapshots)
- Naming convention: `<characteristic>.<valid|invalid>.<extension>`
- Generation scripts: `scripts/generate-test-fixtures/`

---

## Build System

Webpack 5 with Module Federation for microfrontend architecture:

- TypeScript compilation with ts-loader
- Hot module replacement in development (port 5500)
- Module Federation exposed modules are defined in `webpack.config.js` (`ModuleFederationPlugin.exposes`).
- Current values may change; check the config directly.
- Shared singletons: react, react-dom, @mui/material
- `DefinePlugin` injects git commit hash and timestamps at build time
- Production builds strip `console.log` via Terser
- Code splitting with vendor/app bundles
- CSS extraction and minification

---

## Important Files & Configuration

| File                      | Purpose                                                                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/assets/config.json`  | Runtime configuration: NDEx server URL, thresholds (`maxNetworkElementsThreshold: 26000`, `maxEdgeCountThreshold: 20000`, `maxNetworkFileSize: 500MB`), debug flag, Keycloak auth, Google Analytics |
| `src/assets/apps.json`    | External Module Federation app definitions                                                                                                                                                          |
| `src/debug.ts`            | Structured logging system (debug package)                                                                                                                                                           |
| `src/AppConfigContext.ts` | React context for runtime app configuration                                                                                                                                                         |
| `src/custom.d.ts`         | Global TypeScript type declarations                                                                                                                                                                 |
| `src/init.tsx`            | App initialization (calls `enableMapSet()`, sets up logging)                                                                                                                                        |

**Environment variables:** The `.env` file exists but is unused. All build-time variables are injected via Webpack `DefinePlugin` (git commit, timestamps, build mode).

---

## Scripts

| Script                                       | Purpose                                         |
| -------------------------------------------- | ----------------------------------------------- |
| `scripts/generate-test-fixtures/`            | Generate CX2, SIF, table, and URL test fixtures |
| `scripts/generate-model-diagram/`            | Generate Mermaid diagrams of model dependencies |
| `scripts/generate-state-diagram/`            | Generate state structure diagrams               |
| `scripts/download-ndex-networks.ts`          | Download networks from NDEx for testing         |
| `scripts/manual-database-snapshot-export.js` | Export IndexedDB snapshots                      |
| `scripts/batch-renaming/`                    | CSV-based batch file renaming with git-mv       |

---

## Specification References

Read these before working in related areas:

- `docs/specifications/ROUTING_SPECIFICATION.md` — URL routing rules, navigation patterns, search parameter handling
- `docs/specifications/EXTERNAL_INPUT_VALIDATION_POLICY.md` — CX2 validation requirements for external data
- `docs/specifications/DEBUG_GUIDE.MD` — Structured logging policy and debug namespace usage
- `docs/prompts/playwright-test-planner.md` — E2E test planning workflow
- `docs/prompts/playwright-test-generator.md` — E2E test generation conventions
- `docs/prompts/playwright-test-healer.md` — Fixing broken E2E tests
- `docs/prompts/code-quality-for-testing-behaviour.md` — Adding `data-testid`, documentation, linting
- `docs/prompts/code-quality-testing-refactoring.md` — Extracting hooks, adding unit tests

---

## Special Considerations

- **`enableMapSet()`** — Must be called before Immer can handle Map/Set. Already done in `src/init.tsx` and `jest-setup.ts`. If you create a new standalone test entry point, include it.
- **NDEx Dev Server** — `config.json` points to `dev1.ndexbio.org` by default. You need an account there for full development functionality.
- **Blank Workspace?** — Clear IndexedDB (`cyweb-db`) to reset. Browser DevTools → Application → IndexedDB.
- **DB Migrations** — Schema changes go in `src/data/db/migrations.ts`. DB name and current version are defined in `src/data/db/index.ts`.
- **`zod`** — Available as a dependency for runtime validation.
- **`validateCX2()`** — Required for all external CX2 data before processing.
- **Windows Development** — Requires manual environment variable setup for Git commit info (see README.md).
- **Keycloak Auth** — SSO authentication with `silent-check-sso.html` for silent token refresh.
- **Netlify Auto-Deploy** — All branches auto-deploy to `<branch>--incredible-meringue-aa83b1.netlify.app`.
- **Branch Workflow** — `development` (default) → `master` (release) → GitHub release → Zenodo DOI.
