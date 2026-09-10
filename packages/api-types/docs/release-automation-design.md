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

Six concrete failure modes make this worth fixing now rather than after
`1.0.0-beta.4` ships. The first four are mechanical and this design closes them.
The last two are structural — they are what makes the mechanical ones easy to
hit — and this design records them, closing the cheap half now (§Declaring
app compatibility) and scheduling the rest (§Follow-up).

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

An api-types release is not a release of the Cytoscape Web application, and
putting one in that citation record makes the record wrong. Zenodo does let an
owner delete a record within 30 days of publication, but the deletion leaves a
tombstone page carrying the citation, and after 30 days removal requires a
justified case such as copyright infringement. So the mistake is recoverable
only briefly, and never invisibly — which is reason enough not to make it.

This is why `api-types-v1.0.0-beta.3` has a tag but no GitHub Release. That
omission was correct; this design makes it deliberate and documented.

### 4. The runbook's own tarball check is wrong

`../README.md:273-274` says to confirm the tarball contains `dist/index.d.ts`,
`dist/mf-declarations.d.ts`, `README.md`, `CHANGELOG.md`, and `package.json` —
five entries. The real count is **six**: it omits the package-root `index.d.ts`
(123 bytes), which is listed in `files` and does exist. A check that has been
wrong since it was written is a check nobody was really performing.

### 5. The package is a facade over app internals, and nothing guards the contract

`packages/api-types/src/index.ts` does `export * from '../../../src/app-api/types'`.
The published contract is not a separate artifact that someone maintains — it
**is** the application's own source, viewed through a `tsup` declaration
rollup. Editing one line under `src/app-api/types/` changes what consumers
compile against.

Nothing makes that visible. In a pull request such a change reads as an
ordinary edit to application code; the public API diff appears nowhere. Since
the `api-types-v1.0.0-beta.3` tag:

| Path                                                 | Commits |
| ---------------------------------------------------- | ------- |
| `src/app-api/types/` — the published contract itself | 23      |
| `packages/api-types/CHANGELOG.md`                    | 16      |
| `packages/api-types/package.json` (the version bump) | 1       |

Sixteen changelog updates against twenty-three contract commits is decent
discipline, not negligence — the team does record changes as it goes. The
problem is that **discipline is the only mechanism**. There is no check that
fails when the contract moves and the changelog does not, and no artifact in
which a reviewer can see the API difference a pull request causes.

The standard remedy is an API surface report: a generated, committed summary of
the public declarations that changes in the diff whenever the contract changes.
That is scheduled in §Follow-up rather than done here, because introducing it
is its own piece of work and `1.0.0-beta.4`'s changelog has already been
written and reviewed by hand.

### 6. No released application implements what the package describes

The package and the application version independently, which is correct — but
independent versions still have a compatibility relationship, and here it is
undeclared.

`AppContext.apiVersion` exists (`src/app-api/types/AppContext.ts:80`) and the
host publishes `APP_API_VERSION` in its federation descriptor
(`src/app-api/federation/hostDescriptor.ts:22`). Its value is the string
`'1.0'`, hardcoded, and it has not moved across `1.0.0-beta.0` through
`1.0.0-beta.4` — a span containing several breaking changes.
`src/app-api/api_docs/Api.md:2766` is explicit that it is "reserved for future
compatibility checks". So it identifies nothing and enforces nothing.

Meanwhile `api-types` is released from `development`: the
`api-types-v1.0.0-beta.3` tag is an ancestor of `development` and **not** of
`master`. The APIs `1.0.0-beta.4` documents — the Dialog API, `applyVisualStyle`,
the `'modal-launcher'` slot — therefore exist only on `development`. An app
developer who installs `1.0.0-beta.4` and targets a deployed Cytoscape Web can
compile successfully against methods the host does not have, and nothing at
either build time or runtime tells them.

(Which branch the application itself releases from is a separate question, and
the answer on the ground does not match what the repository documents. That is
outside this design's scope; it is noted here only because it is why the
compatibility statement below cannot simply say "the latest release".)

---

## Key decisions

Resolved before implementation. Do not re-litigate these during the work.

