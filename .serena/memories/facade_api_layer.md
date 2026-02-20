# Facade API Layer (`src/app-api/`)

> Added on branch `llm-setups`. Status: design complete, implementation in progress.

## Purpose
`src/app-api/` is the **sole public API** for external apps consuming Cytoscape Web.
Two access paths:
- **Module Federation** — React apps use `useXxxApi()` hooks (`cyweb/ElementApi` etc.)
- **`window.CyWebApi`** — Vanilla JS consumers (browser extensions, LLM agent bridges)

## Directory Structure
```
src/app-api/
├── core/                     ← Framework-agnostic domain logic (no React)
│   ├── elementApi.ts
│   ├── networkApi.ts
│   ├── selectionApi.ts
│   ├── tableApi.ts
│   ├── visualStyleApi.ts
│   ├── layoutApi.ts
│   ├── viewportApi.ts
│   ├── exportApi.ts
│   └── index.ts              ← Assembles CyWebApi; assigned to window.CyWebApi
├── useElementApi.ts           ← React Hook: returns elementApi (thin wrapper)
├── useNetworkApi.ts
├── useSelectionApi.ts
├── useTableApi.ts
├── useVisualStyleApi.ts
├── useLayoutApi.ts
├── useViewportApi.ts
├── useExportApi.ts
├── api_docs/
│   └── Api.md
├── types/
│   ├── ApiResult.ts           ← ApiResult<T>, ApiError, ApiErrorCode
│   ├── AppContext.ts          ← AppContext, CyAppWithLifecycle
│   ├── ElementTypes.ts        ← Curated re-exports of public model types
│   └── index.ts
└── index.ts
```

## ADR Summary
- **ADR 0001** — `ApiResult<T>` discriminated union. Helpers are named functions (`ok`, `fail`), not arrows.
- **ADR 0002** — Public type re-export strategy.
- **ADR 0003** — Framework-agnostic core layer. Core has zero React imports.

## Implementation Phases
| Phase | Content | Key files to read first |
|-------|---------|------------------------|
| Phase 0 | Types (`ApiResult<T>`, `AppContext`, `ElementTypes`) | ADR 0001, ADR 0002, ADR 0003, `src/models/AppModel/CyApp.ts` |
| Phase 1a | Element API | `useCreateNode.ts`, `useCreateEdge.ts`, `useDeleteNodes.ts`, `useDeleteEdges.ts` |
| Phase 1b | Network API | `useCreateNetworkFromCx2.tsx`, `useCreateNetwork.tsx`, `useDeleteCyNetwork.ts` |
| Phase 1c | Selection + Viewport | `ViewModelStoreModel.ts`, `RendererFunctionStore.ts` |
| Phase 1d | Table + VisualStyle | `TableStoreModel.ts`, `VisualStyleStoreModel.ts` |
| Phase 1e | Layout + Export | `LayoutEngine.ts`, `exporter.ts` |

## Key Rules
1. `core/` files: use `useXxxStore.getState()`, **zero React imports**
2. Hook wrappers: ultra-thin (~3–5 lines), zero domain logic
3. Always return `ApiResult<T>` — never throw exceptions across the facade
4. All public types must be JSON-serializable (`Record<K,V>` not `Map`, `T[]` not `Set`)
5. `skipUndo` hardcoded to `false` — never exposed to external callers
6. `window.CyWebApi` assigned in `src/init.tsx` after all stores initialize

## Webpack exposes
```javascript
'./ApiTypes':       './src/app-api/types/index.ts',
'./ElementApi':     './src/app-api/useElementApi.ts',
'./NetworkApi':     './src/app-api/useNetworkApi.ts',
'./SelectionApi':   './src/app-api/useSelectionApi.ts',
'./TableApi':       './src/app-api/useTableApi.ts',
'./VisualStyleApi': './src/app-api/useVisualStyleApi.ts',
'./LayoutApi':      './src/app-api/useLayoutApi.ts',
'./ViewportApi':    './src/app-api/useViewportApi.ts',
'./ExportApi':      './src/app-api/useExportApi.ts',
```
`window.CyWebApi` is NOT a Module Federation expose — assigned globally in `src/init.tsx`.

## Parent Documents
- `docs/design/module-federation/facade-api-specification.md` — Full spec (1,900+ lines)
- `docs/design/module-federation/module-federation-design.md` — Roadmap
- `docs/design/module-federation/phase1a-shared-types-design.md` — Phase 0 blueprint
- `docs/design/module-federation/implementation-checklist-phase0.md`
- `docs/design/module-federation/implementation-checklist-phase1.md`
- `src/app-api/CLAUDE.md` — Local context for the facade layer (read before implementing)
