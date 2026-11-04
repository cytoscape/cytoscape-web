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
- `VITE_EMBED_MAX_ELEMENTS=200000` lifts the 10,000-element limit so the large networks draw.

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