| Decision                  | Resolution                                                                                                                                                                                                            |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Release notes destination | **No GitHub Release.** Notes land in the annotated tag message, the workflow run's job summary, and the `CHANGELOG.md` shipped inside the npm tarball. Protects the Zenodo DOI record (§Background 3)                 |
| npm authentication        | **Trusted Publishing (OIDC).** No repository secret; provenance attestation is generated automatically                                                                                                                |
| npm dist-tag              | **`latest` until `1.0.0` ships, `next` for prereleases afterwards.** The current beta stream stays on `latest`; once a stable `1.0.0` exists, `latest` means stable and prereleases move to `next` (§Dist-tag policy) |
| Workflow trigger          | **Both** `push: tags: ['api-types-v*']` and `workflow_dispatch`. Tag push is the real release path; dispatch provides a dry-run rehearsal and a re-run path for a publish that fails after the tag already exists     |

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
  checks: read # the CI gate below; an omitted scope defaults to none

concurrency:
  # Publishes queue; rehearsals are a separate group so a dry run can never
  # displace a release waiting to publish.
  group: release-api-types-${{ inputs.dry_run == true && 'rehearsal' || 'publish' }}
  cancel-in-progress: false # a cancelled publish leaves an immutable version unverified
  queue: max # see below — the default would cancel a queued release
```

`permissions` is a real tightening: the repository default is
`default_workflow_permissions: write`.

`cancel-in-progress: false` alone does **not** serialize releases. By default
only one run may be _pending_ in a concurrency group; a newly queued run cancels
and replaces the one already waiting. `queue: max` raises that to 100 pending
runs processed first-in-first-out
([GitHub changelog, 2026-05-07](https://github.blog/changelog/2026-05-07-github-actions-concurrency-groups-now-allow-larger-queues/)).
`queue: max` may not be combined with `cancel-in-progress: true` — that is a
validation error, and irrelevant here.

Splitting rehearsals into their own group matters for the same reason: without
it, a `dry_run=true` dispatch queued behind a real publish would cancel it.

### Trigger-dependent parameters

`workflow_dispatch` accepts a tag as its `ref`, so "dispatch" is not one case
but two. Treating it as one is the easiest way to get this workflow wrong —
either a branch rehearsal dies on a guard meant for tags, or the resume path
(§Republishing) is locked out of publishing.

|                    | Tag push                                                                                                                       | Dispatch on a **branch**                       | Dispatch on a **tag**                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ----------------------------------------------------- |
| `dry_run`          | Always `false` — `inputs` is empty on a tag push, so the workflow must default it explicitly rather than read `inputs.dry_run` | The input, default `true`                      | The input, default `true`                             |
| `dist_tag`         | Always `latest` (the standing policy)                                                                                          | The input, default `latest`                    | The input, default `latest`                           |
| Tag-name guard     | **Required**                                                                                                                   | **Skipped** — there is no tag to compare       | **Required** — same as a tag push                     |
| Publishing allowed | Yes                                                                                                                            | **No** — rehearsal only, `dry_run=true` forced | Yes — this is the re-run path after a partial failure |

The discriminator is `github.ref_type`, not `github.event_name`. A real publish
requires `github.ref_type == 'tag'`, which admits both the tag push and a tag
dispatch while refusing an arbitrary un-tagged `development` HEAD. The tag-name
guard carries the same `if:` condition; without it a branch rehearsal fails on
the very first guard and never reaches the checks it exists to exercise.

The version always comes from `package.json`. The tag is only _validated
against_ it, never parsed into it. This is the opposite of the deleted
`release.yml`, which derived the version from the tag with
`npm version --no-git-tag-version` — mutating `package.json` at release time is
exactly how a lockfile drifts.

#### Guard order

Cheap guards run **before** the build, so a bad tag or an undated changelog
fails in about thirty seconds rather than after a full `tsup` declaration pass.
But one check cannot: deciding what to do about an already-published version
requires comparing it against the artifact this run produces, which does not
exist yet. That check is therefore split in two.

**Before the build:**

1. Tag name matches `package.json` version — **`if: github.ref_type == 'tag'`**
2. `package-lock.json`'s workspace entry matches `package.json`
3. `CHANGELOG.md` has a dated `## <version> (YYYY-MM-DD)` section — an
   `(unpublished)` marker fails the release
4. The required checks for this exact SHA succeeded (see §Gating on CI below)
5. **Registry probe only** — does this version exist? Record the answer, and
   fail on any non-`E404` error. Do not decide anything yet
