# Implementation Checklist — Release Automation for `@cytoscape-web/api-types`

> Track progress for the migration from the manual release runbook to a
> tag-triggered CI publish. Mark `[x]` when complete. Run verification after
> each step.
>
> First release under this flow: `1.0.0-beta.4`.

_Design: [release-automation-design.md](release-automation-design.md) — full rationale including the four failure modes of the current flow, the Zenodo constraint, and the rejected alternatives_

**Dependency note:** Steps 0–3 are ordinary repository changes and can land in
one pull request — with one exception: the branch-protection edit in Step 3a is
a repository **settings** change, made in the GitHub UI after that PR merges and
the `api-types` job has run at least once under its final name. **Step 4 is
manual and can only be performed by a human with
owner rights on the npm package** — nothing in CI can self-serve it, and Step 7
cannot succeed until it is done. Step 5 depends on Steps 0–4. **Step 8a runs
before Step 7**, not after: the consumer migration must be rehearsed against a
local tarball while the version number is still changeable. Step 7 depends on
everything before it, and Step 8b lands in the two sibling repositories once the
publish succeeds. **Step 9 is follow-up** — it guards the contract against
silent drift and does not gate this release.

**Sequencing, decided:** `1.0.0-beta.4` ships **before** the 1.1.0 application
release, during this work. It therefore documents APIs that no released version
of Cytoscape Web implements — which is allowed, and is exactly why Step 7a-2's
compatibility statement and Step 7d's dev1 deployment are not optional.

**Key decisions** — resolved before implementation; do not re-litigate during
the work:

| Decision                  | Resolution                                                                                                                                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Release notes destination | **No GitHub Release.** Annotated tag message, workflow job summary, and the `CHANGELOG.md` shipped in the npm tarball. Repo webhook `527149929` is a Zenodo receiver on the `release` event with no tag filter |
| npm authentication        | **Trusted Publishing (OIDC).** No repository secret; provenance generated automatically                                                                                                                        |
| npm dist-tag              | **`latest` now, `next` for prereleases after `1.0.0` ships.** beta.4 publishes to `latest` unchanged; the switch happens at the first prerelease following a stable `1.0.0` (Step 9c)                          |
| Workflow trigger          | **Both** `push: tags: ['api-types-v*']` and `workflow_dispatch` (dry-run rehearsal and re-run path)                                                                                                            |

---

## Step 0: Package Metadata

_Design: §Target design → Package metadata_

### Pre-read files

| File                              | Purpose                                                          |
| --------------------------------- | ---------------------------------------------------------------- |
| `packages/api-types/package.json` | The file being changed                                           |
| `package.json` (root)             | Source of the `author`, `homepage` and repository values to copy |

### 0a — Required publish metadata

- [x] Add `repository` with `"type": "git"`, `"url": "git+https://github.com/cytoscape/cytoscape-web.git"`, and `"directory": "packages/api-types"` — write the canonical `git+https://` form; provenance validates this URL against the repository that ran the workflow
- [x] Add `"publishConfig": { "access": "public" }` — scoped packages default to `restricted`; encoding it here means `--access public` cannot be forgotten

### 0b — Descriptive metadata

- [x] `author`: copy from the root `package.json` — `{ "name": "The Cytoscape Consortium", "url": "https://cytoscape.org" }`
- [x] `homepage`: `https://github.com/cytoscape/cytoscape-web/tree/development/packages/api-types#readme` — **not** the root's value. The root points at `http://web.cytoscape.org`, the application's site, which tells a developer looking for this package nothing (and is `http://`)
- [x] `bugs.url`: `https://github.com/cytoscape/cytoscape-web/issues` — the root has no `bugs` field, so there is nothing to copy

### 0c — Ship the license text

`package.json` declares `"license": "MIT"` but the tarball carries no license
text. Doing this now is free; doing it later means changing `files` here and the
verifier's expected-file list in Step 1b in one coordinated commit.

- [x] Copy the root `LICENSE` (MIT, "Copyright (c) 2024 - 2026 The Cytoscape Consortium", 19 lines) to `packages/api-types/LICENSE`
- [x] Add `"LICENSE"` to the `files` array
- [x] **The tarball is now 7 entries, not 6.** Step 1b's expected list and Step 0's verification below must both say 7 from the start

### 0d — Build safety net

- [x] Add `"prepack": "npm run build"` to `scripts` — makes it structurally impossible to pack a stale `dist/` (the failure mode described in design §Background 1)
- [x] Confirm `prepack` does **not** fire on a root `npm ci` (npm runs `prepare`, not `prepack`, for linked workspaces)

#### Verification (Step 0)

- [x] `npm ci` at the repository root still succeeds and does not trigger a `tsup` build — verified by deleting `dist/` first and confirming it stayed absent
- [x] `npm pack -w packages/api-types` produces a `.tgz` with `"version": "1.0.0-beta.4"` and **7** entries (6 plus `LICENSE`) — note that from here on `prepack` fires on every pack, including `--dry-run`, so packing is no longer a read-only inspection — confirmed: 7 entries, `LICENSE` 1086 bytes. **Also observed: `prepack`'s `tsup` output goes to stdout, so `npm pack --json` cannot be parsed when scripts run.** Step 1b's `--ignore-scripts` is what keeps that output clean, not merely what avoids a second build
- [x] `node -p "require('./packages/api-types/package.json').publishConfig.access"` prints `public`

---

## Step 1: Verification Scripts

_Design: §Target design → Release notes, §Closing the CI gap, §Why the helper scripts are `.mjs`_

### Pre-read files

| File                                 | Purpose                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `scripts/run-playwright.mjs`         | Precedent for zero-dependency Node ESM in `scripts/`                     |
| `scripts/verify-federation-build.ts` | Naming precedent for `verify:*` scripts                                  |
| `packages/api-types/CHANGELOG.md`    | The headings the parser must handle                                      |
| `tsconfig.json` (root)               | Confirms `scripts/` is excluded — the reason these are `.mjs`, not `.ts` |

