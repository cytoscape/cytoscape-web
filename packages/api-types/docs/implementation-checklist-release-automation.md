# Implementation Checklist — Release Automation for `@cytoscape-web/api-types`

> Track progress for the migration from the manual release runbook to a
> tag-triggered CI publish. Mark `[x]` when complete. Run verification after
> each step.
>
> First release under this flow: `1.0.0-beta.4`.

_Design: [release-automation-design.md](release-automation-design.md) — full rationale including the four failure modes of the current flow, the Zenodo constraint, and the rejected alternatives_

**Dependency note:** Steps 0–3 are ordinary repository changes and can land in
one pull request. **Step 4 is manual and can only be performed by a human with
owner rights on the npm package** — nothing in CI can self-serve it, and Step 7
cannot succeed until it is done. Step 5 depends on Steps 0–4. Step 7 depends on
everything before it. Step 8 runs in the two sibling repositories after the
publish succeeds.

**Key decisions** — resolved before implementation; do not re-litigate during
the work:

| Decision                  | Resolution                                                                                                                                                                                                     |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Release notes destination | **No GitHub Release.** Annotated tag message, workflow job summary, and the `CHANGELOG.md` shipped in the npm tarball. Repo webhook `527149929` is a Zenodo receiver on the `release` event with no tag filter |
| npm authentication        | **Trusted Publishing (OIDC).** No repository secret; provenance generated automatically                                                                                                                        |
| npm dist-tag              | **`latest`**, per the standing policy in `../README.md:290-292`                                                                                                                                                |
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

- [ ] Add `repository` with `"type": "git"`, `"url": "git+https://github.com/cytoscape/cytoscape-web.git"`, and `"directory": "packages/api-types"` — write the canonical `git+https://` form; provenance validates this URL against the repository that ran the workflow
- [ ] Add `"publishConfig": { "access": "public" }` — scoped packages default to `restricted`; encoding it here means `--access public` cannot be forgotten

### 0b — Descriptive metadata

- [ ] Add `homepage`, `bugs.url`, and `author`, copying the values from the root `package.json` so the two agree

### 0c — Build safety net

- [ ] Add `"prepack": "npm run build"` to `scripts` — makes it structurally impossible to pack a stale `dist/` (the failure mode described in design §Background 1)
- [ ] Confirm `prepack` does **not** fire on a root `npm ci` (npm runs `prepare`, not `prepack`, for linked workspaces)

#### Verification (Step 0)

- [ ] `npm ci` at the repository root still succeeds and does not trigger a `tsup` build
- [ ] `npm pack -w packages/api-types --dry-run --json` reports `"version": "1.0.0-beta.4"` and 6 entries
- [ ] `node -p "require('./packages/api-types/package.json').publishConfig.access"` prints `public`

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

- [ ] Create the file as dependency-free Node ESM (must run before `npm ci`)
- [ ] CLI: `--version <v>`, `--file <path>` (default `packages/api-types/CHANGELOG.md`), `--require-date`, `--print-date`
- [ ] Parse headings with `/^## +(\S+?)(?: +\((.+?)\))?\s*$/` — keep the parenthetical optional so a malformed heading is found and reported rather than silently missed
- [ ] Body = lines between the matched heading and the next `## `, with leading and trailing blank lines trimmed; do **not** collapse interior blank lines
- [ ] Exit `1` when the section is missing, `2` when `--require-date` is set and the parenthetical is not `YYYY-MM-DD` — distinct codes so callers can tell "forgot the entry" from "forgot the date"
- [ ] Export the heading parser as a named export alongside the CLI entry point (guarded by an `import.meta.url === process.argv[1]` main check) so Step 3b can reuse it

### 1b — `scripts/verify-api-types-pack.mjs`

