# Architecture Reference

> Detail split out of `AGENTS.md` §2 so the always-loaded file stays small.
> Read the section you need before working in that layer.

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
- `src/data/db/` — Dexie IndexedDB layer. DB name and current version are defined in `src/data/db/index.ts`. Includes `migrations.ts`, `serialization/`, `snapshot/`, `validator.ts`.
- `src/data/external-api/ndex/` — NDEx (Network Data Exchange) API client.
- `src/data/external-api/cytoscape/` — Cytoscape Desktop integration API.
- `src/data/task/` — Task hooks exposed via Module Federation to external apps.
- `src/features/` — Source of truth for current feature modules.
- `src/assets/` — Static assets and runtime config files.
- `src/app-api/` — Public API surface for external apps (see [Section 4](#4-app-api-module-federation)).

### Feature Module Pattern

Feature modules are self-contained. Larger features follow this structure:

```text
Feature/
├── Feature_docs/      # Behavioral documentation (markdown)
├── components/        # React components
├── models/            # Feature-specific models
├── store/             # Feature-specific Zustand store (if needed)
├── tests/             # Feature-specific tests
└── utils/             # Feature-specific utilities
```

Key feature modules:

- `AppShell` — Main container (toolbar + routed content). Startup itself lives in `src/boot/steps/`
- `NetworkPanel/CyjsRenderer` — Cytoscape.js rendering engine
- `Vizmapper` — Visual style mapping interface
- `TableBrowser` — Node/edge data table browsing
- `HierarchyViewer` — Hierarchical network viewer (uses web workers)
- `MergeNetworks` — Multi-network merge operations
- `ServiceApps` — External Module Federation app integration
- `Workspace` — Workspace editor and management

### Model Patterns

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

### Zustand Store Patterns

- **Middleware Stack:** All stores use Immer middleware. Persisted stores with subscriptions use: `create(subscribeWithSelector(immer<StoreType>(persist((set, get) => ({ ... })))))`
- **`enableMapSet()` (CRITICAL):** Must be called before Immer can handle Map/Set. Already done in `src/boot/bootstrap.tsx` (app) and `vitest-setup.ts` (tests). **If you create a new standalone test entry point, you MUST include this call or tests will fail with cryptic errors.**
- **IndexedDB Persistence:** Stores use a custom `persist` wrapper that auto-saves to IndexedDB. Before saving, proxy objects must be converted with `toPlainObject()` from `src/data/db/serialization/`. Specialized serializers exist: `serializeTable`, `serializeVisualStyle`, `serializeNetworkView` for Map-based data.
- **Cross-Store Communication:** Inside store actions, access other stores via `useXxxStore.getState()` — not hooks. Hooks are for React components only.

### Routing

URL-as-state pattern with React Router. Search parameters are consumed on initial load, then removed from URL.

```text
/                                       → Root (AppShell)
/:workspaceId                           → Workspace Editor
/:workspaceId/networks                  → Workspace with no network
/:workspaceId/networks/:networkId       → Network viewer
/error                                  → Error page
```

See `docs/specifications/ROUTING_SPECIFICATION.md` for full navigation rules and search parameter behavior.

---
