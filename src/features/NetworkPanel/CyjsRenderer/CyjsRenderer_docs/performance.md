# Full app performance log

Measurements of opening and drawing networks in the full app after each change ported from the embed (#871, `src/embed/embed_docs/performance.md`).
Each row is the median of 3 runs of `scripts/bench-full-app.mjs` against a production build.

## How to reproduce

```bash
npx vite build --outDir /tmp/full-bench
node scripts/bench-full-app.mjs --dist /tmp/full-bench --runs 3
```

- Machine: the author's MacBook, headed Chromium (real GPU), 1400 × 900 viewport.
- Each run uses a fresh browser context, so IndexedDB is empty and every network comes from NDEx.
- Networks are public on `dev1.ndexbio.org`. NDEx latency varies between runs; the `fetch` column shows it.
- The script serves the build on port 5504, so a dev server on 5500 can keep running.

## Metrics

All times in ms, from navigation (or, for `zoom`, `root` and `cytoplasm`, from the scenario's first action).

| Metric    | Meaning                                                                 |
| --------- | ----------------------------------------------------------------------- |
| visible   | Every node is in the Cytoscape.js instance (or the Cell View has drawn) |
| done      | Every edge is in the instance, and a frame has been drawn               |
| settled   | The end of the last long task before 3 s without one                    |
| blocked   | Main-thread time in tasks over 50 ms, up to `settled`                   |
| p95 / max | Frame intervals up to `settled` (for `zoom`: while zooming)             |
| fetch     | First NDEx request start to last NDEx response end                      |

## Scenarios

| Scenario  | Network                                                      | Nodes | Edges  |
| --------- | ------------------------------------------------------------ | ----- | ------ |
| wp1742    | WP1742 TP53 network, with annotations                        | 57    | 34     |
| das       | DNA Damage Association Score                                 | 336   | 11,913 |
| sars2     | BioGRID SARS-CoV-2                                           | 5,781 | 19,488 |
| zoom      | `das`, 20 wheel steps in and 20 out once it has settled      | 336   | 11,913 |
| hierarchy | MuSIC v1 hierarchy, Cell View tab opened                     | 70    | 87     |
| root      | MuSIC v1, root circle clicked                                | 661   | 21,921 |
| cytoplasm | MuSIC v1, "Cytoplasm" clicked after the pointer rests 600 ms | —     | —      |

`sars2` is the largest network the default limits open (`maxEdgeCountThreshold` 20,000).

## Results

### 0. Baseline (`f8e43ea6`)

| Scenario  | visible | done   | settled | blocked | p95 | max   | fetch |
| --------- | ------- | ------ | ------- | ------- | --- | ----- | ----- |
| wp1742    | 1,389   | 1,469  | 1,469   | 286     | 25  | 92    | 597   |
| das       | 3,750   | 4,226  | 4,333   | 2,972   | 17  | 2,492 | 829   |
| sars2     | 9,472   | 11,556 | 12,150  | 10,527  | 42  | 8,600 | 1,004 |
| zoom      | —       | —      | —       | 133     | 9   | 92    | 0     |
| hierarchy | 1,574   | 1,574  | 1,574   | 297     | 25  | 89    | 901   |
| root      | 8,610   | 9,524  | 9,706   | 8,703   | 50  | 5,133 | 570   |
| cytoplasm | 3,146   | 3,153  | 3,153   | 2,324   | 33  | 1,183 | 371   |

### 1. Element data built once, shared styles factored out

- `createCyElements` (`cyjsFactoryUtil.ts`) builds each element's final data in one pass, and `renderNetwork` adds it with one `cy.add`. Before, it added raw data, then `applyViewModel` rewrote every visual property of every element.
- A value every node (or edge) shares moves into the stylesheet's base `node` / `edge` rule. `onStyleModelUpdate` rebuilds both and updates the elements on screen with `applyCyElementData`.
- The stylesheet goes in before the elements, inside the batch. Before, `cy.style()` after `endBatch()` styled every element a second time.
- Elements are created selected; positions sync in one batch and skip nodes that did not move.
- The embed and the style previews now draw through the same `createCyElements`.

| Scenario  | visible | done  | settled | blocked | p95 | max   | fetch |
| --------- | ------- | ----- | ------- | ------- | --- | ----- | ----- |
| wp1742    | 1,217   | 1,235 | 1,235   | 103     | 17  | 58    | 593   |
| das       | 2,573   | 2,987 | 3,072   | 1,773   | 25  | 1,417 | 791   |
| sars2     | 6,609   | 8,688 | 9,219   | 7,670   | 35  | 6,225 | 1,061 |
| zoom      | —       | —     | —       | 128     | 10  | 75    | 0     |
| hierarchy | 1,549   | 1,549 | 1,549   | 187     | 18  | 75    | 956   |
| root      | 6,627   | 7,527 | 7,708   | 6,667   | 50  | 3,133 | 502   |
| cytoplasm | 2,700   | 2,701 | 2,701   | 1,795   | 34  | 1,025 | 363   |

Against step 0: `done` falls 29% on `das`, 25% on `sars2`, 21% on `root`; `blocked` falls 27–40%.

### 2. Fetch sooner, Cell View zoom

- `loadCurrentNetworkById` (`WorkspaceEditor.tsx`) requests the summary and the network together.
- Resting the pointer on a Cell View subsystem for 150 ms downloads its network (`useSubsystemPrefetch`); the click reuses the download. Not for the root or genes.
- The Cell View restyles its circles and labels only when the zoom depth changes, not on every zoom frame, and only in its own SVG.

| Scenario  | visible | done  | settled | blocked | p95 | max   | fetch |
| --------- | ------- | ----- | ------- | ------- | --- | ----- | ----- |
| wp1742    | 1,009   | 1,033 | 1,033   | 0       | 25  | 83    | 400   |
| das       | 2,305   | 2,686 | 2,771   | 1,707   | 34  | 1,400 | 582   |
| sars2     | 6,444   | 8,592 | 9,072   | 7,838   | 43  | 6,467 | 667   |
| zoom      | —       | —     | —       | 78      | 10  | 83    | 0     |
| hierarchy | 1,678   | 1,678 | 1,678   | 162     | 25  | 102   | 851   |
| root      | 6,671   | 7,563 | 7,747   | 6,737   | 58  | 3,167 | 518   |
| cytoplasm | 2,221   | 2,227 | 2,227   | 1,785   | 67  | 1,025 | 0     |

Against step 1: `visible` falls 17% on `wp1742` and 10% on `das`; `fetch` falls by 190–390 ms on the networks opened by URL.
`cytoplasm` falls 18% (2.7 s → 2.2 s) and makes no NDEx request after the click.
No scenario zooms the Cell View, so the zoom change does not show here.

### 3. WebGL above 10,000 elements (measured, then turned off by default)

Networks of 10,000 or more nodes and edges drew with Cytoscape.js's WebGL renderer, as in the embed.

| Scenario  | visible | done  | settled | blocked | p95 | max   | fetch |
| --------- | ------- | ----- | ------- | ------- | --- | ----- | ----- |
| wp1742    | 1,016   | 1,044 | 1,044   | 0       | 24  | 67    | 400   |
| das       | 2,261   | 2,614 | 2,614   | 1,652   | 34  | 1,349 | 526   |
| sars2     | 6,368   | 8,661 | 9,061   | 7,654   | 50  | 6,473 | 652   |
| zoom      | —       | —     | —       | 0       | 9   | 33    | 0     |
| hierarchy | 2,365   | 2,365 | 2,365   | 824     | 42  | 202   | 1,275 |
| root      | 6,689   | 7,468 | 7,579   | 6,591   | 50  | 3,091 | 509   |
| cytoplasm | 2,325   | 2,327 | 2,327   | 1,969   | 75  | 1,017 | 0     |

Against step 2, loading does not change: the time is in styling, not in drawing (see step 4). Zooming `das` goes from 78 ms blocked to 0, but it was already smooth: `hideEdgesOnViewport` hides edges while the view moves.
WebGL also draws differently: node borders thicker, labels blurred, dashed edges solid, `tee` arrows as triangles. For an editor that is the wrong trade, so the full app keeps the canvas renderer.
`webglMinElements` in config.json turns WebGL on from that many elements (`cyjsWebgl.ts`); it is unset by default. The `hierarchy` row is NDEx noise: re-run, step 2 and step 4 both measure 1.95 s.

### 4. Lone edges drawn straight

- Profiling `sars2` after step 3: about 3 s of main-thread time was Cytoscape.js's `parallelEdges()`, run for every `bezier` edge when its curve style is first applied and again when its control points are computed. It scans every edge of the edge's source node, so around a node with thousands of edges it is quadratic.
- `createCyElements` gives `bezier` only to edges that share their two nodes with another edge, in either direction, and to self-loops (class `bundled`). Every other edge is `straight`, which draws the same as a lone `bezier` edge: screenshots of `wp1742`, `das` and `sars2` match step 2's pixel for pixel, with the canvas renderer and with WebGL.
- WebGL is off (step 3).

| Scenario  | visible | done  | settled | blocked | p95 | max   | fetch |
| --------- | ------- | ----- | ------- | ------- | --- | ----- | ----- |
| wp1742    | 1,185   | 1,217 | 1,217   | 113     | 25  | 83    | 427   |
| das       | 2,488   | 2,807 | 2,895   | 1,958   | 50  | 1,242 | 533   |
| sars2     | 4,783   | 5,496 | 5,970   | 4,664   | 50  | 2,975 | 739   |
| zoom      | —       | —     | —       | 128     | 9   | 75    | 0     |
| hierarchy | 1,948   | 1,948 | 1,948   | 459     | 33  | 175   | 991   |
| root      | 6,114   | 6,683 | 6,863   | 5,882   | 50  | 3,042 | 497   |
| cytoplasm | 2,126   | 2,128 | 2,128   | 1,722   | 67  | 1,017 | 0     |

Against step 2: `done` falls 36% on `sars2` (8.6 s → 5.5 s) and 12% on `root`; `sars2`'s longest frame halves (6.5 s → 3.0 s).
`das` has no node with thousands of edges and does not change beyond noise. `zoom` and `hierarchy` are the re-run medians.

## Summary

| Scenario  | Step 0 done | Step 4 done | Change | Step 0 blocked | Step 4 blocked |
| --------- | ----------- | ----------- | ------ | -------------- | -------------- |
| wp1742    | 1,469       | 1,217       | −17%   | 286            | 113            |
| das       | 4,226       | 2,807       | −34%   | 2,972          | 1,958          |
| sars2     | 11,556      | 5,496       | −52%   | 10,527         | 4,664          |
| root      | 9,524       | 6,683       | −30%   | 8,703          | 5,882          |
| cytoplasm | 3,153       | 2,128       | −33%   | 2,324          | 1,722          |

Steps 1 and 4 give most of the gain. Rendering is unchanged: screenshots of `wp1742`, `das` and `sars2` at steps 0, 2 and 4 match pixel for pixel.

## Not ported from the embed

- **Edge streaming.** `onEdgeDeletion`, the selection sync and the Table Browser assume every edge is in the instance. The networks the default limits open draw in under 6 s after step 4.
- **The Web Worker.** It needs networks without the network model's headless Cytoscape.js instance (`withPlainTopology` in the embed) and the Module Federation build to bundle a worker; in the embed it cut `blocked` by about 20%.
- **A size check before the download on the URL path.** Opening a network by URL downloads and draws it whatever its size; only Open Network(s) from NDEx checks the limits. Adding the check changes what a link can open, so it is a product decision.
