# @cytoscape-web/api-types

TypeScript type declarations for the [Cytoscape Web](https://github.com/cytoscape/cytoscape-web) App API.

Install this package in your plugin app to get full IDE support — hover types, parameter names, and
completions — for all `cyweb/*` Module Federation imports and the `window.CyWebApi` global, without
needing the host repository.

## Installation

```bash
npm install --save-dev @cytoscape-web/api-types
```

The declarations reference React types, so `@types/react` (`^18 || ^19`) is a
peer dependency. npm installs it for you — nothing extra is required, including
for a consumer that does not otherwise use React.

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

## `1.0.0-beta.4` migration notes

> **Host compatibility.** `1.0.0-beta.4` documents the App API as implemented
> by the Cytoscape Web build tagged `api-types-v1.0.0-beta.4` on `development`.
> **No released version of Cytoscape Web implements it yet.** It runs on
> [dev1.ndexbio.org/cytoscape](https://dev1.ndexbio.org/cytoscape) once
> `development` has been deployed there (done by hand, so it can lag);
> production stays on the 1.0.x line until Cytoscape Web 1.1.0. **Help → About**
> shows a deployment's build commit as a seven-character prefix — compare it
> against `git rev-parse --short=7 'api-types-v1.0.0-beta.4^{commit}'` to know whether that
> host has this API.

`1.0.0-beta.4` is the most breaking prerelease so far. These are the changes
that stop existing code from compiling or, for callers that reach the API by
name, from working:

- **`'apps-menu'` entries are plain data, not components.** `component`,
  `closeOnAction`, `errorFallback` and `title` are gone from
  `RegisterMenuItemOptions`; register with `label`, `onClick(apis)`, and
  optionally `tooltip`, `icon` and `isEnabled(apis)`. Passing a `component`
  fails with `APP9`. Move the old component's action into `onClick`; move any
  form or other UI into `apis.dialog.open({ title, render })` called from it.
  `'right-panel'` registrations are unchanged.
- **Selection methods take separate id arrays.** `additiveSelect`,
  `additiveDeselect` and `toggleSelected` are now
  `(networkId, nodeIds, edgeIds)`. An old two-argument call does not silently
  misbehave — the host spreads the missing `edgeIds`, which throws and comes
  back as `APP3` `OPERATION_FAILED` (`edgeIds is not iterable`). Split the array
  into nodes and edges. `additiveUnselect` is renamed `additiveDeselect`.
- **Renames:** `VisualStyleApi.removeMapping` → `deleteMapping`;
  `TableApi.setColumnName` → `renameColumn`; `WorkspaceApi.getNetworkList` →
  `getNetworks`, which now returns `{ networks }`.
- **`createContinuousMapping(networkId, vpName, options)`** replaces the
  nine-argument positional form. See `CreateContinuousMappingOptions`.
- **Collection getters return a named object.** `layout.getAvailableLayouts()`
  → `{ layouts }`; `viewport.getNodePositions()` → `{ positions, missing }`
  and takes an optional `nodeIds`; `element.getEdges()` → `{ edges, missing }`.
- **`ResourceApi` introspection returns `ApiResult`.** `getSupportedSlots()`,
  `getRegisteredResources()` and `getResourceVisibility()` used to return raw
  values; they now return `ApiResult`, with the first two wrapping their values
  as `{ slots }` and `{ resources }`. A caller treating the result as an array
  or a visibility object will read `undefined`.
- **Results carry more:** `deleteNodes` / `deleteEdges` gained `missing`;
  `getConnectedEdges` entries include `id`; `generateNextNodeId` /
  `generateNextEdgeId` return `ApiResult<{ nodeId }>` / `ApiResult<{ edgeId }>`
  rather than a bare string.
- `createNetworkFromEdgeList` / `createNetworkFromNodeList` now default
  `addToWorkspace` to `true`.
- `@types/react` is now a declared peer dependency (`^18 || ^19`). npm installs
  it; nothing is required of you.

**If you call the API by method name** — a bridge, an MCP server, anything that
dispatches `window.CyWebApi` through a string path — TypeScript will not catch
the renames or the signature changes above. Cross-check every method string
against this list before upgrading.

See the bundled [CHANGELOG](./CHANGELOG.md) for everything added in beta.4 —
the Dialog API, whole-style `applyVisualStyle` / `getVisualStyle`, named-style
`getStyles` / `switchStyle`, the `'modal-launcher'` and `'search-bar'` slots,
`whenReady()`, `forNetwork()`, batch element creation, and the Visual Style
read API.

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
      // Plain data — the host renders the row; custom UI opens in a dialog.
      slot: 'apps-menu',
      id: 'QuickAction',
      label: 'Quick Action',
      requires: { network: true },
      onClick: (apis) => {
        apis.dialog.open({
          title: 'Quick Action',
          render: ({ close }) => <QuickActionForm onDone={close} />,
        })
      },
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

**Pushing the tag publishes the package.** There is no separate confirmation
step and no manual `npm publish` any more — `.github/workflows/release-api-types.yml`
runs on an `api-types-v*` tag push and goes all the way to the registry. Read
step 4 before you tag anything.

1. **Align the contract.** Update the framework-agnostic implementation and
   hook wrappers in `src/app-api/`, the public declarations in
   `src/app-api/types/`, and the exports in `packages/api-types/src/index.ts`.
   Update `mf-declarations.d.ts` when a `cyweb/*` exposure changes. Add or update
   tests, `src/app-api/api_docs/`, the App API specifications, and an ADR when a
   design decision changes. Document breaking changes and consumer migrations.

2. **Prepare the release before merging.** Bump the version in this package and
   the root lockfile, and give the `CHANGELOG.md` entry a release date — the
   heading must read `## <version> (YYYY-MM-DD)`, not `(unpublished)`, or the
   release workflow refuses to publish. State which host build implements the
   release and where it is deployed; `apiVersion` does not yet carry that.
   These changes belong in the same pull request as the API change.

   A unit test (`src/app-api/federation/apiTypesRelease.test.ts`) already checks
   that the version, the lockfile and the changelog agree, so a forgotten
   `npm install` fails on the pull request rather than at release time.

3. **Verify the bundle.** From the repository root:

   ```bash
   npm run lint
   npm run test:unit
   npm run build:api-types
   npm pack -w packages/api-types --ignore-scripts
   npm run verify:api-types-pack -- <tarball>
   npm run verify:api-types-consumer -- <tarball>
   ```

   `--ignore-scripts` on the pack is deliberate: `prepack` would rebuild what
   was just built, and its output on stdout breaks `npm pack --json`.

   The same checks run on every pull request as the `API Types Package` job, so
   this is a convenience rather than a gate.

4. **Rehearse, then merge and tag the exact merge commit.** Merge the pull
   request into `development`, fetch the updated branch, and identify that pull
   request's merge commit. Do not tag a later `development` HEAD that includes
   unrelated changes — and note that the workflow refuses to publish a commit
   that is not reachable from `origin/development`.

   Rehearse first. A dry run exercises every guard, the build, the packaging
   and the consumer type-check without touching the registry:

   ```bash
   gh workflow run release-api-types.yml --ref development -f dry_run=true
   gh run watch
   ```

   Then tag. Extract the notes from the commit being tagged rather than the
   working tree, and confirm the extraction before creating the tag — `npm run`
   writes its banner to stdout, and the right-hand side of a pipe runs even when
   the left-hand side fails:

   ```bash
   set -euo pipefail
   VERSION=1.0.0-beta.4
   SHA=<MERGE_COMMIT_SHA>
   git fetch origin development
   NOTES="$(mktemp)"
   git show "$SHA:packages/api-types/CHANGELOG.md" \
     | npm run --silent changelog:section -- \
         --version "$VERSION" --file /dev/stdin --require-date >| "$NOTES"
   test -s "$NOTES"
   git tag -a --cleanup=whitespace "api-types-v$VERSION" "$SHA" -F "$NOTES"
   git push origin "refs/tags/api-types-v$VERSION"
   ```

   Three details in that block were each learned the hard way on the first
   beta.4 attempt:
   - **`mktemp`, not a fixed path.** A fixed `/tmp/notes.md` left over from an
     earlier run passed `test -s` and went into the tag, so the tag carried
     notes from a commit that was not the one being tagged.
   - **`>|`, not `>`.** With `noclobber` set, `>` refuses to overwrite and the
     shell moves on; `>|` forces the write in both bash and zsh.
   - **`--cleanup=whitespace`.** `git tag -F` strips lines starting with `#` as
     comments by default, which deletes every Markdown heading from the notes.
     Verify with `git tag -l --format='%(contents)' api-types-v$VERSION` before
     pushing; it should show `### Added` and friends.

5. **The workflow publishes.** The tag push starts it; nothing else is needed.
   It re-checks the tag against `package.json`, the lockfile, the changelog
   date, the `repository` field provenance is validated against, that the
   commit is on `development`, and that `ci.yml` passed for that exact commit.
   Then it builds once, packs one tarball, verifies it, type-checks a consumer
   against it, publishes **that** tarball, and reads the registry back.

   The active beta stream uses the `latest` dist-tag. That is a decision with an
   end: once `1.0.0` ships, `latest` means stable and prereleases move to
   `next`. See `docs/release-automation-design.md` §Dist-tag policy.

   **There are no npm credentials in this repository.** Publishing authority
   comes from a Trusted Publisher configured on npmjs.com, bound to this
   repository and to the workflow filename. **Renaming
   `release-api-types.yml` breaks publishing** until that configuration is
   updated to match. Check it with `npm trust list @cytoscape-web/api-types`.

6. **Verify.** The workflow run's job summary is the primary record — version,
   integrity, the dist-tag it resolves to, and the release notes. Independently:

   ```bash
   git ls-remote --tags origin 'refs/tags/api-types-v1.0.0-beta.4*'
   npm view @cytoscape-web/api-types dist-tags
   npm view @cytoscape-web/api-types@1.0.0-beta.4 \
     version dist.shasum dist.integrity
   ```

   The npm package page should show a **Provenance** panel linking back to the
   workflow run and the tagged commit.

7. **Tell the consumers.** Six files across `cytoscape-web-app-examples` and
   `cy-agent-bridge` pin this package. Their lockfiles hold the old version
   until someone regenerates them, so the breakage arrives on the next
   dependency refresh rather than immediately — which is a reprieve, not
   safety. Rehearse the migration against a local tarball **before** releasing,
   while the version number can still change.

### Why there is no GitHub Release

Releases here are tags, not GitHub Releases. Repository webhook `527149929` is
a Zenodo receiver subscribed to the `release` event with no tag filter, so
**any** GitHub Release published from this repository mints a new version of
the Cytoscape Web software DOI record (10.5281/zenodo.14775458). An api-types
release is not a release of the application and must not appear in that
citation record.

The notes live in the annotated tag (`git show api-types-v<version>`), in the
workflow run's job summary, and in the `CHANGELOG.md` shipped inside the npm
tarball. If a GitHub Release is ever genuinely required, deactivate hook
`527149929` first and reactivate it immediately afterwards.

### If something goes wrong

npm versions are immutable. If the published bundle is wrong, prepare and
release the next version; do not try to overwrite the existing version or move
its Git tag to different content.

If the publish succeeded but a later step failed, **do not delete or move the
tag**. Re-run the workflow against the existing tag:

```bash
gh workflow run release-api-types.yml --ref api-types-v1.0.0-beta.4 -f dry_run=false
```

It compares the registry against the tarball it just built, including the
provenance commit, and resumes at verification instead of refusing.

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
