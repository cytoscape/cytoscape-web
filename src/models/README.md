# @cytoscape-web/types

> **⚠ Deprecated since Phase 0 (February 2026)**
>
> This package is no longer maintained.
> Use [`@cytoscape-web/api-types`](https://www.npmjs.com/package/@cytoscape-web/api-types) instead.
>
> ```bash
> npm install @cytoscape-web/api-types@alpha
> ```
>
> The new package provides the same model types plus typed event bus declarations
> (`CyWebEvents`, `CyWebEventMap`) and ambient `window.CyWebApi` / `WindowEventMap`
> augmentations for vanilla JS consumers. See the
> [packages/api-types/](../../packages/api-types/) workspace for source and build instructions.

---

This directory (`src/models/`) contains the internal TypeScript model definitions for
Cytoscape Web. The published npm package `@cytoscape-web/types` was a snapshot of these
models intended for external app developers. It has been superseded by
`@cytoscape-web/api-types`, which provides a curated, dependency-safe type surface
via `src/app-api/types/ElementTypes.ts`.

See [ADR 0002](../../docs/adr/0002-public-type-reexport-strategy.md) for the full
rationale behind the type re-export strategy.
