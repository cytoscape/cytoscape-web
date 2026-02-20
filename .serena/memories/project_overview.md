# Cytoscape Web — Project Overview

## Purpose
Cytoscape Web is a web-based network visualization and analysis application for biological/scientific network data. It is the web counterpart of Cytoscape Desktop, built for modern browsers.

- **Homepage**: http://web.cytoscape.org
- **Repository**: https://github.com/cytoscape/cytoscape-web
- **License**: MIT
- **Version**: 1.0.5

## Tech Stack
- **Language**: TypeScript (strict null checks, `noImplicitAny`)
- **Framework**: React (functional components only, `react-jsx` transform)
- **State Management**: Zustand with Immer middleware
- **Bundler**: Webpack 5 with Module Federation (microfrontend architecture)
- **Styling**: MUI (Material UI)
- **Database**: IndexedDB via Dexie (`cyweb-db`, version 8)
- **Visualization**: Cytoscape.js for graph rendering
- **Testing**: Jest (unit), Playwright (e2e)
- **Auth**: Keycloak SSO

## Three-Layer Architecture
```
1. Models    (src/models/)               → Pure TS interfaces + implementation functions
2. Stores    (src/data/hooks/stores/)    → Zustand stores with Immer
3. Features  (src/features/)             → React components consuming stores via hooks
```

**Rules:**
- Models must NOT import from React or Zustand
- Stores must NOT import React components
- Features consume stores through hooks
- Cross-store communication: `useXxxStore.getState()` (not hooks)

## Key Directories
- `src/models/` — 19 domain model directories (incl. AppModel, NetworkModel, VisualStyleModel, etc.)
- `src/data/hooks/stores/` — 16 Zustand stores
- `src/data/hooks/` — Integration hooks (compose stores for complex workflows)
- `src/data/db/` — Dexie IndexedDB persistence (version 8)
- `src/data/external-api/` — NDEx and Cytoscape Desktop API clients
- `src/features/` — 19 feature module directories + standalone components
- `src/app-api/` — **New Facade API layer** (public API for external apps, including `window.CyWebApi`)
- `src/utils/` — Shared utilities
- `test/fixtures/` — Test fixtures (CX2, HCX, SIF, etc.)

## Facade API Layer (`src/app-api/`) — Key Addition
The `src/app-api/` directory is the **sole public API** for external apps consuming Cytoscape Web.
- **Module Federation** — React apps import `useXxxApi()` hooks from `cyweb/ElementApi` etc.
- **`window.CyWebApi`** — Vanilla JS consumers (browser extensions, LLM agent bridges) access via global
- **Two-Layer Pattern**:
  - `core/<domain>Api.ts` — Framework-agnostic, uses `useXxxStore.getState()`, no React
  - `use<Domain>Api.ts` — Thin React Hook wrapper (~3–5 lines, zero domain logic)
- **API domains**: element, network, selection, table, visualStyle, layout, viewport, export
- **Types**: `ApiResult<T>` discriminated union (see ADR 0001), curated re-exports (ADR 0002)
- **ADR 0003**: All core functions are framework-agnostic; React hooks are thin wrappers only

## Features
Key feature modules:
- `AppShell` — Main container, initialization, URL parameter processing
- `NetworkPanel/CyjsRenderer` — Cytoscape.js rendering engine
- `Vizmapper` — Visual style mapping interface
- `TableBrowser` — Node/edge data table browsing
- `HierarchyViewer` — Hierarchical network viewer (uses web workers)
- `MergeNetworks` — Multi-network merge operations
- `ServiceApps` — External Module Federation app integration
- `Workspace` — Workspace editor and management
- `LLMQuery` — LLM query feature (components, model, api, store sub-directories)
- `AppManager` — App manager feature

## Architecture Decision Records (ADRs)
Located in `docs/adr/`:
- **ADR 0001** — `ApiResult<T>` discriminated union design
- **ADR 0002** — Public type re-export strategy
- **ADR 0003** — Framework-agnostic core layer (new)

## Design Documents
Located in `docs/design/module-federation/`:
- `facade-api-specification.md` — Full API spec (1,900+ lines)
- `module-federation-design.md` — Roadmap and priorities
- `phase1a-shared-types-design.md` — Phase 0 blueprint
- `implementation-checklist-phase0.md`, `implementation-checklist-phase1.md`

## Important Notes
- `enableMapSet()` from Immer must be called before stores initialize
- All external CX2 data must be validated with `validateCX2()`
- Use structured `debug` logger from `src/debug.ts`, not `console.log`
- `IdType = string` used universally for nodes, edges, networks
- URL-as-state routing with React Router
- Branch workflow: `development` (default) → `master` (release)
- Current active branch for facade API work: `llm-setups`
