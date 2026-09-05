# CyjsRenderer Test Plan

Four tiers of tests for the Cytoscape.js renderer, and the four code changes they
depend on.

|                |                                           |
| -------------- | ----------------------------------------- |
| Scope          | `CyjsRenderer` + `cyjsAnnotationRenderer` |
| New files      | 4                                         |
| Modified files | 4                                         |
| Defects pinned | 7                                         |

---

## Decisions

Each one changes the code before a test can be written against it. Settle all four
before Step 1.

### D1 — Background color has one mechanism, not two

`NetworkTab` paints `networkBackgroundColor` as a CSS background on the Box wrapping
the renderer (`NetworkTab.tsx:44`). `#cy-container` is `rgba(0,0,0,0)`, so it shows
through. `drawBackground` paints the same color onto a third canvas.

**Decision: delete `drawBackground`. Keep the CSS path.**

Annotated networks then hold 5 canvases, not 6. Unannotated hold 3.

### D2 — Delete `cy.removeAllListeners()`

`renderNetwork` strips every listener on the instance at the top of each pass
(`CyjsRenderer.tsx:336`). Three of them it does not own:

- the draw handler for the retained annotation layers
- the `resize` handler `cyCanvas` installs internally
- the `tap` handler the edge-creation effect registers (defect E)

The layer object `cyCanvas()` returns is `{getCanvas, clear, resetTransform,
setTransform}`. Its internal `resize()` is private, so a stripped resize handler
cannot be re-registered from outside.

**Decision: register interactive handlers once in a `[cy]`-keyed effect that reads
live state from refs. Delete the blanket strip.**

The file already uses this pattern with `activeNetworkIdRef` and
`edgeCreationModeRef`. With the strip gone, no `attach()` method is needed — the draw
handler reads annotation elements from a ref. Event namespaces were tested and
rejected; see Evidence.

### D3 — Fake timers are per-test

`fake-indexeddb` schedules on real timers and the stores persist through it. RTL's
`waitFor` and `findBy` need explicit fake-timer handling. `fit` uses double
`requestAnimationFrame`, which Vitest fakes only when `rAF` is in `toFake`.

**Decision: call `vi.useFakeTimers()` inside defects A and C only. Never suite-wide.**

### D4 — `deleteFunctionsForNetwork` clears the global entry only on a reference match

`setFunction` always writes `rendererFunctions`, which is `Map<rendererName,
Map<functionName, fn>>` — no network dimension (`rendererFunctionImpl.ts:7`).
`getFunction` falls back to it whenever `networkId` is falsy, and `''` is falsy.

**Decision: delete the by-network entry unconditionally. Delete the global entry only
when the stored function is reference-identical to the one being removed.**

Two CyjsRenderers coexist whenever `SubNetworkPanel` is mounted. An unconditional
global delete wipes the entry the other one relies on.

---

## Canvas count invariant

Post-D1. Cytoscape's own renderer creates three; each `cyCanvas()` call adds one. The
count must not vary with the number of render passes.

| Network     | Cytoscape base | Annotation layers | Background | Total |
| ----------- | -------------- | ----------------- | ---------- | ----- |
| Annotated   | 3              | 2 (z −1, z +1)    | 0 (CSS)    | **5** |
| Unannotated | 3              | 0                 | 0 (CSS)    | **3** |

Today an annotated network grows by 2 per render pass — `3 + 2N`, so 9 at N=3. The
Tier 1 test asserts the constant, fails at N=2 before the fix, and passes after
without being rewritten.

---

## Evidence

Measured on this repo before the plan was written. Each result decided a line above.

### Cytoscape cannot initialize in jsdom today

```
PROBE getContext => null
PROBE container init err= Could not create canvas of type 2d
PROBE canvases in container = 0
```

jsdom returns null from `getContext('2d')` and `canvas` is not a dependency. This is
what Tier 0 exists to fix.

### A stubbed 2D context unlocks real Cytoscape — no new dependency

```
PROBE init err= NONE
PROBE canvases = 3
PROBE nodes/edges = 2 1
PROBE width/height = 800 600
PROBE cyCanvas ok, canvases now = 5   getCanvas = true true
PROBE synthetic tap fired = 1
PROBE grab/dragfree = 1 1  pos= {"x":111,"y":222}
PROBE png = string  data:image/png;base6
```

Container init, the `cyCanvas` extension, synthetic event dispatch, position writes,
and `cy.png()` all work. AGENTS.md requires asking before touching `package.json`; the
stub avoids the ask and a native build in CI.

### The leak reproduces in 120 ms at unit level

```
PROBE base canvases = 3
PROBE canvases after render 1,2,3 = 6,9,12
```

