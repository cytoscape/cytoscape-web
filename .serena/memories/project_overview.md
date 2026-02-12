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
- `src/models/` — 18 domain model directories
- `src/data/hooks/stores/` — 16 Zustand stores
- `src/data/hooks/` — Integration hooks (compose stores for complex workflows)
- `src/data/db/` — Dexie IndexedDB persistence
- `src/data/external-api/` — NDEx and Cytoscape Desktop API clients
- `src/features/` — 19+ feature module directories + standalone components
- `src/utils/` — Shared utilities
- `test/fixtures/` — Test fixtures (CX2, HCX, SIF, etc.)

## Important Notes
- `enableMapSet()` from Immer must be called before stores initialize
- All external CX2 data must be validated with `validateCX2()`
- Use structured `debug` logger from `src/debug.ts`, not `console.log`
- `IdType = string` used universally for nodes, edges, networks
- URL-as-state routing with React Router
- Branch workflow: `development` (default) → `master` (release)
