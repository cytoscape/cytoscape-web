# Embed performance log

Measurements of the embed (`/embed/<uuid>`, #871) after each performance change.
Each row is the median of 3 runs of `scripts/bench-embed.mjs` against a production build.

## How to reproduce

```bash
VITE_EMBED_MAX_ELEMENTS=200000 npx vite build --config vite.embed.config.ts --outDir /tmp/embed-bench
node scripts/bench-embed.mjs --dist /tmp/embed-bench --runs 3
```

- Machine: the author's MacBook, headed Chromium (real GPU), 1200 × 800 viewport.
- Networks are public on `dev1.ndexbio.org`. NDEx latency varies between runs; the `fetch` column shows it.
- `VITE_EMBED_MAX_ELEMENTS=200000` lifts the size limit (10,000 when measured, 20,000 now) so the large networks draw.

## Metrics

All times in ms, from navigation (or, for `root`, from the click).

| Metric    | Meaning                                              |
| --------- | ---------------------------------------------------- |
| visible   | The network canvas, or the Cell View, is in the page |
| done      | Every edge is drawn: the progress bar has gone       |
| blocked   | Main-thread time in tasks over 50 ms                 |
| p95 / max | Frame intervals while the scenario runs              |
| fetch     | First NDEx request start to last NDEx response end   |

## Scenarios

| Scenario  | Network                               | Nodes  | Edges  | CX2 size     |
| --------- | ------------------------------------- | ------ | ------ | ------------ |
| wp1742    | WP1742 TP53 network, with annotations | 57     | 34     | small        |
| das       | DNA Damage Association Score          | 336    | 11,913 | 1.3 MB       |
| sars2     | BioGRID SARS-CoV-2                    | 5,781  | 19,488 | 13.5 MB      |
| celegans  | BioGRID C. elegans                    | 8,790  | 39,516 | 15 MB        |
| mouse     | BioGRID M. musculus                   | 17,260 | 86,296 | 29.5 MB      |
| hierarchy | MuSIC v1 hierarchy, Cell View built   | 70     | 87     | small        |
| root      | MuSIC v1, root "Cell" clicked         | 661    | 21,921 | 359 KB query |

The largest network tested is `mouse` (103,556 elements).

## Results

### 0. Baseline: edge streaming and WebGL (`1cc7b152`)

Edges stream in 12 ms batches; networks of 10,000+ elements use WebGL.

| Scenario  | visible | done    | blocked | p95 | max   | fetch |
| --------- | ------- | ------- | ------- | --- | ----- | ----- |
| wp1742    | 950     | 964     | 137     | 9   | 108   | 543   |
| das       | 1,911   | 4,186   | 2,819   | 92  | 325   | 748   |
| sars2     | 4,364   | 13,236  | 11,866  | 158 | 1,667 | 877   |
| celegans  | 5,972   | 30,903  | 29,517  | 242 | 2,625 | 952   |
| mouse     | 10,037  | 120,374 | 117,789 | 500 | 4,767 | 1,148 |
| hierarchy | 1,551   | 1,551   | 115     | 9   | 117   | 829   |
| root      | 2,257   | 8,327   | 7,556   | 108 | 475   | 505   |

### 1. Element data built once, shared styles factored out (`7cfd64ad`, measured before step 2's changes)

- `embedElements.ts` builds each element's final data in one pass and adds it with one `cy.add`, instead of adding raw data and then rewriting every key (`applyViewModel`).
- A property every element of a group shares moves into a base `node` / `edge` rule; only elements with another value keep it in their data.
- `embedElements.test.ts` checks every element's computed style against the full app's pipeline.
- Later moved into the full app: `createCyElements` in `features/NetworkPanel/CyjsRenderer/cyjsFactoryUtil.ts` now builds the elements for the embed, the full app and the style previews (`CyjsRenderer_docs/performance.md`).

| Scenario  | visible | done   | blocked | p95 | max   | fetch |
| --------- | ------- | ------ | ------- | --- | ----- | ----- |
| wp1742    | 1,034   | 1,048  | 66      | 9   | 100   | 509   |
| das       | 2,212   | 2,435  | 1,570   | 150 | 401   | 701   |
| sars2     | 3,989   | 8,614  | 6,774   | 150 | 1,341 | 883   |
| celegans  | 4,862   | 12,340 | 10,820  | 224 | 1,824 | 842   |
| mouse     | 8,193   | 34,224 | 32,738  | 333 | 3,666 | 1,121 |
| hierarchy | 1,110   | 1,110  | 112     | 9   | 124   | 758   |
| root      | 2,347   | 3,848  | 3,197   | 150 | 554   | 504   |

Against step 0: `done` falls 72% on `mouse` (120 s → 34 s), 60% on `celegans`, 54% on `root`, 42% on `das`.

### 2. Positions at creation, Cell View depth updates only on change (`7cfd64ad`)

- Layout positions are set on the element definitions, not moved after the nodes are added.
- The Cell View re-applies circle and label visibility only when the shown depth changes, not on every zoom frame.

| Scenario  | visible | done   | blocked | p95 | max   | fetch |
| --------- | ------- | ------ | ------- | --- | ----- | ----- |
| wp1742    | 940     | 956    | 70      | 9   | 100   | 506   |
| das       | 2,249   | 2,321  | 1,472   | 133 | 408   | 684   |
| sars2     | 3,664   | 7,279  | 6,214   | 150 | 1,208 | 844   |
| celegans  | 4,423   | 11,262 | 10,168  | 217 | 1,825 | 873   |
| mouse     | 8,168   | 32,585 | 30,703  | 333 | 3,608 | 1,106 |
| hierarchy | 1,088   | 1,088  | 123     | 9   | 133   | 764   |
| root      | 2,359   | 3,916  | 3,287   | 150 | 558   | 513   |
| cytoplasm | 1,431   | 1,533  | 1,126   | 233 | 367   | 351   |

Small gains, within run-to-run noise for most scenarios. The Cell View change does not show here: no scenario zooms the Cell View.
`cytoplasm` (hover, then click) was added in step 3 and run against this build for comparison.

### 3. Fetch sooner: summary and CX2 together, hover prefetch (`70cbcdec`)

- `loadEmbedNetwork` requests the summary and the CX2 at once, and aborts the CX2 when the summary puts the network over the size limit.
- Resting the pointer on a Cell View circle for 150 ms starts that subsystem's download; the click reuses it.
- `buildDrawing` and `Drawing` split building a network's elements from drawing them, ready for step 4.

| Scenario  | visible | done   | blocked | p95 | max   | fetch |
| --------- | ------- | ------ | ------- | --- | ----- | ----- |
| wp1742    | 937     | 950    | 64      | 9   | 92    | 394   |
| das       | 1,463   | 2,190  | 1,315   | 133 | 400   | 525   |
| sars2     | 3,650   | 7,277  | 5,617   | 150 | 1,158 | 869   |
| celegans  | 4,618   | 11,395 | 9,453   | 225 | 1,975 | 678   |
| mouse     | 8,365   | 33,990 | 30,856  | 358 | 3,674 | 1,433 |
| hierarchy | 936     | 936    | 98      | 17  | 108   | 621   |
| root      | 2,433   | 3,775  | 2,429   | 150 | 700   | 511   |
| cytoplasm | 992     | 1,100  | 1,055   | 525 | 525   | 201   |

Against step 2: `visible` falls 35% on `das`, 31% on `cytoplasm` (hover prefetch), 14% on `hierarchy`.
The large BioGRID networks do not change: their time is in converting and drawing, not in waiting for NDEx.
For `cytoplasm`, `fetch` counts only requests after the click; the prefetched download started before it.

### 4. Prepare networks in a Web Worker (`af646595`)

- `prepare.worker.ts` downloads, converts, styles and lays out networks off the main thread; the page receives the drawing as a structured clone.
- Networks come back with plain node and edge lists instead of the network model's headless Cytoscape.js instance, which cannot be posted.
- Without a worker, the same code runs on the page.

| Scenario  | visible | done   | blocked | p95 | max   | fetch |
| --------- | ------- | ------ | ------- | --- | ----- | ----- |
| wp1742    | 1,018   | 1,042  | 130     | 9   | 92    | 481   |
| das       | 1,847   | 2,269  | 1,166   | 125 | 267   | 413   |
| sars2     | 4,091   | 7,523  | 4,451   | 133 | 867   | 428   |
| celegans  | 4,309   | 10,300 | 7,898   | 192 | 1,292 | 365   |
| mouse     | 8,748   | 29,719 | 24,377  | 284 | 2,683 | 422   |
| hierarchy | 937     | 937    | 99      | 9   | 108   | 655   |
| root      | 1,823   | 4,036  | 2,319   | 142 | 283   | 0     |
| cytoplasm | 909     | 1,027  | 782     | 225 | 242   | 0     |

Against step 3: `blocked` falls 21% on `mouse`, 21% on `sars2`, 26% on `cytoplasm`; the longest frame falls 27% on `mouse` and 60% on `root`.
`visible` barely moves: the work still happens before the first draw, only on another thread. It rises on `das` (1.5 s → 1.8 s), suspected to be worker start-up and the cost of posting the result; not confirmed.
`fetch` no longer sees the CX2 download: Resource Timing on the page does not record the worker's requests, so the column shows only the summary request.

## Summary

| Scenario | Step 0 done | Step 4 done | Change | Step 0 blocked | Step 4 blocked |
| -------- | ----------- | ----------- | ------ | -------------- | -------------- |
| das      | 4,186       | 2,269       | −46%   | 2,819          | 1,166          |
| sars2    | 13,236      | 7,523       | −43%   | 11,866         | 4,451          |
| celegans | 30,903      | 10,300      | −67%   | 29,517         | 7,898          |
| mouse    | 120,374     | 29,719      | −75%   | 117,789        | 24,377         |
| root     | 8,327       | 4,036       | −52%   | 7,556          | 2,319          |

Step 1 (element data and shared styles) gives most of the gain.

## Where the time goes now

- Above ~20,000 edges, `done` is set by edge streaming: 12 ms of adding per frame, plus the frame's render. `mouse` spends ~21 s streaming 86,296 edges.
- `blocked` is mostly those per-frame renders. Each frame stays under ~300 ms at p95, so the page keeps responding, but it is not smooth.
- `visible` on the large networks (4–9 s) is the worker's conversion and styling, and posting the result back.

## Size limit

The default limit is 20,000 nodes and edges (`EMBED_MAX_ELEMENTS`), raised from 10,000 after these measurements; `VITE_EMBED_MAX_ELEMENTS` overrides it at build time.
With step 4, measured on this machine:

| Elements | Network  | First paint | Fully drawn |
| -------- | -------- | ----------- | ----------- |
| 12,249   | das      | 1.8 s       | 2.3 s       |
| 25,269   | sars2    | 4.1 s       | 7.5 s       |
| 48,306   | celegans | 4.3 s       | 10.3 s      |
| 103,556  | mouse    | 8.7 s       | 29.7 s      |

Phones and slower laptops are untested and will be slower.