Three `renderNetwork`-shaped cycles against one instance. Twelve includes
`drawBackground`, which D1 deletes; without it the sequence is 5, 7, 9.

### Layers can be reused; the draw handler must be re-bound

```
PROBE draw handler fires = 1
PROBE after removeAllListeners, draw fires = 1
PROBE canvas still in DOM = true  count = 4
PROBE after rebind, draw fires = 2  canvas count = 4
```

`removeAllListeners()` kills the handler but leaves the canvas attached. Re-binding on
the same layer restores drawing and holds the count flat. This is why D2 removes the
strip instead of adding a re-attach step.

### Event namespaces do not scope teardown in Cytoscape 3.34

```
PROBE cy.emit(tap):       coreNs= 0  plain= 1
PROBE cy.emit(tap.cyweb): coreNs= 1  plain= 2
PROBE after off(.cyweb):  dNs= 1
```

A handler on `tap.cyweb` misses a plain `tap` — which is what Cytoscape emits for real
user input — and `off('.cyweb')` does not remove it. Rejected as a teardown mechanism.

### Only one CX2 fixture in the repo carries annotations

```
2496d8c5-5c74-11ec-b3be-   n=1  fg=0  bg=1  ['ShapeAnnotation']
```

One annotation, on `canvas=background`, with a `customShape`. Nothing exercises the top
layer and nothing exercises `TextAnnotation`. Tier 3 needs a new fixture; Tier 1 builds
its niceCX inline and needs none.

---

## Defect register

Every row gets a test. Column three is the observable failure, not the mechanism.

| ID  | Defect                                                                                        | Symptom                                                                | Location                | Tier |
| --- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------- | ---- |
| L   | Annotation layers are re-created on every render pass                                         | Canvas elements accumulate at 2 per pass; never removed                | `CyjsRenderer.tsx:813`  | 1    |
| A   | `boxend` debounce wait is 0 ms — the `100` is Cytoscape's third `on()` argument, not lodash's | Two `boxend` events under 100 ms call `exclusiveSelect` twice          | `CyjsRenderer.tsx:386`  | 2    |
| C   | The 1-second `isViewCreated` timer gates two effects and is never cleared                     | A visual style change in the first second after load is dropped        | `CyjsRenderer.tsx:850`  | 2    |
| D   | `renderNetwork`'s early return compares element counts, not identity                          | Swap one node for another and the new node never reaches the canvas    | `CyjsRenderer.tsx:310`  | 2    |
| E   | `removeAllListeners()` strips handlers registered outside `renderNetwork`                     | Edge-creation mode stops exiting on background click after a re-render | `CyjsRenderer.tsx:336`  | 2    |
| F   | Six renderer functions register per network id with no cleanup                                | `exportPng` holds a closure over a destroyed instance after unmount    | `CyjsRenderer.tsx:1198` | 2    |
| G   | `renderNetwork` calls `setVisualStyle(id, vs)` on every pass                                  | State keyed alongside `visualStyles` resets on each render             | `CyjsRenderer.tsx:846`  | 2    |

**Withdrawn.** An earlier draft listed a background-color defect — that
`networkBackgroundColor` is painted only for annotated networks. It is not a defect.
`NetworkTab` paints it for every network in CSS, and `drawBackground` duplicates it.
See D1.

**Also fixed in Step 3, no test.** `clearAnnotationsFromCanvas` reads `self.topLayer`
instead of `this.topLayer`, so it is a silent no-op. Nothing calls it. Delete it rather
than test it.

---

## Tier 0 — Enablement

jsdom setup. Blocks everything below it.

### [MODIFY] `vitest-setup.ts`

- Proxy-based `HTMLCanvasElement.prototype.getContext('2d')` stub, with real returns
  for `createLinearGradient`, `createRadialGradient`, `measureText`, `getImageData`,
  `getContextAttributes`, `getTransform`.
- `toDataURL` returning a dummy PNG data URL, so `cy.png()` resolves.

### [NEW] `CyjsRenderer/__testUtils__/renderCyjs.ts`

- `registerCyExtensions()` behind an idempotency guard — `CyjsRenderer.tsx` calls it at
  module scope, so Tier 2 would double-register.
- Sized container: `clientWidth 800`, `clientHeight 600`, `offsetWidth/Height`, and a
  matching `getBoundingClientRect`. jsdom reports 0 for all of them and Cytoscape then
  computes a degenerate viewport.
- Teardown that destroys the instance and clears the container.

### [MODIFY] `vitest.config.ts`

- Add `'src/**/__testUtils__/**'` to the coverage `exclude` list. It currently excludes
  only `*.{test,spec}.*`, `*.d.ts`, and `__mocks__/**`, so the helper would count as
  source.

---

## Tier 1 — Unit

Vitest, real Cytoscape instance.