6. npm CLI is ≥ 11.5.1 (the Trusted Publishing minimum); upgrade if not

`semver@^7.8.4` is a root **runtime** dependency, already installed after
`npm ci`, so guard 6 needs no extra install.

**Then:** build once → pack one `.tgz` → verify that file → type-check a
consumer against it.

**After the artifact exists, before publishing:** decide, using guard 5's
answer plus the `.tgz` now in hand — publish, skip-and-resume, or stop
(§Republishing). Only here is the comparison possible.

**Then:** publish that same file → verify the registry against it.

Why it must be one artifact rather than several builds is the subject of
§Build once, publish what was verified.

#### Gating on CI

`ci.yml` triggers on pushes and pull requests to `master` and `development`. A
tag push does not run it, and nothing otherwise connects a green CI result to
the commit being published. The release workflow must therefore either query
the check runs for its own SHA and refuse to publish unless the required ones
succeeded, or re-run the gates itself (`npm run lint`, `npm run test:unit`)
before building. Querying is preferable: it is faster and it asserts the thing
that actually matters — that this commit passed review-time CI.

Three details decide whether the query is correct or merely present:

- **Name the checks.** Require a fixed, explicit list — the `lint`, `build`,
  `unit-tests` and `api-types` jobs of `ci.yml`. Do not iterate over whatever
  check runs happen to exist for the SHA: that set includes the release run
  itself, which is `in_progress` by definition and would deadlock the guard.
- **Missing is not success.** A required check with no run for this SHA fails
  the guard. The common cause is a tag on a commit that never reached
  `development` — exactly what the guard exists to catch.
- **In progress is not success either.** Fail with a message saying to re-run
  once CI finishes, rather than waiting: a release job blocking on someone
  else's queue is a worse failure than an explicit "not ready".

The query needs `checks: read` in the workflow's `permissions` block. A
`permissions` block that lists only `contents` and `id-token` sets every other
scope to `none`, so the Checks API call fails without it.

#### Republishing after a partial failure

npm publishes are not idempotent, but everything after the publish is. If the
registry accepts the package and a later step fails — the post-publish
verification, the artifact upload — a naive "version must not exist" guard
turns the tag into a dead end: it can neither be re-run nor re-tagged, because
the version is now taken and npm versions are immutable.

The decision therefore branches on what the registry holds, evaluated **after
the `.tgz` exists** so the comparison has something to compare against:

| Registry state                                                                                                                                   | Action                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Version absent                                                                                                                                   | Publish normally                                                      |
| Version present, `dist.integrity` matches this run's `.tgz`, **and** its provenance names this repository, this workflow **and this commit SHA** | Skip the publish, resume at verification — this is the resumable case |
| Version present with different content, a different publisher, or provenance naming a **different commit**                                       | **Stop.** Something else published this version; a human must look    |
| Version present but the dist-tag has since moved to a newer release                                                                              | **Stop.** Do not roll `latest` back onto an older version             |

The commit SHA matters as much as the repository and workflow. Without it, a
publish made from this same workflow at a _different_ commit reads as "already
done" and the run resumes onto someone else's artifact.

Distinguishing "absent" from "cannot tell" is part of the guard, not an
implementation detail. `npm view <pkg>@<version>` exits non-zero for a missing
version _and_ for a network failure, an auth error, and a registry outage.
Only `E404` means "not published"; every other non-zero exit must fail the
run rather than be read as permission to publish.

#### Build once, publish what was verified

`prepack` runs on `npm pack`, on `npm pack --dry-run`, and on `npm publish` —
measured, not assumed:

```
npm pack --dry-run     → prepack ran
npm publish --dry-run  → prepack ran
npm pack               → prepack ran
```

So an explicit build, followed by a verification pack, followed by a publish
rebuilds the package three times, and the bytes that were verified are not the
bytes that reach the registry. Worse, a verification designed to catch a
corrupted `dist/` cannot fail: `prepack` regenerates `dist/` before the check
looks at it.

Two further measurements settle the shape of the fix: publishing a pre-built
tarball does **not** re-run `prepack`, and `npm pack --ignore-scripts` skips it
too. So the flow that really builds once is:

