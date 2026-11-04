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