### [NEW] `annotations/cyjsAnnotationRenderer.test.ts`

- **Parsing.** `getAnnotationElementsFromNiceCX` filters on `n === '__Annotations'`;
  returns `[]` when `networkAttributes` is absent.
- **Layer allocation and reuse — one test.** The first call creates two layers at
  `zIndex −1` and `+1` and returns both handles. Subsequent calls return the same layer
  objects and add no canvases.
- **Canvas invariant (defect L).** Count holds at 5 across N=3 cycles. Fails at N=2
  today.
- **Malformed input.** Annotation strings missing `type=`, or naming an unknown
  `shapeType`, do not throw.

### [MODIFY] `cyjsRenderUtil.test.ts`

- `applyViewModel` delegates to `updateCyElements` (`cyjsRenderUtil.ts:505-560`), which
  is unexported — test through the delegator.
- Custom-graphics keys absent from `view.values` are removed via `removeData`.
- Elements in `cy` but absent from the view model are left untouched, not cleared.
- `nodeSizeLocked` copies height onto width.
- `arrowColorMatchesEdge` copies line color onto both arrow colors.

---

## Tier 2 — Component

Vitest + React Testing Library, real Cytoscape.

### [MODIFY] `RendererFunctionStore.ts` · `rendererFunctionImpl.ts`

- `deleteFunctionsForNetwork(networkId)`, per D4: by-network entry always, global entry
  only on reference match.

### [NEW] `CyjsRenderer.spec.tsx`

- **A — `boxend` debounce.** Two `boxend` events under 100 ms; `exclusiveSelect` fires
  once. Fake timers.
- **C — mount timer.** Change the visual style inside the first second, advance timers,
  assert the style reaches `cy.style()`. Fake timers.
- **D — same-count swap.** Remove node A and add node B in one transaction; assert B is
  in `cy` and A is gone. Today B never arrives: the removal runs through
  `onNodePositionAndNodeDeletion`, but `onNetworkElementsAdded` only fires on a
  `nodes.length` change, which did not happen.
- **E — handler survival.** Enter edge-creation mode, force a render, tap the
  background, assert the mode exits. Order matters: the render must run after the
  handler registers or the test passes vacuously.
- **F — unmount cleanup.** Unmount clears both maps; `getFunction('cyjs','exportPng')`
  with no id returns nothing stale.
- **G — style-set preservation.** A render pass does not reset state keyed alongside
  `visualStyles`.
- **Viewport recovery.** Positions that leave the frame trigger `cy.fit()` through
  `isGraphVisible`. `viewportRecovery.test.ts` covers the pure function against a fake
  `cy`; nothing covers the renderer's use of it.
- **Saved viewport precedence.** A stored viewport in `RendererStore` wins over
  `cy.fit()` on render.
- **Layout spinner gating.** "Applying layout…" shows only when `activeNetworkId ===
id`; `isRunning` is forced false otherwise.
- **Store hydration.** A missing table or visual style skips the render without
  throwing.
- **Selection round trip.** A tap writes to `ViewModelStore`; a store change selects and
  unselects in `cy`; an inactive panel ignores taps.
- **Drag and undo.** `grab` records the start position, `dragfree` writes the new one
  and calls `useUndoStack().postEdit` with `MOVE_NODES`. Mock the hook, not `UndoStore`.
- **StrictMode remount.** Under `<StrictMode>`, assert the final state holds exactly one
  live instance with base canvases present. `bootstrap.tsx:101` wraps the real app, so
  this guards documented intent.

### [MODIFY] `NetworkPanel.spec.tsx`

- The wrapper Box reflects `networkBackgroundColor`. This cannot live in
  `CyjsRenderer.spec.tsx` — that component's own Box is `rgba(0,0,0,0)` and the color
  sits one level up on `NetworkTab`.

---

## Tier 3 — End to end

Playwright, chromium.

### [NEW] `test/fixtures/cx2/valid/annotated-multi-type.valid.cx2`

- Foreground and background annotations, at least one `ShapeAnnotation` and one
  `TextAnnotation`, so the top layer and the font path in `CommonFonts.ts` are both
  exercised.
- Generated under `scripts/generate-test-fixtures/`. It goes in `cx2/valid/`, not
  `ndex/` — that directory holds real NDEx downloads named by UUID.

### [NEW] `test/playwright/annotation-canvas-lifecycle.spec.ts`

- **Container identity guard, first.** Capture the `#cy-container` handle before each
  switch and assert it is the same element after. `NetworkPanel` renders `MessagePanel`
  whenever a network, its tables, or its style are missing, which unmounts the renderer
  and resets the canvas count. Without this guard the leak assertion passes vacuously.
