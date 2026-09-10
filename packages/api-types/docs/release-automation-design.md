# Release Automation Design — `@cytoscape-web/api-types`

> Migration plan: from a hand-typed release runbook to a tag-triggered CI publish.
>
> Implementation checklist: [implementation-checklist-release-automation.md](implementation-checklist-release-automation.md)

_Supersedes the manual procedure in [`../README.md`](../README.md) §"Releasing a new API bundle (core developers)", which this design rewrites._

## Goal

Make releasing this package a matter of pushing an annotated tag. Every check
that a human currently performs by eye becomes a machine assertion that runs
before the registry is touched, and every release note reaches consumers
without anyone copying text between systems.

## Scope

**In scope:** the publication of `@cytoscape-web/api-types` from
`packages/api-types/` — package metadata, a new release workflow, the CI gap
that leaves this package unbuilt, and the release-notes path.

**Out of scope:** the Cytoscape Web application's own release
(`v*` tag → GitHub Release → Zenodo DOI). That flow is documented in the root
[`README.md`](../../../README.md) §"Release Management" and is deliberately left
untouched. The one place the two intersect — the Zenodo webhook — is treated as
a constraint to design around, not something to modify.

The previous `.github/workflows/release.yml` was deleted in `3999e2ce`
("removed release workflow, build requires deployment time paths") because it
ran the **application** `npm run build`, which needs deployment-time paths. A
workflow scoped to `npm run build:api-types` — a pure `tsup` declaration build —
does not have that problem. That is why this design is viable where the earlier
one was not.

---

## Background: the current flow and how it fails

Today's release is six prose steps in `../README.md:247-311`, executed by hand:
lint, unit tests, `npm run build:api-types`, eyeball `npm pack --dry-run`,
annotate a tag, then `npm publish --access public --tag latest`.

The last automated release of anything in this repository was never — the
`api-types-v1.0.0-beta.3` tag exists, but no workflow produced it.

Four concrete failure modes make this worth fixing now rather than after
`1.0.0-beta.4` ships.

### 1. A stale `dist/` can be published under a new version number

`dist/` is gitignored (`.gitignore:11`), and `package.json` has no `prepack` or
`prepublishOnly` script. Nothing connects "publish" to "build" except the
releaser's memory of step 5.

Measured on this working tree while preparing `1.0.0-beta.4`:

| Artifact                                      | Timestamp                       |
| --------------------------------------------- | ------------------------------- |
| `packages/api-types/dist/index.d.ts`          | 2026-07-29 (the beta.3 release) |
| `packages/api-types/src/events.ts`            | 2026-09-04                      |
| `packages/api-types/src/mf-declarations.d.ts` | 2026-09-03                      |

`npm pack --dry-run` against that tree produces a tarball that calls itself
`1.0.0-beta.4` and whose `dist/index.d.ts` contains **zero** occurrences of
`applyVisualStyle`, `switchStyle`, `DialogApi`, or `registerModal` — the four
headline additions of the release. A releaser who skips one step ships beta.3's
declarations under beta.4's version number, and npm versions are immutable.

### 2. CI never builds or type-checks this package

- Root `tsconfig.json` sets `"exclude": ["node_modules", "dist", "scripts", "packages", "scratch"]`, so `lint:tsc` (`tsc --noEmit`) cannot see `packages/`.
- `lint:oxlint` is `oxlint src` — also blind to `packages/`.
- `.github/workflows/ci.yml` runs `lint`, `build` (the Vite app), `unit-tests` and Playwright. It never runs `npm run build:api-types`.
- `vitest.config.ts` includes only `src/**/*.{test,spec}.{ts,tsx}`, so a test placed under `packages/` is silently ignored.

`packages/api-types/src/index.ts` re-exports `../../../src/app-api/types`, and
`tsconfig.json` maps `@/*` → `../../src/*`. So the declaration build walks the
whole public type graph of the host application. A refactor in
`src/app-api/types/` that breaks the `tsup` dts pass surfaces for the first time
on release day.

