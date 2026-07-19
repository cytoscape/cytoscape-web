# Multiple Visual Styles Specification

> How a network owns several named visual styles, how they are persisted in
> IndexedDB and NDEx (CX2), and how the workspace-level style library works.

## 1. Concepts

- **Named style** — a `VisualStyle` plus an `id` (uuid) and a display `name`.
- **Style set** (`VisualStyleSet`) — all named styles owned by ONE network,
  plus `activeStyleId` pointing at the style that is rendered and edited.
  Invariants: at least one entry; `activeStyleId` resolves; entry keys match
  entry ids.
- **Style template** (`StyleTemplate`) — a reusable style in the
  workspace-level **style library**. Applying a template **copies** it into a
  network's style set (copy-on-assign). There are no live references between
  the library and networks, so there is nothing to reconcile on import/export
  and no cross-network edit surprises. Templates never contain bypasses
  (bypass entries reference element ids of a specific network).

Model types live in `src/models/VisualStyleModel/VisualStyleSet.ts`; pure
helpers in `src/models/VisualStyleModel/impl/visualStyleSetImpl.ts`.

## 2. Store layer — working-copy pattern

`useVisualStyleStore` keeps its historical shape: `visualStyles[networkId]`
is ALWAYS the content of the active style (the "working copy"). All existing
visual property mutations (defaults, mappings, bypasses) and all existing
consumers — including Module Federation apps — are untouched.

The new `styleSets[networkId]` holds `{ activeStyleId, styles }` where each
entry is `{ id, name, visualStyle? }`. The ACTIVE entry's `visualStyle` is
`undefined` (its content is the working copy); inactive entries carry their
content inline. This means each style's content lives in exactly one place —
no mirroring, no drift.

Key actions (`StyleSetAction` in
`src/models/StoreModel/VisualStyleStoreModel.ts`):

- `switchStyle(networkId, styleId)` — parks the working copy under the old
  active entry, promotes the target's content to the working copy, and
  **clears the network's undo/redo history** (recorded edits reference the
  previous style and would corrupt the new one when undone).
- `createStyle` / `duplicateStyle` / `renameStyle` / `deleteStyle` /
  `importStyle` — names are de-duplicated ("X" → "X 2"); the last style of a
  network cannot be deleted; deleting the active style activates another.
- `add(networkId, visualStyle, styleSet?)` — registers styles on network
  load. With no `styleSet`, an existing set is PRESERVED and only the working
  copy is replaced (the renderer re-calls `add` after each render pass), or a
  fresh single-style set named "Default" is created for new networks.

`getVisualStyleSetSnapshot(networkId)` /
`assembleStyleSet(state, networkId)` (exported from
`src/data/hooks/stores/VisualStyleStore.ts`) overlay the working copy onto
the set to produce the full model-layer `VisualStyleSet` for persistence and
export.

Persistence note: the store's persist middleware only writes the CURRENT
network's row, but the Vizmapper can target a non-current network
(`ui.activeNetworkView`, e.g. a HierarchyViewer subnetwork) — so every
style-set action explicitly persists the network it mutated, and undo-stack
clears are persisted for that network too. (Plain visual-property edits on
non-current networks remain covered only by the current-network middleware —
pre-existing behavior, unchanged; HierarchyViewer subnetworks are ephemeral
query results with no NDEx save path.)

The style library lives in `useStyleLibraryStore`
(`src/data/hooks/stores/StyleLibraryStore.ts`): write-through persistence per
mutation, `hydrate()` loads once on first use (called when the library dialog
opens).

## 3. IndexedDB persistence

DB version 10 (`src/data/db/index.ts`).

- **`cyVisualStyles`** — one row per network:
  `{ id: networkId, activeStyleId, styles: { [styleId]: { id, name, visualStyle } } }`
  with each `visualStyle` serialized via `serializeVisualStyle` (Maps →
  entry arrays, for Safari).
  - **Legacy rows** (pre-v10: `{ id, visualStyle }`) are normalized on read
    by `getVisualStyleSetFromDb` — wrapped as a single-style set named
    "Default" — and rewritten in the new shape on their next write. No Dexie
    data migration is needed because primary keys did not change.
  - `getVisualStyleFromDb` / `putVisualStyleToDb` remain as
    active-style-only compatibility helpers; `putVisualStyleToDb` preserves
    the row's inactive styles.
- **`cyStyleLibrary`** (new in v10) — one row per template:
  `{ id, name, visualStyle }`.

## 4. NDEx / CX2 persistence

CX2 can only express ONE style per document (the `visualProperties`,
`visualEditorProperties`, `nodeBypasses`, `edgeBypasses` aspects). Multi-style
networks are therefore exported as:

1. The **active** style in the standard aspects — so Cytoscape Desktop, the
   NDEx viewer, and older Cytoscape Web versions render the network exactly
   as the author last saw it.
2. The **full named-style set** in a custom opaque aspect,
   **`cyWebVisualStyles`** — NDEx preserves unknown aspects, so the set
   round-trips losslessly:

```json
{ "cyWebVisualStyles": [{
    "version": "1.0",
    "activeStyleId": "<style id>",
    "styles": [{
      "id": "<style id>",
      "name": "<display name>",
      "visualProperties": { "default": {…}, "nodeMapping": {…}, "edgeMapping": {…} },
      "nodeBypasses": [{ "id": 1, "v": {…} }],
      "edgeBypasses": [{ "id": 2, "v": {…} }]
    }]
}]}
```

Per-style content uses exactly the same encoding as the standard aspects, so
import/export reuses the battle-tested single-style converters
(`buildVisualStyleAspects` in `src/models/CxModel/impl/styleAspectBuilder.ts`
for export; `createVisualStyleFromCx` on a synthetic aspect-fragment document
for import). Converter: `src/models/CxModel/impl/converters/visualStyleSetConverter.ts`.

Rules:

- The aspect is **omitted** when a network has a single style named
  "Default" (the standard aspects already express that) — the common case
  stays clean CX2.
- On import the aspect is validated with zod. Any structural problem
  (malformed shape, dangling `activeStyleId`, duplicate ids, an unsupported
  major `version`, more than `MAX_STYLES_PER_NETWORK` = 50 styles) logs a
  warning and falls back to a single-style set built from the standard
  aspects — a bad aspect can never break network loading. The same cap is
  enforced by the store's `createStyle` / `duplicateStyle` / `importStyle`
  actions, so any set that can be created locally can always round-trip
  through NDEx.
- **Unusable aspects are preserved, never destroyed**: when the importer
  falls back, the RAW aspect stays in `otherAspects` (opaque passthrough),
  and the exporter only drops an opaque copy when it emits a freshly
  regenerated aspect. A document written by a newer format version — or one
  this version cannot parse — therefore survives an open-and-save cycle
  untouched instead of losing its named styles.
- The **standard aspects win for the active style's content**: tools that
  don't know this aspect edit only `visualProperties`, and their edits must
  not be reverted by a stale set entry on re-import.
- On export the aspect is always **regenerated** from the current styles; a
  raw copy arriving via `otherAspects` is dropped (both at import, where it
  is consumed into `CyNetwork.visualStyleSet`, and at export).

`visualEditorProperties` (nodeSizeLocked etc.) remain per-network, not
per-style, matching current behavior.

## 5. UI

`src/features/Vizmapper/StyleManager/` — a selector row at the top of the
Vizmapper panel: switch active style; menu with New (copy of current) /
Duplicate / Rename / Delete; Save Style to Library / Apply Style from
Library (library dialog). All operations mark the network modified.
