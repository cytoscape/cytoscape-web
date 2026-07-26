# Startup Specification

The contract for Cytoscape Web's boot path. Implementation lives in
`src/boot/`; see `src/boot/boot_docs/boot.md` for the directory map and the
reasoning behind it.

## 1. Phases

A phase is a named stage of startup declared in `src/boot/bootPhases.ts` and
executed through `runPhase` (`src/boot/runBoot.ts`). Every phase gets, without
its author doing anything:

- a `performance.mark`/`measure` pair named `cyweb.boot.<phase>`
- the boot shell's status message, if the phase declares one
- error capture, classification and logging
- an abort decision

| Phase | Runs in | Fatal | Message |
| --- | --- | --- | --- |
| `runtime` | `bootstrap.tsx` | no | Loading application... |
| `database` | `bootstrap.tsx` | **yes** | Loading application... |
| `auth` | `startAuthentication.ts` (measured, not run through `runPhase`) | no | — |
| `workspace` | `steps/loadWorkspaceState.ts` | no | Loading workspace... |
| `deep-link` | `steps/resolveDeepLink.ts` | no | Loading workspace... |
| `imports` | `steps/runUrlImports.ts` | no | Importing network... |
| `publish` | `steps/publishWorkspace.ts` | no | Loading network... |
| `intents` | `steps/runInstallIntents.ts` | no | — |
| `route` | `steps/runAppShellBoot.ts` | no | — |

Adding a stage means adding a row and a `runPhase` call. Do not add bare
`await`s to the boot path — that is how the pre-existing pipeline became
untimed and unguarded.

## 2. Rules

### 2.1 A phase must not throw past its runner

`runPhase` returns `{ ok: true, value }` or `{ ok: false, error }`. It never
rejects. Callers must not re-throw a failed result; the point is that a caller
*cannot* accidentally skip later phases.

### 2.2 Only `database` is fatal

A fatal phase aborts the boot: `bootState` switches to the error shell and no
further phase runs. Everything else degrades to a working, if less complete,
application:

| Failure | Outcome |
| --- | --- |
| `workspace` | Empty workspace plus an error message. App is usable. |
| `deep-link` | Workspace without that network, plus a message. |
| `imports` | Other imports still succeed; each failure is reported. |
| `intents` | App not installed; message. Boot continues. |
| `database` | **Boot stops.** Error shell explains and does not mount the app. |

`database` is fatal because AppShell's first act is to read the workspace from
IndexedDB — rendering over a dead database only relocates the failure.

### 2.3 `publish` and `route` always run

`publishWorkspace` is what unblocks `waitForWorkspaceHydration()` and makes the
app usable. `route` is what strips the consumed search params. Neither may be
skipped because an earlier phase failed — if `route` is skipped, a reload
replays the same failing URL. Covered by `steps/runAppShellBoot.test.ts`.

### 2.4 Auth never blocks rendering

The app renders optimistically over the SSO check. Safety comes from
`CredentialStore`'s auth gate, not from ordering. Therefore:

- **Every** terminal path in `startAuthentication` must call
  `completeAuthInitialization()`, exactly once. A path that does not will hang
  every `getToken()` caller for the life of the page.
- The gate opens when the SSO check settles, **before** the email-verification
  lookup that may follow. That lookup is a second network call and must not sit
  on the critical path.
- The outcome is a subscribable source, not a promise. The 4s watchdog can
  publish `UNAUTHENTICATED` before a merely-slow check returns, and a settled
  promise could not be corrected — which used to leave a signed-in user marked
  logged out for the whole session.
- No watchdog on `localhost`/`127.0.0.1`: a developer pointing at a local
  Keycloak should see it hang rather than have it silently downgrade.

### 2.5 The boot shell has exactly one markup source

`bootShellMarkup.ts` produces the HTML; `showBootShell()` and `BootShell.tsx`
both render it. Do not add markup to one renderer only — `bootShell.test.tsx`
asserts the two produce byte-equal DOM, which is what makes the plain-DOM to
React handoff flash-free.

The shell must stay dependency-free. It paints before react-dom and the shared
MUI chunk arrive; a single `@mui/material` import there puts that whole bundle
on the first-paint critical path.

### 2.6 URL params are a mount-time snapshot

The boot both reads the search params and, in `route`, strips them. Steps
receive the snapshot taken when AppShell mounted. Never re-read
`window.location.search` mid-boot — it will eventually see the boot's own
cleanup. Flags needed after `route` (e.g. `?bootReport`) must be captured at
first-chunk load; see `metrics/bootFlags.ts`.

## 3. Milestones and measurement

Point marks, recorded first-write-wins (StrictMode invokes effects twice):

| Milestone | Meaning |
| --- | --- |
| `shell-painted` | Boot shell is on screen. First paint. |
| `init-exec` | The bootstrap chunk started executing. |
| `react-render` | `root.render` returned. |
| `auth-settled` | SSO check settled; the token gate is open. |
| `app-shell-mounted` | AppShell's boot effect fired. |
| `workspace-hydrated` | Stores published; `cywebapi:ready` about to fire. |
| `workspace-editor-mounted` | The editor is on screen; no boot shell remains. |

Milestones are named for what happened, not for what a reader might infer:
`workspace-editor-mounted` does not mean the canvas finished drawing.

`publishBootReport()` fires at the last milestone and folds in the browser's
own metrics (FCP, TTFB, transfer size) plus the build's version and commit.
Available via `window.debug.boot.report` in debug mode and as an overlay under
`?bootReport`.

**There is no CI budget on any of this.** A first-paint regression is visible
while developing but nothing fails a build over it. Playwright also runs only
against the dev server, so `bootShellPlugin` — which is build-only — has no
automated coverage; its injections must be checked against a real
`npm run build` (the plugin warns rather than failing, since a miss is
otherwise silent).

## 4. Reference measurements

Production build, 4Mbps / 100ms latency, median of 5 cold loads. Recorded so a
future change has something to compare against; re-measure rather than trusting
these.

| Milestone | ms |
| --- | --- |
| first contentful paint | 264 |
| `shell-painted` | 247 |
| `init-exec` | 1630 |
| `react-render` | 1645 |
| `app-shell-mounted` | 3194 |
| `workspace-hydrated` | 3224 |
| `workspace-editor-mounted` | 4148 |

The gap from `shell-painted` to `init-exec` is the Module Federation shared
chunk downloading; that is the cost the boot shell exists to cover, not a
regression.

## 5. Related

- `src/boot/boot_docs/boot.md` — directory map and design reasoning
- `docs/specifications/ROUTING_SPECIFICATION.md` — search params and navigation
- `docs/specifications/DEBUG_GUIDE.MD` — logging policy
