# Onboarding Feature

## Overview

The Onboarding feature introduces new users to Cytoscape Web without sending them
to an external site. It has three layers:

1. **Concept primer** — a first-run Welcome dialog that explains the core ideas
   (Workspace, Networks, Visual Styles, Tables, Hierarchies).
2. **Interactive guided tour** — a spotlight walkthrough (react-joyride) that
   points at the real UI: the toolbar, loading data, the workspace panel, the
   canvas, quick network actions (fit / layout), the table browser, and styling.
3. **Persistent access** — a **Help → Take a tour** menu item that relaunches the
   tour any time, alongside the existing external **User Manual** link.

The existing external manual (`web-manual.cytoscape.org`) is unchanged; this
feature is the in-app complement.

## Architecture

- **State**: `store/OnboardingStore.ts` — a Zustand + Immer store persisted to
  `localStorage` under `cyweb.onboarding` (see `store/onboardingPersistence.ts`).
  This matches the app's existing `cyweb.*` "seen once" convention and keeps
  onboarding self-contained rather than expanding `UiStateStore`.
- **Content**: `content/concepts.ts` — the single source of truth for the
  concept-primer copy, as typed data rendered with MUI (no markdown/HTML
  injection).
- **Tours**: `tours/` — a declarative registry. `tours/types.ts` defines
  `TourStepDef`/`TourDef`; `tours/gettingStarted.ts` is the flagship tour;
  `tours/registry.ts` aggregates all tours. Tour steps are **pure data** (no
  imported side effects) so the CI anchor test can import the registry safely.

## Component Structure

Main components:

- `OnboardingHost.tsx` — mounted once at the App root (beside the cookie / multi-
  tab notices). Waits for the app to be ready (`cywebapi:ready` event, with an
  8s fallback), then shows the Welcome dialog on first run. Always renders the
  `TourRunner` (a no-op unless a tour is active).
- `WelcomeDialog.tsx` — the first-run concept carousel with "Take the tour" and
  "Explore on my own" actions.
- `TourRunner.tsx` — wraps react-joyride. Reads `activeTour` from the store,
  maps the tour's `TourStepDef`s into Joyride steps, applies each step's
  `openPanel` before-hook (via `utils/tourActions.ts`), and records
  completion / dismissal back into the store.

Supporting:

- `store/OnboardingStore.ts`, `store/onboardingPersistence.ts`
- `tours/{types,gettingStarted,registry}.ts`
- `content/concepts.ts`
- `utils/tourActions.ts` — opens workspace panels (reuses `UiStateStore`).
- `../ToolBar/HelpMenu/TakeATourMenuItem.tsx` — the relaunch entry point.

## Behavior

- **First run** (no `cyweb.onboarding` / `hasSeenWelcome === false`): after the
  app is ready, the Welcome dialog appears. "Take the tour" starts the Getting
  Started tour; "Explore on my own" (or closing) marks the welcome seen. Either
  choice sets `hasSeenWelcome`, so the dialog does not reappear.
- **Guided tour**: steps are shown sequentially (continuous mode). A step whose
  target only exists with a network loaded is marked `requiresNetwork`; if the
  target is absent, the tour auto-advances (TARGET_NOT_FOUND → next), so it
  flows whether or not a network is on screen. Steps with `openPanel` open the
  relevant panel first so the target is mounted.
- **Relaunch**: Help → Take a tour starts the tour on demand at any time.
- **Completion**: finishing records the tour id in `completedTours`; skipping /
  closing just clears the active tour.

## Integration Points

- **`cywebapi:ready`** event dispatched by `AppShell.tsx` — first-run trigger.
- **`UiStateStore`** (`setPanelState`) — tour before-hooks open panels.
- **`App.tsx`** — mounts `<OnboardingHost />` at the root.
- **`ToolBar/HelpMenu`** — hosts the "Take a tour" relaunch item.
- **`data-testid` surface** — tour steps anchor to existing testids.

## Design Decisions

- **localStorage over IndexedDB/UiStateStore**: onboarding "seen" state is tiny
  and best kept self-contained; it follows the existing `cyweb.*` flag pattern
  and avoids growing the deprecated-for-federation `UiStateStore` interface.
- **Pure-data tour registry + declarative `openPanel`**: keeps tours reviewable
  in one place and lets the Playwright anchor test import them without pulling
  in React/Zustand runtime.
- **Structured content instead of markdown**: the concept copy is app-authored,
  so typed data rendered with MUI is safer (no `dangerouslySetInnerHTML`, which
  the codebase otherwise never uses) and stays type-checked.
- **Auto-skip missing targets**: makes the tour resilient to app state (e.g. no
  network loaded) without a hard dependency on live NDEx.

## Maintainability (anti-staleness)

`test/playwright/onboarding-tour-anchors.spec.ts` enumerates the tour registry
and fails CI if any step's `data-testid` matches neither the running app nor a
literal testid in component source (excluding this feature). If a UI change
renames or removes a targeted testid, the build fails instead of silently
shipping a broken tour. New tours added to `tours/registry.ts` are covered
automatically.

Existing e2e specs are unaffected: the shared `test/playwright/fixtures.ts`
seeds `cyweb.onboarding` as "seen" by default; opt into first-run with
`test.use({ onboarding: true })`.

## Future Improvements

- Additional tours (e.g. "Styling deep-dive", "Hierarchies & LLM analysis") —
  add a `TourDef` to `tours/registry.ts`.
- Contextual, dismissable hints (the store already tracks `dismissedHints`).
- Optionally load a sample network at tour start for a fuller walkthrough when
  offline determinism is not required.
