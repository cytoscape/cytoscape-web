# packages/

This directory contains npm workspace packages published from this repository.

Each subdirectory is an independent npm package managed via [npm workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces).

## Packages

| Package | Version | Description |
|---------|---------|-------------|
| [`@cytoscape-web/api-types`](./api-types/) | `0.1.0-alpha.0` | TypeScript declarations for the Cytoscape Web App API |

## `@cytoscape-web/api-types`

Provides ambient TypeScript type declarations for vanilla JS consumers (browser extensions, LLM agent bridges) who cannot use Module Federation.

**What it provides:**

- `ApiResult<T>`, `ApiErrorCode`, `ok()`, `fail()` — result type helpers
- `CyWebApiType` — type of `window.CyWebApi`
- `CyWebEvents` / `CyWebEventMap` — typed event bus events
- Public model types (`IdType`, `Network`, `Table`, `VisualStyle`, etc.)
- Ambient `window.CyWebApi` and `WindowEventMap` augmentations

**Installation:**

```bash
npm install @cytoscape-web/api-types@alpha
```

**Usage:**

```jsonc
// tsconfig.json — enables window.CyWebApi and typed window.addEventListener
{ "compilerOptions": { "types": ["@cytoscape-web/api-types"] } }
```

```typescript
window.addEventListener('cywebapi:ready', () => {
  const api = window.CyWebApi // typed as CyWebApiType
  window.addEventListener('network:created', (e) => {
    console.log(e.detail.networkId) // fully typed
  })
})
```

## Development

Build all packages:

```bash
npm run build:api-types
```

The `dist/` output of each package is gitignored and generated locally or in CI before publishing.

## Publishing

See [implementation-checklist-phase0.md](../docs/design/module-federation/checklists/implementation-checklist-phase0.md) for the publication steps.