### 1a — `scripts/changelog-section.mjs`

- [x] Create the file as dependency-free Node ESM (must run before `npm ci`)
- [x] CLI: `--version <v>`, `--file <path>` (default `packages/api-types/CHANGELOG.md`), `--require-date`, `--print-date`
- [x] Parse headings with `/^## +(\S+?)(?: +\((.+?)\))?\s*$/` — keep the parenthetical optional so a malformed heading is found and reported rather than silently missed
- [x] Body = lines between the matched heading and the next `## `, with leading and trailing blank lines trimmed; do **not** collapse interior blank lines
- [x] Exit `1` when the section is missing, `2` when `--require-date` is set and the parenthetical is not `YYYY-MM-DD` — distinct codes so callers can tell "forgot the entry" from "forgot the date"
- [x] Export the heading parser as a named export alongside the CLI entry point so Step 3b can reuse it. Guard the CLI with `import.meta.url === pathToFileURL(process.argv[1]).href` — the naive `import.meta.url === process.argv[1]` compares a `file://` URL against a plain path and is **always false**, which would silently disable the CLI (`import.meta.filename === process.argv[1]` also works on Node 20.11+)

### 1b — `scripts/verify-api-types-pack.mjs`

Operates on a **real `.tgz`**, never `--dry-run`: `prepack` runs on
`npm pack --dry-run` too, so a dry-run check would silently rebuild whatever it
was meant to inspect, and the bytes verified would not be the bytes published.

- [x] Create the file; accept a path to an existing `.tgz` (packing it first only if not given), extract it to a temporary directory, and assert against the **extracted tree**
- [x] Assert the exact file list: `CHANGELOG.md`, `LICENSE`, `README.md`, `dist/index.d.ts`, `dist/mf-declarations.d.ts`, `index.d.ts`, `package.json` — seven entries, including the `LICENSE` added in Step 0c. Report missing and unexpected entries separately, and make the failure message say to update the expected list if the change is intentional
- [x] Assert the entry count matches the expected list length and the packed version matches `package.json`
- [x] Assert `dist/index.d.ts` exceeds 10,000 bytes — an empty or stub declaration file is the characteristic `tsup` failure mode
- [x] Assert `dist/index.d.ts` line 1 is exactly `/// <reference path="./mf-declarations.d.ts" />` — proves the relative-path `postbuild` one-liner ran with the right cwd instead of silently no-opping
- [x] Assert `dist/mf-declarations.d.ts` is byte-identical to `src/mf-declarations.d.ts`
- [x] Write `{ version, shasum, integrity, tarball }` to a caller-specified path so the release workflow can compare the registry against this exact artifact
- [x] Exit non-zero with a single actionable message on any failure

### 1c — `test/fixtures/api-types-consumer/` and `scripts/verify-api-types-consumer.mjs`

The size and substring assertions in 1b are sanity checks, not proof the
declarations compile. Only a compiler settles that, and it must run **before**
the publish — a broken `1.0.0-beta.4` cannot be replaced, only superseded.

- [x] Create a minimal fixture: `package.json`, `tsconfig.json` with `"skipLibCheck": false` (mirroring `cy-agent-bridge/tsconfig.json:33-35`) and `"types": ["@cytoscape-web/api-types"]`, and one `.ts` source file
- [x] Cover ordinary type imports — `import type { ApiResult, CyWebApiType } from '@cytoscape-web/api-types'`
- [x] Cover the ambient surface — `window.CyWebApi`, a typed `window.addEventListener`, and a `cyweb/*` module declaration — since `mf-declarations.d.ts` reaches consumers only through the triple-slash reference `postbuild` prepends
- [x] `scripts/verify-api-types-consumer.mjs` **copies the fixture to a temporary directory outside the repository**, then installs the `.tgz` and the fixture's own declared dependencies there and runs `tsc --noEmit`
- [x] Do not compile the fixture in place. Measured from `test/fixtures/api-types-consumer/`, resolution walks up and finds `<repo>/node_modules/react`, `<repo>/node_modules/@types/react`, `<repo>/node_modules/typescript` — and, worst of all, `@cytoscape-web/api-types` resolves to `<repo>/packages/api-types/dist/index.d.ts` via the workspace symlink, so the fixture would type-check the local build no matter what the tarball contains
- [x] Declare every dependency the fixture needs in its own `package.json`, so a missing peer dependency fails here instead of being masked by the host's install
- [x] Pin `@types/react` to **18.x**, matching the host (`react@18.3.1`, `@types/react@^18.0.20`). The `cyweb/*` module declarations reference React types, so the fixture needs them; leaving the version open would install React 19 types and could fail a release over a difference no consumer of this host actually hits
- [x] Pin `typescript` explicitly too, for the same reason — the fixture is installed outside the repo and inherits nothing
- [x] Exclude the fixture from the root `tsconfig.json` and from `oxlint` if either would otherwise pick it up

### 1d — Register the scripts

- [x] Add `"changelog:section": "node scripts/changelog-section.mjs"` to the root `package.json`
- [x] Add `"verify:api-types-pack": "node scripts/verify-api-types-pack.mjs"` to the root `package.json`
- [x] Add `"verify:api-types-consumer": "node scripts/verify-api-types-consumer.mjs"` to the root `package.json`

#### Verification (Step 1)

