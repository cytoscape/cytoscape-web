# Node graphics render hook

**Status:** Implemented (v1, synchronous hooks)
**Audience:** Cytoscape Web maintainers and app authors

## What this adds

An external app registers one function. Cytoscape Web calls it with each node
whose data changed, and draws the returned image as that node's Cytoscape.js
`background-image`.

```js
const api = await window.CyWebApi.whenReady()

api.nodeGraphics.setRenderHook(({ nodeId, attributes }) => {
  const pct = Number(attributes.confidence)
  if (!Number.isFinite(pct)) return null // leave this node to the Vizmapper
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
    <circle cx='50' cy='50' r='48' fill='none' stroke='#4caf50'
            stroke-width='4' stroke-dasharray='${pct * 302} 302'/>
  </svg>`
})
```

Before this, the only way to put an image on a node was a Vizmapper
custom-graphics slot (`nodeImageChart1..9`) driven by a table column. That
suffices when the image is a function of network data, and nothing else.

## Constraint that drove the design: hook images never reach CX2

Vizmapper custom graphics are part of the user's visual style, so they export to
CX2 and are meant to. Hook images are not. They belong to a running app, may be
recomputed on any state change, and must leave no trace in an exported file.

This rules out the obvious implementation — writing hook output into
`nodeImageChartN` defaults or bypasses — because `VisualStyle` is exactly what
`buildVisualStyleAspects` serializes.

There is a second reason the export would be pointless. Cytoscape Desktop loads
custom-graphic image bytes from its session `CustomGraphicsManager` pool, not
from the network file, so an exported image reference renders as "?" in a fresh
Desktop session regardless of URL scheme. See `.serena/memories/lessons.md`
[2026-07-18].

### How non-export is guaranteed

`exportCyNetworkToCx2` (`src/models/CxModel/impl/exporter.ts:43`) destructures
its entire input at `:48-62`: `network`, `visualStyle`, `nodeTable`, `edgeTable`,
`visualStyleOptions`, `networkViews[0]`, `otherAspects`, `networkAttributes`,
`visualStyleSet`. Style aspects come from `buildVisualStyleAspects(vs, …)` and
`buildCyWebVisualStylesAspect`, which take `vs` as their only style input.
`networkView` is read at exactly two lines, `:141-142`, for `x` and `y`.

Five independent reasons a hook image cannot appear:

1. `NodeGraphicsStore` is not a `CyNetwork` field, and no path reaches it from
   any of the seven `CyNetwork` assembly sites.
2. The hook never writes `VisualStyleStore`, so custom-graphics aspects are
   byte-identical.
3. The hook never writes `ViewModelStore`. Excluded even though the exporter
   reads only x/y, because `NodeView.values` _is_ serialized to IndexedDB and
   cross-tab diffed.
4. The image never enters `ele.data()`.
5. The store has no persistence middleware, so nothing reaches Dexie.

Regression test: `src/models/CxModel/impl/exporter.nodeGraphics.test.ts` asserts
byte-identical export with and without hook images, and that a Vizmapper image
bypass still exports.

## Why element style bypasses, not element data

Everything else in the renderer drives visual properties through `ele.data()`
plus one shared stylesheet. This is the only place that calls `ele.style()`.

Two facts make the `data()` route unusable:

1. The `background-image` stylesheet mappers exist only when the visual style has
   a usable custom-graphics slot — the `getFirstValidCustomGraphicVp` gate at
   `cyjsRenderUtil.ts:291`. A hook must work regardless of the user's Vizmapper
   setup, so it cannot depend on that mapper existing.
2. `updateCyElements` sweeps stale custom-graphics keys on every pass
   (`cyjsRenderUtil.ts:528-533`), and `SpecialPropertyName.BackgroundImage` is in
   that list. A hook-written `data('backgroundImage', …)` is wiped by the next
   `applyViewModel`.

A bypass sidesteps both by not participating in either mechanism, and it survives
a stylesheet swap. Verified in `node_modules/cytoscape/dist/cytoscape.cjs.js`:

| Fact                                                                                                                         | Location                 |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `cy.style(sheet)` installs a new Style object, never calling `cleanElements`                                                 | `:19259-19278`           |
| `cleanElements(eles, true)` is reached only from `styfn.clear`, which the app never calls, and preserves bypass props anyway | `:19140`, `:16547-16570` |
| Reapplying a stylesheet value over a bypass keeps the bypass and stores the stylesheet value underneath as `bypassed`        | `:16535-16538`           |

The third row is also why the hook wins over a Vizmapper image for free.

Consequences worth noting: `cyjsRenderUtil.ts` is unmodified, so
`renderStylePreview.ts` is untouched and Vizmapper thumbnails can never show hook
images. That is correct — a thumbnail previews a style, and the hook is not part
of the style.

## Architecture

```text
App (Module Federation plugin / window.CyWebApi)
  │  apis.nodeGraphics.setRenderHook(fn)
  ▼