- **Count invariant.** 5 on annotated, 3 on unannotated, across three switches.
- **Pixel fingerprints.** Sample `getImageData` on the annotation layers after the
  gesture settles. `hideEdgesOnViewport: true` removes edges mid-pan, so anything
  sampled during a gesture is unstable.
- **Flat networks only.** `id="cy-container"` is hardcoded, and
  `SubNetworkPanel.tsx:754` mounts a second `CyjsRenderer`. In any HCX view the selector
  silently takes the first of two.
- **Accept the cookie banner first.** It overlays the bottom of the window and
  intercepts pointer events on canvas drags.
- No screenshot baselines. Nothing in `test/` uses `toHaveScreenshot` today; adding it
  means per-browser, per-OS baselines on a canvas renderer.

---

## Sequence

Two tests are written before their fix and must be seen failing. AGENTS.md: prove it
fails, apply the fix, prove it passes.

### Step 1 — Enablement

- 2D context stub in `vitest-setup.ts`.
- `renderCyjs()` with the idempotent extension registration and container sizing.
- Coverage exclude for `__testUtils__`.

**Gate** — `npm run test:unit`, whole suite. The stub is global and 281 test files now
run against a mutated `HTMLCanvasElement.prototype`. No existing test references
`getContext`, `toDataURL`, or `HTMLCanvasElement`, so the risk is low — not zero.

### Step 2 — Failing tests

- `cyjsAnnotationRenderer.test.ts`, including the constant-count invariant for defect L.
- The defect A and defect E tests, in `CyjsRenderer.spec.tsx`. They need only Tier 0,
  and Step 3 fixes both — write them here or they can never fail first.
- `cyjsRenderUtil.test.ts` additions. These pin current behavior and pass immediately.

**Gate** — run and record the failures. Expect L, A, E red and the `cyjsRenderUtil`
additions green.

### Step 3 — Core fixes

- Cache annotation layers on the instance; create once (defect L).
- Move interactive handlers to a `[cy]`-keyed effect reading refs; delete
  `cy.removeAllListeners()` (D2, defect E).
- `boxend` debounce wait passed to lodash (defect A).
- Delete `drawBackground` (D1) and `clearAnnotationsFromCanvas`.

**Gate** — re-run Step 2's tests. L, A, E green, no rewrite.

### Step 4 — Store action and the rest of Tier 2

- `deleteFunctionsForNetwork` per D4, with its own store test.
- Defects C, D, F, G, plus viewport recovery, saved-viewport precedence, spinner gating,
  hydration, selection, drag/undo, StrictMode.
- The background-color assertion in `NetworkPanel.spec.tsx`.

**Gate** — `npm run test:unit` and `npm run lint`.

### Step 5 — End to end

- Generate the multi-type annotation fixture.
- `annotation-canvas-lifecycle.spec.ts` with the container-identity guard.

**Gate** — `npx playwright test annotation-canvas-lifecycle --project=chromium`. Check
port 5500 is free first and ask before stopping anything listening there.

---

## Verification

```bash
# whole suite — the canvas stub is global
npm run test:unit

# this feature only
npm run test:unit -- src/features/NetworkPanel/CyjsRenderer/

# one spec, chromium; port 5500 must be free
npx playwright test test/playwright/annotation-canvas-lifecycle.spec.ts --project=chromium

npm run lint
```

`vitest-setup.ts` sets `testTimeout: 1000`. A bare Cytoscape init measured 211 ms; a
full `CyjsRenderer` mount adds React, `applyVisualStyle`, and element creation. Expect
per-test `{ timeout }` overrides across Tier 2.

Manual checks run `npm run dev`, which occupies port 5500 — the port Playwright builds
and serves on, and the origin Keycloak's client registration expects. Do the manual pass
before or after the e2e run, never during.

---

## Out of scope

### SubNetworkPanel background — needs a decision, not a drive-by

`SubNetworkPanel.tsx:748` wraps its `CyjsRenderer` in `backgroundColor: 'transparent'`,
so HCX sub-networks get no background color from either mechanism once D1 lands.

Transparency may be deliberate — the sub-network renders as an overlay inside the
hierarchy view. The plan also does not say which style supplies the color; the
sub-network has its own id and its own `visualStyles` entry.

This is a visual change to a different feature. Ship it separately, with an owner's
sign-off. A test-harness change is the wrong place for it.

### Duplicate `id="cy-container"`

`CyjsRenderer` and `SubNetworkPanel`'s copy both render it. Tier 3 works around it by
using flat networks only. Making the id unique is a separate change with its own
selector fallout.

---

Line references are against the working tree on `fix/local-import-665`. Probe output in
Evidence was produced by throwaway specs under
`src/features/NetworkPanel/CyjsRenderer/` and removed after measurement.
