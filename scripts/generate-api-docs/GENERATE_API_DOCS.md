# generate-api-docs

Generates a single, self-contained, shareable HTML page documenting the
**CyWeb App API** (`src/app-api/`) — patch notes, full method reference,
version-to-version surface diffs, and the error-code catalog.

Output: [`docs-site/index.html`](../../docs-site/index.html) (committed, deployed
to its own Netlify site).

## Quick start

```bash
npm run generate:api-docs        # regenerate docs-site/index.html
npm run generate:api-docs -- --strict   # fail if Api.md and the TS surface drift
```

Then commit `docs-site/index.html`. Netlify redeploys on push (see
[`docs-site/netlify.toml`](../../docs-site/netlify.toml)).

## What it does

The page is a **hand-designed template** (`template.html`) into which the
generator injects a single JSON payload (`<script type="application/json">`).
No markdown parser or any other asset ships to the browser — everything is
pre-rendered at build time and the file works fully offline.

Four data sources, four sections:

| Section        | Source of truth                              | Parser              |
| -------------- | -------------------------------------------- | ------------------- |
| Patch notes    | `packages/api-types/CHANGELOG.md`            | `parse-changelog.ts` |
| API reference  | `src/app-api/api_docs/Api.md` (+ TS surface) | `parse-api-md.ts`    |
| Surface diff   | `surfaces/*.json` snapshots (+ live HEAD)    | `extract-surface.ts` |
| Error codes    | `src/app-api/api_docs/ErrorCodes.md`         | `parse-error-codes.ts` |

Method **signatures** are extracted from the TypeScript interfaces with
`ts-morph` (canonical), while behaviour and error tables come from `Api.md`.
`generate.ts` cross-checks the two and prints **drift warnings** when a method
exists on one side but not the other — keep `Api.md` in sync when this fires.

## Surface snapshots (the diff section)

Per-version method surfaces are checked in under `surfaces/`. They are
extracted syntactically from the API interfaces at each release's commit, so
old commits whose imports no longer resolve still parse fine.

The surface of a released version is the code state **just before the next
version's bump commit** (bumps land at the start of a version's work). The
latest version's surface is `HEAD`, re-extracted live on every `generate` run.

Re-run the bootstrap after a new version bump lands, to freeze the
just-released surface:

```bash
npx ts-node --transpileOnly \
  --compilerOptions '{"module":"commonjs","moduleResolution":"node"}' \
  scripts/generate-api-docs/bootstrap-surfaces.ts
```

Edit the `SURFACE_COMMITS` map in `bootstrap-surfaces.ts` to add the new
version → commit entry first. `versions.json` is regenerated alongside the
snapshots and drives the diff picker.

To dump one surface ad hoc:

```bash
npx ts-node ... scripts/generate-api-docs/extract-surface.ts --at <commit> --version <label>
```

## Files

| File                    | Role                                                       |
| ----------------------- | ---------------------------------------------------------- |
| `generate.ts`           | Orchestrator — parse, merge, drift-check, inject, write    |
| `template.html`         | Hand-designed page; `__DATA__` placeholder + inline CSS/JS |
| `markdown.ts`           | Shared `marked` config + heading splitter + slug helpers   |
| `parse-changelog.ts`    | CHANGELOG.md → `versions[]`                                 |
| `parse-api-md.ts`       | Api.md → `namespaces[]` + `guides[]`                        |
| `parse-error-codes.ts`  | ErrorCodes.md → `errorCodes[]`                              |
| `extract-surface.ts`    | ts-morph surface extraction (working tree or `--at`)       |
| `bootstrap-surfaces.ts` | (Re)generate `surfaces/*.json` + `versions.json`           |
| `types.ts`              | The `docs-data` payload contract                           |
| `surfaces/`             | Checked-in per-version surface snapshots                   |

## Notes

- Zero new dependencies: uses `marked@4` (direct dep) and `ts-morph` (devDep),
  run via `ts-node` — the same toolchain as `npm run verify:federation`.
- Prettier's `npm run format` only covers `src/`; keep this dir in the repo
  style manually (no semicolons, single quotes, 2-space, trailing commas).
