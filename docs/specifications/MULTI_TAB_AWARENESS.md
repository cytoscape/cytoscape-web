# Multi-Tab & Cross-Browser Awareness

> Design spec for CW-658. Related tickets: CW-722, CW-652, CW-514.

## 1. Problem

Cytoscape Web persists all state — workspace, networks, visual styles, tables,
UI state — to a single browser-local IndexedDB database (`cyweb-db`). Every
browser tab on the same origin reads and writes that **one shared backend**, so
the app behaves like a desktop application: tabs are windows onto the same
workspace, not independent sessions.

Users do not expect this. Two distinct confusions arise:

- **Same browser, multiple tabs (CW-658, CW-722, CW-652).** A user opens
  network A in tab 1 and network B in tab 2, expecting two independent sessions.
  Instead, a change in one tab can reload the other and/or the tabs fight over
  shared fields (e.g. `currentNetworkId`). There is no signal that the tabs are
  linked.
- **Different browsers / machines (CW-514).** Workspace ids are per-browser
  `uuidv4()`s stored only in that browser's IndexedDB. A "Share" URL embeds a
  workspace id that is meaningless anywhere else, so pasting it into another
  browser opens whatever local workspace already exists there — appearing to be
  "the wrong workspace with unrelated networks."

This document catalogs the ways we can make the shared-backend behavior legible
to users, recommends a minimal implementation (shipped with CW-658), and records
the larger cross-browser identity question as a product follow-up.

## 2. Current behavior (post CW-652 / CW-722)

- `SyncTabsAction` (`src/features/SyncTabs.tsx`) listens to Dexie `db.on('changes')`
  and stamps a shared `timestamp` row on any cross-tab write. On `visibilitychange`
  it reloads the tab (`window.location.reload()`) when another tab wrote newer
  data after this tab was hidden.
  - **CW-652 fix:** reload only fires when a real newer write exists and this tab
    has data — an empty/never-written tab no longer reloads on every refocus
    (`shouldReloadOnRefocus`).
- `AppShell` resolves the displayed network per-tab from the URL, then a per-tab
  `sessionStorage` backstop, then the shared `currentNetworkId`
  (`resolveDisplayNetworkId`).
  - **CW-722 fix:** a cross-tab reload no longer makes a tab adopt the other
    tab's network.

What is still missing, and what CW-658 addresses, is **telling the user** any of
this is happening.

## 3. Awareness options

| # | Option | What the user sees | Pros | Cons | Verdict |
|---|--------|--------------------|------|------|---------|
| A | Transient notice after a cross-tab reload | Info snackbar: "This tab was reloaded to reflect changes in another tab." | Explains the otherwise-mysterious reload; zero config | Only appears at reload time | **Ship now** |
| B | One-time dismissable banner on multi-tab detection | Info banner when a 2nd tab is detected, with "Don't show again" | Proactively sets the mental model once; dismissable | Requires tab detection | **Ship now** |
| C | Persistent status indicator / open-tab count | Small badge/toolbar chip showing "N tabs share this workspace" | Always-visible truth | Screen real estate; low value once understood | Defer |
| D | Single-active-tab lock (`navigator.locks` / leader election) | Non-leader tabs go read-only with a "another tab is active" overlay | Eliminates the fight entirely | Large behavior change; hurts legitimate multi-tab use | Defer (needs product buy-in) |
| E | Cross-browser share identity | Share links that resolve the same network anywhere | Fixes CW-514 at the root | Requires server-side persistence or link redesign | Product follow-up (§5) |

## 4. Recommended minimal implementation (CW-658)

Ship **A + B**, reusing existing infrastructure — no new store.

- **Detection** — `useMultiTabDetection()` uses a `BroadcastChannel`
  (`cyweb-multitab`): a tab announces itself with `ping` on mount; existing tabs
  answer `pong`. Either message marks a tab as "not alone." Degrades to single-tab
  where `BroadcastChannel` is unavailable.
- **Banner (B)** — `MultiTabNotice` renders a dismissable `info` snackbar/alert at
  the app root (`App.tsx`, beside `CookieConsentWidget`, so it is route-independent).
  "Don't show again" persists to `localStorage` (`cyweb.multiTabNotice.dismissed`),
  mirroring the cookie-consent pattern.
- **Reload notice (A)** — before `SyncTabsAction` reloads, it sets a
  `sessionStorage` breadcrumb (`cyweb.crossTabReload`). On the next load,
  `SyncTabsAction` consumes the flag once and pushes an `info` message via the
  existing `MessageStore` / `SnackbarMessageList`.

Pure logic (storage accessors, reload decision, network resolution) is extracted
into helpers with unit tests; the `BroadcastChannel` and lifecycle wiring are thin
glue.

Explicitly **out of scope** for CW-658: options C and D, and the cross-browser
redesign (E).

## 5. Cross-browser identity — product follow-up (from CW-514)

CW-514's root cause is that workspace identity is not portable: the workspace id
in a share URL only means something in the browser that created it. The concrete
CW-514 fixes (hardened URL construction, resilient NDEx import, honest error
messaging) reduce the confusion but do not make a workspace shareable. Options for
a real fix, in rough order of effort:

1. **Network-only canonical share links.** Drop the decorative workspace segment;
   make `/networks/:networkId` the shareable identity (networkId *is* globally
   meaningful via NDEx). Opening it imports/opens that network into the recipient's
   local workspace, with clear messaging that it was added to *their* workspace.
2. **Explicit "added to your workspace" messaging.** Regardless of link shape, when
   a shared network is opened in a browser that didn't have it, tell the user it
   was imported into their existing local workspace rather than implying they are
   viewing the sharer's workspace.
3. **Server-side workspace persistence.** Store workspaces on NDEx so a workspace
   id resolves the same everywhere. Largest effort; genuine cross-device
   continuity. Requires backend work and auth model decisions.

Recommendation: pursue (1) + (2) as the next increment; treat (3) as a longer-term
platform decision.