The only existing guard is `src/app-api/federation/mfDeclarations.test.ts`,
which reads `packages/api-types/src/mf-declarations.d.ts` from disk and asserts
parity with `FEDERATION_EXPOSES`. It runs because it lives under `src/`.

### 3. A GitHub Release here mints a DOI for the wrong thing

Repository webhook `527149929` is a Zenodo receiver subscribed to the `release`
event with **no tag filter**. Any GitHub Release published from this repository
mints a new version of the Cytoscape Web software record
([10.5281/zenodo.14775458](https://doi.org/10.5281/zenodo.14775458)).

An api-types release is not a release of the Cytoscape Web application. Putting
one in that citation record makes the record wrong, and Zenodo versions cannot
be deleted by the depositor.

This is why `api-types-v1.0.0-beta.3` has a tag but no GitHub Release. That
omission was correct; this design makes it deliberate and documented.

### 4. The runbook's own tarball check is wrong

`../README.md:273-274` says to confirm the tarball contains `dist/index.d.ts`,
`dist/mf-declarations.d.ts`, `README.md`, `CHANGELOG.md`, and `package.json` —
five entries. The real count is **six**: it omits the package-root `index.d.ts`
(123 bytes), which is listed in `files` and does exist. A check that has been
wrong since it was written is a check nobody was really performing.

---

## Key decisions

Resolved before implementation. Do not re-litigate these during the work.

| Decision                  | Resolution                                                                                                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Release notes destination | **No GitHub Release.** Notes land in the annotated tag message, the workflow run's job summary, and the `CHANGELOG.md` shipped inside the npm tarball. Protects the Zenodo DOI record (§Background 3)             |
| npm authentication        | **Trusted Publishing (OIDC).** No repository secret; provenance attestation is generated automatically                                                                                                            |
| npm dist-tag              | **`latest`.** Team policy per `../README.md:290-292` — the active beta stream uses `latest`. Exposed as a `workflow_dispatch` input for exceptions                                                                |
| Workflow trigger          | **Both** `push: tags: ['api-types-v*']` and `workflow_dispatch`. Tag push is the real release path; dispatch provides a dry-run rehearsal and a re-run path for a publish that fails after the tag already exists |

---

## Target design

### Package metadata

`packages/api-types/package.json` gains four things, two of which are required
for the publish to work at all.

| Field                                               | Why                                                                                                                                                                                                      |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `repository` with `directory: "packages/api-types"` | **Required.** npm validates this URL against the repository that ran the workflow; provenance generation fails without it. `directory` points npmjs.com at the subdirectory instead of the monorepo root |
| `publishConfig: { access: "public" }`               | **Required.** Scoped packages default to `restricted`. Encoding it here means `--access public` can never be forgotten by a human or lost in a future workflow edit                                      |
| `homepage`, `bugs`, `author`                        | Cosmetic but free — values copied from the root `package.json` so the two agree                                                                                                                          |
| `prepack: "npm run build"`                          | The structural fix for §Background 1. Makes it impossible to pack a stale `dist/`                                                                                                                        |

Write the canonical `git+https://github.com/...` form for `repository.url`. npm
normalizes the shorter form, but provenance URL matching is the one place where
being sloppy has bitten people.

`prepack` is safe against the `npm ci` footgun: npm runs `prepare`, not
`prepack`, for linked workspaces, so a root install does not fire it. It runs
with cwd set to the package directory, which is what the relative-path
`postbuild` one-liner needs.

Deliberately **not** adding `publishConfig.provenance: true`. Trusted Publishing
generates provenance automatically, and an explicit flag becomes a lie if the
token fallback is ever used without `id-token: write`.

### The release workflow

`.github/workflows/release-api-types.yml`.

**The filename is load-bearing.** npm's Trusted Publisher configuration for this
package names `release-api-types.yml`. Renaming the file breaks publishing until
the npm-side configuration is updated to match. This must be stated in a comment
at the top of the workflow.

```yaml
on:
  push:
    tags: ['api-types-v*']
  workflow_dispatch:
    inputs:
      dry_run: { type: boolean, default: true }
      dist_tag: { type: choice, options: [latest, beta, next], default: latest }

permissions:
  contents: read # no GitHub Release is created, so no write scope is needed
  id-token: write # OIDC + provenance

concurrency:
  group: release-api-types # deliberately ref-less: never two tags at once
  cancel-in-progress: false # a cancelled publish leaves an immutable version unverified
```

`permissions` is a real tightening: the repository default is
`default_workflow_permissions: write`.

A `workflow_dispatch` run against a branch is **rehearsal only** — the workflow
refuses a non-dry-run publish unless `github.ref_type == 'tag'`. This prevents
publishing an arbitrary un-tagged `development` HEAD.

The version always comes from `package.json`. The tag is only _validated
against_ it, never parsed into it. This is the opposite of the deleted
`release.yml`, which derived the version from the tag with
`npm version --no-git-tag-version` — mutating `package.json` at release time is
exactly how a lockfile drifts.

#### Guard order

**Every guard runs before the build.** A bad tag or an undated changelog should
fail in about thirty seconds, not after a full `tsup` declaration pass.

1. Tag name matches `package.json` version
2. `package-lock.json`'s workspace entry matches `package.json`
3. `CHANGELOG.md` has a dated `## <version> (YYYY-MM-DD)` section — an
   `(unpublished)` marker fails the release
4. The version is not already on npm
5. npm CLI is ≥ 11.5.1 (the Trusted Publishing minimum); upgrade if not

Guards 4 and 5 have cheap implementations worth noting:
`npm view <pkg>@<missing-version> version` exits 1 with `E404`, so guard 4 is a
single conditional. `semver@^7.8.4` is a root **runtime** dependency, already
installed after `npm ci`, so guard 5 needs no extra install.

Then: build → verify tarball contents → publish → verify the registry
(version, shasum, integrity, provenance URL, and that the dist-tag resolves to
the version just published).

### npm Trusted Publishing

Publishing authority comes from a Trusted Publisher configured on npmjs.com for
this package, bound to the repository and the workflow filename. There are no
npm credentials in this repository.

Configured on `https://www.npmjs.com/package/@cytoscape-web/api-types/access`:

| Field                | Value                   |
| -------------------- | ----------------------- |
| Organization or user | `cytoscape`             |
| Repository           | `cytoscape-web`         |
| Workflow filename    | `release-api-types.yml` |
| Environment name     | blank                   |

Requirements: npm CLI ≥ 11.5.1, Node ≥ 22.14, `id-token: write`, and a public
repository plus public package for automatic provenance. All are satisfied —
`.nvmrc` pins Node 24, and the repository is public.

**Do not set `registry-url` on `actions/setup-node` for this job.** When
`registry-url` is set, `setup-node` always writes
`//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}` into the runner's
`.npmrc`. With no `NODE_AUTH_TOKEN` the substitution yields an empty string,
npm reads the line as "auth is configured", skips the OIDC exchange entirely,
and fails with `ENEEDAUTH` or `E404`
([actions/setup-node#1551](https://github.com/actions/setup-node/issues/1551)).

This has a pleasant consequence: `./.github/actions/setup-node-dependencies` is
reused **unchanged**. Its lack of a `registry-url` input, which looked like an
obstacle, is the correct configuration on the OIDC path.

The release job should still bypass the composite action's `node_modules` cache
and run a clean `npm ci`, so the published artifact comes from a reproducible
install rather than a restored cache.

### Release notes

With no GitHub Release, the notes reach four places, none of which touch the
citation record:

| Destination          | How                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Annotated tag        | `npm run changelog:section -- --version <v> \| git tag -a api-types-v<v> <sha> -F -`. `git show api-types-v<v>` then prints the notes forever |
| Workflow job summary | The canonical machine-generated record, linked from the Actions tab                                                                           |
| npm tarball          | `CHANGELOG.md` is in `files`, so every consumer has the notes locally                                                                         |
| Workflow artifact    | `release-notes.md`, 90-day retention, for forensics                                                                                           |

`scripts/changelog-section.mjs` extracts one version's section. It parses
headings with `/^## +(\S+?)(?: +\((.+?)\))?\s*$/` — the parenthetical is
optional so a malformed heading is _found and reported_ rather than silently
missed — and emits distinct exit codes: 1 for a missing section, 2 for an
undated one. Callers can then tell "you forgot the entry" from "you forgot the
date".

It deliberately does not collapse interior blank lines. A stray blank inside a
list is a defect a human should see, not something the tool should paper over.

### Closing the CI gap

A new `api-types` job in `.github/workflows/ci.yml`, separate from `build`. It
is independent of the application build (`vite build` writes the root `dist/`;
`tsup` writes `packages/api-types/dist/` — no collision), runs in one to two
minutes in parallel, and gives a self-describing red X.

The build and the verification must sit in the **same job**, for the reason the
existing `build` job already documents in a comment: the verifier reads
`packages/api-types/dist/`, which does not survive a job boundary.

`scripts/verify-api-types-pack.mjs` runs `npm pack --dry-run --json` and asserts
an exact file list, the entry count, the version, and — the assertions that earn
their keep — that the build is not silently broken:

- `dist/index.d.ts` exceeds 10 KB (today it is 62,559 bytes; an empty or stub declaration file is the characteristic `tsup` failure mode)
- its first line is exactly `/// <reference path="./mf-declarations.d.ts" />`, proving the relative-path `postbuild` one-liner ran with the right cwd rather than silently no-opping
- `dist/mf-declarations.d.ts` is byte-identical to `src/mf-declarations.d.ts`
- a couple of load-bearing exported names are present

The same script runs in the release workflow, so the release path asserts
exactly what every pull request asserted.

A companion consistency test lives at
`src/app-api/federation/apiTypesRelease.test.ts` — under `src/`, next to
`mfDeclarations.test.ts`, because the vitest include glob covers only `src/**`.
It asserts that `package.json` and `package-lock.json` agree on the version,
that a `## <version>` heading exists, that every heading's parenthetical is
either a date or the literal `unpublished`, that at most one `(unpublished)`
section exists and it is first, and that headings descend in semver order.

It deliberately does **not** require a date on pull requests. `(unpublished)` is
the legitimate working state; requiring a date on every PR would force daily
churn. The date requirement belongs only in the release workflow's guard.

#### Why the helper scripts are `.mjs`

`scripts/` is in the root `tsconfig.json` `exclude` list and outside
`oxlint src`, so a `.ts` helper there would be checked by neither — and would
additionally need the `ts-node --transpileOnly --compilerOptions ...` workaround
that `verify:federation` carries. `scripts/run-playwright.mjs` is the precedent
for zero-dependency Node ESM. A dependency-free `.mjs` script also runs before
`npm ci`, which keeps the changelog guard usable in any context.

---

## Rejected alternatives

**Create a GitHub Release and accept a Zenodo version.** Cheapest to implement —
add `contents: write` and `gh release create --notes-file`. Rejected: it mints a
DOI version of the Cytoscape Web _software_ record for something that is not a
release of that software, and Zenodo versions are not deletable by the
depositor.

**Temporarily deactivate the Zenodo webhook around each release.** Works, but it
is a manual toggle whose failure mode is silent: an interrupted run leaves
Zenodo disconnected, and the _next application release_ then quietly fails to
mint a DOI, which nobody notices for months. It also cannot be automated from
the release workflow without granting `admin:repo_hook`, far more scope than a
publish job should hold. Kept as a documented escape hatch if a one-off
api-types GitHub Release is ever genuinely needed.

**`NPM_TOKEN` repository secret.** Rejected as the primary path for three
reasons specific to this repository: there are currently **zero** secrets in it,
so introducing a publish credential creates a rotation burden where none exists;
`id-token: write` is needed for provenance either way, after which the token
adds only risk; and it forces a `registry-url` change to the composite action
that OIDC does not need. Retained as a documented fallback if the Trusted
Publisher section is unavailable — in which case add an optional `registry-url`
input to the composite action rather than making a second `actions/setup-node`
call, which would re-run cache setup and leave two post-steps racing on the same
npm cache.

**Add `registry-url` to the composite action for the OIDC path.** This looks
like the obvious fix for "setup-node needs registry-url to write auth config."
It is wrong here, and actively breaks publishing — see §"npm Trusted
Publishing".

**Use `tsc -p packages/api-types/tsconfig.json --noEmit` as the CI check.**
Rejected: that tsconfig is tuned for the `tsup` declaration build. Running plain
`tsc` against it produces a wall of errors unrelated to the build —
`TS2732` on `@/assets/config.json` for want of `resolveJsonModule`, `TS2339` on
`import.meta.env`, and more. The real checks are the actual
`npm run build:api-types` plus a consumer-side type-check of the emitted
declarations.

**Adopt changesets or semantic-release.** Not evaluated in depth: this is a
single publishable package with a hand-written, prose-heavy changelog that is
itself a consumer-facing migration document. Generated changelogs would be a
downgrade.

---

## Consumer impact

All six downstream consumers pin `^1.0.0-beta.3` as a devDependency:

| Repository                 | File                                 |
| -------------------------- | ------------------------------------ |
| cy-agent-bridge            | `package.json:51`                    |
| cytoscape-web-app-examples | `package.json:62`                    |
| cytoscape-web-app-examples | `project-template/package.json:60`   |
| cytoscape-web-app-examples | `hello-world/package.json:42`        |
| cytoscape-web-app-examples | `network-statistics/package.json:40` |
| cytoscape-web-app-examples | `network-workflows/package.json:42`  |

Under semver, **`^1.0.0-beta.3` does match `1.0.0-beta.4`** — a caret range on a
prerelease admits later prereleases of the same `major.minor.patch`. Verified
directly:

```
semver.satisfies('1.0.0-beta.4', '^1.0.0-beta.3')  // true
```

So the moment beta.4 reaches `latest`, any fresh `npm install` in those
repositories silently pulls a release that removes `component`, `closeOnAction`,
`errorFallback` and `title` from `RegisterMenuItemOptions`, renames
`additiveUnselect` → `additiveDeselect`, `removeMapping` → `deleteMapping` and
`setColumnName` → `renameColumn`, and rewraps the collection getters. There is
no window in which leaving these pins alone is safe.

`cy-agent-bridge` should be bumped first: its `tsconfig.json:33-35` sets
`"skipLibCheck": false` with this package in `types`, making its type-check the
de facto correctness test for the published declarations — and it runs against
the real registry tarball, not a local build.

Each example app that registers an `'apps-menu'` item also needs a real code
migration, not just a pin bump. The component-to-data change is not
source-compatible.

---

## Follow-up (out of scope for `1.0.0-beta.4`)

- **`packages/api-types/LICENSE`** — the package declares `"license": "MIT"` but ships no license text. Adding the file plus a `files` entry changes the expected tarball entry count from 6 to 7, so it must land in the same commit as the verifier's expected-file list.
- **`exports` field** — must not ride along with an already-heavily-breaking release. `cy-agent-bridge` consumes this package through the `types` array with `skipLibCheck: false`; adding `exports` changes resolution under `node16`/`nodenext`. Land it separately, gated on a cy-agent-bridge type-check. Revisit `"main": "dist/index.d.ts"` at the same time.
- **`environment: npm-publish` approval gate** — a required reviewer before the publish step. The environment name must be set in both the workflow and the npm Trusted Publisher configuration, or the OIDC subject will not match.
- **Release notes as a GitHub Discussion** — Discussions emit `discussion`, never `release`, so Zenodo is untouched and consumers get a subscribable feed. Needs `discussions: write`.
- **Replace the Zenodo webhook with an explicit deposition step** in the application release workflow, gated on `v*` tags — or split this package into its own repository, which decouples the two release cadences entirely. The latter is where a package with independent versioning and its own downstream consumers naturally belongs.
- **Exact rather than caret pins for prerelease consumers.** Caret ranges on prereleases give the update cadence of a stable dependency with the breakage cadence of an alpha. Exact pins make every consumer bump a deliberate, reviewable act, which is what this contract needs while it is still moving this fast.
