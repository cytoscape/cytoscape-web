# Remote App Loading Modernization

> Status: **In progress** (2026-06-18)
> Branch: `feature/vite-from-webpack`
> Related: [vite-migration-federation-test-hardening.md](./vite-migration-federation-test-hardening.md)

## Background — how the gap was found

While implementing Tier 3.2 of the federation test-hardening plan (a real
host-loads-a-remote E2E), the fixture remote — built with
`@module-federation/vite` — failed to load with:

```
Cannot use import statement outside a module
```

## Root-cause findings

1. **The host injects remotes as _classic_ scripts.** `ExternalComponent.tsx`
   created a `<script type="text/javascript">` and read the container from
   `window[scope]`. A classic script cannot parse the top-level `import`
   statements in a modern (`@module-federation/vite`) ESM `remoteEntry.js`, so
   the remote threw before registering its container.

2. **The loader was hand-rolled, not the MF runtime.**
   `@module-federation/runtime` is installed (transitively via the Vite
   federation plugin) but was unused. `ExternalComponent.tsx` reimplemented
   script injection, container caching, and `init`/`get` orchestration by hand
   (~150 lines).

3. **Remotes were initialized with an _empty_ share scope.** The loader called
   `container.init({})` (`remoteShareScope = { default: {} }`). Shared
   singletons were therefore never wired: every remote bundled and used its own
   React / ReactDOM / MUI. Because the public app API passes React **context**
   into apps (e.g. `AppIdContext`), and React context does not cross two
   separate React instances, any React-based plugin consuming host context was
   on unsound footing.

4. **The example apps were webpack-era.** The classic-script contract existed
   because the original example apps were built with webpack
   `ModuleFederationPlugin`, whose `remoteEntry.js` self-registers a global. The
   Vite migration moved the host to ESM but left the consumer-side loader on the
   webpack-era contract.

There are **no third-party apps deployed yet**, so backward compatibility with
the classic contract is not required — this is the right time to modernize.

## Three-stage plan

### Stage 1 — ESM remote loading

Replace classic-script injection with a dynamic `import()` of the remote's
`remoteEntry.js`, reading `{ init, get }` from the ES module namespace. The
fixture becomes a real `@module-federation/vite` ESM remote so the Tier-3.2 E2E
validates the actual production artifact.

### Stage 2 — Adopt the Module Federation runtime ✅

Replaced the bespoke injection/caching with the global `@module-federation/runtime`
(`registerRemotes` / `loadRemote`), retiring the hand-rolled loader. Remotes are
registered with `type: 'module'` so the runtime's `loadEsmEntry` imports the ESM
`remoteEntry.js` via dynamic `import()` (the runtime otherwise defaults to
classic `<script>` injection, which fails on ESM). Module ids are addressed as
`<scope>/<expose>` (the `cyweb/`-style `./Expose` prefix is stripped). This sets
up Stage 3, where the runtime's managed share scope wires true singletons.

### Stage 3 — True shared singletons ✅

Adopting the host runtime in Stage 2 already made the remote resolve the host's
React (a remote hooks-component renders inside the host tree without an "invalid
hook call"). Stage 3 completes the shared set: **`@emotion/react` and
`@emotion/styled` are now shared singletons** alongside `react`, `react-dom`,
and `@mui/material` (in `FEDERATION_SHARED_SINGLETONS`). Without shared Emotion,
a MUI-using remote would create a second Emotion cache (duplicated styles,
broken theming) even with MUI itself shared.

Tests:
- `verify:federation` asserts all five singletons register in the built bundle.
- The Tier-3.2 E2E now registers an `apps-menu` resource whose component calls a
  React hook; the host renders it in its own tree and the test asserts it
  appears with no hook-call error — a behavioral proof of a single shared React
  across the boundary (the `AppIdContext`-across-remotes hazard from finding #3).

## Test coverage

- Tier 3.2 E2E (`test/playwright/remote-app-load.spec.ts`) — real remote load.
- `ExternalComponent` unit tests — loader contract via an injectable importer.
- Stage 3 adds a single-React-instance assertion across the boundary.