- [ ] Create the file; run `npm pack --dry-run --json` with `cwd` set to `packages/api-types`
- [ ] Assert the exact file list: `CHANGELOG.md`, `README.md`, `dist/index.d.ts`, `dist/mf-declarations.d.ts`, `index.d.ts`, `package.json` — report missing and unexpected entries separately, and make the failure message say to update the expected list if the change is intentional
- [ ] Assert `entryCount` matches the expected list length and the packed version matches `package.json`
- [ ] Assert `dist/index.d.ts` exceeds 10,000 bytes — an empty or stub declaration file is the characteristic `tsup` failure mode
- [ ] Assert `dist/index.d.ts` line 1 is exactly `/// <reference path="./mf-declarations.d.ts" />` — proves the relative-path `postbuild` one-liner ran with the right cwd instead of silently no-opping
- [ ] Assert `dist/mf-declarations.d.ts` is byte-identical to `src/mf-declarations.d.ts`
- [ ] Assert `dist/index.d.ts` contains the load-bearing exports `CyWebApiType` and `ApiResult`
- [ ] Write `{ version, shasum, integrity, files }` to `/tmp/pack-result.json` so the release workflow can diff against the registry
- [ ] Exit non-zero with a single actionable message on any failure

### 1c — Register the scripts

- [ ] Add `"changelog:section": "node scripts/changelog-section.mjs"` to the root `package.json`
- [ ] Add `"verify:api-types-pack": "node scripts/verify-api-types-pack.mjs"` to the root `package.json`

#### Verification (Step 1)

- [ ] `npm run changelog:section -- --version 1.0.0-beta.3` prints the beta.3 section
- [ ] `npm run changelog:section -- --version 1.0.0-beta.4 --require-date` exits `2` while the heading still reads `(unpublished)`
- [ ] `npm run changelog:section -- --version 9.9.9` exits `1`
- [ ] `npm run build:api-types && npm run verify:api-types-pack` passes
- [ ] Temporarily truncating `dist/index.d.ts` makes `verify:api-types-pack` fail (restore afterwards)

---

## Step 2: Release Workflow

_Design: §Target design → The release workflow, §Guard order_

### Pre-read files

| File                                                 | Purpose                                                     |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| `.github/workflows/ci.yml`                           | House style for jobs, concurrency and timeouts              |
| `.github/actions/setup-node-dependencies/action.yml` | Reused **unchanged**; note it skips `npm ci` on a cache hit |
| `packages/api-types/README.md:247-311`               | The manual runbook this workflow replaces                   |

### 2a — Create `.github/workflows/release-api-types.yml`