- [x] `npm run --silent changelog:section -- --version 1.0.0-beta.3` prints the beta.3 section — note `--silent`: `npm run` writes its `> pkg@version script` banner to **stdout**, so without it the banner contaminates any captured output
- [x] `npm run changelog:section -- --version 1.0.0-beta.4 --require-date` exits `2` while the heading still reads `(unpublished)`
- [x] `npm run changelog:section -- --version 9.9.9` exits `1`
- [x] A test invokes the CLI as a subprocess and asserts stdout and exit code — the `pathToFileURL` main-check guard is exactly the kind of bug an in-process import test cannot see — `src/app-api/federation/changelogSection.test.ts`, 9 tests. Confirmed it earns its keep: reverting the guard to the naive comparison fails 6 of them
- [x] `npm run build:api-types`, then `npm pack -w packages/api-types --ignore-scripts`, then `npm run verify:api-types-pack -- <tgz>` passes
- [x] `npm run verify:api-types-consumer -- <tgz>` passes — and it caught a real mistake on first run: the fixture used `result.value`, but `ApiSuccess` exposes `data` (`src/app-api/types/ApiResult.ts:385-388`)
- [x] Corrupting `dist/index.d.ts` **and packing again without rebuilding** makes both verifiers fail (a plain truncate would be undone by `prepack`; restore afterwards) — pack fails on the 58-byte size check; the consumer check fails with `TS2694` on `AppDataApi`, `CyWebEvents` and `AppContextApis`, i.e. `mf-declarations.d.ts` losing the types it references

---

## Step 2: Release Workflow

_Design: §Target design → The release workflow, §Guard order_

### Pre-read files

| File                                                 | Purpose                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------ |
| `.github/workflows/ci.yml`                           | House style for jobs, concurrency and timeouts; the required checks to gate on |
| `.github/actions/setup-node-dependencies/action.yml` | Left unchanged — the release job does **not** use it (see 2a)                  |
| `packages/api-types/README.md:247-311`               | The manual runbook this workflow replaces                                      |

### 2a — Create `.github/workflows/release-api-types.yml`

