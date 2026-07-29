# Multi-tab behavior

> Design spec for cross-tab synchronization. Related tickets: CW-658, CW-722,
> CW-652, CW-514.

## 1. The situation

Cytoscape Web keeps a workspace in IndexedDB (`cyweb-db`), which is scoped to the
origin, not to the tab. Every tab a user opens on the same host therefore reads
and writes **one shared database**. That is the root fact this document is about:
tabs are not independent apps, they are concurrent views onto shared state.

Two consequences follow, and they pull in opposite directions:

- Shared **document** state must propagate. If one tab renames a network, the
  others are showing something false.
- Shared **view** state must not propagate. If one tab switches network or
  collapses a panel, the others must not follow.

The original implementation ignored the distinction and reloaded the whole page
(`window.location.reload()`) whenever another tab wrote to the database. That was
disruptive, lost in-flight work, and still got the view/document split wrong.

Workspace identity is also per-browser, so a share link cannot resolve the same
workspace on another machine (CW-514). That is a product-level gap, unchanged by
this design; see §7.

## 2. How it works now

### 2.1 One transport: `db.on('changes')`

`dexie-observable` maintains a `_changes` table and fires `db.on('changes')` in
**every** tab for **every** change — each tab replaying the rows above the
revision it last saw. Cross-tab sync subscribes to exactly that, in
`src/features/SyncTabs.tsx`.

There is deliberately **no BroadcastChannel carrying sync data**. An earlier
design relayed changes over a `cyweb-db-sync` channel, which was both redundant
and harmful:

- Every tab already received the change directly, so a peer would re-broadcast
  it and the originating tab would hydrate its own write — clobbering its own
  local state.
- BroadcastChannel has no replay. A tab that was frozen or bfcached when a
  message was posted missed it permanently; the `_changes` log always catches up.

### 2.2 Origin tagging

A tab has to ignore its own writes. `stampTransactionSource` in
`src/data/db/index.ts` overrides Dexie's `_createTransaction` to set
`trans.source` to this tab's id (`src/data/tabState/tabId.ts`).
`dexie-observable` copies that onto every `_changes` row, so the listener filters
with `change.source !== getTabId()`.

The id is per-document and deliberately NOT persisted. It does not need to be:
filtering own writes only requires uniqueness for the lifetime of one page, and
replay positioning is dexie-observable's own syncNode revision, not our id. An
earlier version stored it in `window.name` — which is writable by any script on
the page (a federated app, an auth redirect, a third-party widget) and is copied
by "Duplicate tab", giving two live tabs one id and making each ignore the
other's edits. `window.name` still carries the _addressable_ tab name for
`window.open(url, tabId)` focusing (`src/boot/tabManager.ts`); that is a separate
concern with a separate failure mode.

The cost of not persisting it: a `_changes` row written immediately before a
reload reads as foreign afterwards, so the tab hydrates that one write itself.
It lands during boot, where the sync gate buffers it and hydration dedupes it to
a single read.

`_createTransaction` is a Dexie internal, so this is defended three ways:

1. `db.test.ts` asserts `_changes` rows really do carry the tab id, so a Dexie
   upgrade fails CI rather than silently regressing to an echo loop.
2. `verifyTransactionSourceStamp()` runs once per boot from
   `openDatabaseForStartup` and logs an error if the hook stopped firing — CI
   only protects builds someone ran the suite against; this is visible in the
   field.
3. `dexie` and `dexie-observable` are pinned to exact versions, so the internal
   cannot move under a `^` range bump. **A Dexie 4 migration must re-validate
   this hook**, with the `db.test.ts` stamp assertions as the acceptance gate.

If the stamp is lost anyway, every change reads as foreign and each tab
re-applies its own writes. That is wasteful rather than corrupting, and the apply
tasks are written to keep it that way: the `viewSelections` case — the only one
that overwrites local state outright instead of merging into it — compares
against the current selection and returns early when they match, so an echo
cannot clear a user's live selection.

### 2.3 Hydration: fetch, then apply

`hydrateFromCrossTabChange` (`src/data/sync/crossTabHydration.ts`) runs in two
phases, and the split is the whole point:

1. **Fetch** (async) — dedupe the batch to one entry per row, then read every
   affected row. No store is touched and no write suppression is in effect.
2. **Apply** (synchronous) — set the suppression flag, run every prepared
   mutation, clear it. There is no `await` in this phase.

Because JavaScript is single-threaded and the apply phase never yields, no user
interaction can interleave with it. The earlier version held the suppression flag
across the awaited reads, so **any edit a user made during those reads was
applied to Zustand but silently never persisted** — and `persistNetworkSlices`
only diffs before/after of the current `set`, so nothing recovered it. Regression
tests: `src/data/sync/crossTabHydrationConcurrency.test.ts`.

The flag itself is still needed: applying a peer's change without it would
re-persist that change locally, minting a fresh change record for every other tab
to hydrate in turn. Every store that hydration writes to must consult
`isHydrating()` before persisting.

### 2.4 Initialization gate

`SyncTabsAction` mounts with `AppShell`, before `initializeAppShell` has finished
loading the workspace. Hydrating during that window would race initialization, so
`src/data/sync/crossTabSyncGate.ts` holds hydration until init settles. Changes
seen in the meantime are **buffered, not dropped** — a change written after
init's read would otherwise leave the tab stale until the next unrelated edit.

## 3. What is shared and what is not

| State                                                           | Scope       | Where it lives                                                                |
| --------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------- |
| Networks, tables, visual styles, node positions, opaque aspects | **Shared**  | `cyNetworks`, `cyTables`, `cyVisualStyles`, `cyNetworkViews`, `opaqueAspects` |
| Network summaries, workspace `networkIds`                       | **Shared**  | `summaries`, `workspace`                                                      |
| Node/edge selection                                             | **Shared**  | `viewSelections` (own row since v11)                                          |
| Filters                                                         | **Shared**  | `filters`                                                                     |
| Undo/redo stacks                                                | **Shared**  | `undoStacks`                                                                  |
| Column widths, visual style options, custom tab names           | **Shared**  | `uiState`                                                                     |
| Which network this tab shows                                    | **Per-tab** | URL, then `sessionStorage` (`tabNetwork.ts`)                                  |
| Panel open/closed, active tab indices                           | **Per-tab** | `sessionStorage` (`tabViewState.ts`)                                          |
| Camera pan/zoom                                                 | **Per-tab** | in-memory `RendererStore`                                                     |
| Error dialogs, popups                                           | **Per-tab** | in-memory `UiStateStore`                                                      |

**Per-tab state is kept out of the shared rows, not filtered on read.** Masking
it during hydration was not enough: the shared row still carried the field, so
the next local mutation wrote this tab's private value straight back into it, and
a newly opened tab inherited whatever tab happened to write last.
`withoutTabNetworkId` (WorkspaceStore) and `withoutTabViewState`
(`tabViewState.ts`) strip these fields before the row is persisted. They are
blanked rather than omitted, so stored rows still satisfy the validators.

Per-tab network resolution (CW-722) has a fixed priority: the tab's own URL, then
its `sessionStorage` backstop, then the first network in the workspace. Both
per-tab signals require workspace membership, since either can be stale after
another tab removes a network.

### 3.1 Why selection has its own row

Selection is shared, but it used to live inside the `cyNetworkViews` row. Since
it is also the highest-frequency thing a user changes, every click rewrote the
entire view model — node positions included — and made every other tab replace
its whole view model on hydration.

DB v11 moves it to `viewSelections`, keyed by network id. A selection change now
writes two small id arrays, and the view row it no longer touches stays
byte-identical, so `dexie-observable` records no change for it at all.
`getNetworkViewsFromDb` merges selection back in, so `NetworkView` is still whole
above the DB layer.

**Existing workspaces.** There is no Dexie upgrade function for v11 — the schema
change is additive and no stored data is transformed, so an existing workspace
opens normally and no network, table, style, view or position is touched. Only
selection needed care, and only for one narrow reason: reading a pre-v11 row falls
back to its inline `selectedNodes`/`selectedEdges`, but the _next_ write of that
row strips them (`withoutSelection` in `ViewModelStore`), and if no
`viewSelections` row existed yet the inline copy was the only copy. A node move or
a layout would then have discarded a selection the user could still see.