src/app-api/core/nodeGraphicsApi.ts          per-app factory + anonymous singleton
  │  useNodeGraphicsStore.getState().setHook(...)
  ▼
src/data/hooks/stores/NodeGraphicsStore.ts   EPHEMERAL: hooks[] + images{net}{node}
  ▲                                          registerAppCleanup at module load
  │  setImages(networkId, entries)
src/features/NetworkPanel/CyjsRenderer/useNodeGraphicsSync.ts
  │    invalidation · coalescing · chunking · circuit breaker
  │  returns images[networkId]
  ▼
src/features/NetworkPanel/CyjsRenderer/nodeGraphicsApply.ts
       node.style({ 'background-image': ..., ... })      cy-only, never in data
```

`nodeGraphicsResolve.ts` sits between the hook and the store, validating and
defaulting whatever the app returned.

### Files

| File                                                            | Role                                         |
| --------------------------------------------------------------- | -------------------------------------------- |
| `src/models/StoreModel/NodeGraphicsStoreModel.ts`               | Types                                        |
| `src/data/hooks/stores/NodeGraphicsStore.ts`                    | Hook registry + resolved images              |
| `src/app-api/core/nodeGraphicsApi.ts`                           | Public API                                   |
| `src/features/NetworkPanel/CyjsRenderer/nodeGraphicsResolve.ts` | Validate + default a hook result             |
| `src/features/NetworkPanel/CyjsRenderer/nodeGraphicsApply.ts`   | Write bypasses into cy                       |
| `src/features/NetworkPanel/CyjsRenderer/useNodeGraphicsSync.ts` | Decide when to run hooks                     |
| `src/models/VisualStyleModel/impl/imageSourceImpl.ts`           | Shared scheme policy + SVG sizing            |
| `src/models/TableModel/impl/tableDiff.ts`                       | `detectRowDelta` for changed vs removed rows |

## The hook contract

```ts
type NodeGraphicsRenderHook = (
  request: NodeGraphicsRequest,
) => NodeGraphicsResult

interface NodeGraphicsRequest {
  readonly networkId: IdType
  readonly nodeId: IdType
  readonly attributes: Record<AttributeName, ValueType> // shallow copy
  readonly width?: number
  readonly height?: number
}

type NodeGraphicsResult = string | NodeGraphicsImage | null | undefined
```

`attributes` is a copy, not the live row. Passing the live `NodeView` would hand
the app a Map that is either immer-frozen (an app write throws) or not yet frozen
(an app write silently corrupts the render).

**Synchronous in v1.** An app needing async work computes and caches it in its
own code, then calls `refresh()` so the hook can return the cached value. Native
`Promise` support is a follow-on.

**Must not throw.** A throw yields no image for that node. After 20 throws or
slow calls (>16 ms), the hook is disabled for the session — checked per call, so
a hook that starts failing on node 1 of 100000 stops being called on node 21.

Accepted image sources: `http(s)://` URLs, `data:` URIs, raw `<svg>` markup
(promoted to a data URI). Rejected: `blob:` (dead by the time a style reapplies)
and `file:`. Same policy as the Vizmapper passthrough path — one implementation
in `imageSourceImpl.ts`.