- [x] Header comment stating that the **filename is load-bearing** (npm's Trusted Publisher configuration names `release-api-types.yml`; renaming breaks publishing) and that the workflow deliberately creates **no** GitHub Release, with the Zenodo webhook id and DOI as the reason
- [x] Triggers: `push: tags: ['api-types-v*']` and `workflow_dispatch` with a `dry_run` boolean (default `true`) and a `dist_tag` choice (`latest` / `beta` / `next`, default `latest`)
- [x] `permissions: contents: read` + `id-token: write` + `checks: read` — no write scope, since no GitHub Release is created. `checks: read` is required for the CI gate in 2b: a `permissions` block sets every unlisted scope to `none`
- [x] Resolve `dry_run` and `dist_tag` explicitly per trigger: on a tag push `inputs` is empty, so default them to `false` and `latest` rather than reading `inputs.*`
- [x] `concurrency`: separate groups for publish and rehearsal (so a dry run cannot displace a queued release), `cancel-in-progress: false`, **and `queue: max`** — without it only one run may be pending and a newly queued release cancels the one already waiting
- [x] `actions/checkout@v4` with `fetch-depth: 0`
- [x] `actions/setup-node@v4` **directly** with `node-version-file: .nvmrc` and `cache: npm`, no `registry-url`, followed by exactly one `npm ci` — do not layer `npm ci` on top of the composite action, which would install twice on a cache miss and reuse a lockfile-keyed cache on a hit
- [x] Read the version from `packages/api-types/package.json`; never derive it from the tag

### 2b — Guards (all before the build)

- [x] Refuse a non-dry-run publish unless `github.ref_type == 'tag'`
- [x] Tag name minus the `api-types-v` prefix equals the `package.json` version — **conditional on `github.ref_type == 'tag'`**, otherwise a branch rehearsal fails here and never reaches the guards it exists to exercise
- [x] `package-lock.json`'s `packages['packages/api-types'].version` equals the `package.json` version
- [x] `scripts/changelog-section.mjs --require-date` succeeds, writing the notes to a file for later steps
- [x] Required CI checks for **this exact SHA** succeeded — query the Checks API and refuse to publish otherwise. `ci.yml` runs on branch pushes and pull requests, not on tags, so nothing else connects a green CI to the commit being published
- [x] Require a **fixed, explicit list** of check names — `Lint`, `Build`, `Unit Tests` and `API Types Package`. These are the **display names**, not the job IDs: `ci.yml` declares `lint:` / `name: Lint`, `build:` / `name: Build`, `unit-tests:` / `name: Unit Tests`, and the Checks API reports the display name. Matching on the job IDs would report "no required check" against a perfectly green CI run
- [x] Give the new `api-types` job an explicit `name:` (Step 3a) and use that exact string here, so the two cannot drift
- [x] Do **not** iterate over every check run for the SHA: that set includes this release run itself, which is `in_progress` by definition and would deadlock the guard
- [x] A required check with **no run** for this SHA fails the guard — usually a tag on a commit that never reached `development`, which is exactly what this catches
- [x] A required check still `in_progress` also fails, with a message saying to re-run once CI finishes — do not block a release job on someone else's queue
- [x] **Registry probe only** at this stage: record whether the version exists and fail on any non-`E404` error. The publish/skip/stop decision needs the `.tgz` and therefore belongs after the build (see 2d)
- [x] npm CLI is ≥ 11.5.1, using the root `semver` runtime dependency to compare; upgrade in place if not

### 2c — Build once, verify, publish that artifact

`prepack` runs on `npm pack`, `npm pack --dry-run` **and** `npm publish`, so a
build-then-verify-then-publish sequence rebuilds three times and publishes bytes
that were never verified. Publishing a pre-built tarball does not re-run
`prepack`, so one artifact flows through every step.

- [x] `npm run build:api-types`
- [x] `npm pack -w packages/api-types --ignore-scripts` → a real `.tgz`; every later step consumes **that file**. **`--ignore-scripts` is load-bearing**: a plain `npm pack` fires `prepack` and rebuilds, making this build twice rather than once (measured)
- [x] `npm run verify:api-types-pack -- <tgz>`
- [x] `npm run verify:api-types-consumer -- <tgz>` — the `skipLibCheck: false` compile gate, before the registry is touched
- [x] Publish with `npm publish <tgz> --tag <dist_tag>` — no `NODE_AUTH_TOKEN`, no `--access` (it is in `publishConfig`), no `--provenance` (automatic under OIDC)
- [x] A parallel `--dry-run` step for the rehearsal path, with a comment recording that **`npm publish --dry-run` does not validate credentials** — verified locally: it succeeds while `npm whoami` returns `E401`. A green rehearsal proves the guards, build and packaging, never the OIDC configuration
- [x] Post-publish: poll until the version is visible (the registry CDN lags a publish by seconds), then **assert** `dist.integrity` equals the local `.tgz`'s integrity — an equality check, not a logged value — and assert the dist-tag resolves to the version just published
- [x] Assert the provenance attestation **exists** and names this repository, this workflow and **this commit SHA**. Leaving provenance to a human's post-release spot check means a release with none, or with the wrong source, passes the automated gate
- [x] Write the release notes and the published metadata to `$GITHUB_STEP_SUMMARY`
- [x] Upload the `.tgz`, the release notes and the pack result as a workflow artifact with 90-day retention
- [x] Confirm the workflow contains **no** `gh release create` and no `contents: write`

### 2d — Registry-state decision and the resume path

A flat "version must not exist" guard makes a partial failure unrecoverable: if
npm accepts the package and only the verification or artifact upload fails, the
tag can be neither re-run nor re-tagged.

**This decision runs after the `.tgz` exists**, not with the pre-build guards —
it compares the registry against the artifact this run produced, which does not
exist yet at guard time. 2b only probes for existence; the branching happens
here.

- [x] Version absent → publish normally
- [x] Version present, `dist.integrity` matches this run's `.tgz`, **and** its provenance names this repository, this workflow **and this commit SHA** → skip the publish and resume at verification
- [x] Match the commit SHA, not just repository and workflow — otherwise a publish made from this same workflow at a **different commit** reads as "already done" and the run resumes onto someone else's artifact
- [x] Version present with different content, a different publisher, or provenance naming a different commit → **stop**; a human must investigate
- [x] The dist-tag already points at a newer release → **stop**; never roll `latest` back onto an older version
- [x] Treat only `E404` as "not published" — `npm view` also exits non-zero on network failure, auth error and registry outage, and those must fail the run rather than be read as permission to publish
- [x] Under `dry_run`, warn instead of failing when the version already exists

#### Verification (Step 2)

- [x] `actionlint` (or `gh workflow view`) reports no syntax errors — clean once `queue` is ignored. actionlint 1.7.7 predates the feature (GitHub added it 2026-05-07) and reports it as an unexpected key; the workflow carries a comment saying so
- [x] Grep confirms the workflow contains neither `NODE_AUTH_TOKEN` nor `registry-url` — both appear only inside the comment explaining why they are absent; neither is on a configuration line
- [x] Grep confirms the workflow contains no `gh release create`
- [x] Grep confirms `queue: max` is present and `cancel-in-progress: true` is not (the combination is a validation error)
- [x] The tag-name guard carries an `if:` condition on `github.ref_type`

Static greps prove the workflow _says_ the right things. The branches below are
the ones that only run when something has already gone wrong, which is the worst
time to discover they were never exercised. Rehearse each with `dry_run=true`,
or against a scratch package on a fork:

- [x] **Resume after a post-publish failure** — with the version already on the registry and the `.tgz` matching, the run skips the publish and completes verification instead of refusing — proven against `@cytoscape-web/app-runtime@0.4.0-next.1`, a real OIDC publish whose provenance repo/workflow/commit all match: `action=skip`
- [x] **Integrity mismatch** — a registry entry whose `dist.integrity` differs from the local `.tgz` stops the run — proven against the published `1.0.0-beta.3`
- [x] **Provenance SHA mismatch** — a version published from this same workflow at a different commit stops the run rather than resuming onto it — proven by holding repo and workflow fixed and changing only the SHA
- [ ] **Missing required CI** — a SHA with no `Lint` / `Build` / `Unit Tests` / `API Types Package` check run fails the guard, and the message names which check was missing — **needs a live run**: the guard calls the Checks API, which has no offline equivalent. Exercised by Step 5's rehearsal
- [x] **dist-tag rollback refusal** — with the dist-tag already pointing at a newer version, the run stops rather than moving it backwards — proven by asking it to publish `1.0.0-beta.2` while `latest` is `1.0.0-beta.3`
- [ ] **Non-`E404` registry error** — a failed `npm view` that is not a 404 fails the run instead of being read as "not published" — **not yet exercised**: needs a reachable-but-failing registry, which is awkward to stage. The code path is small and reviewed; note it as untested rather than claiming otherwise

---

## Step 3: Close the CI Gap

_Design: §Background 2, §Target design → Closing the CI gap_

### Pre-read files

| File                                            | Purpose                                                                                 |
| ----------------------------------------------- | --------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`                      | The `build` job's in-job-locality comment is the precedent to follow                    |
| `src/app-api/federation/mfDeclarations.test.ts` | Precedent for a test under `src/` that reads `packages/` from disk                      |
| `vitest.config.ts`                              | Confirms the include glob is `src/**` only — why the test cannot live under `packages/` |

### 3a — `api-types` job in `ci.yml`

- [x] Add a **separate** `api-types` job (not appended to `build`) with a 10-minute timeout
- [x] Give the job an explicit `name: API Types Package` — the release workflow's CI gate (Step 2b) matches on the display name, so an unnamed job would be reported under its ID and the gate would miss it
- [x] Steps: checkout → `./.github/actions/setup-node-dependencies` → `npm run build:api-types` → `npm pack -w packages/api-types --ignore-scripts` → `npm run verify:api-types-pack -- <tgz>` → `npm run verify:api-types-consumer -- <tgz>`
- [x] Comment explaining that root `tsconfig.json` excludes `packages/`, so `lint:tsc` never sees this package and a declaration break would otherwise be invisible until release day
- [x] Comment noting the build, the pack and both verifiers must stay in the same job, because `packages/api-types/dist/` and the `.tgz` do not survive a job boundary
- [ ] **Repository settings, not part of the PR — not yet done:** after the PR merges and the job has run once under its final name, add **`API Types Package` only** to `development`'s branch-protection required checks. `required_status_checks` is currently empty, so this is the first check this repository requires; scoping it to the new job keeps the blast radius small and leaves the existing development flow intact
- [ ] Do **not** add `Lint` / `Build` / `Unit Tests` at the same time — making them blocking is a separate policy decision that needs a view on their flakiness first. Step 2b still verifies all four at release time; that gate reads the Checks API directly and does not depend on branch protection

### 3b — `src/app-api/federation/apiTypesRelease.test.ts`

- [x] Create the file next to `mfDeclarations.test.ts`, with `// @vitest-environment node` as the first line
- [x] Assert `packages/api-types/package.json` version equals `package-lock.json`'s workspace entry — the highest-value assertion, catching "bumped the package, forgot `npm install`"
- [x] Assert `CHANGELOG.md` has a `## <version>` heading for the current package version
- [x] Assert every heading's parenthetical is either `YYYY-MM-DD` or the literal `unpublished` — nothing else
- [x] Assert at most one `(unpublished)` section exists and, if present, it is the first
- [x] Assert version headings descend in strict semver order, using the root `semver` dependency
- [x] Assert `files` includes `dist` and the `types` path lives under a directory named in `files`
- [x] Reuse the parser exported from `scripts/changelog-section.mjs` so there is exactly one heading-parsing implementation
- [x] Do **not** require a date — `(unpublished)` is the legitimate working state on a pull request; the date requirement belongs only to the release workflow

#### Verification (Step 3)

- [x] `npx vitest run apiTypesRelease` passes — 6 tests
- [x] `npm run test:checks:quiet` passes — 335 files, 4259 tests
- [ ] The pull request's CI run shows the new `api-types` job green — **pending**: the job has not run on GitHub yet. Its four steps were executed locally in order and all passed
- [x] Temporarily editing `packages/api-types/package.json` to a mismatched version makes `apiTypesRelease` fail (revert afterwards) — and two more breakages were staged: an invalid parenthetical (`(TBD)`) and an out-of-order version heading each fail exactly their own assertion

---

## Step 4: npm Trusted Publisher (manual — human only)

_Design: §Target design → npm Trusted Publishing_

**Nothing in CI can perform this step.** It requires a browser session as an npm
maintainer of the package (`keiono`, `ndexbio-org`, or `dylanfong`). Step 2's
workflow will fail to publish until this is done.

### 4a — Configure the trusted publisher

- [ ] Sign in to npmjs.com and open `https://www.npmjs.com/package/@cytoscape-web/api-types/access`
- [ ] In **Trusted Publisher**, choose **Connect to a trusted publisher** → **GitHub Actions**
- [ ] Organization or user: `cytoscape`
- [ ] Repository: `cytoscape-web`
- [ ] Workflow filename: `release-api-types.yml` — must match Step 2a exactly
- [ ] Environment name: **leave blank** (only fill this in if the workflow later adopts `environment:`; the two must agree or the OIDC subject will not match)
- [ ] **Allowed actions: tick `npm publish`.** Configurations created after 2026-09-03 default to `npm stage publish` only, so accepting the default would make Step 2c's `npm publish` fail. (Configurations created before 2026-05-20 allowed `npm publish` outright, and those before 2026-09-03 forced an explicit choice — this one falls after both dates.) If the team prefers the two-phase flow instead, change the workflow to `npm stage publish` rather than leaving the mismatch
- [ ] Save

### 4b — Confirm nothing else blocks the publish

- [ ] Check **Publishing access** on the same page; leave it as it is — trusted publishing works under either 2FA setting
- [ ] Confirm the `@cytoscape-web` scope does not force a different registry or restrict publishing to a team that excludes the OIDC identity
- [ ] Confirm no GitHub organization ruleset restricts pushing tags matching `api-types-v*` for the releaser

#### Verification (Step 4)

- [ ] The package's npm settings page lists a GitHub Actions trusted publisher for `cytoscape/cytoscape-web` / `release-api-types.yml`
- [ ] `gh secret list` still returns empty — no npm credential was introduced

---

## Step 5: Dry-Run Rehearsal

_Design: §Target design → The release workflow_

### 5a — Rehearse before the CHANGELOG is dated

- [ ] Merge Steps 0–3 to `development`
- [ ] Run `gh workflow run release-api-types.yml --ref development -f dry_run=true`, then `gh run watch`
- [ ] Confirm the run fails at the CHANGELOG date guard with exit code `2` — this is the **correct** outcome while the heading still reads `(unpublished)`, and it proves the guard works

### 5b — Rehearse after Step 7a

- [ ] After the CHANGELOG is dated and merged, run the dispatch again with `dry_run=true`
- [ ] Confirm every guard passes, the build succeeds, both verifiers pass, and `npm publish --dry-run` reports the expected tarball
- [ ] Confirm the job summary renders the release notes

### 5c — Record what the rehearsal does and does not prove

- [ ] Note in the run summary, and in the runbook, that a green rehearsal covers the guards, the build, the packaging and the consumer type-check — but **not** npm authentication
- [ ] `npm publish --dry-run` succeeds with no credentials at all: verified locally, where it reported success while `npm whoami` returned `E401`. A dry run may still attempt the OIDC exchange, but it does not require it to succeed — so a green rehearsal cannot confirm the trusted-publisher configuration either way. That is why every guard is ordered ahead of the real publish

#### Verification (Step 5)

- [ ] A fully green `dry_run=true` run exists against the merge commit that will be tagged
- [ ] Nothing was published — `npm view @cytoscape-web/api-types version` still reports `1.0.0-beta.3`

---

## Step 6: Documentation

_Design: §Background 4, §Target design_

### Pre-read files

| File                                   | Purpose                                            |
| -------------------------------------- | -------------------------------------------------- |
| `packages/api-types/README.md:247-311` | The runbook being rewritten; rendered on npmjs.com |
| `packages/README.md`                   | Stale version table and install hint               |

### 6a — Rewrite the release runbook in `packages/api-types/README.md`

- [ ] Step 2: note that the CHANGELOG heading must be dated (the workflow refuses `(unpublished)`) and that `package-lock.json` must be regenerated; mention that a CI test now enforces both
- [ ] Step 3: replace the hand-run checklist with `npm run lint`, `npm run test:unit`, `npm run build:api-types`, `npm pack -w packages/api-types --ignore-scripts`, then both verifiers against the resulting `.tgz`; note these also run on every pull request
- [ ] Step 3: **delete the "confirm the tarball contains … " list entirely** — it names five entries but the real count is six (it omits the package-root `index.d.ts`), and the check is now machine-enforced
- [ ] New step: rehearse with `gh workflow run release-api-types.yml --ref development -f dry_run=true`
- [ ] Step 4: keep the "do not tag a later `development` HEAD" warning verbatim; give the extract-to-file tagging command from 7b (**never** a pipe into `git tag -F -`); state plainly that **pushing the tag publishes the package** with no further confirmation
- [ ] Step 5: replace `npm whoami` / `npm run build` / `npm publish` with a description of what the workflow does; state that there are no npm credentials in the repository and that **renaming the workflow file breaks publishing**
- [ ] Step 5: replace the standing `latest` dist-tag sentence (`README.md:290-292`) with the full policy and its expiry — `latest` while only prereleases exist, `next` for prereleases once `1.0.0` ships — so the current choice reads as a decision with an end date rather than an oddity
- [ ] Step 6: point at the workflow run's job summary as the primary record, keep the `npm view` commands as an independent second opinion, and add checking for the Provenance panel on the npm page
- [ ] New section "Why there is no GitHub Release" — webhook `527149929`, the DOI record, and the escape hatch if one is ever genuinely needed
- [ ] Extend the closing immutability warning: if a publish fails _after_ the tag exists, do not delete or move the tag — re-run the workflow against the existing tag, which the registry-state guard (Step 2d) resumes rather than rejects

### 6b — Fix stale content

- [ ] `packages/README.md:11` — version table says `0.1.0-alpha.0`; change to the current version
- [ ] `packages/README.md:28` — `npm install @cytoscape-web/api-types@alpha` still points at the abandoned `0.1.0-alpha.3`; drop `@alpha`
- [ ] `packages/README.md` "Publishing" section points at `implementation-checklist-phase0.md`, which only records the historical one-off alpha publish; point it at this checklist and the design document instead
- [ ] `packages/api-types/README.md:57` — the "`1.0.0-beta.3` migration notes" section is stale for the most breaking release in the package's history; add or replace with beta.4 notes covering the `'apps-menu'` component-to-data change (`APP9` on `component`, actions to `onClick`, UI to `apis.dialog.open`), the `SelectionApi` signature split, and the collection-getter wrapping. This README is what npmjs.com renders, so it is the migration document every consumer sees

#### Verification (Step 6)

- [ ] `npx prettier --check` on the changed Markdown, YAML and `.mjs` files passes — `npm run format` does **not** cover them; its glob is `src/**/*.{js,jsx,ts,tsx}` only
- [ ] Every file path and line reference cited in the rewritten runbook resolves
- [ ] No remaining occurrence of `@cytoscape-web/api-types@alpha` in `packages/`

---

## Step 7: Release `1.0.0-beta.4`

_Design: §Consumer impact_

### Pre-read files

| File                              | Purpose                                      |
| --------------------------------- | -------------------------------------------- |
| `packages/api-types/CHANGELOG.md` | Lines 5, 7–22, 123, 159 are all edited in 7a |

### 7a — Prepare the CHANGELOG

- [ ] Line 5: `## 1.0.0-beta.4 (unpublished)` → `## 1.0.0-beta.4 (YYYY-MM-DD)` using the actual merge date
- [ ] Lines 7–22: the `### Changed` heading holds a single item explicitly labelled `**BREAKING — 'apps-menu' entries are plain data, not components.**`, sitting under the non-breaking heading and before `### Added`. Move that item to the top of the existing `### Changed — BREAKING` block and delete the now-empty `### Changed` heading. Note that having both a `### Changed — BREAKING` and a `### Changed` section is the house convention — beta.3 has both — so the defect is only the misfiled item, not the two headings
- [ ] Line 159: delete the stray blank line splitting the `### Fixed` list, so all its items form one list
- [ ] Confirm no version bump is needed — `package.json` and `package-lock.json` already record `1.0.0-beta.4`

### 7a-2 — Write the host-compatibility statement

_Design: §Target design → Declaring app compatibility_

Consumers currently have no way to tell which Cytoscape Web implements a given
api-types version: `APP_API_VERSION` is the hardcoded string `'1.0'`
(`src/app-api/federation/hostDescriptor.ts:22`) and has not moved across
`1.0.0-beta.0`–`1.0.0-beta.4`. Until that is fixed (Step 9), the statement is
the only signal.

- [ ] Add a short compatibility block at the top of the `## 1.0.0-beta.4` section of `CHANGELOG.md`, so it ships in the tarball and renders on npmjs.com
- [ ] Identify the host build by the **tag name** (`api-types-v1.0.0-beta.4`), not by a commit SHA. Writing the SHA here is self-referential: the CHANGELOG is committed before the merge, and the merge commit's SHA does not exist until after that content is fixed — adding it would change the commit and invalidate the SHA just written
- [ ] Let the machine record the SHA instead: the workflow summary and the provenance attestation both carry the exact commit, and `git rev-list -n1 api-types-v1.0.0-beta.4` resolves the tag for anyone who needs it
- [ ] Name which deployments carry that build at release time, concretely rather than as "the latest version". For beta.4: available on `dev1.ndexbio.org/cytoscape` once `development` is deployed there (Step 7d), and **not** on production `web.cytoscape.org`, which stays on the 1.0.x line until 1.1.0
- [ ] Tell the reader how to check for themselves: **Help → About** shows the deployed build's commit (`REACT_APP_GIT_COMMIT`, injected at `vite.config.ts:38`, rendered at `src/features/ToolBar/HelpMenu/AboutDialog.tsx:56-57`). Comparing it against `git rev-list -n1 api-types-v1.0.0-beta.4` answers "does this deployment have it?" — necessary because dev1 is deployed manually and can lag `development`
- [ ] State plainly that the APIs added in beta.4 (Dialog API, `applyVisualStyle`/`getVisualStyle`, `getStyles`/`switchStyle`, the `'modal-launcher'` and `'search-bar'` slots) exist on `development` only, so **no released application version implements them yet** — this is a real hazard, not boilerplate: an app can compile against methods the deployed host does not have
- [ ] Mirror the same statement in the `packages/api-types/README.md` migration notes updated in Step 6b

### 7b — Merge and tag

- [ ] Merge the release pull request into `development` and note the merge commit SHA
- [ ] Complete Step 5b against that merge commit
- [ ] Tag the **exact merge commit**, not a later `development` HEAD:

  ```bash
  #!/usr/bin/env bash
  # set -e is required. Verified: a failing `test -s` does NOT stop the next
  # command in an ordinary shell, so without it a failed extraction still
  # reaches `git tag` and creates a tag with an empty message.
  set -euo pipefail

  VERSION=1.0.0-beta.4
  SHA=<MERGE_COMMIT_SHA>
  git fetch origin development

  # Read the CHANGELOG **from the commit being tagged**, not the working tree,
  # so the notes cannot drift from what is actually released.
  git show "$SHA:packages/api-types/CHANGELOG.md" > /tmp/changelog-at-tag.md

  # --silent suppresses npm's `> pkg@version script` banner, which npm writes
  # to stdout and would otherwise land inside the tag message.
  npm run --silent changelog:section -- \
    --version "$VERSION" --file /tmp/changelog-at-tag.md > /tmp/notes.md
  test -s /tmp/notes.md

  git tag -a "api-types-v$VERSION" "$SHA" -F /tmp/notes.md
  git push origin "refs/tags/api-types-v$VERSION"
  ```

- [ ] `gh run watch` — the tag push fires the workflow automatically and publishes with `--tag latest`

### 7c — Verify the release

- [ ] Job summary reports the expected version, shasum, integrity and provenance URL
- [ ] `npm view @cytoscape-web/api-types dist-tags` shows `latest: 1.0.0-beta.4`
- [ ] `npm view @cytoscape-web/api-types@1.0.0-beta.4 --json | jq '.dist.attestations'` is non-null
- [ ] The npm package page shows a **Provenance** panel linking back to the workflow run and the tagged commit — the first release with one, since beta.3 was published by hand
- [ ] `git ls-remote --tags origin 'refs/tags/api-types-v1.0.0-beta.4*'` resolves to the intended merge commit
- [ ] **No GitHub Release was created** — `gh release list` is unchanged
- [ ] **Zenodo did not fire** — `gh api repos/cytoscape/cytoscape-web/hooks/527149929/deliveries --jq '.[0].delivered_at'` shows no new delivery, and the DOI record's version list is unchanged

### 7d — Deploy `development` to dev1

`dev1.ndexbio.org/cytoscape` is deployed **manually** from `development`, so
"merged" does not imply "running". Until this is done, beta.4 documents an API
that is reachable nowhere, and the compatibility statement written in Step 7a-2
is false.

- [ ] Deploy `development` at or after the release commit to `dev1.ndexbio.org/cytoscape`
- [ ] Confirm via **Help → About** that the deployed commit is at or after `git rev-list -n1 api-types-v1.0.0-beta.4`
- [ ] Smoke-check one beta.4 API against the deployed host — `applyVisualStyle` or an `apis.dialog.open` call from an app — so the claim is tested, not just asserted
- [ ] If the deployment has to happen after the publish, say so in the compatibility block rather than claiming availability that does not exist yet

#### Verification (Step 7)

- [ ] A clean `npm pack @cytoscape-web/api-types@1.0.0-beta.4` from a scratch directory yields a tarball whose `dist/index.d.ts` contains `applyVisualStyle`, `switchStyle`, `DialogApi` and `registerModal` — proving the stale-`dist` failure mode is closed
- [ ] The published compatibility statement is true when read: the build it names is reachable at the deployment it names, confirmed through Help → About rather than assumed

---

## Step 8: Downstream Consumers

_Design: §Consumer impact_

`^1.0.0-beta.3` matches `1.0.0-beta.4` under semver, but both consumer
lockfiles currently record `1.0.0-beta.3`, so `npm ci` keeps resolving beta.3
after the publish. The breakage arrives on the next lockfile-regenerating
operation — `npm update`, an install with no lockfile, or a newly scaffolded
app — rather than instantly. That is a reprieve, not safety.

### 8a — Rehearse the migration **before** Step 7 publishes

Do this while the version number can still change. Once beta.4 is on the
registry, every problem found here becomes a `1.0.0-beta.5`.

- [ ] Build a local `.tgz` from the release commit (`npm run build:api-types && npm pack -w packages/api-types --ignore-scripts`)
- [ ] Install it into `cy-agent-bridge` via a `file:` specifier and run `npx tsc --noEmit` — this repository sets `"skipLibCheck": false` (`tsconfig.json:33-35`) with the package in `types`, making it the strictest consumer of the declarations
- [ ] Install it into each example app and fix the fallout, especially every app registering an `'apps-menu'` item: the component-to-data change is not source-compatible, so a pin bump alone is not enough
- [ ] Record which host commit or version beta.4 requires, and which deployments carry it. `apiVersion` is documented as being for future compatibility checking (`src/app-api/api_docs/Api.md:2766`) and enforces nothing today, so nothing stops an app built against beta.4 from loading into an older host
- [ ] Fold that host-compatibility statement into the release notes

### 8b — Bump the pins after the publish

- [ ] `cy-agent-bridge/package.json:51` → `^1.0.0-beta.4`, updating the lockfile in the same commit
- [ ] `cytoscape-web-app-examples/package.json:62` → `^1.0.0-beta.4`
- [ ] `project-template/package.json:60` → `^1.0.0-beta.4`
- [ ] `hello-world/package.json:42` → `^1.0.0-beta.4`
- [ ] `network-statistics/package.json:40` → `^1.0.0-beta.4`
- [ ] `network-workflows/package.json:42` → `^1.0.0-beta.4`
- [ ] Land the app migrations rehearsed in 8a

#### Verification (Step 8)

- [ ] `cy-agent-bridge` type-checks and builds against the published package
- [ ] Every example app builds, and its menu items render and act correctly in the host at `localhost:5500`
- [ ] Every consumer lockfile records `1.0.0-beta.4`, so `npm ci` resolves the new version rather than the old one

---

## Step 9: Guard the contract (follow-up — **not** blocking `1.0.0-beta.4`)

_Design: §Background 5, §Background 6, §Follow-up_

Steps 0–8 make the release mechanism safe. They do not stop the published
contract from changing without anyone noticing, because the package is a facade
over `src/app-api/types/` and a one-line edit there reads as ordinary
application code in review. Since the beta.3 tag, 23 commits touched that
directory. Sixteen updated the changelog — good discipline, but discipline is
currently the only mechanism.

Do this after beta.4 ships. The beta.4 tag is the natural baseline: its
contract has just been reviewed by hand.

### 9a — API surface report

- [ ] Generate a public-declaration summary and commit it — Microsoft API Extractor writes an `.api.md`; a committed `.d.ts` rollup reviewed as a file is a lighter equivalent
- [ ] Produce it from the **same `tsup` output the package ships**, not a second compilation, or the report and the tarball can disagree
- [ ] Cover **both** shipped declaration files. A report over `dist/index.d.ts` alone misses every change to the `cyweb/*` module declarations in `dist/mf-declarations.d.ts` — including altered argument and return types. The existing `mfDeclarations.test.ts` does not close that gap: it asserts that the declared module _names_ match `FEDERATION_EXPOSES`, and says nothing about their signatures
- [ ] Fail CI when the generated report differs from the committed one, with a message telling the author to review the API change and commit the updated report
- [ ] Generate the first baseline at the `api-types-v1.0.0-beta.4` commit
- [ ] Add the report to the `api-types` job from Step 3a
- [ ] Document in `packages/api-types/README.md` that a changed report means a changed public contract and requires a changelog entry

### 9b — Make `apiVersion` mean something

- [ ] Give `APP_API_VERSION` (`src/app-api/federation/hostDescriptor.ts:22`) a value that actually changes when the contract changes, instead of the constant `'1.0'`
- [ ] Let apps declare the API versions they support — a **range or compatible-major**, not a bare minimum. "At least 1.4" does not imply compatibility with 2.0, which by definition contains breaking changes, so a minimum-only check silently green-lights the one case it most needs to catch
- [ ] Have the host refuse, or warn loudly, on a mismatch at mount time
- [ ] Update `src/app-api/api_docs/Api.md:2766`, which currently documents the field as "reserved for future compatibility checks"
- [ ] Update the example apps and `cy-agent-bridge` to declare their requirement

This turns Step 7a-2's written claim into an enforced one. It touches the host,
the app runtime and every example app, so treat it as its own project rather
than a checklist item bolted onto a release.

### 9c — Move prereleases to `next` (at the first prerelease after `1.0.0`)

_Design: §Dist-tag policy_

Decided, but **not actionable until `1.0.0` ships**. `latest` cannot be pointed
at nothing (see design §Dist-tag policy for the measured evidence), so moving
prereleases to `next` today would leave `latest` stuck on an older prerelease —
worse than where it is now.

- [ ] Publish `1.0.0` to `latest` as usual — this is the release that gives `latest` a stable meaning
- [ ] From the next prerelease onward, publish prereleases to `next`
- [ ] Replace the hardcoded `latest` default in the release workflow with a derived one — `semver.prerelease(version) === null ? 'latest' : 'next'`, using the root `semver` dependency — so the policy cannot be forgotten
- [ ] Move consumers from `^1.0.0-beta.n` to `^1.0.0`. This is the half that actually protects them: ranges resolve against versions, not dist-tags, but a caret on a stable version excludes prereleases of a different tuple (verified: `^1.0.0` matches `1.0.1` and `1.1.0`, not `1.1.0-beta.1`)
- [ ] `npm dist-tag rm @cytoscape-web/api-types alpha` — it still points at `0.1.0-alpha.3` and only misdirects
- [ ] Update the runbook and `packages/README.md` to describe the post-1.0.0 arrangement

#### Verification (Step 9)

- [ ] A pull request that edits `src/app-api/types/` fails CI until the committed API report is regenerated
- [ ] An app declaring a higher required API version than the host provides is refused or warned at mount time
- [ ] After `1.0.0`, `npm view @cytoscape-web/api-types dist-tags` shows `latest` on a stable version and `next` on the newest prerelease, and no `alpha`

---

## Verification

- [ ] `npm run test:checks:quiet` passes
- [ ] Build, pack, and both verifiers pass against a single `.tgz`
- [ ] The `api-types` job is green on the pull request that adds it, and is a required check
- [ ] A `dry_run=true` dispatch is fully green against the commit that will be tagged — remembering it does not exercise npm authentication
- [ ] The published `dist.integrity` was asserted equal to the locally packed `.tgz`, not merely logged
- [ ] `@cytoscape-web/api-types@1.0.0-beta.4` is on npm with `latest` pointing at it and a provenance attestation attached
- [ ] `gh secret list` is still empty — no npm credential was introduced
- [ ] The Zenodo DOI record gained no new version
- [ ] All six downstream consumers pin `^1.0.0-beta.4`, record it in their lockfiles, and build
- [ ] The published `CHANGELOG.md` states which host commit and which deployments implement this version

Step 9 is deliberately excluded from this list — it is follow-up work, tracked
here so it is not lost, and not a condition for releasing `1.0.0-beta.4`.
