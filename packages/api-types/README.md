# @cytoscape-web/api-types

TypeScript type declarations for the [Cytoscape Web](https://github.com/cytoscape/cytoscape-web) App API.

Install this package in your plugin app to get full IDE support — hover types, parameter names, and
completions — for all `cyweb/*` Module Federation imports and the `window.CyWebApi` global, without
needing the host repository.

## Installation

```bash
npm install --save-dev @cytoscape-web/api-types
```

## Setup

Add the package to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["@cytoscape-web/api-types"]
  }
}
```

That's it. No imports needed — global augmentations for `window.CyWebApi` and typed
`window.addEventListener` overloads are active automatically.

## What's included

| Export                                                 | Description                                                                                                  |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `CyWebApiType`                                         | Type of `window.CyWebApi` (10 domain API objects)                                                            |
| `ElementApi`                                           | Create/delete nodes and edges, return full mutation data, batch edge topology reads, graph traversal queries |
| `NetworkApi`                                           | Create networks from edge lists, CX2, or node subsets; delete networks                                       |
| `SelectionApi`                                         | Read and modify node/edge selection state                                                                    |
| `ViewportApi`                                          | Fit the renderer and read/update node positions                                                              |
| `TableApi`                                             | Read schemas/rows, write node/edge attribute tables, and import/export TSV                                   |
| `VisualStyleApi`                                       | Set defaults, bypasses, and discrete/continuous/passthrough mappings                                         |
| `LayoutApi`                                            | Run layout algorithms and list available layouts                                                             |
| `ExportApi`                                            | Export networks to CX2                                                                                       |
| `WorkspaceApi`                                         | Read, switch, and rename workspace state                                                                     |
| `ContextMenuApi`                                       | Register custom items in the network context menu                                                            |
| `AppContextApis`                                       | Per-app API shape passed to `mount()` (extends `CyWebApiType`)                                               |
| `ResourceApi`                                          | Register panels and menu items at runtime                                                                    |
| `ResourceDeclaration`                                  | Declarative resource entry for `CyAppWithLifecycle.resources`                                                |
| `ApiResult<T>`                                         | Discriminated union returned by fallible API functions                                                       |
| `ElementCodes`, `TableCodes`, `StyleCodes`, `AppCodes` | Domain-grouped error code catalogs — each entry is `{ code, severity, message }`                             |
| `ApiErrorCodeDef`, `ApiErrorSeverity`                  | Supporting types for the error code catalogs                                                                 |
| `CyWebEvents`                                          | Typed detail shapes for lifecycle, topology, selection, layout, style, and table events                      |
| Model types                                            | `IdType`, `Network`, `Node`, `Edge`, `Table`, `VisualStyle`, …                                               |

Ambient module declarations for all `cyweb/*` Module Federation remotes are also bundled, so imports
like `import { useElementApi } from 'cyweb/ElementApi'` resolve correctly in TypeScript.

## `1.0.0-beta.3` migration notes

`1.0.0-beta.3` contains a breaking error-model migration and several additive API changes:

- Replace comparisons against `ApiErrorCode` with the domain catalogs shown
  below. Failed results now include `error.severity`; `ApiError.cx2Code` (an
  interim field from a prior beta) is removed — the primary `code` now carries
  that identity directly.
- `fail()` changed signature: `fail(codeDef, ...templateArgs)` replaces
  `fail(code, message, cx2Code?)`. Only apps constructing `ApiError` values
  directly are affected.
- Boundary validation is stricter: invalid element attributes, table schemas
  and values, visual style values, bypass targets/scopes, and mapping
  sources/bounds that earlier prereleases accepted are now rejected.
- `NetworkApi.deleteNetwork()` no longer changes behavior based on
  `DeleteNetworkOptions.navigate` (kept for source compatibility): deleting the
  current network always repairs `currentNetworkId`, and deleting a non-current
  network never switches networks.
- `createNode`, `createEdge`, `deleteNodes`, and `deleteEdges` return complete
  element data as well as IDs/counts.
- `VisualStyleApi.createDiscreteMapping()` accepts an optional mapping-entry
  record; `createContinuousMapping()` accepts optional `controlPoints`,
  `ltMinVpValue`, and `gtMaxVpValue` arguments.
- `data:changed` handlers receive `addedColumns` and `removedColumns` arrays.
- New APIs include `ElementApi.getEdges`, `TableApi.getColumns`, and
  `NetworkApi.createNetworkFromNodeList`.
- `importTableFromTsv` returns `skippedRows` for TSV keys that do not match a
  node or edge.

See the bundled [CHANGELOG](./CHANGELOG.md) for the complete list and migration
mapping.

## Usage examples

### Error handling

Every failed call returns `{ success: false, error: { code, severity, message } }`.
Codes that enforce a CX2 validation requirement reuse the CX2 code string
directly (`FK1`, `BV1`, `MI3`, …); codes with no CX2 equivalent use a distinct
`APP1`–`APP9` namespace. Import the catalogs to compare against known codes
rather than hardcoding string literals:

```typescript
import { AppCodes, TableCodes } from 'cyweb/ApiTypes'

const result = tableApi.createColumn(networkId, 'node', 'id', 'string', '')
if (!result.success) {
  if (result.error.code === TableCodes.NODE_ID_COLUMN_FORBIDDEN.code) {
    // FK1 — "id" is a reserved column name
  } else if (result.error.code === AppCodes.NETWORK_NOT_FOUND.code) {
    // APP1 — networkId doesn't exist
  }
  console.error(result.error.severity, result.error.message)
}
```

See [ErrorCodes.md](https://github.com/cytoscape/cytoscape-web/blob/development/src/app-api/api_docs/ErrorCodes.md)
for the full code catalog.

### Declarative resource registration (recommended)

```typescript
import { lazy } from 'react'
import { VisualPropertyName } from 'cyweb/ApiTypes'
import type { CyAppWithLifecycle } from 'cyweb/ApiTypes'

export const MyApp: CyAppWithLifecycle = {
  id: 'myApp',
  name: 'My App',
  version: '1.0.0',
  apiVersion: '1.0',

  // Panels and menu items — host registers these automatically
  resources: [
    {
      slot: 'right-panel',
      id: 'MainPanel',
      title: 'My Panel',
      component: lazy(() => import('./components/MainPanel')),
    },
    {
      slot: 'apps-menu',
      id: 'QuickAction',
      title: 'Quick Action',
      component: lazy(() => import('./components/QuickAction')),
      closeOnAction: true,
    },
  ],

  // Context menus need apis access, so they go in mount()
  mount({ apis }) {
    apis.contextMenu.addContextMenuItem({
      label: 'Highlight node',
      targetTypes: ['node'],
      handler: ({ id, networkId }) => {
        if (id !== undefined) {
          apis.visualStyle.setBypass(
            networkId,
            VisualPropertyName.NodeBackgroundColor,
            [id],
            '#ff0000',
          )
        }
      },
    })
  },
}
```

### Module Federation (React component)

```typescript
import { useElementApi } from 'cyweb/ElementApi'
import { useWorkspaceApi } from 'cyweb/WorkspaceApi'
import { useCyWebEvent } from 'cyweb/EventBus'

function MyPanel() {
  const element = useElementApi()
  const workspace = useWorkspaceApi()

  useCyWebEvent('network:switched', ({ networkId }) => {
    console.log('switched to', networkId)
  })

  const handleAdd = () => {
    const net = workspace.getCurrentNetworkId()
    if (!net.success) return
    const result = element.createNode(net.data.networkId, [100, 200])
    if (result.success) {
      console.log('created node', result.data.nodeId)
    }
  }
}
```

### Per-app context in plugin components

```typescript
import { useAppContext } from 'cyweb/AppIdContext'

function MyComponent() {
  const ctx = useAppContext()
  if (!ctx) return null

  // ctx.apis has all 10 domain APIs + resource + contextMenu (per-app)
  const resources = ctx.apis.resource.getRegisteredResources()
}
```

### Vanilla JS / `window.CyWebApi`

```javascript
window.addEventListener('cywebapi:ready', () => {
  const api = window.CyWebApi

  const result = api.workspace.getCurrentNetworkId()
  if (result.success) {
    console.log('current network:', result.data.networkId)
  }
})
```

> **Note:** `window.CyWebApi` is typed as `CyWebApiType`. It includes the
> anonymous `contextMenu` singleton, but not `resource` or the lifecycle-bound
> context-menu factory. Those per-app APIs are available through
> `AppContextApis` inside `mount()` or `useAppContext()`.

## Available `cyweb/*` remotes

| Remote                 | Hook                                                      |
| ---------------------- | --------------------------------------------------------- |
| `cyweb/ElementApi`     | `useElementApi()`                                         |
| `cyweb/NetworkApi`     | `useNetworkApi()`                                         |
| `cyweb/SelectionApi`   | `useSelectionApi()`                                       |
| `cyweb/ViewportApi`    | `useViewportApi()`                                        |
| `cyweb/TableApi`       | `useTableApi()`                                           |
| `cyweb/VisualStyleApi` | `useVisualStyleApi()`                                     |
| `cyweb/LayoutApi`      | `useLayoutApi()`                                          |
| `cyweb/ExportApi`      | `useExportApi()`                                          |
| `cyweb/WorkspaceApi`   | `useWorkspaceApi()`                                       |
| `cyweb/EventBus`       | `useCyWebEvent(type, handler)`                            |
| `cyweb/AppIdContext`   | `useAppContext()` — per-app context for plugin components |
| `cyweb/ApiTypes`       | Re-exports all types from this package                    |

## Releasing a new API bundle (core developers)

The host implementation and this package are one public contract. Release them
from the same `development` commit after the runtime behavior, exported types,
tests, and documentation have been aligned.

1. **Align the contract.** Update the framework-agnostic implementation and
   hook wrappers in `src/app-api/`, the public declarations in
   `src/app-api/types/`, and the exports in `packages/api-types/src/index.ts`.
   Update `mf-declarations.d.ts` when a `cyweb/*` exposure changes. Add or update
   tests, `src/app-api/api_docs/`, the App API specifications, and an ADR when a
   design decision changes. Document breaking changes and consumer migrations.
2. **Prepare the release before merging.** Bump the version in this package and
   the root lockfile, move the new `CHANGELOG.md` entry from `Unreleased` to its
   release date, and update any version-specific notes in this README. These
   changes belong in the same pull request as the API change.
3. **Verify the bundle.** From the repository root, run:

   ```bash
   npm run lint
   npm run test:unit
   npm run build:api-types
   cd packages/api-types
   npm pack --dry-run
   ```

   Confirm that the tarball contains `dist/index.d.ts`,
   `dist/mf-declarations.d.ts`, `README.md`, `CHANGELOG.md`, and `package.json`.

4. **Merge and tag the exact merge commit.** Merge the pull request into
   `development`, fetch the updated branch, and identify that pull request's
   merge commit. Do not tag a later `development` HEAD that includes unrelated
   changes. The tag format is `api-types-v<version>`:

   ```bash
   git fetch origin development
   git tag -a api-types-v1.0.0-beta.4 MERGE_COMMIT_SHA \
     -m "Release @cytoscape-web/api-types 1.0.0-beta.4"
   git push origin refs/tags/api-types-v1.0.0-beta.4
   ```

5. **Publish the tagged content.** Use a clean checkout of the tagged commit,
   authenticate with npm, rebuild once, and publish from this directory. The
   active beta stream currently uses the `latest` dist-tag; use another tag only
   when the team has agreed to change that policy.

   ```bash
   npm whoami
   npm run build
   npm publish --access public --tag latest
   ```

6. **Verify both registries.** Confirm the remote tag target, published version,
   dist-tag, and tarball checksum:

   ```bash
   git ls-remote --tags origin 'refs/tags/api-types-v1.0.0-beta.4*'
   npm view @cytoscape-web/api-types dist-tags
   npm view @cytoscape-web/api-types@1.0.0-beta.4 \
     version dist.shasum dist.integrity
   ```

npm versions are immutable. If the published bundle is wrong, prepare and
release the next version; do not try to overwrite the existing version or move
its Git tag to different content.

## Documentation

- [App API Specification](https://github.com/cytoscape/cytoscape-web/blob/development/docs/design/module-federation/specifications/app-api-specification.md) — Full API reference
- [Event Bus Specification](https://github.com/cytoscape/cytoscape-web/blob/development/docs/design/module-federation/specifications/event-bus-specification.md) — Event types, detail shapes, and subscription patterns
- [ADR 0001 — ApiResult design](https://github.com/cytoscape/cytoscape-web/blob/development/docs/design/module-federation/adr/0001-api-result-discriminated-union.md) (error code/severity shape superseded by ADR 0005)
- [ADR 0002 — Public type re-export strategy](https://github.com/cytoscape/cytoscape-web/blob/development/docs/design/module-federation/adr/0002-public-type-reexport-strategy.md)
- [ADR 0003 — Framework-agnostic core layer](https://github.com/cytoscape/cytoscape-web/blob/development/docs/design/module-federation/adr/0003-framework-agnostic-core-layer.md)
- [ADR 0005 — Structured, severity-tagged error codes](https://github.com/cytoscape/cytoscape-web/blob/development/docs/design/module-federation/adr/0005-structured-error-codes.md)
- [ErrorCodes.md — Full error code reference](https://github.com/cytoscape/cytoscape-web/blob/development/src/app-api/api_docs/ErrorCodes.md)

## License

MIT
