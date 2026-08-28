# Benchmarking: making a row measure the thing it is named for

Read this before adding a benchmark row or acting on one. A row that
measures nothing looks exactly like a row that measures something, so the
rule that runs through all of it is: **ask what would make this number
move, then run it that way once.**

The harness is a port of the cytoscape.js `v4` branch benchmark tooling
(issue #601). The design arguments live in that project's development log
("round N" in the ported files' comments); the rules below are the ones
that transfer, restated for this codebase.

## The suites, the runner and the published archive

- `benchmark/` holds the suites, each headed by a comment saying what it
  prices and what would make its numbers move: `load.mjs` (CX2 validate /
  convert / export), `serialization.mjs` (model ↔ IndexedDB-row
  conversions), `table-edit.mjs` (the immutable TableModel primitives),
  `network-edit.mjs` (NetworkFn over headless cytoscape), and
  `render-transform.mjs` (the CyjsRenderer pipeline outside React) run in
  the **quick profile**; `db.mjs` (fake-indexeddb persistence) joins with
  `--all`; `--full` re-runs the quick suites at N=500 and N=10000,
  bracketing the app's thresholds (layout `ELE_THRESHOLD` 1000,
  `maxNetworkElementsThreshold` 26000). `browser-bench.mjs` boots the
  built `dist/` in Playwright Chromium (`npm run benchmark:browser`, or
  `--renderer` in a report run) and times the `cyweb.boot.*` milestones
  plus a real `CyWebApi` CX2 import.
- **Run everything under Node 24** (mise/nvm — the repo is engine-strict
  and the default `node` on some machines is older). `npm run benchmark`
  is the quick report; a single suite runs standalone as
  `node --import tsx benchmark/load.mjs`, scaled with `BENCH_N=10000` and
  filtered with `BENCH_OP=<group-substring>`.
- `benchmark/bench-size.mjs` holds the run size (`N`, `E`, `MIDNUM`,
  `MID`) and imports nothing — take constants from there, never from
  `fixture.mjs`, which evaluates the app.
- **Timing is mitata's; the canonical number is p50, in nanoseconds.**
  `finishRun()` (bench-run.mjs) is the JSON tail; suites that must time
  one shot per row use `finishManualRun()` and their rows carry
  `samples: 1`, which the comparison lists as *unscreened* rather than
  ranking — one measurement is not evidence about its own noise.
- **Publish with `--repeat 3`** (`npm run benchmark -- --repeat 3`, then
  `npm run benchmark:publish -- --note "..."`). The runner runs each job
  once per pass **in its own process** (per-process JIT/heap state is the
  noise being measured) and publishes the per-row median plus the band the
  passes spanned (`repeatSpread`); the comparison screens every change
  against that row's own band. Single-run change tables are mostly noise —
  the v4 harness measured this. `benchmark/results/` is gitignored;
  `benchmark/published/` is tracked and deliberate (see its README).
- **Every job carries a harness fingerprint** (`harness-id.mjs`): a hash
  of the suite file, its `./`-import closure, and the shared inputs
  (bench-env, fixture, the CX2 generator) — never `src/`, which is the
  subject. A change across two fingerprints renders as a `⋮ harness`
  break, not a percentage. Cosmetic changes normalise out (comments,
  formatting); anything left over can be declared in
  `EQUIVALENT_HARNESSES` with a reason (audited — stale entries fail).
- **`--jobs N` runs jobs concurrently** for the iteration loop; the
  default is serial and **published runs must be serial** — a concurrent
  run measures under contention, stamps a different harness hash
  (`concurrentHash`), and the publish script refuses it without
  `--allow-concurrent`.
- `npm run benchmark:compare` renders a cross-run comparison page per
  (machine fingerprint, profile) with ≥ 2 published runs: per-row p50
  series, movers beyond ±10% screened against their own bands, and the
  whole-run **drift** (geometric mean change). Read the drift before the
  movers — a row moving near the drift factor is the box, not the commit.

## The control row

There is no second implementation to pair against, so each group carries a
bench literally named **`control`**: a frozen, library-free operation on
the same operand (a `structuredClone` of the document, a bare
`new Map(rows)` copy). It plays two roles: in the report it is a scale
yardstick, and in the comparison it is the per-row noise control — frozen
code, so if the control moved too, the machine moved. Never rename it
("control clone" is a plain row); never treat its ratio as a speedup
headline.

## Methodology rules (every suite follows these)

- **Rotation pools**: operands come from a pool of K clones resolved
  outside the timed region, rotated per iteration, so V8 cannot specialise
  on one object or hoist a pure call.
- **Pre-warm every row before any row samples** — otherwise the
  first-declared bench measures monomorphic inline caches and later ones
  polymorphic, a systematic bias that decides the sign of near-parity
  rows.
- **Resolve operands outside the timed region** — and mind the live
  getters: `network.nodes` / `network.edges` materialize the topology on
  every read (that cost has its own row in network-edit; don't pay it by
  accident in another row's loop).
- **Mutations are reversible round-trips on dedicated instances** (add +
  delete of the same batch), so the graph is in the same state at the
  start of every iteration. Run a suite twice and compare p50s to prove a
  delete row isn't draining its instance.
- **Sub-10ns rows must amplify** (32 ops per iteration, renamed `(x32)`)
  or they are a coin-flip wearing a number — below that the harness floor
  owns the sign.
- **A row is guilty until shown to discriminate.** The v4 log's catalogue
  of false rows all failed the same question: nothing would have made the
  number move (a preset layout that does no work without positions, a box
  selection measuring an empty result, a "curved edge" row whose fixture
  had no curved edges). Ask what would make the row move; run it that way
  once; where cheap, have the row assert the property it is named for.

## What the instrument does to the measurement

- **tsx injects esbuild's `__name` wrapper** on every closure creation.
  The suites import `src/` through tsx, so a closure-heavy hot path can
  read several times slower than it is in the built bundle. Before
  rewriting a hot path on a suite's evidence, re-measure it through the
  production build (the browser bench measures `dist/` and is immune).
- **A styleEnabled cytoscape instance keeps an animation timer alive** —
  a suite that creates one must `process.exit(0)` after `finishRun()` or
  the process lingers forever (render-transform.mjs does this; the v4
  mutators suite discovered it).
- **The ESM lexer cannot see through `export *` barrels** compiled to CJS
  `__exportStar` — named imports from such a barrel throw at load; import
  the concrete module instead (serialization.mjs documents the case).
- **fake-indexeddb is not IndexedDB.** The db suite's rows are
  regression tripwires for serialization and await-chain structure, never
  absolute persistence numbers; real-browser cost belongs to the browser
  bench.
- **bench-env.mjs is part of the instrument.** It shims the browser
  globals dexie-observable needs and installs fake-indexeddb and
  `enableMapSet()`; it is in `SHARED_HARNESS`, so changing a shim
  correctly re-stamps every suite's epoch.