So `getNetworkViewsFromDb` back-fills: when it finds a legacy row with a non-empty
inline selection and no `viewSelections` row, it writes one. Lazy rather than an
upgrade function, because it is provably sufficient — a view row is only rewritten
for a network whose slice is in the store, which means a network the user opened,
which means this read already ran for it — and an upgrade would have to touch
every `cyNetworkViews` row at open time to buy nothing. Nothing is written when
the legacy selection is empty, so opening a workspace does not mint change records
for every network in it.

### 3.2 Camera recovery without a cross-tab message

When another tab re-runs a layout, coordinates can move far enough that a tab
holding its own pan/zoom is left looking at blank canvas. Each tab handles this
locally: on hydrated position changes, `isGraphVisible`
(`src/features/NetworkPanel/CyjsRenderer/viewportRecovery.ts`) checks whether the
graph's bounding box still intersects the viewport, and only then re-fits.

This replaced a `FIT_NETWORK` BroadcastChannel message that made peers discard
their saved viewport so a later effect would incidentally call `cy.fit()`. It
fired on every `updateNodePositions` — including undo/redo and the scaling slider
— so it repeatedly yanked other tabs' cameras, and it depended on arriving before
the position data on a separate channel.

## 4. Destroying the database

`resetWorkspace` deletes the whole database, which every other tab still has
open — and IndexedDB will not delete a database with live connections. The
handshake in `src/data/db/lifecycle.ts`:

1. deleter posts `DATABASE_DELETED`
2. peers close their connection and post `DATABASE_DELETED_ACK`
3. deleter waits a short grace period, then deletes
4. deleter posts `DATABASE_RESET_COMPLETE`
5. peers reload, against a database that is already gone and recreated

Every wait is bounded, in both directions: a wedged tab must not stop a user
resetting their workspace, and a deleter that dies must not leave peers stuck.
The previous version announced and deleted immediately while peers reloaded at
once, so a reload could re-create the database mid-delete — the "ghost workspace"
the announcement existed to prevent.

BroadcastChannel is correct here: this is a liveness signal, not data. There is
nothing to replay, and it has to arrive _before_ the data it refers to is gone.

## 5. Known limitation: last writer wins

There is **no revision check and no conflict resolution**. Hydration reads a
row's current value and applies it. Two tabs editing the same network
concurrently will silently lose one side's edit.

This is acceptable for the common case — one tab active, others idle — and not
for genuine concurrent editing. Fixing it properly needs either per-row revisions
with a merge policy, or operational transforms. Anyone adding a feature that
encourages simultaneous editing in two tabs should treat this as a prerequisite,
not a detail.

## 6. Adding a new synced table

1. Add the object store in `src/data/db/index.ts` and bump `currentVersion`.
   Never edit a released version's schema — Dexie will not re-run a version a
   client already has on disk.
2. Add a `case` to `prepareChange` in `src/data/sync/crossTabHydration.ts`. The
   fetch half may `await`; the returned apply function must be synchronous.
3. Guard every DB write in the owning store with `isHydrating()`. Without this
   the table write-loops across tabs. Conversely, do **not** add the guard to a
   store whose table is not hydrated — it can then only drop legitimate writes.
4. If the table is per-network rather than workspace-wide, confirm
   `isRelevantToThisTab` in `SyncTabs.tsx` classifies it correctly.
5. Add it to `DatabaseSnapshot` and the import key map in
   `src/data/db/snapshot/index.ts`.

## 7. Cross-browser identity — product follow-up (CW-514)

Nothing above helps across browsers or machines: a workspace id is minted
per-browser and lives only in that browser's IndexedDB, so a share link cannot
resolve the same workspace elsewhere.

What is fixed is the failure mode. Share-URL construction is validated
(`shareUrl.ts`), NDEx import failures no longer abort startup, and a network
requested in the URL that cannot be imported keeps its id in the address bar with
an explicit error, instead of silently redirecting the user to an unrelated local
network. Making workspace identity genuinely portable requires server-side
persistence or a redesigned link format, and remains open.