## Worked example: STRING node images

STRING networks carry two node-image values, and both need handling the contract
above does not do for you.

| STRING column            | Value shape                                                                    |
| ------------------------ | ------------------------------------------------------------------------------ |
| `stringdb::imageurl`     | `https://version-12-0.string-db.org//images/Proteinpictures/pdb/1f/1fgu_A.png` |
| `stringdb::STRING style` | `string:data:image/png;base64,iVBORw0KGgo…`                                    |

```js
const strip = (v) => String(v).replace(/^string:(?=data:|https?:)/, '')

api.nodeGraphics.setRenderHook(({ attributes }) => {
  const raw =
    attributes['stringdb::STRING style'] ?? attributes['stringdb::imageurl']
  if (raw == null) return null
  return {
    image: strip(raw),
    fit: 'contain',
    // Required for the remote host — see below.
    crossOrigin: 'null',
  }
})
```

**The `string:` prefix must be stripped.** `string:data:image/png;base64,…` is not
a recognised scheme, so `normalizeImageSource` rejects it as `unrecognized` and the
node silently gets no image. The prefix is a STRING app namespace marker, not part
of the URI.

**The remote host sends no CORS header.** Measured: `GET` on the structure URL
returns `200 image/png`, `content-length: 33667`, and **no
`Access-Control-Allow-Origin`**. So `crossOrigin: 'anonymous'` fails to load it at
all and `'null'` is required — which taints the canvas, so Cytoscape omits that
image from `cy.png()`. The base64 value is same-origin and survives PNG export
either way. This is the general shape of the problem with remote node images:
the failure looks identical to "the feature is broken", so preflight with an
`Image()` under both modes when adding a new source.

**Both STRING images are 240×240.** Square, so a square node uses the whole
graphic; on the default 75×35 node they letterbox to a 35px square — correct, just
small. Rasters skip the SVG size wrapper entirely, so Cytoscape's native
`background-fit` sizes them and their aspect ratio is preserved without the drift
workaround being involved.

Note for STRING specifically: `.serena/memories/lessons.md` [2026-07-18] records
that Desktop loads custom-graphic image bytes from its session pool rather than the
network file, so these images do not round-trip to a fresh Desktop session even by
the Vizmapper path — independent of this feature keeping hook images out of CX2 by
design.

## Precedence and draw order

A hook image wins over a Vizmapper image on the same node. Returning `null` drops
the bypass and the Vizmapper mapper reasserts itself on the next restyle, leaving
no residue in the saved style.

**Pie and ring charts still draw on top by default.** Cytoscape's node draw order
is shape → `drawImages(inside)` → border → `drawPie` → stripe →
`drawImages(over)`. `background-image-containment` defaults to `'inside'`, so a
Vizmapper pie covers a hook image. This matches how two Vizmapper slots already
behave. Pass `containment: 'over'` to own the node face.

Multiple apps: hooks run in registration order and the first non-`null` result
wins. An app returning `null` for nodes it does not own yields to the next one.
An always-returning hook starves later hooks — which is why per-node filtering is
the next phase.

## Invalidation

Renderer-scoped: called from `CyjsRenderer`, so no hook work happens for
background networks, and mounting is the natural first-run trigger.

| Trigger                         | Action                                                         |
| ------------------------------- | -------------------------------------------------------------- |
| Mount / network switch          | Run every node                                                 |
| Hook registered or replaced     | Run every node                                                 |
| Last hook removed               | Drop every image for the network                               |
| Table edit                      | Run the rows whose object identity changed                     |
| Node deleted                    | Drop its image, no hook call                                   |
| `refresh(networkId?, nodeIds?)` | Run the named nodes, or all                                    |
| Two `refresh` calls in one tick | Node ids merge; either call omitting `nodeIds` runs all         |
| Unmount                         | Cancel queued work, drop the network's images                  |
| Undo / redo                     | Automatic — `useUndoStack` replays the same TableStore actions |

