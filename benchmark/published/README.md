# Published benchmark runs

This directory is **tracked**, unlike `benchmark/results/`. It holds the runs
promoted into the shared archive — the numbers that cross-run comparisons and
"did this PR make loading slower?" answers stand on.

The harness is a port of the cytoscape.js `v4` branch benchmark tooling; the
conventions below were measured and argued there, and transfer.

## How a run gets here

A run reaches the archive only by being promoted deliberately, on the machine
that measured it:

```
npm run benchmark -- --repeat 3        # or benchmark:all / benchmark:full
npm run benchmark:publish -- --note "baseline before the table refactor"
```

Then commit `benchmark/published/`.

**Use `--repeat 3`.** The v4 harness measured its own run-to-run spread and
found single-run p50s move more than the ±10% the comparison page flags at —
a change table built from single runs is largely noise, and medians of three
flagged none of its identical-code row pairs. Two repeats does not do it —
bimodal rows make a 2-run aggregate land between the modes or pick one — and
best-of is worse than median, because it takes the fast mode whenever it
appears. A `--repeat` run also records each row's own band (`repeatSpread`),
which is what the comparison screens a change against.

`benchmark:publish` refuses a run from a dirty tree (its numbers are not
attributable to the named commit; `--allow-dirty` overrides) and a run made
with `--jobs > 1` (measured under contention — its own epoch;
`--allow-concurrent` overrides). `--prune <n>` keeps the newest n runs per
(machine, profile); `--dry-run` previews.

## What is in here

- `index.json` — one entry per run: date, commit, profile, machine summary,
  and the **machine fingerprint**.
- `results-*.json` — the run itself, exactly as `benchmark/results/` produced
  it. Reports are re-rendered from these (`--render-only`,
  `report-compare.mjs`) rather than stored as HTML, so a report improvement
  applies to every past run.

## Reading a trend

Runs are grouped by `fingerprint` — a hash of CPU model, core counts, RAM,
architecture and the GPU list. **Two runs with different fingerprints are not
comparable**, and `buildComparison` throws rather than plot them on one line.
The fingerprint deliberately ignores kernel and node version, so an OS
upgrade does not split a machine's history in two.

Every job also carries a hash of the **harness** that produced it — the suite
file, its `./`-relative imports, and the shared inputs (`bench-run.mjs`,
`bench-size.mjs`, `bench-env.mjs`, `fixture.mjs`, `render-stats.mjs`, and the
CX2 generator the fixtures wrap). Not `src/`: that is the subject of the
measurement. The comparison refuses to show a change across a harness change
— the cell reads `⋮ harness` instead. A change that really is cosmetic but
survives normalisation can be declared in `EQUIVALENT_HARNESSES`
(`benchmark/harness-id.mjs`) with a reason; the list is audited, so an entry
naming a hash the archive no longer carries fails the build.

In a comparison, read the whole-run **drift** (geometric mean change over
every shared row) before the movers — a row moving near the drift factor is
the box, not the commit — and read each mover's `control` twin the same way:
the control is frozen library-free code, so if it moved too, the machine did.