- [ ] Header comment stating that the **filename is load-bearing** (npm's Trusted Publisher configuration names `release-api-types.yml`; renaming breaks publishing) and that the workflow deliberately creates **no** GitHub Release, with the Zenodo webhook id and DOI as the reason
- [ ] Triggers: `push: tags: ['api-types-v*']` and `workflow_dispatch` with a `dry_run` boolean (default `true`) and a `dist_tag` choice (`latest` / `beta` / `next`, default `latest`)
- [ ] `permissions: contents: read` + `id-token: write` — no write scope, since no GitHub Release is created
- [ ] `concurrency: { group: release-api-types, cancel-in-progress: false }` — ref-less so two tags cannot publish at once; never cancel a publish in flight
- [ ] `actions/checkout@v4` with `fetch-depth: 0`
- [ ] Reuse `./.github/actions/setup-node-dependencies` **without** a `registry-url` input, then run a clean `npm ci` that bypasses the restored `node_modules` cache
- [ ] Read the version from `packages/api-types/package.json`; never derive it from the tag

### 2b — Guards (all before the build)

- [ ] Refuse a non-dry-run publish unless `github.ref_type == 'tag'`
- [ ] Tag name minus the `api-types-v` prefix equals the `package.json` version
- [ ] `package-lock.json`'s `packages['packages/api-types'].version` equals the `package.json` version
- [ ] `scripts/changelog-section.mjs --require-date` succeeds, writing the notes to a file for later steps
- [ ] The version is not already on npm — `npm view <pkg>@<version> version` exits 1 with `E404` when absent, so this is one conditional; warn instead of failing under `dry_run`
- [ ] npm CLI is ≥ 11.5.1, using the root `semver` runtime dependency to compare; upgrade in place if not

### 2c — Build, publish, verify

- [ ] `npm run build:api-types`
- [ ] `npm run verify:api-types-pack`
- [ ] Publish with `npm publish --tag <dist_tag>` from `packages/api-types` — no `NODE_AUTH_TOKEN`, no `--access` flag (it is in `publishConfig`), no `--provenance` flag (automatic under OIDC)
- [ ] A parallel `--dry-run` step for the rehearsal path
- [ ] Post-publish: poll until the version is visible (the registry CDN lags a publish by seconds), then assert the reported version, log shasum/integrity/provenance URL, and assert the dist-tag resolves to the version just published
- [ ] Write the release notes and the published metadata to `$GITHUB_STEP_SUMMARY`
- [ ] Upload the release notes and `pack-result.json` as a workflow artifact with 90-day retention
- [ ] Confirm the workflow contains **no** `gh release create` and no `contents: write`

#### Verification (Step 2)

- [ ] `actionlint` (or `gh workflow view`) reports no syntax errors
- [ ] Grep confirms the workflow contains neither `NODE_AUTH_TOKEN` nor `registry-url`
- [ ] Grep confirms the workflow contains no `gh release create`

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

- [ ] Add a **separate** `api-types` job (not appended to `build`) with a 10-minute timeout
- [ ] Steps: checkout → `./.github/actions/setup-node-dependencies` → `npm run build:api-types` → `npm run verify:api-types-pack`
- [ ] Comment explaining that root `tsconfig.json` excludes `packages/`, so `lint:tsc` never sees this package and a declaration break would otherwise be invisible until release day
- [ ] Comment noting the build and the verifier must stay in the same job, because `packages/api-types/dist/` does not survive a job boundary

### 3b — `src/app-api/federation/apiTypesRelease.test.ts`

- [ ] Create the file next to `mfDeclarations.test.ts`, with `// @vitest-environment node` as the first line
- [ ] Assert `packages/api-types/package.json` version equals `package-lock.json`'s workspace entry — the highest-value assertion, catching "bumped the package, forgot `npm install`"
- [ ] Assert `CHANGELOG.md` has a `## <version>` heading for the current package version
- [ ] Assert every heading's parenthetical is either `YYYY-MM-DD` or the literal `unpublished` — nothing else
- [ ] Assert at most one `(unpublished)` section exists and, if present, it is the first
- [ ] Assert version headings descend in strict semver order, using the root `semver` dependency
- [ ] Assert `files` includes `dist` and the `types` path lives under a directory named in `files`
- [ ] Reuse the parser exported from `scripts/changelog-section.mjs` so there is exactly one heading-parsing implementation
- [ ] Do **not** require a date — `(unpublished)` is the legitimate working state on a pull request; the date requirement belongs only to the release workflow

#### Verification (Step 3)

- [ ] `npx vitest run apiTypesRelease` passes
- [ ] `npm run test:checks:quiet` passes
- [ ] The pull request's CI run shows the new `api-types` job green
- [ ] Temporarily editing `packages/api-types/package.json` to a mismatched version makes `apiTypesRelease` fail (revert afterwards)

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
- [ ] Confirm every guard passes, the build succeeds, `verify:api-types-pack` passes, and `npm publish --dry-run` reports the expected tarball
- [ ] Confirm the job summary renders the release notes

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
- [ ] Step 3: replace the hand-run checklist with `npm run lint`, `npm run test:unit`, `npm run build:api-types`, `npm run verify:api-types-pack`; note these also run on every pull request
- [ ] Step 3: **delete the "confirm the tarball contains … " list entirely** — it names five entries but the real count is six (it omits the package-root `index.d.ts`), and the check is now machine-enforced
- [ ] New step: rehearse with `gh workflow run release-api-types.yml --ref development -f dry_run=true`
- [ ] Step 4: keep the "do not tag a later `development` HEAD" warning verbatim; update the command to pipe `npm run changelog:section` into `git tag -F -`; state plainly that **pushing the tag publishes the package** with no further confirmation
- [ ] Step 5: replace `npm whoami` / `npm run build` / `npm publish` with a description of what the workflow does; keep the `latest` dist-tag policy sentence; state that there are no npm credentials in the repository and that **renaming the workflow file breaks publishing**
- [ ] Step 6: point at the workflow run's job summary as the primary record, keep the `npm view` commands as an independent second opinion, and add checking for the Provenance panel on the npm page
- [ ] New section "Why there is no GitHub Release" — webhook `527149929`, the DOI record, and the escape hatch if one is ever genuinely needed
- [ ] Extend the closing immutability warning: if a publish fails _after_ the tag exists, do not delete or move the tag — re-run the workflow against the existing tag

### 6b — Fix stale content

- [ ] `packages/README.md:11` — version table says `0.1.0-alpha.0`; change to the current version
- [ ] `packages/README.md:28` — `npm install @cytoscape-web/api-types@alpha` still points at the abandoned `0.1.0-alpha.3`; drop `@alpha`
- [ ] `packages/README.md` "Publishing" section points at `implementation-checklist-phase0.md`, which only records the historical one-off alpha publish; point it at this checklist and the design document instead
- [ ] `packages/api-types/README.md:57` — the "`1.0.0-beta.3` migration notes" section is stale for the most breaking release in the package's history; add or replace with beta.4 notes covering the `'apps-menu'` component-to-data change (`APP9` on `component`, actions to `onClick`, UI to `apis.dialog.open`), the `SelectionApi` signature split, and the collection-getter wrapping. This README is what npmjs.com renders, so it is the migration document every consumer sees

#### Verification (Step 6)

- [ ] `npm run format` leaves the touched Markdown unchanged
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

### 7b — Merge and tag

- [ ] Merge the release pull request into `development` and note the merge commit SHA
- [ ] Complete Step 5b against that merge commit
- [ ] Tag the **exact merge commit**, not a later `development` HEAD:
  ```bash
  git fetch origin development
  npm run changelog:section -- --version 1.0.0-beta.4 \
    | git tag -a api-types-v1.0.0-beta.4 <MERGE_COMMIT_SHA> -F -
  git push origin refs/tags/api-types-v1.0.0-beta.4
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

#### Verification (Step 7)

- [ ] A clean `npm pack @cytoscape-web/api-types@1.0.0-beta.4` from a scratch directory yields a tarball whose `dist/index.d.ts` contains `applyVisualStyle`, `switchStyle`, `DialogApi` and `registerModal` — proving the stale-`dist` failure mode is closed

---

## Step 8: Downstream Consumers

_Design: §Consumer impact_

**Time-sensitive.** `^1.0.0-beta.3` matches `1.0.0-beta.4` under semver, so the
moment beta.4 reaches `latest`, a fresh `npm install` in these repositories
silently pulls a heavily breaking release. There is no safe window.

### 8a — `cy-agent-bridge` first

- [ ] `cy-agent-bridge/package.json:51` → `^1.0.0-beta.4`, updating the lockfile in the same commit
- [ ] `npx tsc --noEmit` — this repository sets `"skipLibCheck": false` (`tsconfig.json:33-35`) with the package in `types`, making it the de facto correctness test for the published declarations, run against the real registry tarball

### 8b — `cytoscape-web-app-examples`

- [ ] `package.json:62` → `^1.0.0-beta.4`
- [ ] `project-template/package.json:60` → `^1.0.0-beta.4`
- [ ] `hello-world/package.json:42` → `^1.0.0-beta.4`
- [ ] `network-statistics/package.json:40` → `^1.0.0-beta.4`
- [ ] `network-workflows/package.json:42` → `^1.0.0-beta.4`
- [ ] Migrate every app that registers an `'apps-menu'` item — the component-to-data change is not source-compatible, so a pin bump alone is not enough

#### Verification (Step 8)

- [ ] `cy-agent-bridge` type-checks and builds against the published package
- [ ] Every example app builds, and its menu items render and act correctly in the host at `localhost:5500`

---

## Verification

- [ ] `npm run test:checks:quiet` passes
- [ ] `npm run build:api-types && npm run verify:api-types-pack` passes
- [ ] The `api-types` job is green on the pull request that adds it
- [ ] A `dry_run=true` dispatch is fully green against the commit that will be tagged
- [ ] `@cytoscape-web/api-types@1.0.0-beta.4` is on npm with `latest` pointing at it and a provenance attestation attached
- [ ] `gh secret list` is still empty — no npm credential was introduced
- [ ] The Zenodo DOI record gained no new version
- [ ] All six downstream consumers pin `^1.0.0-beta.4` and build