### Why coalescing is mandatory

`InMemoryTable` rebuilds **every** row object on `createColumn`, `deleteColumn`,
`setColumnName`, `duplicateColumn`, `applyValueToElements`, `setTable`, and `add`.
So a single column rename reports every node as changed.

1. Pending nodes are a `Set`; writes within 50 ms merge into one flush.
2. A flush processes up to 200 nodes per animation frame, and stops early once a
   chunk has spent 8 ms, so a large batch repaints progressively rather than
   stalling. Both bounds are needed: a hook taking 12 ms per node stays under the
   16 ms slow-call threshold, so a node count alone would not bound the frame.
   At least one node always runs, so progress never stalls.
3. A generation counter is captured at flush start. A chunk from an older
   generation drops its results, which is what makes rapid network switching and
   hook re-registration safe.
4. `isHydrating()` defers the flush. A peer tab's edit arrives as a full-table
   replace, so every row looks changed; the pending set is preserved, so nothing
   is lost.
5. A result identical to the stored one in every field is skipped — the main
   defense against Cytoscape's unbounded image cache. All fields are compared, not
   just the image: a hook that keeps the URL and changes only `opacity` is making
   a real change.
6. A refresh request merges with one the renderer has not read yet, then is
   acknowledged once its nodes are queued. Merging without the ack would make
   every later refresh re-run every node ever refreshed for that network.

## Known limitations

| Limitation                                | Detail                                                                                                                                                                                                                                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cytoscape's image cache is unbounded**  | `BRp.getCachedImage` retains one `Image` per distinct URL with no eviction, freed only by `cy.destroy()`. Mitigated by string-equality dedupe and a 2000-distinct-URL cap per renderer, counted in `nodeGraphicsApply.ts` on the URL actually handed to Cytoscape — an SVG re-wrapped per node size is a distinct URL per size, so counting hook images instead would miss it. **Prefer stable URLs over freshly generated data URIs.** This is the likeliest production problem. |
| Synchronous only                          | Async images go through `refresh()`.                                                                                                                                                                                                                                                        |
| PNG export drops remote images            | `crossOrigin: 'null'` (the default) taints the canvas, and Cytoscape excludes tainted images from `cy.png()`. Use data URIs or `crossOrigin: 'anonymous'`.                                                                                                                                  |
| No HierarchyViewer circle-packing support | Only the two `CyjsRenderer` mount sites are covered.                                                                                                                                                                                                                                        |
| Images recompute on network switch        | The sync hook is renderer-scoped. If it hurts, promote the images slice to survive unmount and evict on `network:deleted`.                                                                                                                                                                  |
| Breaks the `ele.data()` convention        | Deliberate; see above. `nodeGraphicsApply.ts` carries the reasoning inline.                                                                                                                                                                                                                 |

## Deferred

- Per-node filtering, so an app declares which nodes it owns instead of
  returning `null` for the rest.
- Native `Promise` support.
- A push `setNodeGraphics` write API. The store and apply layer already support
  it; only a second fill path is missing.
- Stacking hook and Vizmapper layers (`background-image` accepts a list).
- The remaining `background-*` properties. The type union at
  `cyjsVisualPropertyName.ts:67-86` lists ~20; v1 wires 5.
- Edge graphics.

## Relationship to the earlier design note

`scratch/custom-node-graphics/dynamic-node-graphics.md` §4 recommended a push
API (`setNodeGraphics`) over a render-time hook, partly because push "round-trips
through CX2". That property is now an explicit non-goal, which removes the
argument. The hook model was chosen instead because the host can coalesce
invalidation once, correctly, rather than every app reimplementing it — and
because per-node filtering only makes sense when the host drives the calls.

That note remains accurate about the substrate (`background-image`, SVG data URIs
as the draw-anything path) and about the discrete-vs-continuous distinction. A
per-frame factory is still the wrong tool for data-driven updates, and this
design is not one: hooks run on discrete invalidation, never inside the paint
loop.
