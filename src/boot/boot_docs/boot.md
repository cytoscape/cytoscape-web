# Boot

How Cytoscape Web starts. Everything on the startup path lives under `src/boot/`.

The formal phase contract is `docs/specifications/STARTUP_SPECIFICATION.md`;
this document is the map of the directory and the reasoning behind its shape.

## Directory

| Path                                                 | Role                                                                 |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| `bootstrap.tsx`                                      | Entry. Wires phases together and renders. Deliberately thin.         |
| `bootPhases.ts`                                      | The pipeline: every phase, its user-facing message, which are fatal. |
| `runBoot.ts`                                         | The phase runner — timing, error classification, abort handling.     |
| `bootState.ts`                                       | What the boot shell displays. Module-scope observable, not Zustand.  |
| `bootError.ts`                                       | Maps a thrown value to actionable copy; per-phase classifiers.       |
| `startAuthentication.ts`                             | Keycloak silent SSO. Started, never awaited.                         |
| `openDatabasePhase.ts`                               | The DB gate, its error copy, and the database-reset recovery.        |
| `shell/`                                             | The boot shell: one markup source, plain-DOM and React renderers.    |
| `shell/bootShellActions.ts`                          | Click dispatch for error-shell recovery buttons; arm-then-confirm.   |
| `metrics/`                                           | User Timing marks and the dev boot report.                           |
| `steps/`                                             | The AppShell half of the boot, one file per step.                    |
| `keycloak.ts`, `tabManager.ts`, `googleAnalytics.ts` | Integrations the boot sets up.                                       |
| `tabId.ts`                                           | This tab's id. Lazy — the DB layer stamps it on every transaction.   |
| `AppBootstrap.tsx`                                   | First React component; swaps in the email-verification modal.        |

## Sequence

```text
index.html
  └─ bootShell chunk           ← injected by bootShellPlugin as the FIRST script
       └─ showBootShell()      ← paints the app-shaped shell   [shell-painted]
  └─ mf-entry-bootstrap        ← downloads the ~700kB shared chunk
       └─ src/index.tsx
            └─ import('./boot/bootstrap')
                 ├─ markBoot('init-exec')                      [init-exec]
                 ├─ createRoot(#root)
                 ├─ phase RUNTIME    enableMapSet, debug, tabManager
                 ├─ startAuthentication()  ← not awaited; overlaps the DB open  [auth-settled]
                 ├─ phase DATABASE   openDatabaseForStartup()   ← the gate; fatal
                 ├─ root.render(<AppBootstrap/>)                [react-render]
                 └─ runOnIdle(analytics)  ← gtag deferred off the boot path
                      └─ <App/>  (prefetched chunk)
                           └─ <AppShell/>  (prefetched chunk)   [app-shell-mounted]
                                └─ runAppShellBoot()
                                     ├─ phase WORKSPACE   workspace + summaries + UI state
                                     ├─ phase DEEP_LINK   :networkId not in workspace
                                     ├─ phase IMPORTS     ?import=<url>
                                     ├─ phase PUBLISH     per-tab network, stores, event bus,
                                     │                   cywebapi:ready  [workspace-hydrated]
                                     │                   + cache-only prefetch of the current network
                                     ├─ phase INTENTS     ?installApp= (fetch + classify)
                                     └─ phase ROUTE       restore URL state, navigate, strip params
                                          └─ <WorkspaceEditor/>          [workspace-editor-mounted]
                                                                          → publishBootReport()
```

## Why it is shaped this way

**The shell chunk exists because nothing in the normal entry graph can paint
sooner.** The generated Module Federation bootstrap awaits its share-scope
setup, which transitively downloads the ~700kB chunk holding react-dom, before
`src/index.tsx` runs at all. So the shell is emitted as a standalone chunk whose
entire import graph is the shell markup, and injected ahead of the MF
bootstrap. Measured on a production build at 4 Mbps: first paint ~250ms against
~1.4s with no shell.

**One shell, one markup source.** `showBootShell()` (plain DOM, pre-React) and
`BootShell.tsx` (React, every Suspense fallback) both render the string from
`bootShellMarkup.ts`. That is why `BootShell` uses `dangerouslySetInnerHTML`:
it makes the handoff provably identical instead of relying on two copies
staying in step. A unit test asserts the two DOMs are byte-equal.

**Error-shell buttons are declared as data, dispatched by id.** A recovery is a
`BootShellError.action` (`id`, `label`, `confirmLabel`, `confirmMessage`); the
handler is registered separately by id in `shell/bootShellActions.ts`. Two
reasons it is split that way: the markup module must stay dependency-free, and
neither renderer can hand a button an `onClick` — both write the shell as an HTML
string — so a single delegated listener on `document` serves both and survives a
repaint. Every action is arm-then-confirm, since the only recovery worth offering
this early is destructive. Today there is exactly one: resetting the database
after a `schema-too-new` open failure (`openDatabasePhase.ts`), which registers
its handler on the failure path rather than at module scope so a healthy boot
pays nothing. It reuses `deleteDb()` — the same primitive as the error page's
"Reset Workspace" button, which cannot be reused directly here because it is MUI
plus react-router and React never mounts on this path.

**The app renders over the SSO check, not after it.** What keeps a logged-in
user's startup requests from going out anonymously is not ordering but
`CredentialStore`'s auth gate: `getToken`/`getParsedToken` block until
`completeAuthInitialization`. Every terminal path in `startAuthentication` must
call it, or credentialed requests hang forever. The cache-first loaders resolve
the token lazily, so a returning user's cached workspace never waits on auth at
all.

**`bootState` is not Zustand.** The pre-React shell chunk imports it, and
pulling zustand + immer in there would put them on the first-paint critical
path and undo the chunk's whole purpose. It follows the module-scope observable
shape of `src/debug.ts` and is consumed via `useSyncExternalStore`.

**`runPhase` returns a result instead of throwing.** A caller physically cannot
let a phase rejection escape and skip the phases after it. This is the guarantee
that keeps `PUBLISH` and `ROUTE` running when an import fails — previously a
throw there left the workspace unpublished and the URL un-cleaned, so reloading
reproduced the same failure while the shell stayed up forever.

**`DATABASE` is the only fatal phase.** Everything else degrades: a failed
workspace read still reaches an empty workspace, a failed import still reaches
a workspace without that network. A dead database cannot be rendered over,
because AppShell's first act is to read from it.

## Working on the boot

- **Add a stage** → add a row to `bootPhases.ts` and a `runPhase` call. Timing
  and error handling come with it.
- **See where the time went** → `?bootReport` for an overlay, `window.debug.boot.report`
  in the console (debug mode), or the User Timing track in DevTools.
- **Simulate a slow SSO check** → `?authDelay` (1500ms) or `?authDelay=4000`. Dev
  builds only; compiled out of production.
- **Reproduce the DB gate** → open DevTools → Application → IndexedDB and bump
  `cyweb-db` to a version above `currentVersion`, or just open a newer branch
  deploy in the same browser profile.
- **Blank workspace?** Clear `cyweb-db`.

## Known rough edges

- `REACT_APP_VERSION` / `REACT_APP_BUILD_TIME` are Vite `define` constants and
  are not substituted when a module is imported outside the app's own graph.
  This is only visible in ad-hoc harnesses; the app and production builds are
  correct.
- A fresh workspace has an empty `currentNetworkId`, so the boot navigates to
  `/{workspaceId}/networks/` and the trailing route renders an empty `<div/>`.
  Harmless, but it is why that route exists.
