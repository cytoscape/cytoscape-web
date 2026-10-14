# Cyweb usage of Cytoscape.js v3 and v4 support

[inventory.csv](inventory.csv) contains 114 feature rows, with individual
visual-property rows and additional detail for layouts, charts, annotations,
renderer availability, and exports. The first four columns follow the requested
order. Remaining columns identify the category, API/property, unchanged-code
compatibility, source evidence, and verification method.

## Snapshot

Reviewed on 2026-09-07 against these local, initially clean checkouts:

- **cytoscape-web / development:**
  `d16966b128bf761c088dd3f6f330b02bd6de4ec7`
- **cytoscape.js / v4:**
  `4d9bebde6115939fe4a9ae18a0dd72d2933d6865`
- Cyweb declares `cytoscape ^3.34.0` and `@types/cytoscape ^3.19.9`.
  Its installed Cytoscape.js version is `3.34.0`.
- V4 identifies itself as `4.0.0-unstable`. These findings describe this
  work-in-progress checkout, not a future release commitment.

## Reading the statuses

**Fully supported in cyjs v4** answers whether the capability needed by cyweb
exists, after adapting the shared v3 integration syntax:

- **Yes:** the capability exists in the current v4 source. This does not mean
  cyweb can use it unchanged or that all browser/pixel parity is verified.
- **No (partial):** a related capability exists, but a material part of cyweb's
  behaviour or contract is missing or different.
- **No:** the current required API/feature is absent or rejected. Comments
  identify an alternative where one exists.
- **N/A:** an external engine owns the capability, or no direct cyweb use was
  found. These rows help avoid attributing G6/D3/Cosmos work to Cytoscape.js.

**Works unchanged in v4** separates drop-in API compatibility from feature
availability. In particular, a supported visual property still needs the
shared stylesheet bridge rewritten. These rows are not independent migration
tasks and their counts must not be treated as a completion percentage.

**Used in cyweb** distinguishes production use, cyweb-owned/external features,
model-only partial support, and helpers with no discovered caller. Searches
excluded tests when establishing usage; a type union or dependency declaration
alone was not treated as evidence of a rendered feature. Evidence paths are
relative to the repository named by their column.

## Main findings

- **Renderer availability is a requirement:** cyweb currently uses v3's
  default Canvas2D renderer. V4 is WebGPU-only. The user explicitly requires
  **WebGL in v4** for widespread renderer support. There is no WebGL or
  Canvas2D fallback in the reviewed v4 implementation.
- **Layouts:** grid and circle exist; concentric exists with different ring
  packing. CoSE is absent. Biological-flow needs a port or replacement.
  Every cyjs layout currently goes through `cyLayout.on('layoutstop', ...)`,
  but v4 emits lifecycle events on the core. Default routing also uses G6
  gForce/dagre, so cyweb's layout support is broader than its cyjs integration.
- **Styles:** the ordered selector-block stylesheet and most `data(key)`
  strings need replacement. Arbitrary z-order is absent, per-element font
  families are unsupported, visibility needs structural hide/show handling,
  and pie/ring properties need conversion to the chart family. Most basic
  shapes, colours, widths, labels, arrowheads and underlays exist.
- **Graphics and exports:** the canvas annotation extension and SVG/PDF
  extensions cannot register in v4. SVG and PDF are separate unsupported
  rows. PNG exists but is asynchronous. Node image bypasses exist, but v4
  discards them on sheet replacement, which conflicts with cyweb's image diff
  cache unless it reapplies them.
- **Graph integration:** common traversals remain available. String selectors,
  classes, JSON import, removed-element readback and v3 type declarations need
  attention.

## Verification and limits

The inventory cross-checks cyweb production call sites, its visual-property
converter and active mapper generator, layout registrations/options, preview
renderer, annotation layers and exports against v4 `src/`, `MIGRATING.md`, and
the maintained scope notes in `src/README.md`. The v3 snapshot inside the v4
repository was not mistaken for the active v4 implementation.

Small Node probes imported the **current v4 TypeScript source through tsx**,
rather than trusting a possibly stale build. They confirmed:

- Selector-block arrays, selector strings, `z-index`, `display`, `pie-size`
  and `underlay-shape: roundrectangle` are rejected.
- Legacy `data(v)` fails for width and background colour, works for labels,
  and is accepted as a literal font-family string. A font-family mapper object
  is rejected because fonts are global constants.
- `cytoscape.use` and element `addClass` are absent.
- Grid, circle and concentric run and emit one core `layoutstop`; their
  layout objects have no `on` method. CoSE and biological-flow names throw.
- Incident edges, neighbourhoods, outgoers/incomers, successors/predecessors,
  roots and leaves return expected IDs on a two-node graph.
- A width bypass of 99 becomes 20 after replacing the sheet with width 20.
- JSON import throws. Removed edge endpoints can initially remain readable,
  contrary to an overly broad reading of the migration prose, but after edge
  slot reuse the old handle reads the replacement endpoint. This is not a
  durable deleted-edge snapshot contract.

The CSV was populated and round-tripped through Artifact Tool, parsed again as
CSV, and checked for ten columns, unique feature names, and existing source
paths. Cyweb's `npm run test:checks:quiet` passed: TypeScript/oxlint and
329 unit-test files, with 4,219 tests passed and one skipped.

This is an inventory, not a completed cyweb-to-v4 port. No application code or
dependencies changed. Browser rendering, GPU device availability, image loading,
visual parity and actual v4 integration with third-party extensions were not
tested. No e2e spec was run because this change only adds documentation; the
existing v3 e2e suite would not establish v4 compatibility. External apps loaded
through Module Federation or services can have additional cyjs dependencies
outside this repository's direct usage.
