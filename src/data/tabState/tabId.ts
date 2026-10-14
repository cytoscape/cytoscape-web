/**
 * Per-tab identity for cross-tab data sync.
 *
 * Cross-tab sync needs to know which browser tab caused a given IndexedDB
 * change, so a tab can ignore the echo of its own writes. That id is stamped
 * onto every Dexie transaction as `trans.source`, which dexie-observable records
 * on each `_changes` row (see `src/data/db/index.ts`).
 *
 * ## Why this is not persisted
 *
 * The id only has to be unique among *live* tabs for the lifetime of one page.
 * It does not need to survive a reload: replay positioning is dexie-observable's
 * own syncNode revision, not this id.
 *
 * It used to live in `window.name`, which was wrong on both counts:
 *
 * - `window.name` is writable by anything running on the page — a federated app,
 *   an auth redirect, a third-party widget. An overwrite mid-session silently
 *   changes this tab's `trans.source`, and it starts hydrating its own writes.
 * - It is COPIED by "Duplicate tab" (as is sessionStorage), so two live tabs end
 *   up sharing one id and each ignores the other's edits — a worse failure than
 *   self-hydration, and a silent one.
 *
 * A module-scope value has neither problem: unreachable from outside, and a
 * duplicated tab is a fresh document and so mints its own.
 *
 * The cost is one benign self-hydration per reload: a `_changes` row written
 * immediately before the reload reads as foreign afterwards. It arrives during
 * boot, where `crossTabSyncGate` buffers it and hydration dedupes it to a single
 * read.
 *
 * `window.name` still carries the tab's *addressable* name, so an external app
 * can focus an existing tab with `window.open(url, tabId)`. That is a separate
 * contract with a separate failure mode, and it lives in `./tabManager`.
 */

export const CYWEB_TAB_PREFIX = 'cyweb'

/** Resolved once per document, then memoized. */
let cachedTabId: string | null = null

/**
 * `Date.now()` alone collides when two tabs initialize in the same millisecond —
 * a session restore reopening a window full of them — so mix in a random suffix.
 *
 * Deliberately not `crypto.randomUUID()`: that is only defined in a secure
 * context, so it throws when the app is served over plain HTTP — reaching a dev
 * server by LAN IP from another machine, for instance. This works everywhere,
 * including in a worker with no `window`.
 */
const mintTabId = (): string =>
  `${CYWEB_TAB_PREFIX}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

/**
 * Stable id for this document, created on first call.
 *
 * Lazy so that importing this module has no side effects, which matters because
 * `CyDB` is constructed at module-import time — before boot runs.
 */
export const getTabId = (): string => {
  if (cachedTabId === null) {
    cachedTabId = mintTabId()
  }
  return cachedTabId
}

/** Test-only: forget the memoized id so a test can simulate a fresh tab. */
export const resetTabIdForTesting = (): void => {
  cachedTabId = null
}