1. `npm run build:api-types` — the one build, with legible output if it fails
2. `npm pack --ignore-scripts` → a real `.tgz` on disk. **`--ignore-scripts` is
   load-bearing**: a plain `npm pack` here would fire `prepack` and rebuild,
   making this "build twice" rather than "build once"
3. Verify the `.tgz` — extract it and inspect the extracted tree, so the check
   reads exactly what a consumer would install
4. Type-check a consumer fixture against that same `.tgz` (§Closing the CI gap)
5. `npm publish <path-to-tgz> --tag <dist_tag>`
6. Assert the registry's `dist.integrity` equals the local `.tgz`'s integrity,
   and that its provenance names this repository, workflow and commit

Step 6 is an equality assertion, not a log line. Recording a shasum that nobody
compares proves nothing — and provenance belongs here, in the automated check,
not only in a human's post-release spot check.

The alternative — drop the explicit build and let `prepack` do it during the
pack — also builds once and is defensible. It is not chosen here only because a
failure then surfaces as a failed `npm pack` rather than a failed build step.

`prepack` still earns its place: it makes a stale `dist/` unpublishable by any
route, including a hand-run `npm publish` from a laptop. It is a backstop, not
the mechanism.

### npm Trusted Publishing

Publishing authority comes from a Trusted Publisher configured on npmjs.com for
this package, bound to the repository and the workflow filename. There are no
npm credentials in this repository.

Configured on `https://www.npmjs.com/package/@cytoscape-web/api-types/access`:

| Field                | Value                                      |
| -------------------- | ------------------------------------------ |
| Organization or user | `cytoscape`                                |
| Repository           | `cytoscape-web`                            |
| Workflow filename    | `release-api-types.yml`                    |
| Environment name     | blank                                      |
| Allowed actions      | **must include `npm publish`** — see below |

**Allowed actions is not optional for a configuration created now.** npm's
documented rule: configurations created before 2026-05-20 allow `npm publish`
only; those created before 2026-09-03 require an explicit choice; and
**configurations created after 2026-09-03 default to `npm stage publish`**,
with direct `npm publish` as an opt-in. This configuration is being created
after that date, so leaving the default in place would make the workflow's
`npm publish` fail. Either tick `npm publish`, or change the workflow to the
two-phase `npm stage publish` flow — but decide deliberately rather than
inheriting the default.

Requirements: npm CLI ≥ 11.5.1, Node ≥ 22.14, `id-token: write`, and a public
repository plus public package for automatic provenance. All are satisfied —
`.nvmrc` pins Node 24, and the repository is public.

#### Why this job omits `registry-url`

npm's own documented example **does** pass
`registry-url: 'https://registry.npmjs.org'` to `actions/setup-node`, so
setting it is not inherently wrong.

