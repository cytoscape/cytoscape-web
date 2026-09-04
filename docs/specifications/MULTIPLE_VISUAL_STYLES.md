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
  workspace-level **style library**, labelled **Workspace Styles** in the UI
  (#704; code and DB names keep "library"). Applying a template **copies** it
  into a network's style set (copy-on-assign). There are no live references between
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
  active entry and promotes the target's content to the working copy. Returns
  whether it switched. **Preserves the undo/redo history**; see below.
- `createStyle` / `duplicateStyle` / `renameStyle` / `deleteStyle` /
  `importStyle` — names are de-duplicated ("X" → "X 2"); the last style of a
  network cannot be deleted; deleting the active style activates another.
  `deleteStyle` **clears the network's undo/redo history** (any style, not just
  the active one).

### Switching is an undoable edit

A recorded edit names a visual property and a network, never a style, so
replaying one applies it to whatever style is active at the time. Switching used
to clear the undo history for that reason.

Instead, the switch itself is recorded as `UndoCommandType.SWITCH_STYLE` with
`undoParams: [networkId, previousStyleId]` and `redoParams: [networkId,
nextStyleId]` — ids only, never style content, so the stack stays small and
serializes cleanly. Undoing past a switch therefore restores the previous style
**before** older edits replay, and each edit lands on the style it was recorded
under. The regression test for this is in `useUndoStack.test.tsx` ("restores the
style before undoing edits recorded under it").

Two consequences:

- `switchStyle` must not clear the history — it would destroy the very edit the
  caller pushes for the switch.
- `deleteStyle` must clear it, for **any** style: a `SWITCH_STYLE` edit naming a
  deleted style cannot be replayed, and dropping just that edit would leave the
  older ones landing on whichever style happened to be active. This is the one
  irrecoverable case, and delete is rare and confirmation-gated.

The undo command map calls `switchStyle` and **throws** when it returns false, so
an unreplayable switch is discarded by the runner rather than silently moving to
the redo stack as though it had worked.

**Copying a style in is undoable too**, and records the same `SWITCH_STYLE`
command. Copying changes how the network looks exactly as much as switching does,
so leaving Undo greyed out afterwards reads as undo being broken. Only the
**switch** is recorded, not the import: undo reverts which style is active and
leaves the copy in the list. Deleting it on undo would mean carrying the style's
whole content in `redoParams` so redo could recreate it, and the undo stack is
persisted to IndexedDB — a stack of 30kB styles does not belong there. The
leftover style is inert until selected, and deletable.

Callers pass the mutated network explicitly as `postEdit`'s optional last
argument. `postEdit` otherwise infers the target from live store state, while a
component's own target network is often `useEffect`-derived — for one render
after the focus changes the two disagree, and the edit would be filed against a
network it never touched.

- `add(networkId, visualStyle, styleSet?)` — registers styles on network
  load. With no `styleSet`, an existing set is PRESERVED and only the working
  copy is replaced (the renderer re-calls `add` after each render pass), or a
  fresh single-style set named "Default" is created for new networks.

`getVisualStyleSetSnapshot(networkId)` /
`assembleStyleSet(state, networkId)` (exported from
`src/data/hooks/stores/VisualStyleStore.ts`) overlay the working copy onto
the set to produce the full model-layer `VisualStyleSet` for persistence and
export.

Persistence note: the store's `persistNetworkSlices` middleware diffs slices per
network, so it writes whichever network's style actually changed — including a
non-current one, which the Vizmapper can target via `ui.activeNetworkView` (e.g.
a HierarchyViewer subnetwork). Named-style **metadata** (create / rename / delete
/ switch) lives outside the slice the middleware watches, so those actions call
`persistStyleSetOf()` for the network they mutated; `deleteStyle` persists its
undo-stack clear the same way. The middleware assembles the whole style set at
flush time rather than writing the changed slice alone, so a row never loses its
inactive styles.

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

`src/features/Vizmapper/StyleManager/` — a row at the top of the Vizmapper
panel showing the active style's **thumbnail and name**, plus a management menu
(New (copy of current) / Duplicate / Rename / Delete; Save Style to Workspace /
Apply Style from Workspace). All operations mark the network modified — the
undoable ones through `postEdit`, the rest through an explicit
`setNetworkModified` in `StyleManager` (#680). "Save Style to Workspace" is the
exception: it writes only the browser-local style library and leaves the
network untouched.

Clicking the row opens **`StylePickerDialog`**, a modal grid of style previews in
four sections. The sections exist because a style belongs to one network and
moving one across networks copies it (§1) — they are what tell the user whether a
click switches or copies:

| Section          | Source                                  | A click…                    |
| ---------------- | --------------------------------------- | --------------------------- |
| This Network     | `styleSets[networkId]`                  | switches (undoable)         |
| Other Networks   | `getStyleSetMetadataFromDb` (IndexedDB) | copies in via `importStyle` |
| Workspace Styles | `useStyleLibraryStore`                  | copies in via `importStyle` |
| General Styles   | `PRESET_VISUAL_STYLES`                  | copies in via `importStyle` |

Cytoscape Desktop pools every style into one flat list instead; it can only do
that because its styles are session-global and shared live.

Also: a search field filtering all sections, per-tile Rename / Duplicate /
Delete, and selection shown by both a ring and a check badge (never colour
alone).

### Naming: "Default" is a non-name

A CX2 network expressing one style in the standard aspects registers it as
`DEFAULT_STYLE_NAME`, so in a workspace of ten networks **every** network owns a
style called "Default". The name then identifies nothing, and the picker — which
shows many networks side by side — is where that becomes a problem.

Stored names are deliberately left alone: §4's exporter omits the
`cyWebVisualStyles` aspect precisely when a network has a single style named
"Default", so renaming on load would force that aspect into every document for no
gain. `StyleManager/styleNaming.ts` resolves names at display and copy time
instead.

- **Other Networks tiles lead with the network name**, with the style name as the
  secondary line. Reversed from what reads naturally, because the network is the
  identifying half. Keeping the style name as the subtitle is what stops two
  styles from one network ("Default", "Default 2") collapsing into two identical
  tiles. Search matches either line.
- **A copy takes its source's name when its own says nothing**
  (`copiedStyleName`). A copy of "Big Labels" stays "Big Labels"; a copy of
  "Default" from `Zhang18_27559151` becomes `Zhang18_27559151`. Otherwise the
  copy arrives as yet another anonymous "Default 2" and every trace of its origin
  is lost on arrival. `importStyle` still de-duplicates, so two copies from one
  network become "X" and "X 2". This matches what Cytoscape Desktop's style names
  look like in practice ("galFiltered Style", "CV_DMV_systems_map").

Provenance is therefore carried by the copy's **name**, not by a stored field —
recording an origin on `NamedVisualStyle` would mean a model, persistence and CX2
change for information the name already conveys.

### Duplicate suppression

Copying is a copy, not a reference, so a style pulled from network B lives in the
current network permanently — and B's own picker then lists that copy beside B's
original, identical in every respect. Left alone, the list grows a duplicate for
every copy ever made, which is the failure mode of a workspace-wide listing built
on copy-on-assign.

`styleFingerprint` (`StyleManager/styleFingerprint.ts`) hides a foreign style when
the current network already holds byte-identical content, and the picker states
how many it hid rather than filtering silently. Notes:

- Fingerprints go through `serializeVisualStyle`, not `JSON.stringify` directly:
  bypasses and discrete mappings are Maps and would stringify to `{}`, making
  styles that differ only in their mappings look identical.
- It detects **copies**, not semantic equivalence. Two styles built separately to
  look alike may serialize in different key order and both stay visible. That is
  the safer bias: a false "these are the same" hides a style the user still needs.
- Two untouched networks both carrying a pristine default style **are** identical
  and one will be hidden. This is intended — copying it would change nothing.
- Cached in a `WeakMap` keyed by the style object, so an edited style is a natural
  miss and reappears once it genuinely differs.

### Thumbnails

`StyleManager/preview/` renders each thumbnail through the **same pipeline as the
canvas** — `applyVisualStyle` → `addCyElements` → `createCyjsDataMapper` →
`applyViewModel` → `cy.png()` — so a preview cannot drift from what the network
will actually look like.

- **Drawn on a sample of the network being viewed** (`sampleFromNetwork`, ~8
  nodes, reusing existing view positions so no layout runs), not on a fixed
  two-node graph. A two-node graph has no attribute values, so mapping-driven
  styles would all collapse to their defaults and become indistinguishable.
  Styles from other networks and from the library are previewed on that same
  sample, which is what applying them _here_ would look like.
  `syntheticSample()` is the Source → Target fallback when no network is loaded.
- **Bypasses are stripped** (`stripBypasses`): they key off one network's element
  ids.
- **One offscreen cytoscape instance** for the whole app, with renders serialized
  through a queue — not one instance per tile.
- **Cache is a `WeakMap<VisualStyle, …>`.** The store's Immer middleware hands
  out a fresh object on every mutation, so an edited style is automatically a
  miss and an unedited one a hit, with no hashing and no stale thumbnails.
- Tiles render lazily under an `IntersectionObserver`.

Note for tests: jsdom cannot rasterize a canvas, so component specs mock
`preview/renderStylePreview`. `previewSample.ts` is pure and tested directly.

### Querying other networks' styles

Only the current network's styles are in memory — summaries load for every
workspace network at boot, but style sets are registered only when a network is
opened. `getStyleSetMetadataFromDb(ids)` (`src/data/db/index.ts`) fills the gap
with **one `bulkGet`** returning names only: a stored style's `name` is a plain
string in the row, so this skips both `deserializeVisualStyle` and the zod
validation pass. Content is deserialized later, per network, by the existing
`getVisualStyleSetFromDb`.

- A legacy (pre-v10) row has no style id of its own — `getVisualStyleSetFromDb`
  mints a fresh uuid per read — so metadata reports `LEGACY_STYLE_ID` as both the
  entry id and the active id. Resolve content by looking a style up by id and
  **falling back to the set's active style**, which is correct for every row
  shape.
- A network never opened has **no row**, so it is absent from the result and the
  picker reports the count rather than silently omitting it. Its styles exist
  only in the CX2 on the server.