The reason to omit it here is narrower. When `registry-url` is set,
`setup-node` writes `//registry.npmjs.org/:_authToken=${NODE_AUTH_TOKEN}` into
the runner's `.npmrc`. With no `NODE_AUTH_TOKEN` that expands to an empty
credential, and there are reported cases of npm treating the line as configured
auth and never attempting the OIDC exchange, failing with `ENEEDAUTH` or `E404`
([actions/setup-node#1551](https://github.com/actions/setup-node/issues/1551),
[npm/documentation#1960](https://github.com/npm/documentation/issues/1960)).
Whether a given npm version attempts OIDC first is a moving target.

Since Trusted Publishing does not use `NODE_AUTH_TOKEN` at all, the line buys
nothing and can only cause that failure. Omitting it is a defensive choice, not
a claim that `registry-url` is always broken. If publishing ever fails with an
auth error, this is the first thing to test.

Convenient consequence: nothing needs to be added to
`./.github/actions/setup-node-dependencies`.

#### Node and dependency setup for the release job

Do **not** layer an extra `npm ci` on top of the composite action. On a cache
miss the composite already runs `npm ci`, so the release job would install
twice; on a cache hit it restores `node_modules` from a cache keyed only on the
lockfile hash, which is not the reproducible install a publish deserves.

Call `actions/setup-node@v4` directly in the release job with
`node-version-file: .nvmrc` and `cache: npm`, no `registry-url`, followed by
exactly one `npm ci`. The composite action stays as it is, for CI's benefit.

### Release notes

With no GitHub Release, the notes reach four places, none of which touch the
citation record:

| Destination          | How                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------- |
| Annotated tag        | Extracted from the tagged commit to a file, checked, then passed to `git tag -F` — see below |
| Workflow job summary | The canonical machine-generated record, linked from the Actions tab                          |
| npm tarball          | `CHANGELOG.md` is in `files`, so every consumer has the notes locally                        |
| Workflow artifact    | `release-notes.md`, 90-day retention, for forensics                                          |

**Do not pipe `npm run` into `git tag -F -`.** Two measured problems: `npm run`
writes its `> pkg@version script` banner to **stdout**, so the banner would be
embedded in the tag message; and in a pipeline the right-hand side runs
regardless of whether the left-hand side failed, so a failed extraction would
still create a tag — with an empty message. Extract to a file, confirm it is
non-empty, then tag:

Extract from the commit being tagged (`git show "$SHA:.../CHANGELOG.md"`), not
from the working tree, so the notes cannot drift from what is being released,
and run it under `set -euo pipefail` — a failing `test -s` does **not** stop the
next command in an ordinary shell, so without it a failed extraction still
reaches `git tag` and creates a tag with an empty message.

**The runnable command lives in one place only:**
[implementation-checklist-release-automation.md](implementation-checklist-release-automation.md)
§Step 7b. It is deliberately not duplicated here — an out-of-date copy in a
design document is a command someone will paste.

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

`scripts/verify-api-types-pack.mjs` packs a real `.tgz`, extracts it, and
asserts against the extracted tree — the same bytes a consumer installs, and
the same file the publish step will upload. It checks an exact file list, the
entry count, the version, and, as structural evidence that the build is not
silently broken:

- `dist/index.d.ts` exceeds 10 KB (today it is 62,559 bytes; an empty or stub declaration file is the characteristic `tsup` failure mode)
- its first line is exactly `/// <reference path="./mf-declarations.d.ts" />`, proving the relative-path `postbuild` one-liner ran with the right cwd rather than silently no-opping
- `dist/mf-declarations.d.ts` is byte-identical to `src/mf-declarations.d.ts`

These are cheap sanity checks, not proof of correctness. Size thresholds and
substring greps cannot tell a working declaration bundle from a broken one —
only a compiler can. That is the consumer fixture's job.

The same script runs in the release workflow, so the release path asserts
exactly what every pull request asserted.

#### The consumer fixture — before publishing, not after

`cy-agent-bridge` type-checks this package with `skipLibCheck: false` and is
the only place the published declarations are genuinely compiled. Today that
happens **after** the release, where it is useless: a broken `1.0.0-beta.4`
cannot be replaced, only superseded by `1.0.0-beta.5`.

So the same check must run before the publish, in both CI and the release
workflow, against the `.tgz` just built:

- A small fixture — its own `package.json`, `tsconfig.json`, and one `.ts` file — installed from `file:` pointing at the `.tgz`
- `skipLibCheck: false`, mirroring `cy-agent-bridge/tsconfig.json:33-35`
- Both consumption modes covered: ordinary `import type { ... } from '@cytoscape-web/api-types'`, and the ambient side — `window.CyWebApi`, a typed `window.addEventListener`, and a `cyweb/*` module declaration — since `mf-declarations.d.ts` reaches consumers only through the triple-slash reference that `postbuild` prepends

**The fixture must be copied out of the repository before it is installed and
compiled.** Node and TypeScript resolution walk up the directory tree, so a
fixture left in place at `test/fixtures/api-types-consumer/` silently borrows
the host's dependency tree. Measured from that exact path:

| Specifier                  | Resolves to                                 |
| -------------------------- | ------------------------------------------- |
| `react`                    | `<repo>/node_modules/react`                 |
| `@types/react`             | `<repo>/node_modules/@types/react`          |
| `typescript`               | `<repo>/node_modules/typescript`            |
| `@cytoscape-web/api-types` | `<repo>/packages/api-types/dist/index.d.ts` |

The last row defeats the point entirely: the workspace symlink wins over the
`.tgz`, so the fixture would type-check the local build no matter what the
tarball contains. The others hide missing peer dependencies that a real
consumer would have to install for themselves.

Copy the fixture to a temporary directory outside the repository, install the
`.tgz` and the fixture's own declared dependencies there, then run `tsc`. Only
then is it a consumer test rather than a second view of the host tree.

This turns "the declarations compile" from a post-hoc discovery into a release
gate.

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

### Dist-tag policy

The conventional arrangement — prereleases on `next` or `beta`, `latest`
reserved for stable — is not what this package does today, and deliberately so.
`latest` currently points at `1.0.0-beta.3` and will point at `1.0.0-beta.4`.

The reason is that `latest` cannot be pointed at nothing, so with only
prereleases in existence it has to point at one of them — and the newest is more
useful than an old one. A bare `npm install @cytoscape-web/api-types` then gets
the version the documentation describes.

That constraint is easy to get wrong from the CLI documentation, which covers
`npm publish --tag` and `npm dist-tag rm` without noting that `latest` is a
special case. This organisation established it the expensive way, publishing
`@cytoscape-web/app-runtime@0.1.0` under `--tag next` on 2026-08-18 and finding
that npm assigned `latest` anyway, then that `DELETE …/dist-tags/latest` returns
`400` on an authenticated request. Written up in
`cytoscape-web-app-examples/design/specifications/app-sdk/phase6-release-runbook.md`
§2, and still visible in the registry today — that package carries both
`latest` and `next`.

So the choice for api-types is not "prerelease on `latest`" versus "no
`latest`". It is which version `latest` points at, and until a stable release
exists every candidate is a prerelease.

**The policy changes when `1.0.0` ships**, in two steps that must not be
conflated:

| Period                      | `latest`               | Prereleases                     |
| --------------------------- | ---------------------- | ------------------------------- |
| Now, through `1.0.0-beta.n` | The newest prerelease  | Also `latest` — no separate tag |
| `1.0.0` itself              | `1.0.0`                | —                               |
| After `1.0.0`               | Newest **stable** only | `next`                          |

So `1.0.0-beta.4` needs no change: it publishes to `latest` exactly as beta.3
did. The switch happens at the release _after_ `1.0.0`, and it is the first
prerelease of `1.1.0` that goes to `next`.

Two implementation notes for when that time comes:

- **Derive the tag rather than remembering it.** `semver.prerelease(version)`
  returns `null` for a stable version and an array for a prerelease, and
  `semver` is already a root runtime dependency. Defaulting `dist_tag` to
  `prerelease(version) === null ? 'latest' : 'next'` makes the policy
  self-enforcing. Until `1.0.0` the default stays the literal `latest`,
  because that derivation would be wrong today.
- **The tag change is what finally protects consumers.** Moving prereleases off
  `latest` does nothing on its own — ranges resolve against versions, not tags,
  which is why `^1.0.0-beta.3` already admits `1.0.0-beta.4`. What protects
  consumers is that after `1.0.0` they pin `^1.0.0`, and a caret range on a
  stable version excludes prereleases of a _different_ version tuple. Verified:
  `^1.0.0` matches `1.0.1` and `1.1.0` but **not** `1.1.0-beta.1`. So the
  dist-tag switch and the consumers' move to stable pins are one change, not
  two.

Housekeeping for the same moment: the registry still carries an `alpha`
dist-tag pointing at `0.1.0-alpha.3`, abandoned since March 2026, and
`packages/README.md:28` still tells readers to install `@alpha`. The README line
is fixed as part of this work (§Follow-up lists the tag itself).

### Declaring app compatibility

Closing §Background 6 properly means making `apiVersion` real, which is a
change to the host and to every app — too much to attach to this release. The
cheap half is worth doing now, because it costs a paragraph and it is the only
thing standing between a consumer and a silent runtime failure.

**Every api-types release states which host it requires.** A short block at the
top of the version's `CHANGELOG.md` section, shipped in the tarball and
therefore visible on npmjs.com:

- The host commit the package was built from — the tagged commit, which the
  release workflow already knows
- Which deployments carry that commit at release time, named concretely
  (`dev1.ndexbio.org/cytoscape`, production, or "not yet deployed")
- For a prerelease that runs ahead of every application release, an explicit
  sentence saying so, rather than leaving the reader to infer it

For `1.0.0-beta.4` that sentence is not a formality: the APIs it documents are
on `development` only, so the honest statement is that no released application
version implements them yet.

This is a claim a human writes, not a generated field. It is not enforced, and
it does not pretend to be — it replaces "the consumer has no way to know" with
"the consumer was told", which is the whole of the improvement available at
this cost. Enforcement is §Follow-up.

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
release of that software. The owner-deletion window is 30 days and leaves a
tombstone page carrying the citation, so the record would be wrong in public
first and permanently marked afterwards.

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
Rejected for this job because OIDC never reads `NODE_AUTH_TOKEN`, so the line
the input exists to write is dead weight that has been reported to suppress the
OIDC exchange. See §"Why this job omits `registry-url`" — this is a defensive
omission, not a claim that the input is broken in general.

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

**But a committed lockfile wins over the range.** Both consumer lockfiles
currently record `1.0.0-beta.3`, so `npm ci` — and a plain `npm install` that
finds the lockfile satisfying the manifest — keeps resolving beta.3 after
beta.4 ships. The exposure is narrower than "any install":

| Operation                                                                                 | Resolves to                |
| ----------------------------------------------------------------------------------------- | -------------------------- |
| `npm ci`, or `npm install` against the current lockfile                                   | `1.0.0-beta.3` — unchanged |
| `npm install` with no lockfile (a consumer that never committed one)                      | `1.0.0-beta.4`             |
| `npm update`, `npm install @cytoscape-web/api-types@latest`, or any lockfile regeneration | `1.0.0-beta.4`             |
| A new app scaffolded from `create-cytoscape-app`                                          | `1.0.0-beta.4`             |

So the breakage arrives on the next dependency refresh rather than instantly.
That is a reprieve, not safety: the change removes `component`,
`closeOnAction`, `errorFallback` and `title` from `RegisterMenuItemOptions`,
renames `additiveUnselect` → `additiveDeselect`, `removeMapping` →
`deleteMapping` and `setColumnName` → `renameColumn`, and rewraps the
collection getters — and it will land on whoever next runs `npm update`,
without them asking for it.

**Prepare the consumer migration before publishing, not after.** Pack a local
`.tgz` from the release commit, install it into each consumer, and fix the
fallout while the version number is still changeable. Publishing first turns
every problem found into a `1.0.0-beta.5`.

Version compatibility beyond types also needs recording. `apiVersion` exists
but is documented as being for future compatibility checking
(`src/app-api/api_docs/Api.md:2766`) and enforces nothing today, so nothing
stops an app built against beta.4 from loading into a host that predates it.
The release notes should state which host commit or version beta.4 requires and
which deployments carry it.

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
- **An API surface report — the highest-value single addition here.** Generate a public-declaration summary (Microsoft API Extractor writes an `.api.md`; a committed `.d.ts` rollup diffed in review is a lighter equivalent), commit it, and fail CI when the generated file differs from the committed one. This converts §Background 5's "someone must notice" into "the diff shows it": a pull request that changes `src/app-api/types/` then carries a visible public-API change that a reviewer must accept, and forgetting the changelog becomes hard rather than merely discouraged. Two notes on sequencing — the natural moment to generate the first baseline is the `1.0.0-beta.4` tag, where the contract has just been reviewed by hand; and the report should be produced from the same `tsup` output the package ships, not from a second compilation, or the two can disagree.
- **Make `apiVersion` mean something.** Today `APP_API_VERSION` is the constant `'1.0'` and has never moved (§Background 6). Give it a real value that changes when the contract does, have apps declare the minimum they need, and have the host refuse — or warn loudly — on a mismatch at mount time. That turns §Declaring app compatibility's written claim into an enforced one. It touches the host, the app runtime and every example app, so it is its own project.
- **Move prereleases to `next` after `1.0.0`.** Decided, not yet actionable — see §Dist-tag policy for the two-step transition and the `semver.prerelease()` derivation that should replace the hardcoded `latest` default at that point.
- **Remove the stale `alpha` dist-tag.** `npm dist-tag rm @cytoscape-web/api-types alpha` — it points at `0.1.0-alpha.3` and only misdirects. Do it alongside the `next` switch so all tag changes land together.
- **Exact rather than caret pins for prerelease consumers.** Caret ranges on prereleases give the update cadence of a stable dependency with the breakage cadence of an alpha. Exact pins make every consumer bump a deliberate, reviewable act, which is what this contract needs while it is still moving this fast.
