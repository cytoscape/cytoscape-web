# DX Audit — Full Findings

> Audit date: 2026-07-13 · branch `wincompat` @ 186d52cf · Method: 8 parallel dimension auditors, every finding independently re-verified against the repo by a skeptical verifier agent (60 agents total). 51 findings confirmed, 1 rejected.
>
> The synthesized, deduplicated report is in [README.md](./README.md). Raw structured data: [dx-findings.json](./dx-findings.json).
>
> Findings overlap across dimensions where independent auditors converged on the same gap (e.g. the .spec include pattern, verify:federation, check:agents) — convergence noted inline.

## Production build & build pipeline

### 0. Make `vite build` self-contained: move copy steps into publicDir and the existing plugin, then collapse build/build:netlify/build:analyze

**Impact:** medium · **Effort:** low · **Area:** Production build pipeline / npm scripts

**Evidence**

package.json:44-47 — "copy:dist": "cpy \"silent-check-sso.html\" \"src/assets/apps.json\" dist --flat", "copy:netlify": "cpy \"netlify/_redirects\" dist --flat", and three build scripts that each chain run-s build:bundle + copy steps. vite.config.ts:33-37 comments that apps.json "is copied into dist by the copy:dist npm script (cpy-cli), so no build-time emission is needed here" — i.e. the plugin already owns the dev path but delegates the build path to an external script. public/ already exists and is used (only favicon.ico in it). A bare `vite build` today produces a dist missing silent-check-sso.html (breaking Keycloak silent SSO, src/init.tsx:135) and apps.json — it only fails at runtime in a deployed environment.

**Recommendation**

1) `git mv silent-check-sso.html public/` — Vite copies public/ into dist automatically and serves it in dev, killing half of copy:dist. 2) Extend the existing serveAppsConfigInDev plugin in vite.config.ts with a build branch: in generateBundle, `this.emitFile({ type: 'asset', fileName: 'apps.json', source: fs.readFileSync(appsConfigPath, 'utf8') })` (it already receives appsConfigPath, which is apps.json for build and apps.local.json for serve). 3) Move netlify/_redirects into public/ — a `_redirects` file is inert outside Netlify. Then: "build": "vite build", delete copy:dist/copy:netlify, make build:netlify just "npm run build" (keep the name since Netlify's UI-configured build command references it — there is no netlify.toml in the repo), and build:analyze becomes "cross-env ANALYZE=true vite build". Also drop the no-op `cross-env` prefix on build:bundle (package.json:43 sets no env vars).

**Benefit**

One canonical build command instead of four script permutations; impossible to produce an incomplete dist by running `vite build` directly; the dev/prod apps.json split lives in one plugin instead of a plugin plus a script comment pointing at package.json. Removes a class of deploy-only runtime failures (missing silent-check-sso.html).

**Verification** — confirmed

Every factual claim verified against the repo: package.json:43-51 has exactly the quoted copy:dist/copy:netlify scripts, three build permutations chaining run-s build:bundle + copy steps, and a no-op cross-env prefix on build:bundle. vite.config.ts:33-37 contains the verbatim comment delegating the build path to the copy:dist npm script while the serveAppsConfigInDev plugin (lines 38-54) owns only the dev path. public/ exists (only favicon.ico) and publicDir is not overridden, so Vite's automatic public/ copying is active. A bare `vite build` genuinely produces an incomplete dist: apps.json is fetched at runtime (src/app-api/constants.ts:6, DEFAULT_MANIFEST_URL = '/apps.json') and silent-check-sso.html is referenced by Keycloak init (src/init.tsx:141-142), and both failures surface only in deployed environments. netlify/_redirects exists, netlify.toml does not (so the Netlify build command is UI-configured and keeping the build:netlify script name is correct). CI runs `npm run build` (ci.yml:44) so nothing else depends on the copy scripts. emitFile in generateBundle works under Vite 8/Rolldown and does not conflict with @module-federation/vite. Two details in the recommendation need fixing (see correction): the plugin's apply:'serve' must be removed for a generateBundle hook to ever run, and build:netlify's NODE_OPTIONS heap bump should be retained (though BUILD=netlify is verified dead — no process.env.BUILD reads anywhere).

**Verifier corrections (apply these over the recommendation above)**

The plan is sound with three fixes: (1) The existing serveAppsConfigInDev plugin declares `apply: 'serve'` (vite.config.ts:41), so merely adding a generateBundle hook does nothing — it never runs during build. Remove `apply: 'serve'` (safe, since configureServer only fires in serve mode anyway) before adding `generateBundle() { this.emitFile({ type: 'asset', fileName: 'apps.json', source: fs.readFileSync(appsConfigPath, 'utf8') }) }`, and rename the plugin (e.g. appsConfigPlugin) since it's no longer dev-only. (2) build:netlify currently sets NODE_OPTIONS=--max-old-space-size=6144 and BUILD=netlify (package.json:47). BUILD is consumed nowhere in the repo (no process.env.BUILD reads — only REACT_APP_BUILD_TIME matches) and can be dropped, but keep the NODE_OPTIONS heap bump: make build:netlify `cross-env NODE_OPTIONS=--max-old-space-size=6144 vite build` rather than a bare `npm run build`, until a Netlify deploy is verified without it (Rolldown likely doesn't need it, but the Netlify builder can't be tested locally and every branch auto-deploys). (3) Minor citation fix: the silent-check-sso.html reference is src/init.tsx:141-142 (silentCheckSsoRedirectUri), not line 135. Everything else stands as written: git mv silent-check-sso.html and netlify/_redirects into public/ (_redirects is inert outside Netlify and Netlify requires it at the publish root, which is dist root), "build": "vite build", "build:analyze": "cross-env ANALYZE=true vite build" (ANALYZE is read at vite.config.ts:86), delete copy:dist/copy:netlify, and drop the no-op cross-env on the former build:bundle. Optionally remove the now-unused cpy-cli devDependency (with permission, per CLAUDE.md dependency rule).

---

### 1. Gate the CI build job on `npm run verify:federation` — the verifier exists, passes, and is wired to nothing

**Impact:** medium · **Effort:** low · **Area:** CI build pipeline / Module Federation contract

**Evidence**

.github/workflows/ci.yml:43-44 — the build job runs only `npm run build` and does nothing with the resulting dist. scripts/verify-federation-build.ts:5-13 states it must "Run AFTER a build" and "Exits non-zero on any miss so CI gates on it". docs/design/module-federation/specifications/vite-migration-federation-test-hardening.md:221 specifies "Tier 2 build verifier | npm run build && npm run verify:federation | CI build job" — the wiring was designed but never landed. Verified locally: against a fresh dist it prints "✓ all 36 checks passed" in seconds (checks remoteEntry.js container exports, every FEDERATION_EXPOSES key, all shared singletons).

**Recommendation**

Add one step to the build job in ci.yml after `npm run build`:

      - name: Verify federation build output
        run: npm run verify:federation

This reuses the dist the build job just produced — no extra build, no artifact plumbing.

**Benefit**

Regressions in the Module Federation public surface (dropped expose, unregistered singleton, renamed remoteEntry) are caught on every PR instead of shipping to external plugin authors. Cost is a few seconds in an existing job; completes a gate the migration design doc already promised.

**Verification** — confirmed

Every evidence claim checks out. .github/workflows/ci.yml:43-44 shows the build job ends at `npm run build` with no verification step, and grep confirms `verify:federation` is wired to nothing in CI (ci.yml is the only workflow; no Netlify wiring either). scripts/verify-federation-build.ts:6,12 explicitly documents it should run after a build and exit non-zero "so CI gates on it". The design doc (vite-migration-federation-test-hardening.md, §5 CI wiring table) specifies exactly this wiring in the CI build job — it was designed but never landed. I ran `npm run verify:federation` against the current dist and it printed "✓ all 36 checks passed". The recommended one-step addition works in this repo's setup: the build job's `npm ci` installs ts-node (devDependency, package.json:110), `npm run build` (vite build + copy:dist) produces dist/remoteEntry.js at the path the script expects, and the step reuses the dist in the same job — no artifact plumbing, no conflict with the Playwright container (different job) or npm workspaces.

---

### 2. Build and typecheck packages/api-types in CI — today it is gated by nothing

**Impact:** medium · **Effort:** low · **Area:** CI / published types package

**Evidence**

package.json:52 — "build:api-types": "npm run build --workspace=packages/api-types" is the only way the package builds (tsup with dts: { only: true }, packages/api-types/tsup.config.ts), and .github/workflows/ci.yml never invokes it. tsconfig.json:21 — "exclude": ["node_modules", "dist", "scripts", "packages"] means `lint:tsc` (tsc --noEmit) skips the package entirely; only ESLint sees it via tsconfig.eslint.json:3. The unit test src/app-api/federation/mfDeclarations.test.ts checks expose parity against packages/api-types/src/mf-declarations.d.ts, but nothing proves `tsup` still produces a valid dist/index.d.ts. Measured: the build takes 3.75s.

**Recommendation**

Add `npm run build:api-types` as a step in the existing CI build job (after `npm run build`). Optionally also stop excluding `packages` in tsconfig.json (or add a `tsc --noEmit -p packages/api-types` step) so type errors in the published surface fail `npm run lint` locally too.

**Benefit**

A broken or drifted @cytoscape-web/api-types (the package plugin authors compile against) is caught on every PR instead of at manual publish time, for ~4s of CI. Removes the human step of remembering to run build:api-types before releasing.

**Verification** — confirmed

Every evidence claim checks out against the actual files: package.json:52 has the exact build:api-types script; packages/api-types/tsup.config.ts uses dts:{only:true}; .github/workflows/ci.yml (read in full) never builds or typechecks the package; tsconfig.json:21 excludes "packages" so lint:tsc skips it; tsconfig.eslint.json:3 includes packages/**/*; src/app-api/federation/mfDeclarations.test.ts:10 checks expose parity only against the source mf-declarations.d.ts, never the tsup dist output. The primary recommendation was verified to work: from a root install, `npm run build:api-types` succeeds in ~3.2s (tsup is a workspace devDep installed by root `npm ci`, so the CI build job can run it with no extra setup). The gap is actually slightly larger than claimed: lint:eslint only lints `src`, so ESLint does not lint package files either. One detail of the optional recommendation is wrong, hence the correction: `tsc --noEmit -p packages/api-types` fails today with 20+ pre-existing errors because that package's tsconfig (strict:true, no resolveJsonModule, paths alias into ../../src/app-api) type-checks the whole src dependency graph under stricter settings than the root config. The other optional variant (removing "packages" from the root exclude) was empirically verified to add the package sources to the program with zero new errors.

**Verifier corrections (apply these over the recommendation above)**

Add `npm run build:api-types` as a step in the CI build job after `npm run build` (verified working, ~3-4s). For type-checking the package under `npm run lint`, use the variant that removes "packages" from tsconfig.json:21's exclude (verified: adds the 4 package source files with zero new tsc errors). Do NOT use the suggested alternative `tsc --noEmit -p packages/api-types` as-is — packages/api-types/tsconfig.json maps `src/app-api/types` into ../../src with full `strict: true` and no `resolveJsonModule`, so it re-checks the entire src/app-api graph under stricter settings and currently fails with 20+ pre-existing errors (src/debug.ts, src/data/db/index.ts, src/models/CxModel/impl/validator.ts, src/models/TableModel/impl/valueTypeImpl.ts); that variant would require first aligning the package tsconfig with the root compiler options. Unrelated but relevant caveat: `npm run lint:tsc` already fails on the wincompat branch with 3 pre-existing `import.meta.hot` errors in src/init.tsx, which would need fixing before any new tsc gate is meaningful.

---

### 3. Cache node_modules across the six CI jobs instead of running six full `npm ci` installs (and do NOT bother caching the test-remote build — it takes 75ms)

**Impact:** medium · **Effort:** medium · **Area:** CI wall-clock and runner minutes

**Evidence**

.github/workflows/ci.yml:22-23, 40-41, 58-59, 84-85 — every job (lint, build, unit-tests, plus the 3-browser integration matrix = 6 jobs per run) runs its own `npm ci`. setup-node's `cache: 'npm'` (ci.yml:20 etc.) only caches the ~/.npm tarball store; each job still resolves and extracts a ~2.3GB node_modules from scratch. On the artifact-reuse hypothesis for the e2e fixture: measured `npm run build:test-remote` completes in 75ms bundle / 1.46s wall (test/fixtures/remote-app is a single component), and e2e runs against the Vite dev server (playwright.config.ts:31-37), not the build job's dist — so cross-job artifact sharing of either build has near-zero value; the install duplication is the actual repeated cost.

**Recommendation**

Add an actions/cache step for `node_modules` keyed on `${{ runner.os }}-${{ hashFiles('package-lock.json', '.nvmrc') }}` (give the Playwright-container matrix jobs their own key suffix since they run in mcr.microsoft.com/playwright:v1.61.0-noble), and skip `npm ci` when `cache-hit == 'true'`. All jobs are linux-x64 so the native Rolldown/oxc binaries are cache-compatible within each key. Alternatively, fold lint + build + unit-tests into one job (their work is fast — build is ~8s wall locally, api-types 4s) so only the browser matrix pays separate installs.

**Benefit**

Eliminates up to 5 redundant multi-minute installs per CI run (npm ci on a lockfile this size is typically 1-3 min even with a warm tarball cache) — the single largest recurring cost in the pipeline given the production build itself is ~5s. Also shortens the critical path into the integration matrix, which waits on unit-tests.

**Verification** — confirmed

Every cited fact checks out against the actual files: ci.yml runs `npm ci` in all 6 jobs at exactly the cited lines (22-23, 40-41, 58-59, 84-85), uses only setup-node `cache: 'npm'` (tarball store, not node_modules), and the container image at ci.yml:74 is precisely mcr.microsoft.com/playwright:v1.61.0-noble as the recommendation assumes. playwright.config.ts:31-37 confirms e2e runs against the Vite dev server, and package.json:39-41 shows test:e2e rebuilds the test-remote fixture on every run anyway — I measured it at 78ms/1.44s wall, matching the 75ms/1.46s claim, so the 'do not cache the fixture build' side-claim is correct. The node_modules cache approach is compatible with this repo: no postinstall/prepare lifecycle scripts in the root package.json (safe to skip npm ci on cache-hit), actions/cache works inside container jobs, all jobs are linux-x64, and keying on .nvmrc handles node-major busts. The fold-jobs alternative also works (run-s is already used). One detail is wrong, fixed in the correction: the repo uses npm workspaces, so caching only root node_modules is incomplete.

**Verifier corrections (apply these over the recommendation above)**

The cache path must cover the npm-workspaces layout, not just root node_modules. `npm ci` also creates a nested `packages/api-types/node_modules` (version-conflicted deps: tsup, esbuild, chokidar, etc. — package.json:5 declares workspaces), and `npm run build:api-types` (package.json:52) runs tsup from that nested tree. Use `path: node_modules` plus `packages/*/node_modules` in the actions/cache step (keyed on `${{ runner.os }}-${{ hashFiles('package-lock.json', '.nvmrc') }}` with a container-image suffix for the Playwright matrix jobs, as proposed), and keep setup-node's `cache: 'npm'` so cache-miss installs still hit the warm tarball store. Everything else in the recommendation stands as written.

---

### 4. Publish bundle-size feedback from the CI build job — build:analyze exists but only runs when someone remembers to

**Impact:** medium · **Effort:** low · **Area:** Bundle-size regression feedback loop

**Evidence**

vite.config.ts:86-96 — the rollup-plugin-visualizer report (ba/bundle-report.html, with gzip+brotli sizes) is gated behind `process.env.ANALYZE`, reachable only via the manual `build:analyze` script (package.json:51). .github/workflows/ci.yml:43-44 runs `npm run build` and uploads/records nothing about output size. Measured today: dist is 8.3MB across 123 assets / 116 JS chunks, largest chunk 710.17 kB (213.20 kB gzip). The dependency surface makes silent regressions likely: three UI kits (@mui, @mantine, primereact) plus a client-side `import OpenAI from 'openai'` (src/features/LLMQuery/api/chatgpt.ts:1) all in dependencies.

**Recommendation**

In the CI build job, switch the build step to `ANALYZE=true npm run build`, upload `ba/bundle-report.html` as an artifact (retention ~7 days), and add a cheap budget gate: a small node script that sums gzip bytes of dist/assets/*.js and fails (or warns via job summary) when the total exceeds a checked-in threshold. For richer PR feedback later, visualizer's `template: 'raw-data'` output feeds size-diff actions.

**Benefit**

Every PR gets a downloadable treemap and a hard/soft size budget instead of bundle growth being discovered ad-hoc; the analyze path stops being tribal knowledge. Costs ~1s of build time (visualizer) in an existing job.

**Verification** — confirmed

Premise verified against actual files: vite.config.ts:86-96 gates rollup-plugin-visualizer (ba/bundle-report.html, gzip+brotli) behind process.env.ANALYZE, reachable only via package.json:51 build:analyze; ci.yml:43-44 runs plain `npm run build` with no size artifact/gate, and no size tooling (size-limit/bundlewatch/etc.) exists anywhere in the repo. src/features/LLMQuery/api/chatgpt.ts:1 does import OpenAI client-side, and dist measures 8.3MB / 123 assets as claimed. The recommendation is workable: ANALYZE propagates through run-s, the build job runs on plain ubuntu-latest (not the Playwright container), /ba/ is gitignored, and visualizer ^7.0.1 supports the raw-data template. Two measured details are wrong, but in a direction that strengthens the finding: the largest chunk is not 710.17 kB — it is dist/assets/LayoutStore-DnlKjEp1.js at ~1.71 MB minified (registerCyImageExportExtensions-C4Mg5WwZ.js is ~1.46 MB; the 710 kB MUI loadShare chunk is only third-largest), and dist/assets contains 110 JS files, not 116.

**Verifier corrections (apply these over the recommendation above)**

Corrected evidence: dist is 8.3MB across 123 assets in dist/assets (110 JS chunks; 112 counting remoteEntry.js/remoteEntry.ssr.js at dist root); the largest chunks are LayoutStore-DnlKjEp1.js (~1.71 MB) and registerCyImageExportExtensions-C4Mg5WwZ.js (~1.46 MB) — the 710.17 kB MUI loadShare chunk cited is only third-largest, so the regression risk is understated. Corrected recommendation: in the CI build job, run the existing `npm run build:analyze` script (package.json:51 — identical to ANALYZE=true npm run build and already cross-platform via cross-env), upload ba/bundle-report.html as a ~7-day artifact, and add a node script summing gzip bytes of dist/assets/*.js against a checked-in budget. Expect the gzip+brotli sizing to add a few seconds to the build, not ~1s.

---

### 5. Revisit the no-production-sourcemaps tradeoff — hidden sourcemaps now cost 0.35s, and the app has an error-report feature that cannot symbolicate

**Impact:** medium · **Effort:** low · **Area:** Production debugging / build configuration

**Evidence**

vite.config.ts:118-122 — `sourcemap: mode !== 'production'` with the comment "Production omits them — matching the old webpack config... and shaving build time by skipping multi-MB .map generation." That rationale was priced for Webpack. Measured on this machine: baseline production build 5.16s; with `--sourcemap hidden` 5.51s (+0.35s), dist grows 8.3MB → 35MB (maps are emitted but not referenced, so browsers never fetch them). The repo ships a production error reporter (src/data/external-api/error-report/index.ts) whose stack traces currently point into minified Oxc output.

**Recommendation**

Change vite.config.ts to `sourcemap: mode === 'production' ? 'hidden' : true`. 'hidden' emits .map files without the sourceMappingURL comment, so end users see no change; developers can load the deployed .map in DevTools or a symbolication script to decode error-report stacks. If Netlify deploy weight is a concern, exclude *.map from the CDN via a post-build move instead of disabling generation.

**Benefit**

Production stack traces from the error-report feature and Netlify branch deploys become decodable for the cost of ~0.4s build time — the original 'shaving build time' justification no longer holds under Rolldown.

**Verification** — confirmed

Every factual claim verified. (1) vite.config.ts:118-122 contains the exact quoted comment and `sourcemap: mode !== 'production'`. (2) The production error reporter is real and wired up: src/data/external-api/error-report/index.ts captures error.stack (lines 44/111/145) and POSTs to the endpoint configured in src/assets/config.json:25 ("https://dev1.ndexbio.org/report"), invoked from src/features/Error.tsx (lines 62/169/179); the payload includes a buildId, which makes offline symbolication against archived .map files practical. (3) Reproduced the measurements: baseline `vite build` = 6.9s / dist 8.3M (size exact match); `vite build --sourcemap hidden` = 7.4s (+0.5s) / dist 35M (exact match), .map files emitted for all chunks including module-federation virtual chunks, and zero sourceMappingURL comments in emitted JS — so 'hidden' behaves as claimed and browsers never fetch maps. (4) No conflicts with this repo's setup: the MF plugin build succeeds with hidden maps; build:test-remote uses a separate vite config; the Netlify .map-exclusion mitigation fits the trivial cpy-based copy:dist/copy:netlify pipeline (package.json:44-45).

**Verifier corrections (apply these over the recommendation above)**

Only a measurement nit: on this machine the hidden-sourcemap cost measured +0.5s (6.9s → 7.4s), not +0.35s — same order of magnitude, and the dist growth (8.3MB → 35MB) matched exactly. Recommendation stands as written: `sourcemap: mode === 'production' ? 'hidden' : true` in vite.config.ts, optionally excluding dist/**/*.map from the Netlify publish via a post-build step alongside the existing cpy-based copy:dist/copy:netlify scripts.

---

### 6. Delete the vestigial NODE_OPTIONS=--max-old-space-size=6144 and dead BUILD=netlify env from build:netlify

**Impact:** low · **Effort:** low · **Area:** Build scripts hygiene / Netlify pipeline

**Evidence**

package.json:47 — "build:netlify": "cross-env NODE_OPTIONS=--max-old-space-size=6144 BUILD=netlify run-s build:bundle copy:dist copy:netlify". Measured: the full production build finishes in 5.16s with 2.48GB peak RSS for the whole process — and that memory is Rolldown's native (Rust) allocation, which `--max-old-space-size` (a V8 JS-heap cap) does not govern at all. Git history confirms the flag is a Webpack-era OOM workaround: commits 0f60fb2f "fix(build): raise Node heap limit for Netlify build" and 3d3e1af6 "...for local and analyze builds", later pared back by 41239513 "default build not limited in mem" (May 2026, pre-Rolldown) — only the Netlify script kept it. Grep confirms nothing anywhere reads `process.env.BUILD` (only REACT_APP_BUILD_TIME et al., which come from define in vite.config.ts:135-141).

**Recommendation**

Reduce build:netlify to `run-s build:bundle copy:dist copy:netlify` (or, combined with the copy-step finding, just `npm run build`). Remove `BUILD=netlify` outright since it has no consumers. Update the CLAUDE.md line documenting the 6144 workaround at the same time.

**Benefit**

Removes a misleading workaround that implies the build needs 6GB of JS heap (it needs effectively none — bundling is native now), preventing devs from cargo-culting NODE_OPTIONS into new scripts or misdiagnosing future Netlify memory issues against the wrong knob.

**Verification** — confirmed

Core finding verified against the repo. package.json:47 contains the quoted script verbatim. No file anywhere (src/, scripts/, packages/, netlify/, vite.config.ts, index.html) reads a bare BUILD env var — only REACT_APP_BUILD_TIME/REACT_APP_VERSION via define in vite.config.ts:136-142 — so BUILD=netlify is dead. Git history confirms the webpack-era origin: 0f60fb2f and 3d3e1af6 (2026-05-12) added the heap flag when build:netlify ran `webpack --mode production`; 41239513 later removed it from the default build, leaving only build:netlify. Functional proof: I ran `npm run build:bundle` with no NODE_OPTIONS flag and it completed in 4.97s with exit 0, so the 6GB V8 heap cap is vestigial (and the V8-heap-vs-Rolldown-native-allocation reasoning is correct). Three evidence/recommendation details are wrong though: (1) commit 41239513 is dated 2026-06-11 (June, not May 2026) and was already post-Vite/Rolldown — its package.json shows `vite build`; (2) CLAUDE.md contains no line documenting the 6144 workaround (grep for 6144/max-old-space finds nothing there; only 'npm run build:netlify - Build for Netlify deployment' at line 186), so there is nothing to update in CLAUDE.md; (3) the alternative of replacing build:netlify with plain `npm run build` would drop copy:netlify (package.json:45, copies netlify/_redirects to dist) and break Netlify SPA redirects unless the separate copy-step finding folds it in.

**Verifier corrections (apply these over the recommendation above)**

Change package.json:47 to `"build:netlify": "run-s build:bundle copy:dist copy:netlify"` — drop NODE_OPTIONS=--max-old-space-size=6144, the unused BUILD=netlify, and the now-pointless cross-env wrapper. Keep copy:netlify (it copies netlify/_redirects; plain `npm run build` omits it). No CLAUDE.md edit is needed — it never documented the 6144 workaround. History nit: the pare-back commit 41239513 is June 2026 and post-Vite/Rolldown; the webpack-era origin commits are 0f60fb2f/3d3e1af6 (May 12, 2026).

---

## Inner dev loop (dev server, HMR)

### 7. Gate Module Federation off in dev and add an HMR boundary in init.tsx so store/model/api edits hot-update instead of full-reloading

**Impact:** high · **Effort:** low · **Area:** HMR / edit-refresh cycle for the entire non-component half of the codebase (src/models/, src/data/, src/app-api/)

**Evidence**

Live-verified with a headless-Chromium probe against `npm run dev` at HEAD: appending a comment to src/data/hooks/stores/NetworkStore.ts, src/models/NetworkModel/impl/networkImpl.ts, or src/app-api/core/exportApi.ts each produced a full page reload (vite server log: '[vite] (client) page reload src/data/hooks/stores/NetworkStore.ts', same for the other two), while src/features/ToolBar/DropdownMenu.tsx produced 'hmr update'. Two causes traced via Vite module-graph analysis: (1) src/init.tsx:8 `import { CyWebApi } from './app-api/core'` — the entry chain has no import.meta.hot.accept (zero `import.meta.hot` usages in src/), so edits under app-api/core (whose 11 core files import every store) dead-end at the entry; (2) the federation plugin (vite.config.ts:64-79) makes the transformed entry start with `import "/@id/virtual:mf-exposes:__mfe_internal__cyweb__remoteEntry_js"`, and that virtual module contains `import("/src/data/hooks/stores/NetworkStore.ts")` etc. for all 26 FEDERATION_EXPOSES (src/app-api/federation/federationExposes.ts:13-40) — a non-accepting importer of every exposed store, dead-ending at /src/index.tsx. Causal fix verified live: with `federation()` applied only when `command === 'build' || process.env.MF === '1'` plus a 5-line `import.meta.hot.accept('./app-api/core', (mod) => { (window as any).CyWebApi = mod?.CyWebApi })` in init.tsx, all three edits hot-updated (probe: full_reloads=0 for store, model-impl, and api-core; `grep -c 'page reload' vite.log` = 0). The db↔store cycle (src/data/db/index.ts:23 imports ViewModelStore) and RendererStore→DefaultRenderer.tsx component cycle (RendererStore.ts:13) were tested and are NOT required fixes — Vite skips revisited chain modules.

**Recommendation**

In vite.config.ts, wrap the `federation({...})` plugin in `if (command === 'build' || process.env.MF === '1')` and add a `"dev:mf": "cross-env MF=1 vite --host --open"` npm script for the plugin-development workflow (external apps consuming cyweb/* still work there; `npm run build` and the e2e federation contract are unaffected since command==='build' keeps it). In src/init.tsx, after `;(window as any).CyWebApi = CyWebApi`, add: `if (import.meta.hot) { import.meta.hot.accept('./app-api/core', (mod) => { if (mod) (window as any).CyWebApi = mod.CyWebApi }) }`. Caveat to document: a hot-swapped store module re-runs `create()`; persisted stores rehydrate from IndexedDB, and a manual refresh remains the fallback if state looks stale.

**Benefit**

Every edit to models, stores, db layer, or app-api — roughly half the 692 source modules — currently costs a full app restart (keycloak init, IndexedDB hydration, loading screen, lost UI state like open dialogs/selections; ~1s minimum on a fast machine, multiple seconds with networks loaded). After the change these become sub-second in-place HMR updates, the same experience component edits already get.

**Verification** — confirmed

The diagnosis is fully verified: federation() is applied unconditionally in vite.config.ts:64-79 with 26 exposes from src/app-api/federation/federationExposes.ts:13-39 (all stores/api hooks), src/init.tsx:8 imports './app-api/core' at the entry chain, and there are zero import.meta.hot usages in src/ — so store/model/app-api edits have no accepting HMR boundary and dead-end at the entry, forcing full reloads. The gap is not already implemented anywhere, and the gate is implementable since defineConfig already destructures `command` (vite.config.ts:56); cross-env ^10.1.0 exists (package.json:93). However, one evidence claim is factually wrong: "the e2e federation contract [is] unaffected since command==='build' keeps it." playwright.config.ts runs the HOST via `npm run dev -- --no-open` (vite serve, MF unset) plus a fixture MF remote on :4191, and test/playwright/remote-app-load.spec.ts loads that remote through the dev-server host, asserting shared-single-React. ExternalComponent.tsx:17-23 documents that remote loading uses "the very same host instance that @module-federation/vite initializes at startup" — with federation gated off in serve mode, the global MF runtime is never initialized and the host's React never enters the share scope, so both Tier-3.2 tests fail, breaking `npm test`/`test:e2e*` and CI integration-tests. The recommendation works with a small amendment (below), so valid with correction rather than invalid.

**Verifier corrections (apply these over the recommendation above)**

Keep the fix as proposed (gate federation() behind `command === 'build' || process.env.MF === '1'` in vite.config.ts; add `"dev:mf": "cross-env MF=1 vite --host --open"`; add the `import.meta.hot.accept('./app-api/core', ...)` boundary in src/init.tsx) but with two required amendments: (1) update the first playwright.config.ts webServer entry to run the host with MF enabled — e.g. `command: 'npm run dev:mf -- --no-open'` (or add `env: { MF: '1' }` to that webServer) — because test/playwright/remote-app-load.spec.ts loads the :4191 fixture remote through the dev-server host and requires the federation plugin's runtime init + shared-React singleton (ExternalComponent.tsx:17-23); without this, `npm test` and CI integration-tests break. (2) Document that plain `npm run dev` can no longer load ANY external app — apps.local.json ships three example apps served by the dev middleware (vite.config.ts:38-54,59), and with federation off they silently degrade to DisabledExternalComponent — so `dev:mf` is required whenever exercising the Apps menu / ServiceApps in dev, not only for plugin authors.

---

### 8. Make debug logging and why-did-you-render a runtime toggle instead of the git-tracked config.json flag

**Impact:** medium · **Effort:** low · **Area:** Debug/observability toggles during development (and prod hygiene of the same flag)

**Evidence**

src/debug.ts:53-60: `initializeDebug` gates on `config.debug` from src/assets/config.json — a git-tracked runtime config whose committed value is currently `"debug": true` (src/assets/config.json:3). Enabling/disabling debug or wdyr therefore requires editing a tracked file (dirty tree, easy to commit accidentally — it is committed as true right now, so production users also get `localStorage.debug = '*'` and `whyDidYouRender(React, ...)` React patching; the console output is stripped by dropConsole (vite.config.ts:126-129) so they pay the overhead with no visible output). why-did-you-render is also statically imported at src/debug.ts:1, so it ships in the production bundle regardless of the flag. There is no URL-param or localStorage override anywhere in src/.

**Recommendation**

In initializeDebug(), compute `const debugEnabled = import.meta.env.DEV && (config.debug || new URLSearchParams(location.search).has('debug') || localStorage.getItem('cyweb-debug') === '1')` (keep a config.debug escape hatch for prod diagnosis if desired, but default the committed value to false). Load wdyr lazily: `if (debugEnabled) { const { default: wdyr } = await import('@welldone-software/why-did-you-render'); wdyr(React, { trackAllPureComponents: false }) }` so it is tree-shaken from prod and skipped in normal dev sessions.

**Benefit**

Devs toggle logging/render-tracking per-session via `?debug` or a localStorage key without touching tracked files or restarting; eliminates the recurring risk of committing debug:true (already happened); removes wdyr from the production bundle and its React patching from production runtime.

**Verification** — confirmed

Every cited fact checks out: src/debug.ts:1 statically imports why-did-you-render (only import site in src/), initializeDebug at src/debug.ts:53-60 gates solely on config.debug and does localStorage.debug='*' + whyDidYouRender(React,...), src/assets/config.json:3 is committed as "debug": true, vite.config.ts:126-129 sets dropConsole:true for production, and a grep of src/ confirms there is no URL-param or localStorage override anywhere. The fix is compatible with this repo: debug.ts is app code under Vite 8 so import.meta.env.DEV works, init.tsx:51 calls initializeDebug() before ReactDOM.createRoot so it can be made async, and wdyr@8.0.3 supports the installed React 18.3.1. Two details are wrong but don't invalidate the finding (see correction): the "no visible output" claim and an internal inconsistency in the recommended gating expression.

**Verifier corrections (apply these over the recommendation above)**

Two fixes to the finding: (1) The claim that dropConsole leaves prod users with "overhead but no visible output" is backwards — dropConsole only removes direct console.*() call expressions, but the debug package (v4.4.3) logs via a saved reference (`exports.log = console.debug || console.log || (() => {})`, node_modules/debug/src/browser.js:192), which is not stripped. So with the committed debug:true, production users likely get visible console.debug output from every logStore/logUi/etc. call in addition to wdyr's React patching — the problem is worse than stated. (2) The recommended expression `import.meta.env.DEV && (config.debug || ...)` contradicts its own "keep config.debug as a prod escape hatch" note — DEV-gating everything makes prod diagnosis impossible. Corrected recommendation: default the committed config.json value to "debug": false; enable the debug logger via `config.debug || localStorage.getItem('cyweb-debug') === '1' || new URLSearchParams(location.search).has('debug')` (works in prod for diagnosis; note AppShell's URL-param stripping doesn't matter since initializeDebug reads location.search at init.tsx:51, before React mounts — but the localStorage key is the more durable toggle); gate ONLY the wdyr load behind `import.meta.env.DEV && debugEnabled` with `await import('@welldone-software/why-did-you-render')` so the DEV constant lets Rolldown dead-code-eliminate the chunk from prod builds. Make initializeDebug async and await it in init.tsx (trivial — it runs before keycloak.init and renderApp) so wdyr patches React before first render.

---

### 9. Add a dev/e2e URL-param IndexedDB reset (?resetDb) handled before store hydration

**Impact:** low · **Effort:** low · **Area:** Recovering from wedged local state; deterministic clean-state hook for Playwright

**Evidence**

CLAUDE.md instructs: 'Blank Workspace? — Clear IndexedDB (cyweb-db) to reset. Browser DevTools → Application → IndexedDB' — a manual multi-click DevTools procedure. The code already has everything needed: `deleteDb()` at src/data/db/index.ts:203 (closes, `Dexie.delete(DB_NAME)`, recreates) and `resetWorkspace` (src/data/hooks/stores/WorkspaceStore.ts:123-124) reachable from the Data menu (src/features/ToolBar/DataMenu/index.tsx:103,120) and the Error page (src/features/Error.tsx:192). But both require the app to render first — exactly what fails when a bad migration or corrupted store wedges startup (the case CLAUDE.md describes). No search parameter for reset exists in the URL-processing layer (src/data/hooks/navigation/, src/features/AppShell.tsx).

**Recommendation**

In src/init.tsx's initializeApp() (before keycloak init/render, so it runs even when the app cannot boot), add: `const params = new URLSearchParams(location.search); if (params.has('resetDb') && (import.meta.env.DEV || confirm('Reset all local Cytoscape Web data?'))) { const { deleteDb } = await import('./data/db'); await deleteDb(); params.delete('resetDb'); history.replaceState(null, '', location.pathname) }` (follow the existing consume-then-strip search-param convention from ROUTING_SPECIFICATION.md). Update the CLAUDE.md 'Blank Workspace?' tip to mention `localhost:5500/?resetDb` and the existing Data-menu reset instead of the DevTools procedure.

**Benefit**

One URL replaces the DevTools dig for the most common local-state failure mode, works even when the app cannot render, and gives Playwright specs a deterministic clean-state entry point (today tests inherit whatever cyweb-db the reused dev server session left behind).

**Verification** — confirmed

Premise verified against actual files: deleteDb() at src/data/db/index.ts:203-217 closes/deletes/recreates the DB exactly as claimed; resetWorkspace (src/data/hooks/stores/WorkspaceStore.ts:123-135) calls it and is only reachable from rendered UI (src/features/ToolBar/DataMenu/index.tsx:103,120; src/features/Error.tsx:192); grep confirms no reset search param exists anywhere in src/data/hooks/navigation/ or src/features/AppShell.tsx; and workspace hydration happens post-render (AppShell.tsx:278 getWorkspaceFromDb), so a reset in init.tsx's initializeApp() would indeed run before hydration. import.meta.env.DEV works (Vite 8). However, two details are wrong: (1) the Playwright benefit is false — playwright.config.ts uses default isolated contexts (no persistent context/storageState), so each e2e test already starts with empty IndexedDB; reuseExistingServer only reuses the dev server process, not client storage; (2) the code snippet's history.replaceState(null, '', location.pathname) drops all other search params despite the params.delete('resetDb') call, and initializeApp() is currently synchronous so the await needs restructuring.

**Verifier corrections (apply these over the recommendation above)**

Keep the ?resetDb param handled in src/init.tsx before keycloak init/render, but: (1) make initializeApp async (or chain the reset promise before keycloak.init), since it is currently synchronous (init.tsx:34-182); (2) preserve other search params when stripping: after params.delete('resetDb'), use history.replaceState(null, '', location.pathname + (params.toString() ? '?' + params.toString() : '')) — matching the consume-then-strip convention which removes only the consumed param; (3) drop the Playwright justification from the benefit — Playwright already gives each test a fresh isolated browser context with empty IndexedDB (playwright.config.ts uses no persistent context or storageState), so the win is for developers' persistent local browser profiles and for recovering when a bad migration/corrupted store wedges startup, plus the CLAUDE.md doc update.

---

## Testing

### 10. Include the 34 orphaned src/**/*.spec unit-test files in the Vitest run

**Impact:** high · **Effort:** low · **Area:** Unit testing / CI correctness gate

**Evidence**

vitest.config.ts:14 sets `include: ['**/*.test.{ts,tsx}']`, so the 34 `*.spec.ts(x)` files under src/ (e.g. src/data/hooks/stores/VisualStyleStore.spec.ts, 11 files in src/features/TableDataLoader/tests/) never run: `vitest run` executes exactly 107 files / 1732 tests, matching the 107 `.test` files. CLAUDE.md even documents `.spec.ts` as the convention for store/feature tests. No script or CI job runs them — ci.yml:62 runs `npm run test:unit` = `vitest run` (package.json:36), and `git log --all -- vitest.spec-check.config.ts` shows no tracked runner ever existed (an untracked scratch config with `include: ['src/**/*.spec.{ts,tsx}']` was present at audit start and vanished mid-session). I verified via a temporary merged config: all 141 files / 2096 tests pass in 18.4s vs 17.8s for the current 107-file run.

**Recommendation**

Change vitest.config.ts include to `['src/**/*.{test,spec}.{ts,tsx}']`. The `src/` scoping is required because Playwright's specs live in test/playwright/*.spec.ts and would crash under Vitest. Then delete any lingering spec-check scratch config. One-line change; the suite is already green.

**Benefit**

364 currently-dead tests (21% of the unit suite, including all store tests) start gating CI and `npm test` again, for +0.6s of runtime. Prevents silent regressions in Zustand stores and TableDataLoader that today would merge cleanly.

**Verification** — confirmed

Every load-bearing claim reproduces. vitest.config.ts:14 is exactly `include: ['**/*.test.{ts,tsx}']`. There are exactly 34 *.spec.ts files under src/ (16 Zustand store suites in src/data/hooks/stores/, 7 in src/features/MergeNetworks/tests/, 11 in src/features/TableDataLoader/tests/) and no script, config, or CI job runs them: package.json:36 test:unit = `vitest run`, ci.yml unit-tests job runs `npm run test:unit`, and vitest.spec-check.config.ts does not exist. I reran both suites: current config = 107 files / 1732 tests (1731 pass, 1 skip); with a temporary config using include `['src/**/*.{test,spec}.{ts,tsx}']` = 141 files / 2096 tests, all green — exactly +34 files / +364 tests as claimed. The src/ scoping is genuinely required (Playwright specs live in test/playwright/*.spec.ts) and drops nothing (no .test files exist outside src/). CLAUDE.md does document .spec.ts as the store/feature convention, so these are intended unit tests, not deliberately excluded. Recommendation is a working one-line change with no conflict with module federation, workspaces, or the Playwright container.

**Verifier corrections (apply these over the recommendation above)**

Two details need fixing. (1) Benefit wording: not "all store tests" are dead — 4 store-related .test files in src/data/hooks/stores/ (AppCleanupRegistry.test.ts, useAppManager.test.tsx, useAppManager.lifecycle.test.ts, waitForWorkspaceHydration.test.ts) already run; what is dead is all 16 canonical Zustand <X>Store.spec.ts suites (NetworkStore, VisualStyleStore, TableStore, WorkspaceStore, etc.) plus all MergeNetworks and TableDataLoader suites. (2) Runtime cost: measured delta was 12.77s -> 18.36s (~+5.6s, since jsdom environment setup scales with the 34 extra files), not +0.6s — still cheap relative to gating 364 tests. Recommendation itself stands as written: change vitest.config.ts:14 to include: ['src/**/*.{test,spec}.{ts,tsx}'] (src/ scoping required to keep Playwright's test/playwright/*.spec.ts out of Vitest; verified no .test files outside src/ are lost).

---

### 11. Run the e2e browser matrix in parallel with unit tests in CI

**Impact:** medium · **Effort:** low · **Area:** CI pipeline latency

**Evidence**

.github/workflows/ci.yml:66 — `integration-tests: needs: unit-tests`. Measured on run 29274652460 (2026-07-13): Unit Tests took 105s (18:29:31→18:31:16); all three Integration jobs only started at 18:31:18-20 and the pipeline finished 18:34:08 (~4m40s total). Lint (82s) and Build (58s) already run in parallel with unit tests. The e2e jobs share nothing with the unit job — each runs its own `npm ci` in the Playwright container (ci.yml:73-85) and rebuilds its own fixtures.

**Recommendation**

Delete the `needs: unit-tests` line (or replace with `needs: []`). If you want to conserve runner minutes on obviously-broken pushes, gate on the 82s lint job instead (`needs: lint`), which still cuts ~25s-1m45s off the critical path. `fail-fast: false` is already set on the matrix, so behavior is otherwise unchanged.

**Benefit**

CI wall-clock drops from ~4m40s to ~2m50s (-105s, ~40%) on every push/PR, at the cost of 3 extra containers spinning up on runs where unit tests would have failed.

**Verification** — confirmed

All evidence verified. .github/workflows/ci.yml:66 has `needs: unit-tests` on integration-tests; it is a pure gate — no artifacts or outputs flow between jobs (only failure-case upload-artifact at ci.yml:91/99, no download-artifact, no other `needs:` in the repo). Each e2e matrix job is self-contained: Playwright container (ci.yml:73-75), own `npm ci` (ci.yml:84-85), and self-rebuilt fixtures via package.json:39 (`test:e2e` runs `build:test-remote` first). `fail-fast: false` confirmed at ci.yml:70. Run 29274652460 timings confirmed via gh: Unit Tests 105s (18:29:31→18:31:16), Lint 82s, Build 58s, integration jobs started 18:31:18-20, finish 18:34:08 (~4m40s); longest e2e job is 168s, so parallel start yields ~2m50s as claimed. Removing the needs line is compatible with the container/workspaces setup, and the `needs: lint` fallback math (~25s saving) also checks out.

**Verifier corrections (apply these over the recommendation above)**

Only a nit: the workflow runs on pushes to master/development and PRs targeting them (ci.yml:3-7), not literally every push. Otherwise the recommendation stands as written — delete `needs: unit-tests` at ci.yml:66 (or use `needs: lint` to gate on the 82s lint job).

---

### 12. Track unit-test coverage in CI and gitignore the coverage/ output

**Impact:** medium · **Effort:** low · **Area:** CI quality signal / repo hygiene

**Evidence**

package.json:38 defines `test:coverage: vitest run --coverage` and @vitest/coverage-v8 ^4.1.8 is installed (package.json:88), but ci.yml:62 runs plain `npm run test:unit` — coverage is never computed anywhere. There is no `coverage` block in vitest.config.ts or the `test:` section of vite.config.ts:143-147 (no thresholds, no reporters). I verified the provider works (scoped run completed in 2s, emitting html/clover/json into ./coverage). `.gitignore` has no `coverage` entry (checked full file — only /test-results/, /playwright-report/ etc. at lines 33-35), so running the existing script dirties the working tree with dozens of untracked files.

**Recommendation**

1) Add `/coverage/` to .gitignore. 2) In vite.config.ts's test block add `coverage: { provider: 'v8', reporter: ['text', 'json-summary', 'lcov'], include: ['src/**'] }`. 3) In ci.yml change the unit job to `npm run test:coverage` and add davelosert/vitest-coverage-report-action (or upload lcov as an artifact) for a PR comment. Optionally add thresholds later once a baseline exists.

**Benefit**

Coverage becomes visible on every PR instead of never; reviewers see untested-code deltas automatically; local `npm run test:coverage` stops polluting git status. Adds roughly 10-30s to the 105s unit job.

**Verification** — confirmed

Every factual claim verified against actual files: package.json:38 defines test:coverage and package.json:88 pins @vitest/coverage-v8 ^4.1.8; ci.yml:62 runs plain `npm run test:unit` and "coverage" appears nowhere in any workflow; neither vitest.config.ts:12-16 nor vite.config.ts:143-147 has a coverage block; .gitignore (all 43 lines) has no coverage entry (test-results/playwright-report at lines 33-35 as cited). Independently reproduced: a scoped `vitest run --coverage` succeeded, emitted html/clover/json into ./coverage, and left `?? coverage/` in git status (artifact removed after verification). No existing codecov config or tracked coverage output anywhere. The CI recommendation is compatible with this repo: the unit-tests job runs on plain ubuntu-latest (ci.yml:48), not the Playwright container, so a coverage-report action works. One detail is misdirected — the coverage config should go in vitest.config.ts, not vite.config.ts (see correction).

**Verifier corrections (apply these over the recommendation above)**

Same finding, two adjusted details: (1) Add the coverage block to vitest.config.ts (the config Vitest actually resolves; it already holds the test overrides at lines 12-16 and merges vite.config.ts via mergeConfig), not to vite.config.ts's test section — putting it in vite.config.ts would technically survive the merge but grows the already-duplicated test blocks. E.g. `test: { ..., coverage: { provider: 'v8', reporter: ['text', 'json-summary', 'lcov'], include: ['src/**'] } }` (Vitest's default coverage excludes already omit the colocated *.test.*/*.spec.* files). (2) If using davelosert/vitest-coverage-report-action for PR comments, add `permissions: pull-requests: write` to the unit-tests job — ci.yml currently has no permissions block. Steps 1 (gitignore `/coverage/`) and 3 (switch ci.yml:62 to `npm run test:coverage`) stand as written.

---

### 13. Run CI e2e against a built preview instead of masking dev-server cold-start with retries

**Impact:** medium · **Effort:** medium · **Area:** E2E flakiness / fidelity

**Evidence**

playwright.config.ts:6-9 admits the mitigation: 'Retry on CI to ride out the Vite dev-server cold-start window: the first requests trigger dependency optimization + a full reload, during which an in-flight module import can transiently fail' → `retries: process.env.CI ? 2 : 0`. webServer runs the dev server in CI (`command: 'npm run dev -- --no-open'`, playwright.config.ts:33), and test/fixtures/remote-app/serve.mjs:8-12 documents that this cold start already flaked unrelated tests badly enough to force the fixture pre-build ordering. Both webServer entries also set `reuseExistingServer: true` unconditionally (lines 35, 43) rather than the standard `!process.env.CI`.

**Recommendation**

In CI, serve the production bundle: make the webServer command environment-dependent, e.g. `command: process.env.CI ? 'npm run build && npx vite preview --port 5500 --strictPort' : 'npm run dev -- --no-open'` (build measured at 58s in the CI build job), set `reuseExistingServer: !process.env.CI`, and drop retries to 1. If dev-server semantics must be kept (Module Federation dev behavior), the cheaper alternative is a Playwright globalSetup that polls the baseURL and one lazy route until dep-optimization settles, which also lets retries drop.

**Benefit**

Removes the class of transient module-import failures that 2 retries currently paper over (each retried test costs up to 3x its runtime plus trace collection, and retries hide genuinely flaky app bugs). Bonus: e2e exercises the shipped bundle rather than the dev transform pipeline.

**Verification** — confirmed

Every cited fact verified: playwright.config.ts:6-9 contains the exact cold-start comment, line 9 sets retries: process.env.CI ? 2 : 0, line 33 runs 'npm run dev -- --no-open' as the webServer even in CI, and lines 35/43 set reuseExistingServer: true unconditionally (non-standard; Playwright convention is !process.env.CI). serve.mjs:8-12 confirms the cold-start already flaked unrelated tests badly enough to force fixture pre-build ordering (package.json:39-41). CI (.github/workflows/ci.yml integration-tests) runs 'npm run test:e2e -- --project=<browser>', so e2e genuinely runs against the Vite dev server in CI. The recommendation is compatible with this repo's setup: 'npm run build' (run-s build:bundle copy:dist) copies apps.json and silent-check-sso.html into dist, replacing the dev-only /apps.json middleware (vite.config.ts:38-54, apply:'serve'); urlBaseName is '/' so 'vite preview --port 5500 --strictPort' matches baseURL; webServer timeout is already 300s; Module Federation works against the built host (production is MF's primary mode), and the fixture remote registers via a UI-entered manifest URL (remote-app-load.spec.ts:12,27), not dev-server behavior. Checked dev-vs-prod behavioral deltas against the suite: production dropConsole (vite.config.ts:126-129) is safe because no test asserts on console output (only page.on('pageerror')), and no test depends on the apps.local.json catalog contents. The gap is not already implemented anywhere (no preview script, no CI-conditional webServer, no globalSetup exists).

**Verifier corrections (apply these over the recommendation above)**

Recommendation stands with two refinements: (1) The dev server sets 'Access-Control-Allow-Origin: *' (vite.config.ts:107-109) which vite preview will not — nothing in the current e2e suite needs it (the host is only loaded same-origin and the :4191 fixture server sets its own CORS in serve.mjs:52), but add a matching preview.headers block in vite.config.ts for parity to avoid surprises if future tests load host modules cross-origin. Also note the preview'd bundle differs from dev in two test-visible ways that are currently safe but should be kept in mind: console.* is stripped (rolldown dropConsole, vite.config.ts:126-129) and /apps.json serves the production catalog from src/assets/apps.json instead of apps.local.json. (2) The 'cheaper alternative' (globalSetup polling one lazy route) is weaker than stated: Vite re-triggers dependency optimization mid-run when a later test first imports not-yet-discovered dynamic chunks — the exact failure mode serve.mjs:8-12 documents — so warming one route may not fully settle it; prefer the preview approach as primary.

---

### 14. Reorder `npm test` to run lint first and expose the installed Vitest UI

**Impact:** low · **Effort:** low · **Area:** Local dev loop ergonomics

**Evidence**

package.json:35 — `"test": "run-s test:unit test:e2e:chromium lint"` runs lint LAST, after the 18s unit suite and a multi-minute Playwright chromium run (build:test-remote + dev-server boot + suite; the equivalent CI job takes ~2m20s). A trivial type error (`lint` = `run-s lint:tsc lint:eslint`, package.json:53) therefore surfaces minutes late; note CLAUDE.md documents the intended order as lint → unit → e2e, so the script drifted. Separately, @vitest/ui ^4.1.8 is installed (package.json:89) but no script invokes it — only `test:unit:watch: vitest` (package.json:37).

**Recommendation**

Change to `"test": "run-s lint test:unit test:e2e:chromium"` (matches the documented order). Add `"test:unit:ui": "vitest --ui"` so the already-paid-for Vitest UI dependency is discoverable.

**Benefit**

Type/lint failures fail `npm test` in ~1 min instead of after several minutes of unit+e2e; contributors discover the browser-based test UI that is already in node_modules.

**Verification** — confirmed

Every evidence claim checks out: package.json:35 has "test": "run-s test:unit test:e2e:chromium lint" (lint last), package.json:53 has "lint": "run-s lint:tsc lint:eslint", CLAUDE.md:193 documents the intended lint → unit → Chromium e2e order (script drifted), test:e2e:chromium (package.json:40) re-runs build:test-remote before Playwright so lint failures surface minutes late, and @vitest/ui ^4.1.8 (package.json:89) is installed with no script invoking --ui (only "test:unit:watch": "vitest" at line 37). The fix is workable: run-s (npm-run-all 4.1.5, package.json:105) is sequential and fails fast, and a root vitest.config.ts exists so "vitest --ui" runs with the already-installed @vitest/ui. No conflict with module federation, npm workspaces, or the Playwright CI container. Only the illustrative timing figures (18s unit, ~2m20s CI) were unverifiable, and they don't affect validity.

---

### 15. Add npm script entry points for the test-fixture generators

**Impact:** low · **Effort:** low · **Area:** Fixture generation DX

**Evidence**

scripts/generate-test-fixtures/ contains four `generate-all-*.ts` orchestrators plus per-format generators, runnable only via manual invocation documented in file headers (generate-all-cx2.ts:12: `npx tsx scripts/generate-test-fixtures/generate-all-cx2.ts`) — and that header even says `#!/usr/bin/env ts-node` while instructing tsx, two different runners. package.json defines no script for any of them (the only scripts/ entry is `sync:agents`, package.json:32), and no docs/*.md references the directory.

**Recommendation**

Add package.json scripts: `"fixtures:cx2": "tsx scripts/generate-test-fixtures/generate-all-cx2.ts"`, likewise `fixtures:sif`, `fixtures:tables`, `fixtures:urls`, and an umbrella `"fixtures:all": "run-s fixtures:*"`. Fix the stale ts-node shebangs while there.

**Benefit**

Fixture regeneration becomes a discoverable one-liner (`npm run fixtures:all`) instead of tribal knowledge buried in file headers; removes the ts-node/tsx ambiguity for new contributors and agents.

**Verification** — confirmed

The core premise verifies: all four generate-all-*.ts orchestrators carry a stale `#!/usr/bin/env ts-node` shebang (line 1) while instructing `npx tsx` (e.g. generate-all-cx2.ts:12), and package.json:30-58 defines no fixtures script. However, two evidence details are wrong (sync:agents is NOT the only scripts/ entry — verify:federation at package.json:42 runs scripts/verify-federation-build.ts; and CLAUDE.md:257/AGENTS.md:260 do reference the directory, just without a run command), and the recommendation as written would break twice: (1) tsx is not a devDependency (only ts-node ^10.9.1 at package.json:110; no node_modules/.bin/tsx), so a bare `tsx ...` npm script fails — the orchestrators themselves spawn `npx tsx` internally (generate-all-cx2.ts:39-41); (2) `"fixtures:all": "run-s fixtures:*"` infinitely recurses because npm-run-all's `fixtures:*` glob matches `fixtures:all` itself.

**Verifier corrections (apply these over the recommendation above)**

Add package.json scripts using npx (tsx is not installed; adding it as a devDependency would need explicit permission per CLAUDE.md's dependency rule, and the orchestrators already rely on `npx tsx` internally at generate-all-cx2.ts:39-41): `"fixtures:cx2": "npx tsx scripts/generate-test-fixtures/generate-all-cx2.ts"`, likewise `fixtures:sif`, `fixtures:tables`, `fixtures:urls`. Name the umbrella WITHOUT a colon so it escapes its own glob: `"fixtures": "run-s fixtures:*"` (or enumerate: `"fixtures:all": "run-s fixtures:cx2 fixtures:sif fixtures:tables fixtures:urls"` — never `"fixtures:all": "run-s fixtures:*"`, which self-matches and loops forever). Fix the stale `#!/usr/bin/env ts-node` shebangs to `#!/usr/bin/env tsx` (or drop them) in all four generate-all-*.ts files. Evidence nits: sync:agents is not the only scripts/ entry (verify:federation, package.json:42, also runs a scripts/ file), and CLAUDE.md:257 does list the directory — the real gap is that no doc or script gives a runnable command.

---

## Lint, typecheck & format

### 16. Enable ESLint --cache with a persistent cache location

**Impact:** medium · **Effort:** low · **Area:** Local lint loop (and CI lint job)

**Evidence**

package.json:54 `"lint:eslint": "eslint --ext .js,.ts,.jsx,.tsx src"` has no --cache flag. Measured on this repo (833 TS files in src/): cold run 8.63s, warm run with `--cache --cache-location node_modules/.cache/eslint/` 1.17s (7.4x faster).

**Recommendation**

Change lint:eslint and lint:fix to `eslint --cache --cache-location node_modules/.cache/eslint/ src` (keeping --ext flags). Using node_modules/.cache avoids any .gitignore change. Optionally add an actions/cache step for that path in the CI lint job (ci.yml lint job, lines 10-26) keyed on package-lock.json + eslint.config.js.

**Benefit**

Every repeat lint drops from ~8.6s to ~1.2s locally; `npm run lint` warm time drops by ~7s per invocation. Zero behavior change — cache invalidates on file/config change.

**Verification** — confirmed

Verified against actual files. package.json:54 ("lint:eslint": "eslint --ext .js,.ts,.jsx,.tsx src") and :56 (lint:fix) have no --cache; src/ has exactly 833 .ts/.tsx files; ci.yml lint job is lines 10-26 as cited. Reproduced the measurement on this repo: cold run 7.99s wall, warm run with --cache --cache-location node_modules/.cache/eslint/ 0.96s (~8x), with byte-identical output (125 warnings, 0 errors). The command works with the repo's ESLint 9.39.1 flat config (eslint.config.js) — --ext is supported in flat config since ESLint 9.11 — and the cache is semantically safe because only non-type-aware rules are enabled (tseslint recommended + syntactic rules), so per-file caching cannot go stale across files. node_modules/.cache already hosts prettier/webpack caches, so no .gitignore change is needed. Only the optional CI-cache detail is flawed (see correction).

**Verifier corrections (apply these over the recommendation above)**

Local change is correct as proposed: set lint:eslint to "eslint --ext .js,.ts,.jsx,.tsx --cache --cache-location node_modules/.cache/eslint/ src" and lint:fix likewise (verified working, 7.99s → 0.96s). But the optional CI caching part needs two fixes: (1) add --cache-strategy content — ESLint's default metadata strategy keys on mtime/size, and actions/checkout produces fresh mtimes every run, so a restored cache would invalidate every file and give zero CI speedup; (2) place the actions/cache step AFTER the "npm ci" step (ci.yml line 23), because npm ci deletes node_modules and would wipe a cache restored before it (or use a cache path outside node_modules for CI). Also note the CI key should use restore-keys for partial hits, and that overall "npm run lint" time remains dominated by lint:tsc (tsc --noEmit), which this does not affect. Minor caveat: if type-aware rules (e.g. tseslint recommendedTypeChecked) are ever enabled, per-file caching could mask cross-file type changes and the cache flags should be revisited.

---

### 17. Reorder npm test to run lint first and parallelize lint with run-p

**Impact:** medium · **Effort:** low · **Area:** Script orchestration / fail-fast feedback

**Evidence**

package.json:35 `"test": "run-s test:unit test:e2e:chromium lint"` runs lint LAST, after Vitest plus a full Playwright chromium run that itself rebuilds the test-remote fixture first (package.json:40-41). package.json:53 `"lint": "run-s lint:tsc lint:eslint"` runs tsc (11.3s measured) and eslint (8.6s measured) serially even though they are independent.

**Recommendation**

Change `"lint"` to `"run-p --aggregate-output lint:tsc lint:eslint"` (npm-run-all 4.1.5 is already installed and supports both). Change `"test"` to `"run-s lint test:unit test:e2e:chromium"` so the cheapest check runs first, matching CI which already runs these as independent jobs (ci.yml jobs lint/unit-tests/integration-tests have no ordering between lint and tests).

**Benefit**

`npm run lint` drops from ~20s to ~11.5s (max of the two legs; ~3-4s once cache/incremental findings land). A typo-level lint error in `npm test` surfaces in seconds instead of after minutes of unit + e2e runs. CI lint job gets the same ~8s saving.

**Verification** — confirmed

All cited evidence verified against actual files: package.json:35 runs lint last in "test"; package.json:40-41 confirm test:e2e:chromium rebuilds the test-remote fixture first; package.json:53 runs lint:tsc and lint:eslint serially via run-s. Timings reproduce (tsc ~9.8s, eslint ~8.6s measured locally, vs claimed 11.3s/8.6s). npm-run-all 4.1.5 is installed (package.json:105) and its run-p supports --aggregate-output. ci.yml confirms lint (line 10, npm run lint at line 26), unit-tests, and integration-tests jobs have no ordering between lint and tests (only integration-tests needs unit-tests), and the CI lint job uses the same npm run lint so it inherits the speedup. No conflict with module federation, npm workspaces, or the Playwright container — the change is pure script composition.

**Verifier corrections (apply these over the recommendation above)**

Recommendation works as written, with two refinements: (1) use `"lint": "run-p --aggregate-output --continue-on-error lint:tsc lint:eslint"` — without --continue-on-error, run-p kills the sibling task on first failure, so a fast tsc error would truncate eslint output (exit code stays non-zero either way); (2) note that lint:tsc currently FAILS on the wincompat branch (src/init.tsx:32-33, import.meta.hot → TS2339/TS7006 because vite/client types aren't in tsconfig.json "types"), so after reordering, `npm test` will fail immediately at the lint step until that pre-existing error is fixed — which is the intended fail-fast behavior, but should be fixed alongside the reorder.

---

### 18. Turn on incremental typecheck with a tsBuildInfo file outside dist

**Impact:** medium · **Effort:** low · **Area:** Typecheck loop (lint:tsc)

**Evidence**

tsconfig.json (lines 2-20) has no "incremental" or "tsBuildInfoFile" setting; grep confirms neither appears anywhere in the file. Measured: `tsc --noEmit` cold 11.28s; warm rerun with `--incremental --tsBuildInfoFile` 2.80s (4x faster).

**Recommendation**

Add `"incremental": true, "tsBuildInfoFile": "node_modules/.cache/tsc/tsbuildinfo.json"` to tsconfig.json compilerOptions. The explicit path matters: with outDir ./dist/ (tsconfig.json:5) the default buildinfo location lands in dist/ and gets wiped by `npm run clean` (rimraf dist, package.json:31) and every build.

**Benefit**

Warm `tsc --noEmit` drops from ~11.3s to ~2.8s; combined with eslint --cache and run-p, a warm `npm run lint` goes from ~20s to ~3s.

**Verification** — confirmed

Verified in-repo: tsconfig.json (lines 2-20) has no incremental/tsBuildInfoFile; outDir './dist/' is at tsconfig.json:5, so the default buildinfo would land in dist/, which is wiped both by 'clean': 'rimraf dist' (package.json:31) and by every Vite build (vite.config.ts:112 outDir 'dist' with default emptyOutDir=true). Empirically reproduced the speedup: cold tsc --noEmit with --incremental --tsBuildInfoFile took 11.2s, warm rerun 3.3s (~3.4x); the buildinfo file is written even under --noEmit, tsc auto-creates the cache directory, and cached runs still re-report the repo's 3 pre-existing src/init.tsx type errors correctly. No conflict with Vite/module federation/npm workspaces — the setting only affects lint:tsc (tsc --noEmit, package.json:55) and packages/ is excluded from the root tsconfig.

**Verifier corrections (apply these over the recommendation above)**

Recommendation stands as written: add "incremental": true, "tsBuildInfoFile": "node_modules/.cache/tsc/tsbuildinfo.json" to tsconfig.json compilerOptions. Minor detail fixes: warm rerun measured ~3.3s (not 2.8s) on this machine — still ~3.4x; the gain is local-only (CI jobs run fresh npm ci and setup-node caches only ~/.npm, so node_modules/.cache does not persist across CI runs); and the "~20s → ~3s npm run lint" figure additionally requires the separate eslint --cache and run-s→run-p changes (package.json:53-54), which are not yet in place.

---

### 19. Drop the unused type-aware parserOptions.project from ESLint (or adopt type-checked rules deliberately)

**Impact:** medium · **Effort:** low · **Area:** ESLint performance and config hygiene

**Evidence**

eslint.config.js:23 sets `project: './tsconfig.eslint.json'`, which forces full TS program construction, but the config enables zero type-aware rules: line 13 uses `tseslint.configs.recommended` (not recommendedTypeChecked — grep for TypeChecked presets returns 0), and the custom rules block (lines 41-59) contains only syntactic rules (react, react-hooks, simple-import-sort, no-unused-vars). Measured: 8.63s with project vs 5.56s without (~35% of lint time wasted). tsconfig.eslint.json:3 is also stale — it includes "jest-setup.ts", which no longer exists (the Vitest setup file is vitest-setup.ts).

**Recommendation**

Either delete `parserOptions.project` (and tsconfig.eslint.json entirely) since nothing consumes type info, or — if type-aware rules are wanted — switch to `parserOptions.projectService: true` with `tseslint.configs.recommendedTypeChecked` so the cost actually buys something. If keeping tsconfig.eslint.json, replace the stale jest-setup.ts include with vitest-setup.ts.

**Benefit**

~3s off every cold ESLint run (cache misses, CI, --fix runs), and removes a stale second tsconfig that must track file renames; alternatively unlocks type-aware rules that are currently being paid for but not used.

**Verification** — confirmed

Every claim verified against actual files. eslint.config.js:23 sets project: './tsconfig.eslint.json'; line 13 uses non-type-checked tseslint.configs.recommended and the rules block (lines 41-59) is purely syntactic (react, react-hooks, no-unused-vars, simple-import-sort) — repo-wide grep for TypeChecked presets or projectService returns zero hits, so nothing consumes the TS program. Reproduced the timing: 11.7s with project vs 5.3s without on this machine (~55% saved, larger than the auditor's ~35%), with identical warning counts and exit codes, proving removal changes no lint output. tsconfig.eslint.json:3 does include the nonexistent jest-setup.ts (vitest-setup.ts exists at repo root). Deletion is safe: tsconfig.eslint.json is referenced only from eslint.config.js. The alternative (projectService + recommendedTypeChecked) is supported by the installed typescript-eslint 8.46.3. Supporting fact strengthening the finding: package.json:53-55 shows npm run lint runs tsc --noEmit before ESLint, so ESLint's TS program construction is fully duplicated type-checking work.

**Verifier corrections (apply these over the recommendation above)**

Finding stands as written; only refinement: the measured savings are machine-dependent and were larger in verification (11.7s → 5.3s, ~55%) than the cited ~35%, so the benefit is understated if anything.

---

### 20. Add pre-commit hooks (husky + lint-staged) so errors surface before CI

**Impact:** high · **Effort:** low · **Area:** Commit-time automation

**Evidence**

No hook infrastructure exists: no .husky/ directory, no husky/lint-staged/simple-git-hooks in package.json (grep returns nothing), `git config core.hooksPath` is unset, and .git/hooks contains only samples. Meanwhile ci.yml:3-7 triggers only on push to [master, development] and PRs targeting those branches — so commits on feature branches (like the current wincompat) get zero automated checks until a PR is opened. Prettier drift of 303 files (see prettier finding) is direct evidence of this gap.

**Recommendation**

Add husky + lint-staged (requires permission for the package.json change): pre-commit runs lint-staged with `"*.{js,jsx,ts,tsx}": ["prettier --write", "eslint --cache --cache-location node_modules/.cache/eslint/ --fix"]`. Keep tsc out of pre-commit (it is whole-program); optionally add `tsc --noEmit` as a pre-push hook once incremental mode makes it ~3s.

**Benefit**

Formatting and lint errors are fixed automatically at commit time in ~1-2s (staged files only) instead of being discovered in a 15-minute CI round-trip after the PR opens; prevents new format drift permanently.

**Verification** — confirmed

Every evidence claim checks out against the actual files: ci.yml:3-7 triggers only on push to [master, development] and PRs targeting them, so feature-branch commits (e.g. current wincompat) get no CI until a PR opens; no .husky/, no husky/lint-staged/simple-git-hooks in package.json, core.hooksPath unset, .git/hooks contains only .sample files; prettier --check reports exactly 303 drifted files; and CI never checks formatting (lint = tsc + eslint, and eslint.config.js:7,62 uses only eslint-config-prettier to disable rules, not enforce them). The recommendation is compatible with npm workspaces, module federation, and the Playwright container (hooks are local-only), and correctly flags the package.json permission requirement. Two config details need fixing (see correction): the lint-staged glob is broader than the repo's lint scope, and the ~1-2s estimate ignores type-aware ESLint.

**Verifier corrections (apply these over the recommendation above)**

Keep the recommendation, with two fixes: (1) Scope lint-staged to src/ to match existing lint/format scripts (package.json:54,57 only cover src/) — running eslint --fix repo-wide would hit scripts/ and test/playwright/ files never linted today and block commits on pre-existing errors. Use `"src/**/*.{js,jsx,ts,tsx}": ["prettier --write", "eslint --no-warn-ignored --cache --cache-location node_modules/.cache/eslint/ --fix"]` (the `--no-warn-ignored` flag is needed for ESLint 9 flat config when lint-staged passes individual files). (2) Temper the speed claim: eslint.config.js:23 enables type-aware linting (project: './tsconfig.eslint.json'), so each per-file eslint run loads the full TS program — expect several seconds, not 1-2s; --cache does not cache type info. If that proves too slow, run only prettier in pre-commit and leave eslint to CI. Also do a one-time `npm run format` of the existing 303-file drift first, otherwise lint-staged will smear reformatting noise across unrelated commits.

---

### 21. Enforce Prettier with a format:check script and CI step, after a one-time reformat

**Impact:** medium · **Effort:** medium · **Area:** Formatting consistency / CI

**Evidence**

Formatting is currently unenforceable and already broken: .prettierrc.json exists, but package.json:57 only defines `"format": "prettier --write ..."` (no check variant), ci.yml contains no prettier step (grep for prettier/format returns nothing), and measured `npx prettier --check "src/**/*.{js,jsx,ts,tsx}"` reports "Code style issues found in 303 files" out of ~833. Additionally eslint-plugin-prettier ^5.1.1 is installed (package.json:96) but never registered in eslint.config.js (only eslint-config-prettier is applied, line 62) — a dead dependency.

**Recommendation**

1) Run `npm run format` once and commit (add the commit hash to a .git-blame-ignore-revs file to keep blame clean); coordinate timing with open branches since 303 files will change. 2) Add `"format:check": "prettier --check \"src/**/*.{js,jsx,ts,tsx}\""` and append it to the lint script or CI lint job. 3) Drop the unused eslint-plugin-prettier dependency (or wire it in instead of a separate check — the separate check is faster).

**Benefit**

Ends the current state where a third of the codebase drifts from the declared style, eliminating noisy reformat hunks in code-review diffs and merge conflicts; prettier --check adds only ~2-3s to CI.

**Verification** — confirmed

Every evidence point checks out against the actual files: package.json:57 defines only "format": "prettier --write ..." with no check variant; .github/workflows/ci.yml contains no prettier/format step (grep empty); re-running `npx prettier --check "src/**/*.{js,jsx,ts,tsx}"` reproduces exactly "Code style issues found in 303 files" out of 834 source files; eslint-plugin-prettier ^5.1.1 is at package.json:96 and a repo-wide grep confirms it is never registered anywhere (eslint.config.js only requires eslint-config-prettier at line 7 and applies it at line 62, as claimed). No .git-blame-ignore-revs exists yet. The recommendation (one-time reformat + blame-ignore-revs, add format:check to lint/CI, drop the dead plugin) is standard and conflicts with nothing in this repo's Vite/module-federation/workspaces/Playwright-container setup; prettier --check on ~834 files is cheap.

**Verifier corrections (apply these over the recommendation above)**

Only trivial refinements: source file count is 834, not ~833. Note that .git-blame-ignore-revs is honored automatically by GitHub blame but local git needs `git config blame.ignoreRevsFile .git-blame-ignore-revs` (worth documenting in the commit/README). Also, per this repo's CLAUDE.md, modifying package.json (adding format:check, removing eslint-plugin-prettier) requires explicit user permission first.

---

### 22. Adopt full TypeScript strict mode incrementally, starting with the four free flags

**Impact:** medium · **Effort:** medium · **Area:** Typecheck strictness / long-term correctness

**Evidence**

tsconfig.json:15 enables only strictNullChecks (plus noImplicitAny at line 6) — not "strict" — while the newer packages/api-types/tsconfig.json:6 already sets `"strict": true`, so the repo is split. Measured migration cost on today's code: full --strict = ~143 errors (88 TS2322, 25 TS2345, 14 TS18046); broken down: strictFunctionTypes alone ~126 errors, useUnknownInCatchVariables 14, noImplicitThis+alwaysStrict+strictBindCallApply ~1, strictPropertyInitialization 0.

**Recommendation**

Phase 1 (now, ~1 error to fix): add noImplicitThis, alwaysStrict, strictBindCallApply, strictPropertyInitialization to tsconfig.json. Phase 2 (14 mechanical catch-block fixes): useUnknownInCatchVariables. Phase 3 (scheduled tech-debt, ~126 errors mostly in callback/variance typing): strictFunctionTypes, then replace the flag list with `"strict": true` to match packages/api-types.

**Benefit**

Phases 1-2 land ~15 fixes for most of strict mode's safety, locking in guarantees the API-types package already has; bounds the remaining migration to one known 126-error work item instead of an unquantified 'someday'.

**Verification** — confirmed

Every factual claim checks out against the repo. tsconfig.json:15 enables only strictNullChecks (noImplicitAny at line 6, no "strict"), while packages/api-types/tsconfig.json:6 sets "strict": true — and src/models/tsconfig.json:6 (used by the diagram scripts) is a third strict:true island, making the split even clearer than claimed. Re-measured on TS 5.9.2 (after subtracting a 3-error pre-existing baseline in src/init.tsx): full --strict = 143 errors with exactly 88 TS2322, 25 TS2345, 14 TS18046 as top codes; strictFunctionTypes alone = 126; useUnknownInCatchVariables = 14; the four cheap flags produce exactly 1 error (TS2683 at src/features/HierarchyViewer/components/CirclePackingLayout/CirclePackingPanel.tsx:752); strictPropertyInitialization = 0. The gap is not already implemented (lint:tsc = root tsc --noEmit, package.json:55, which the strict sub-configs do not govern), and the flags are type-check-only, so nothing conflicts with Vite module federation, npm workspaces, or the Playwright container.

**Verifier corrections (apply these over the recommendation above)**

Two details to fold in. (1) Prerequisite/Phase 0: baseline `tsc --noEmit` already fails on this branch with 3 pre-existing errors in src/init.tsx:32-33 (import.meta.hot — TS2339 x2, TS7006; likely missing vite/client types), unrelated to strict flags; fix these first or no phase can land green. All measured counts above exclude this baseline. (2) Phase arithmetic: 1 + 14 + 126 = 141, not 143 — about 2 extra errors (the 10 TS2418 computed-property/variance errors partially overlap strictFunctionTypes) only appear when flags combine, so budget Phase 3 as ~128 rather than exactly 126. Otherwise the recommendation stands as written; Phase 1 is exactly one fix (CirclePackingPanel.tsx:752).

---

## CI/CD pipeline

### 23. Fix the Vitest include pattern so the 34 *.spec.ts unit tests actually run in CI

**Impact:** high · **Effort:** low · **Area:** CI test signal correctness (unit-tests job)

**Evidence**

vitest.config.ts:14 sets `include: ['**/*.test.{ts,tsx}']`, which replaces Vitest's default include (`**/*.{test,spec}.*`). `find src -name '*.spec.ts*'` returns 34 files — including all 16 store specs (src/data/hooks/stores/VisualStyleStore.spec.ts, NetworkStore.spec.ts, WorkspaceStore.spec.ts, ...) and the MergeNetworks suite (src/features/MergeNetworks/tests/*.spec.ts). These files are already Vitest-native (VisualStyleStore.spec.ts:2 `import { beforeEach, describe, expect, it, vi } from 'vitest'`; line 17 `vi.mock('../../db', ...)`; zero files match `jest.`). CI runs `npm run test:unit` = `vitest run` (ci.yml:62, package.json:36), so none of these tests execute. The narrowing was presumably done to avoid collecting Playwright's test/playwright/*.spec.ts files.

**Recommendation**

Change vitest.config.ts include to `['src/**/*.{test,spec}.{ts,tsx}', 'packages/**/*.{test,spec}.{ts,tsx}']` (scoping to src/ and packages/ keeps test/playwright/*.spec.ts out without an exclude). Then run `npx vitest run` locally: expect ~141 test files instead of 107. Since these 34 files have been silently excluded for a while, budget for fixing any that bit-rotted before merging.

**Benefit**

Restores CI coverage for every Zustand store and the MergeNetworks feature — currently a green unit-tests job proves nothing about ~24% of the unit-test files. Prevents shipping store regressions that the tests were written to catch.

**Verification** — confirmed

All evidence verified against actual files. vitest.config.ts:14 sets include: ['**/*.test.{ts,tsx}'], overriding Vitest's default {test,spec} pattern. 34 .spec.ts* files exist under src/ (16 store specs incl. VisualStyleStore/NetworkStore/WorkspaceStore, 7 MergeNetworks, 11 TableDataLoader); all are Vitest-native (VisualStyleStore.spec.ts:2 imports from 'vitest', line 17 uses vi.mock; zero jest. matches). package.json:36 has "test:unit": "vitest run" and ci.yml's unit-tests job runs npm run test:unit, so these 34 files never execute in CI — proven behaviorally: `npx vitest run src/data/hooks/stores/VisualStyleStore.spec.ts` exits 1 with "No test files found". No other config runs them (no vitest workspace/second config; playwright.config.ts testDir is ./test/playwright, whose 7 .spec.ts files explain the narrowing). The recommended include was tested via a temporary config: all 34 spec files were collected and all 364 tests passed in ~4s, and 107 .test files + 34 spec = 141 matches the predicted count. No .test.* files exist outside src/ or packages/, so scoping loses nothing, and packages/ has 0 spec files today (harmless future-proofing).

**Verifier corrections (apply these over the recommendation above)**

Recommendation is correct as written; one refinement: no repair budget is needed — running the widened include today shows all 34 spec files pass (364 tests, ~4s), so the change is a pure one-line config edit to vitest.config.ts:14 (include: ['src/**/*.{test,spec}.{ts,tsx}', 'packages/**/*.{test,spec}.{ts,tsx}']) with no test fixes required.

---

### 24. Add concurrency with cancel-in-progress to ci.yml

**Impact:** medium · **Effort:** low · **Area:** CI runner utilization and PR feedback clarity

**Evidence**

.github/workflows/ci.yml has no `concurrency:` block anywhere (lines 1-8 go straight from `on:` triggers to `jobs:`). Each push to a PR branch starts a fresh 6-job run (lint, build, unit, 3-browser integration ≈ 15 runner-minutes) while the previous run for the same ref keeps executing to completion.

**Recommendation**

Add at the workflow top level:
```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/master' && github.ref != 'refs/heads/development' }}
```
The conditional keeps push runs on master/development intact (so every merged commit still gets a full result) while cancelling superseded PR runs.

**Benefit**

Rapid-push PR workflows stop stacking stale runs: saves up to ~15 runner-minutes per superseded push and removes confusing 'old commit still red/green' status noise on PRs.

**Verification** — confirmed

Premise verified: .github/workflows/ci.yml (the repo's only workflow) has no concurrency block anywhere — `on:` at lines 3–7 goes directly to `jobs:` at line 9, and grep of .github/ finds zero `concurrency` occurrences. The 6-job/~15-min claim is accurate (lint, build, unit-tests, and a 3-browser integration matrix at ci.yml:72, each with timeout-minutes: 15 and its own npm ci). The recommendation is compatible with this repo (nothing in the Playwright container, matrix, or npm-workspaces setup conflicts), and expression-valued cancel-in-progress is supported by GitHub Actions; for pull_request events github.ref is refs/pull/N/merge, so PRs correctly get cancellation while pushes to master/development don't. One detail is wrong though: with cancel-in-progress:false, GitHub still cancels previously *pending* (queued) runs in the same concurrency group, so under rapid successive merges to master/development, intermediate commits' queued runs get cancelled — contradicting the stated 'every merged commit still gets a full result'. The group needs to be made unique per run on those branches.

**Verifier corrections (apply these over the recommendation above)**

Add a top-level concurrency block, but make the group unique per run on protected branches so queued push runs are never cancelled:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}-${{ (github.ref == 'refs/heads/master' || github.ref == 'refs/heads/development') && github.run_id || 'pr' }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/master' && github.ref != 'refs/heads/development' }}
```

This keeps the intended behavior: superseded PR runs are cancelled (github.ref is refs/pull/N/merge per PR), while every push to master/development gets its own group (via github.run_id) so neither in-progress nor pending runs are ever cancelled and every merged commit gets a full CI result. (The original proposal's `cancel-in-progress: false` alone is insufficient because GitHub always cancels previously pending runs within a shared concurrency group.) Also drop the redundant `ci-` prefix since ${{ github.workflow }} already namespaces the group.

---

### 25. Stop gating the Playwright matrix on unit-tests (drop needs: unit-tests)

**Impact:** medium · **Effort:** low · **Area:** CI wall-clock latency for PR feedback

**Evidence**

ci.yml:66 `needs: unit-tests` on integration-tests. Measured on the latest run (2026-07-13, total 4m41s): lint/build/unit all started ~18:29:30; unit-tests finished 18:31:16; the three integration jobs only started 18:31:18-20 and finished 18:33:38-18:34:08. The gate adds the entire unit-tests job (~1m47s) to the critical path. The gate's only payoff is skipping e2e when unit tests fail — and since the matrix already has `fail-fast: false` (ci.yml:70), the repo has chosen completeness over early cancellation anyway.

**Recommendation**

Delete line 66 (`needs: unit-tests`) so all 6 jobs run in parallel. If you want to keep the cost-saving on unit failures, keep `needs` only for push events: `needs: unit-tests` cannot be conditional, so instead accept parallelism — at ~2.5 min per integration job the worst-case waste on a unit-test failure is ~7.5 runner-minutes.

**Benefit**

Total CI wall time drops from ~4m40s to ~2m55s (-38%) on every push and PR — the single biggest latency win available in this pipeline.

**Verification** — confirmed

Verified against .github/workflows/ci.yml and actual run 29274652460. ci.yml:66 has `needs: unit-tests` on integration-tests and ci.yml:70 has `fail-fast: false`, exactly as cited. Job timings match the claim almost to the second: lint/build/unit started 18:29:30-32, Unit Tests finished 18:31:16 (1m45s), integration jobs started 18:31:18-20 and finished 18:33:40-18:34:08, total run 4m41s. The gate serializes the pipeline: with the longest integration job at 2m48s (webkit), running all 6 jobs in parallel yields ~2m52s total, matching the claimed ~2m55s / -38%. The removal is safe: integration jobs are fully self-contained (own checkout, npm ci, and test:e2e which rebuilds test-remote and starts its own dev server) — no artifact/output dependency on unit-tests — and nothing about the Playwright container, module federation, or npm workspaces is affected. Worst-case waste on a unit failure (~3 x 2.5 = 7.5 runner-minutes) is accurately estimated.

**Verifier corrections (apply these over the recommendation above)**

The core fix is right but the recommendation's middle sentence is self-contradictory (proposes keeping `needs` only for push events, then correctly notes `needs` cannot be conditional). Clean version: delete line 66 (`needs: unit-tests`) from .github/workflows/ci.yml so all 6 jobs start in parallel, cutting CI wall time from ~4m41s to ~2m52s (-38%); accept the worst-case cost of ~7.5 runner-minutes when unit tests fail (there is no supported way to make `needs` conditional per event without duplicating the job). Minor nit: the fail-fast:false argument is about sibling browser jobs within the matrix, not the cross-job gate, though it does correctly signal the repo prefers completeness over early cancellation.

---

### 26. Run verify:federation in the CI build job

**Impact:** medium · **Effort:** low · **Area:** CI regression coverage for the Module Federation public API

**Evidence**

package.json:42 defines `verify:federation` (a build-output smoke verifier). Its own docstring says it should gate CI: scripts/verify-federation-build.ts:8-13 — 'Run AFTER a build: npm run build && npm run verify:federation ... Exits non-zero on any miss so CI gates on it.' But the CI build job only runs `npm run build` (ci.yml:44); no job anywhere runs verify:federation, so a build that silently drops `remoteEntry.js`, an expose key, or a shared singleton passes CI.

**Recommendation**

In the build job, after `npm run build`, add a step: `run: npm run verify:federation`. dist/ is already present in that job, so this is a pure addition (~seconds of runtime, ts-node is already a dependency).

**Benefit**

External plugin apps (Module Federation consumers) stop being the first to discover a broken federation contract; the check the team already wrote actually executes. Near-zero added CI time.

**Verification** — confirmed

All evidence verified. package.json:42 defines verify:federation; scripts/verify-federation-build.ts:8-13 contains the exact quoted docstring ('npm run build && npm run verify:federation' at line 8, 'Exits non-zero on any miss so CI gates on it' at line 12); ci.yml:44 runs only 'npm run build' and grep of .github/ confirms no job anywhere invokes verify:federation. The recommendation is workable: the build job's npm ci installs ts-node (devDependency, package.json:110), Vite outputs to dist/ at repo root (vite.config.ts:112) which matches the verifier's DIST path, there is no top-level "type":"module" to break ts-node CJS mode, and the build job runs on ubuntu-latest (not the Playwright container) so no environment conflict. Executed npm run verify:federation against a real dist/ build — all 36 checks passed in seconds, confirming it works as a pure post-build CI step.

---

### 27. Add check:agents and a Prettier check to the CI lint job

**Impact:** medium · **Effort:** low · **Area:** CI quality gates (docs sync and formatting drift)

**Evidence**

package.json:33 defines `check:agents` = `run-s sync:agents gitdiff:agents` (fails if AGENTS.md is out of sync with CLAUDE.md, which CLAUDE.md declares auto-generated), but ci.yml's Lint job only runs `npm run lint` = tsc + eslint (ci.yml:26, package.json:53). Nothing in CI runs it, so AGENTS.md drift lands silently. Similarly package.json:57 only has `format` (`prettier --write`) — there is no `--check` variant and no CI step, so unformatted code merges freely despite Prettier being the declared formatter (CLAUDE.md section 3).

**Recommendation**

1) Add `"format:check": "prettier --check \"src/**/*.{js,jsx,ts,tsx}\""` to package.json scripts. 2) In the Lint job after `npm run lint`, add two steps: `run: npm run check:agents` and `run: npm run format:check`. Dependencies are already installed in that job; combined runtime is well under a minute. (Optionally roll them into the `lint` run-s chain instead.)

**Benefit**

AGENTS.md can no longer drift from CLAUDE.md, and formatting churn stops polluting PR diffs — both enforced automatically instead of by reviewer vigilance.

**Verification** — confirmed

All cited evidence is accurate: package.json:33 defines check:agents (sync + git diff --exit-code on tracked AGENTS.md), ci.yml:26's Lint job runs only `npm run lint` (tsc + eslint per package.json:53), and package.json:57 has only `prettier --write` with no --check variant. Crucially, the gap is not already covered elsewhere: eslint.config.js applies only eslint-config-prettier (line 62, rule-disabling) and does not wire in the installed eslint-plugin-prettier, so `npm run lint` does not enforce formatting; ci.yml is the sole workflow. The recommendation is mechanically sound in this repo's setup (Lint job runs on ubuntu-latest with checkout@v4, so git diff works; deps already installed), and `npm run check:agents` passes today. However, one detail is wrong: `npx prettier --check` currently fails on 303 files in src/, so enabling format:check without a prerequisite formatting commit would immediately break CI.

**Verifier corrections (apply these over the recommendation above)**

The recommendation is correct but needs a prerequisite step: the repo is not currently Prettier-clean (`npx prettier --check "src/**/*.{js,jsx,ts,tsx}"` reports issues in 303 files), so first run `npm run format` and land that one-time formatting commit (or scope the check to changed files) BEFORE adding the CI step; otherwise the new `format:check` step fails on the first PR. Then: 1) add `"format:check": "prettier --check \"src/**/*.{js,jsx,ts,tsx}\""` to package.json; 2) add `npm run check:agents` and `npm run format:check` steps to the Lint job after `npm run lint` (check:agents already passes today and can be enabled immediately). Alternative for the formatting half: wire the already-installed eslint-plugin-prettier into eslint.config.js, but the standalone prettier --check step is faster and simpler.

---

### 28. Enable CI for feature-branch pushes (or at least workflow_dispatch)

**Impact:** medium · **Effort:** low · **Area:** Pre-PR feedback for developers on feature branches

**Evidence**

ci.yml:3-7: `on: push: branches: [master, development]` and `pull_request: branches: [master, development]`. There is no `workflow_dispatch`. Pushes to any feature branch — including the current branch `wincompat` — run zero CI until a PR is opened, and there is no way to trigger a run manually. Netlify auto-deploys every branch (CLAUDE.md section 7), so feature branches get deployed but never tested.

**Recommendation**

Add `workflow_dispatch:` under `on:` (one line, zero risk). Optionally go further: change push triggers to all branches and rely on the concurrency block (previous finding) plus a guard like `if: github.event_name != 'push' || github.event.pull_request == null` — or simpler, keep push limited to master/development and let devs use workflow_dispatch/`gh workflow run ci.yml --ref wincompat` for pre-PR validation.

**Benefit**

Developers get CI signal on WIP branches before opening a PR instead of discovering lint/tsc/e2e failures at PR time; today the only pre-PR option is running the full suite locally.

**Verification** — confirmed

Evidence verified: .github/workflows/ci.yml:3-7 triggers only on push/pull_request to [master, development], there is no workflow_dispatch anywhere in .github/, and ci.yml is the only workflow file — so feature branches like wincompat get zero CI until a PR opens and no manual trigger exists. The Netlify all-branch auto-deploy claim matches CLAUDE.md section 7. Adding workflow_dispatch is a one-line, zero-conflict change. However, the optional guard suggested for all-branch push triggers (`if: github.event_name != 'push' || github.event.pull_request == null`) is logically a no-op — github.event.pull_request is always null on push events, so the condition is always true and prevents no duplicate runs.

**Verifier corrections (apply these over the recommendation above)**

Add `workflow_dispatch:` under `on:` in .github/workflows/ci.yml so devs can run `gh workflow run ci.yml --ref <branch>` for pre-PR validation (note: the branch must contain the updated workflow file for dispatch to work on that ref). If you also enable push on all branches, do NOT use the suggested guard `if: github.event_name != 'push' || github.event.pull_request == null` — it is always true and dedupes nothing. Instead either keep push limited to master/development, add a `concurrency: { group: ci-${{ github.workflow }}-${{ github.ref }}, cancel-in-progress: true }` block, or skip same-repo pull_request runs with `if: github.event_name != 'pull_request' || github.event.pull_request.head.repo.full_name != github.repository`.

---

### 29. Skip the full 6-job pipeline for docs-only changes

**Impact:** low · **Effort:** low · **Area:** CI runner cost on documentation commits

**Evidence**

ci.yml:3-7 has no `paths`/`paths-ignore` filters. This repo has heavy docs traffic by design: CLAUDE.md/AGENTS.md, docs/specifications/, docs/prompts/, per-feature *_docs/ folders, and the git-tracked .serena/memories/lessons.md that CLAUDE.md instructs agents to update after corrections. Every such commit currently runs lint, build, unit tests, and the 3-browser Playwright matrix (~15 runner-minutes, ~4m40s wall).

**Recommendation**

Add to both `push` and `pull_request` triggers:
```yaml
paths-ignore:
  - '**.md'
  - 'docs/**'
  - '.serena/**'
```
Caveat: if lint/unit-tests are later made required branch-protection checks, skipped runs leave them unreported — in that case use dorny/paths-filter inside the jobs instead, or add a trivial pass-through job. Keep AGENTS.md/CLAUDE.md out of paths-ignore only if you adopt the check:agents CI step and want it to run on those files (then use paths-filter to run just the Lint job).

**Benefit**

Docs-only pushes and PRs (a routine event given the agent-memory workflow) stop consuming ~15 runner-minutes each and stop queueing ahead of code CI runs.

**Verification** — confirmed

Verified: ci.yml:3-7 has push/pull_request triggers on [master, development] with no paths/paths-ignore filters, and every trigger runs 6 jobs (lint, build, unit-tests, 3-browser Playwright matrix), each with its own npm ci. The heavy-docs-traffic premise checks out: docs/specifications/ and docs/prompts/ exist, multiple src/features/*/*_docs/ folders exist, and .serena/memories/lessons.md is git-tracked with CLAUDE.md instructing agents to update it after corrections. The check:agents script referenced in the caveat exists (package.json:33) and is not currently in CI, so the caveat is accurate. No .md files are imported into the app bundle (verified via grep of src/ and vite.config.ts), so skipping CI on markdown-only changes cannot hide a build break. The fix is a pure workflow-trigger change with no conflict with module federation, npm workspaces, or the Playwright container.

**Verifier corrections (apply these over the recommendation above)**

Recommendation stands as written. One evidence nit: "every such commit currently runs the pipeline" is slightly overstated — push triggers fire only on master/development (ci.yml:5), so docs-only commits on feature branches cost CI only via PRs targeting those branches (or when merged/pushed to development). Also note .serena/** in paths-ignore additionally covers .serena/project.yml and .serena/.gitignore, which is safe since nothing in the build or tests consumes .serena/.

---

### 30. Cache node_modules across the 6 jobs instead of six independent npm ci runs

**Impact:** low · **Effort:** medium · **Area:** CI runner minutes and per-job startup

**Evidence**

All four job definitions run their own `npm ci` (ci.yml:22-23, 40-41, 58-59, 84-85), so with the 3-browser matrix that is 6 installs per run of a ~2.3GB node_modules tree. setup-node's `cache: 'npm'` (ci.yml:20,38,56,82) only caches the ~/.npm tarball store — extraction still happens every job. Measured on the latest run: install took 41s (lint), 34s (build), 42s (unit), 36-46s (each integration job, so the npm cache does restore correctly inside the mcr.microsoft.com/playwright container) — about 3.5-4 runner-minutes per CI run total.

**Recommendation**

Add an actions/cache step for node_modules keyed on `${{ runner.os }}-node24-modules-${{ hashFiles('package-lock.json') }}` and guard install with `if: steps.node-modules-cache.outputs.cache-hit != 'true'`. Keep the key identical in the container jobs (the Playwright noble image matches ubuntu-latest's noble base, and setup-node installs the same Node 24 from .nvmrc, so native modules are compatible — verify once on a scratch branch). Alternatively accept a smaller win: leave as-is, since per-job cost is only ~40s.

**Benefit**

Cuts install from ~40s to ~10-15s (cache restore) per job: ~2.5-3 runner-minutes saved per CI run and ~25-30s off every job's wall time; compounds with every push once concurrency/path filters are in place.

**Verification** — confirmed

Every factual claim verified. ci.yml has exactly the cited structure: `npm ci` in all 4 jobs (lines 22-23, 40-41, 58-59, 84-85) and setup-node `cache: 'npm'` (lines 20, 38, 56, 82), with the 3-browser matrix yielding 6 installs per run. Timings verified against the actual latest run (29274652460): 41s/34s/42s installs on host jobs and 37-46s in the Playwright container jobs, ~4.1 runner-minutes total — matching the claim. The container-compatibility premise holds: mcr.microsoft.com/playwright:v1.61.0-noble (ci.yml:74) is Ubuntu 24.04 like ubuntu-latest, and all jobs including the container run setup-node with node-version-file .nvmrc (node 24), so a shared node_modules cache key is ABI-safe; setup-node's npm cache already restoring in-container proves the cache toolkit works there. Skipping npm ci on cache hit is safe: no postinstall/prepare/preinstall lifecycle scripts in root or workspace package.json, and @playwright/test 1.61.0 has no install-time browser download (browsers come from the container image). One detail is wrong, fixed in the correction: the repo uses npm workspaces (packages/api-types) with a real nested packages/api-types/node_modules (~11MB: tsup, esbuild platform binaries), so caching only root node_modules would leave workspace deps missing on cache hit.

**Verifier corrections (apply these over the recommendation above)**

Recommendation stands, but because this is an npm-workspaces repo the cache path must cover nested workspace installs, not just root node_modules. Use: `- uses: actions/cache@v4` with `id: node-modules-cache`, `path: | node_modules packages/*/node_modules`, `key: ${{ runner.os }}-node24-modules-${{ hashFiles('package-lock.json') }}` (consider hashing .nvmrc into the key instead of the hardcoded 'node24' literal so Node bumps invalidate it automatically), then guard with `if: steps.node-modules-cache.outputs.cache-hit != 'true'` on the `npm ci` step. Keep the identical key in the Playwright container jobs — verified compatible (noble base + Node 24 from .nvmrc in all jobs) — and do the one-time scratch-branch verification as suggested.

---

## Docs & onboarding

### 31. Re-include the 34 skipped .spec.ts unit tests in the Vitest run

**Impact:** high · **Effort:** medium · **Area:** Unit testing / CI test coverage (and docs-vs-reality consistency)

**Evidence**

vitest.config.ts:13 sets `include: ['**/*.test.{ts,tsx}']`, which excludes every `.spec.ts` file. `find src -name '*.spec.ts*'` returns 34 files — including ALL 16 store test suites (src/data/hooks/stores/NetworkStore.spec.ts, VisualStyleStore.spec.ts, WorkspaceStore.spec.ts, etc.) and the entire MergeNetworks suite (src/features/MergeNetworks/tests/*.spec.ts). Every one of the 34 imports from 'vitest' and uses `vi.mock` (verified: `grep -L "from 'vitest'"` over all spec files returns empty), so they were fully migrated in the Jest→Vitest move but are silently never executed. CI runs `npm run test:unit` = `vitest run` (ci.yml:62, package.json:36), and vitest.config.ts takes priority over vite.config.ts, so CI skips them too. Meanwhile CLAUDE.md:212 documents `.spec.ts` as the official convention 'for stores and feature modules'. The narrow include appears intended to keep Vitest away from Playwright's test/playwright/*.spec.ts files (playwright.config.ts:4 testDir './test/playwright', e.g. cookie-consent.spec.ts).

**Recommendation**

Change vitest.config.ts include to `['src/**/*.{test,spec}.{ts,tsx}']` — scoping to src/ restores the 34 migrated spec suites while still excluding Playwright's test/playwright/*.spec.ts files. Then run `npm run test:unit` and fix any suites that rotted while skipped (they were migrated to vi.mock so most should pass). Optionally add a CI assertion or comment explaining why the pattern is src-scoped so it isn't re-narrowed.

**Benefit**

Restores ~25% of the unit-test files (34 of 141) to the CI signal, including every Zustand store test — the layer CLAUDE.md calls out as the core architecture. Prevents regressions in stores/merge logic from landing green.

**Verification** — confirmed

Verified end-to-end by applying the fix and running it. vitest.config.ts (line 14) sets include: ['**/*.test.{ts,tsx}'], which excludes all 34 .spec.ts files under src/ — including all 16 store suites in src/data/hooks/stores/, 7 MergeNetworks suites, and 11 TableDataLoader suites. All 34 import from 'vitest' and use vi.mock (grep -L confirmed empty). CI runs 'npm run test:unit' = 'vitest run' (package.json:36), so they never execute in CI. CLAUDE.md:212 does document .spec.ts as the convention for stores/feature modules. Playwright's testDir is ./test/playwright with 7 *.spec.ts files there (playwright.config.ts:4), so the src-scoping in the recommendation is necessary and sufficient. I temporarily changed include to ['src/**/*.{test,spec}.{ts,tsx}'] and ran Vitest: all 34 spec files pass (364 tests), and the full suite runs 141 files / 2095 tests passed — matching the '34 of 141' claim exactly. No .test.ts* files exist outside src (checked repo-wide including packages/), so nothing is dropped by scoping. Edit reverted after verification.

**Verifier corrections (apply these over the recommendation above)**

Two trivial fixes to the evidence, one to the recommendation: (1) the include line is vitest.config.ts:14, not :13; (2) the 34 files break down as 16 store specs + 7 MergeNetworks + 11 TableDataLoader (the finding omitted TableDataLoader); (3) the 'fix any suites that rotted while skipped' step is unnecessary — verified today that all 34 suites (364 tests) pass unmodified under the proposed include pattern, and the full 141-file run is green in ~18s. The change is a pure one-line config edit: include: ['src/**/*.{test,spec}.{ts,tsx}'].

---

### 32. Fix the enumerated stale line-level claims in CLAUDE.md Sections 4-5 and 7

**Impact:** high · **Effort:** low · **Area:** Agent/contributor instructions accuracy (CLAUDE.md is the source of truth agents follow verbatim)

**Evidence**

Specific stale claims verified today, each contradicted by an actual file: CLAUDE.md:17, :115, :209, :287 reference `jest-setup.ts` (does not exist; actual file is vitest-setup.ts). CLAUDE.md:206-208 say 'Unit Tests (Jest)', 'jsdom with ts-jest'. CLAUDE.md:209 claims setup loads `@testing-library/jest-dom` — that package is not in package.json at all. CLAUDE.md:210 claims 'Timeout: 100 seconds (global)' but vitest-setup.ts:8 sets `vi.setConfig({ testTimeout: 1000 })` = 1 second — a 100x error that will mislead anyone debugging a timeout. CLAUDE.md:214 shows `jest.mock(...)` examples; actual tests use `vi.mock` (NetworkStore.spec.ts:10). CLAUDE.md:193 says `npm test` runs 'lint → unit → Chromium e2e' but package.json:35 is `run-s test:unit test:e2e:chromium lint` — lint runs LAST. CLAUDE.md:172-173 and :235 say exposes are 'defined in webpack.config.js' — actual source of truth is src/app-api/federation/federationExposes.ts, consumed by vite.config.ts:14-18,72. CLAUDE.md:152 and :238 credit Terser — actual is Oxc minifier `dropConsole` (vite.config.ts:123-129). CLAUDE.md:187 says 'Webpack bundle analyzer' — actual is rollup-plugin-visualizer (vite.config.ts:86-95). CLAUDE.md:233 'Webpack 5' and :251 'Webpack DefinePlugin' — actual is Vite `define` (vite.config.ts:135-142).

**Recommendation**

Do a single line-by-line correction pass on CLAUDE.md using the replacements above (vitest-setup.ts, vi.mock, 1s timeout, unit→e2e→lint order, federationExposes.ts, Oxc dropConsole, rollup-plugin-visualizer, Vite define), delete the jest-dom claim, then run `npm run sync:agents` to regenerate AGENTS.md. The 1s-timeout and npm-test-order lines are the highest-value fixes because they change agent behavior (agents write slow tests expecting 100s, and expect lint feedback first when it actually arrives after minutes of tests).

**Benefit**

Agents and new contributors stop editing/looking for nonexistent files (webpack.config.js, jest-setup.ts) and stop writing jest.mock-style tests that fail; timeout debugging goes from misleading to correct.

**Verification** — confirmed

Every enumerated claim verified against actual files. jest-setup.ts is cited at CLAUDE.md:17/:115/:209/:287 but does not exist (vitest-setup.ts does). CLAUDE.md:206-208 say Jest/ts-jest; :209's @testing-library/jest-dom is absent from package.json and not loaded by vitest-setup.ts; :210's '100 seconds' contradicts vitest-setup.ts:8 (vi.setConfig({ testTimeout: 1000 }) = 1s); :214's jest.mock contradicts vi.mock in NetworkStore.spec.ts:10; :193's 'lint → unit → e2e' contradicts package.json:35 ("run-s test:unit test:e2e:chromium lint" — lint last); :172-173/:235 point to nonexistent webpack.config.js while exposes live in src/app-api/federation/federationExposes.ts (imported vite.config.ts:13-18, used :72); :152/:238 credit Terser vs actual Oxc dropConsole (vite.config.ts:123-129); :187 says Webpack bundle analyzer vs rollup-plugin-visualizer (vite.config.ts:86-95); :233/:251 say Webpack 5/DefinePlugin vs Vite define (vite.config.ts:135-142). The recommendation works: sync:agents exists (package.json:32) and AGENTS.md is declared auto-generated from CLAUDE.md. While generic docs staleness is a known finding, this list is the concrete line-level fix set, and the two behavior-changing items (1s timeout, npm-test order) are accurate and high-value.

**Verifier corrections (apply these over the recommendation above)**

Recommendation stands as written, with two trivial refinements: the federation-exposes import in vite.config.ts spans lines 13-18 (not 14-18), and the correction pass must also update CLAUDE.md:17 and :115 (both reference jest-setup.ts; they are in the evidence list but omitted from the recommendation's replacement enumeration). The timeout fix should state that vitest-setup.ts:8 explicitly sets testTimeout to 1000 ms, so slow tests must opt into longer timeouts per-test.

---

### 33. Enforce AGENTS.md sync by adding check:agents to the CI lint job

**Impact:** medium · **Effort:** low · **Area:** Docs automation / CI

**Evidence**

package.json:33-34 define `check:agents` = `run-s sync:agents gitdiff:agents` (regenerates AGENTS.md then `git diff --exit-code -- AGENTS.md`), and CLAUDE.md:3-4 declare AGENTS.md is auto-generated. But .github/workflows/ci.yml (jobs lint/build/unit-tests/integration-tests, lines 10-104) never runs it — nothing prevents CLAUDE.md and AGENTS.md drifting after an edit that forgets `npm run sync:agents`. (Verified they are currently byte-identical to the generator output of scripts/generate-agents-from-claude.js, so adding the gate now is zero-friction.) There are also no git hooks (no husky/lint-staged) to catch it locally.

**Recommendation**

Add one step to the existing lint job in .github/workflows/ci.yml after `npm ci`: `- name: Check AGENTS.md is in sync\n  run: npm run check:agents`. Note the step needs `git diff` so no extra setup is required in that job (checkout is already done).

**Benefit**

Guarantees the two agent-instruction files never drift; one-line CI change, zero maintenance. Every stale-docs fix from the other findings stays propagated automatically.

**Verification** — confirmed

All evidence checks out against the actual files. package.json:33-34 define `check:agents` (`run-s sync:agents gitdiff:agents`) and `gitdiff:agents` (`git diff --exit-code -- AGENTS.md`), with `sync:agents` on line 32 invoking scripts/generate-agents-from-claude.js. CLAUDE.md:3-4 state AGENTS.md is auto-generated via `npm run sync:agents`. .github/workflows/ci.yml (jobs lint/build/unit-tests/integration-tests, lines 10-104) never runs check:agents or references AGENTS.md, so nothing gates drift. Verified by replicating the generator in-memory that AGENTS.md is currently byte-identical to generator output, so the gate passes immediately. Confirmed no husky/lint-staged/prepare script or active .git/hooks exist to catch it locally. The recommended one-step addition to the lint job works: that job runs on ubuntu-latest (not the Playwright container), actions/checkout@v4 provides a git repo with HEAD (shallow clone is sufficient for `git diff --exit-code` of the regenerated working-tree file), git is preinstalled on the runner, and run-s is installed by the job's existing `npm ci` (the lint job already uses run-s via `npm run lint`). No conflicts with npm workspaces or module federation.

---

### 34. Correct stale build/test claims in README.md's Developer's Guide

**Impact:** medium · **Effort:** low · **Area:** First-time contributor onboarding (README is the only public quickstart)

**Evidence**

README.md:86 says '`test:unit`: run Jest unit tests' — actual is Vitest (package.json:36 `vitest run`). README.md:82 says the app 'points to NDEx dev server (https://dev.ndexbio.org)' — actual default is dev1.ndexbio.org (src/assets/config.json:2 `"ndexBaseUrl": "dev1.ndexbio.org"`), so contributors create their test account on the wrong server. README.md:84 describes `lint` as 'lint code according to the eslint config' but package.json:53 runs `run-s lint:tsc lint:eslint` (a full tsc typecheck runs first — surprising when 'lint' fails on type errors). README.md:85 says `format` formats 'according to eslint and prettier configs' — package.json:57 is prettier-only. README.md:133 instructs `export NODE_ENV=production` before `npm run build` — unnecessary (`vite build` defaults to production mode, vite.config.ts:122-129 keys off `mode`) and non-portable, directly contradicting README.md:118-120 which promises no Windows-specific setup. README.md:127 has a malformed URL (`https:development--...`, missing `//`). README.md:41 still says 'Developer's Guide (TBA)' and README.md:60 says '! The following section is not finished yet.' README also never mentions `npm test` (the composite gate) or `npm run check:agents`. The Quick Start itself (README.md:49-56, nvm section 62-76, Playwright section 89-116) is accurate and sufficient to get `npm run dev` running on port 5500 (vite.config.ts:105).

**Recommendation**

Fix the six factual errors (Vitest, dev1.ndexbio.org, lint=tsc+eslint, format=prettier-only, drop the NODE_ENV export in favor of plain `npm run build`, fix the Netlify URL), delete the '(TBA)'/'not finished yet' placeholders, and add two lines documenting `npm test` (unit → chromium e2e → lint) and `npm run check:agents` so the README command list matches package.json:30-57.

**Benefit**

A first-time contributor can trust every command in the README; removes the wrong-NDEx-server account dead-end and the Windows-breaking production-build instruction.

**Verification** — confirmed

All six factual errors verified against the actual files: README.md:86 claims Jest but package.json:36 runs `vitest run`; README.md:82 names https://dev.ndexbio.org while src/assets/config.json:2 defaults to dev1.ndexbio.org (Keycloak too, config.json:5) — a real wrong-server account trap; README.md:84 omits that `lint` runs `tsc --noEmit` first (package.json:53,55); README.md:85 wrongly says `format` uses eslint (package.json:57 is prettier-only); README.md:133's `export NODE_ENV=production` is unnecessary (vite build defaults to production mode; vite.config.ts:122,126-129 key off `mode`) and bash-only, contradicting the Windows portability promise at README.md:118-120; README.md:127's Netlify URL is malformed (`https:development--...`). Placeholders "(TBA)" (line 42) and "not finished yet" (line 60) exist, and the README indeed never documents `npm test` (package.json:35, order unit → chromium e2e → lint matches the finding) or `check:agents` (package.json:33). These are NEW README-specific stale claims, distinct from the known CLAUDE.md/AGENTS.md staleness, and the doc-only fix conflicts with nothing in the repo setup.

**Verifier corrections (apply these over the recommendation above)**

Only trivial detail fixes: the "(TBA)" placeholder is at README.md:42 (the "# Developer's Guide" heading is at line 40, not 41), and the Windows section spans README.md:118-120 with the heading at 118. Everything else in the evidence and recommendation is accurate as stated.

---

### 35. Purge webpack.config.js and jest references from STORE_CREATION_PATTERN.md and src/app-api/CLAUDE.md

**Impact:** medium · **Effort:** low · **Area:** Specification docs that agents are directed to read before store/API work

**Evidence**

docs/specifications/STORE_CREATION_PATTERN.md:11 and :278 reference `jest-setup.ts` (actual: vitest-setup.ts) and :255 instructs 'add it to `webpack.config.js` exposes' (webpack.config.js does not exist; exposes live in src/app-api/federation/federationExposes.ts, wired via vite.config.ts:64-79). src/app-api/CLAUDE.md:252-253,:284 show `jest.mock(...)` and :287,:297 `jest.spyOn(...)` test examples (actual code uses vi.mock/vi.fn — NetworkStore.spec.ts:10), and its ':303-305' section is literally titled 'Webpack `exposes` Pattern' telling devs to edit `webpack.config.js` `ModuleFederationPlugin.exposes`. Root CLAUDE.md:99+ (Section 4) mandates reading src/app-api/CLAUDE.md before touching app-api files, and Section 6 mandates STORE_CREATION_PATTERN.md before store work — so these are high-traffic instructions, not dead docs.

**Recommendation**

In STORE_CREATION_PATTERN.md: replace jest-setup.ts → vitest-setup.ts (lines 11, 278) and rewrite line 255's step to 'add the entry to FEDERATION_EXPOSES in src/app-api/federation/federationExposes.ts'. In src/app-api/CLAUDE.md: retitle 'Webpack exposes Pattern' → 'Module Federation exposes (federationExposes.ts)' with the real file path, and convert the jest.mock/jest.spyOn snippets to vi.mock/vi.spyOn matching the live spec files. Grep `grep -rn 'webpack\|jest' docs/ src/app-api/CLAUDE.md` afterward to confirm zero remaining hits.

**Benefit**

The two most-read pattern docs stop sending devs and agents to edit a nonexistent webpack.config.js and stop teaching a test-mocking API that does not exist in the codebase; new-store and new-API-endpoint tasks succeed on the first try.

**Verification** — confirmed

Every cited line verified byte-for-byte: STORE_CREATION_PATTERN.md:11/:278 reference nonexistent jest-setup.ts and :255 directs devs to a nonexistent webpack.config.js; src/app-api/CLAUDE.md:252-253/:284 use jest.mock, :287/:297 use jest.spyOn, and :303-305 is a 'Webpack exposes Pattern' section pointing at webpack.config.js ModuleFederationPlugin.exposes. Actual setup confirmed: vitest-setup.ts exists, specs use vi.mock (NetworkStore.spec.ts:10,:35), and FEDERATION_EXPOSES lives in src/app-api/federation/federationExposes.ts:12, spread into the federation plugin in vite.config.ts (~lines 64-79). Root CLAUDE.md Sections 4 and 6 do mandate reading both docs, so these are high-traffic instructions. The proposed fixes are correct and conflict-free; only the final verification grep is wrong in scope.

**Verifier corrections (apply these over the recommendation above)**

The fixes are correct as stated (jest-setup.ts → vitest-setup.ts at STORE_CREATION_PATTERN.md:11/:278; rewrite :255 to point at FEDERATION_EXPOSES in src/app-api/federation/federationExposes.ts; retitle src/app-api/CLAUDE.md:303 section and convert jest.mock/jest.spyOn → vi.mock/vi.spyOn). However, the verification step must be scoped: `grep -rn 'webpack\|jest' docs/` will never reach zero hits because ~17 files under docs/design/module-federation/ (migration audit, ADRs, vite-migration spec, phase checklists) legitimately mention webpack/jest as history. Use `grep -rn -i 'webpack\|jest' docs/specifications/STORE_CREATION_PATTERN.md src/app-api/CLAUDE.md` instead and confirm zero hits in those two files only. (Note: use -i, since the headings use capitalized 'Webpack'.)

---

## Automation

### 36. Run verify:federation in the CI build job

**Impact:** high · **Effort:** low · **Area:** CI correctness gating for the Module Federation public API

**Evidence**

package.json:42 defines "verify:federation" (ts-node scripts/verify-federation-build.ts). The script's own header at scripts/verify-federation-build.ts:12 says 'Exits non-zero on any miss so CI gates on it' — it verifies remoteEntry.js, every FEDERATION_EXPOSES key, and shared singletons in dist/. But .github/workflows/ci.yml build job (lines 28-44) runs only 'npm run build' and stops; no job anywhere runs verify:federation. The federation surface is the sole public API for external apps (src/app-api/), so a Vite/MF config regression ships silently.

**Recommendation**

In .github/workflows/ci.yml, add one step to the build job after 'Run build' (line 44): '- name: Verify federation surface' / 'run: npm run verify:federation'. The dist/ it inspects is already present in that job's workspace, so no artifact passing is needed.

**Benefit**

The build job goes from 'it compiled' to 'the public plugin contract is intact'. Catches breakage of every exposed module (ElementApi, NetworkApi, EventBus, stores, task hooks) at PR time instead of when an external app fails at runtime — the exact failure class this script was written to gate.

**Verification** — confirmed

Every evidence claim checks out against the actual files: package.json:42 defines verify:federation (ts-node scripts/verify-federation-build.ts); the script header at scripts/verify-federation-build.ts:12 says 'Exits non-zero on any miss so CI gates on it' and it exits 1 on failure (line 105); it verifies remoteEntry.js, all FEDERATION_EXPOSES keys, and shared singletons against repo-root dist/. The CI build job (.github/workflows/ci.yml:28-44) runs only 'npm run build' and no job in the sole workflow (ci.yml is the only file in .github/workflows/) runs verify:federation — confirmed via repo-wide grep, so the gap is not already implemented. The recommendation works in this repo's setup: 'npm run build' (vite build + copy:dist, package.json:43-46) emits to the exact dist/ path the script inspects within the same job workspace; ts-node is a devDependency (package.json:110) installed by that job's npm ci; and I executed 'npm run verify:federation' against a real Vite build locally — all 36 checks passed (exit 0), proving the script is compatible with the @module-federation/vite output (it matches the virtual_mf-exposes chunk naming that plugin produces). No conflict with npm workspaces or the Playwright container (the step is added to the plain ubuntu-latest build job).

---

### 37. Add .github/dependabot.yml for npm and github-actions ecosystems

**Impact:** high · **Effort:** low · **Area:** Dependency freshness and security patching

**Evidence**

.github/ contains only workflows/ci.yml (verified via find — no dependabot.yml, no renovate.json). Staleness is measurable: package.json:60 "@faker-js/faker": "^7.6.0" (v9+ current), package.json:173 "openai": "^4.18.0" in runtime dependencies, dexie ^3.2.4, zustand ^4.4.7, uuid ^9.0.0. ci.yml uses actions/checkout@v4 and actions/setup-node@v4 (lines 15-20) with no automation to bump them. @playwright/test is pinned exactly to 1.61.0 (package.json) and must be manually kept in sync with the container image mcr.microsoft.com/playwright:v1.61.0-noble at ci.yml:74.

**Recommendation**

Add .github/dependabot.yml with two update blocks: (1) package-ecosystem: npm, schedule monthly, grouped updates (e.g. groups for mui, mantine, tiptap, d3, types) with open-pull-requests-limit ~5 to control noise across the ~150 deps; (2) package-ecosystem: github-actions, monthly. Enable Dependabot security updates in repo settings so CVE fixes arrive as PRs regardless of schedule. If keeping ci.yml's Playwright container image in sync with the npm pin matters, use Renovate instead — its regex manager can bump both together; add a comment at ci.yml:74 either way noting the coupling.

**Benefit**

Security patches and dependency updates become PRs that CI (lint + unit + 3-browser e2e) validates automatically, instead of ad-hoc manual bumps ('Bump up cytoscape js version' commits). Prevents the multi-major-version drift already visible, which makes each eventual upgrade far more expensive.

**Verification** — confirmed

All evidence verified: .github/ contains only workflows/ci.yml (no dependabot.yml or renovate.json anywhere). package.json:60 has "@faker-js/faker": "^7.6.0", package.json:173 has "openai": "^4.18.0" inside the dependencies block (starts line 116, so runtime dep), dexie ^3.2.4 (line 160), zustand ^4.4.7 (line 193), uuid ^9.0.0 (line 191). ci.yml uses actions/checkout@v4 (line 15) and actions/setup-node@v4 (line 17) with no bump automation. @playwright/test is pinned exactly to 1.61.0 (package.json:64) and the container image mcr.microsoft.com/playwright:v1.61.0-noble is at exactly ci.yml:74 — the manual coupling is real. Dependabot npm ecosystem supports npm workspaces (operates on root manifest/lockfile) and groups/open-pull-requests-limit are valid config; nothing conflicts with module federation or the Playwright container. The recommendation already flags the Playwright pin/container coupling and proposes Renovate or a comment.

**Verifier corrections (apply these over the recommendation above)**

Recommendation is sound as written; one refinement: since @playwright/test (package.json:64) is exact-pinned to match the container tag at ci.yml:74, a plain-Dependabot setup should add an `ignore` entry for @playwright/test in the npm block (otherwise its bump PRs will fail CI on browser-revision mismatch until the container tag is updated in the same PR), unless Renovate's regex manager is used to bump both together.

---

### 38. Automate GitHub release + changelog on tag push, and add CITATION.cff for Zenodo

**Impact:** medium · **Effort:** medium · **Area:** Release process (version bump → tag → GitHub release → Zenodo DOI)

**Evidence**

No release workflow exists (.github/workflows/ contains only ci.yml) and no CHANGELOG file exists in the repo root (verified by ls). Versioning is manual: commits 'bump up version to 1.0.8-SNAPSHOT' (2026-06-23) and 'remove SNAPSHOT from version. Prepare for the release.' (2026-07-01). The manual GitHub-release step demonstrably gets dropped: git tag v1.0.8 was created 2026-07-09 but 'gh release list' shows the latest GitHub release is still v1.0.7; the v1.0.6 release (tag 2026-03-11) was only published 2026-06-18 — 3 months late. CLAUDE.md:295 documents the flow as development → master → GitHub release → Zenodo DOI, so a missing GitHub release also means no DOI. No .zenodo.json or CITATION.cff exists to control DOI metadata. Cadence is ~9 releases in 17 months (tags v1.0.0 2025-01-30 … v1.0.8 2026-07-09).

**Recommendation**

Add .github/workflows/release.yml triggered on 'push: tags: [v*]' that: (1) checks package.json version matches the tag (fails fast on drift), (2) runs npm ci + npm run build + npm run verify:federation, (3) creates the GitHub release with generated notes (softprops/action-gh-release with generate_release_notes: true, or use GitHub's release-notes config in .github/release.yml). Add CITATION.cff (title, authors from The Cytoscape Consortium, repo URL) so the Zenodo webhook mints DOIs with correct metadata. Optionally adopt release-please later to automate the SNAPSHOT/version-bump commits themselves.

**Benefit**

Tagging becomes the whole release ceremony: the GitHub release (and hence the Zenodo DOI, which currently lags by up to 3 months or is missing entirely for v1.0.8) is published within minutes of the tag, with auto-generated notes replacing the nonexistent changelog. Removes ~30-60 min of manual work and the observed forget-to-release failure mode, ~6 times a year.

**Verification** — confirmed

Every evidence claim verified against the repo: .github/workflows/ contains only ci.yml; no CHANGELOG, CITATION.cff, or .zenodo.json exists; version-bump commits 04ef4888 (2026-06-23, '1.0.8-SNAPSHOT') and 60702ca5 (2026-07-01, 'remove SNAPSHOT') exist verbatim; tag v1.0.8 (2026-07-09) has no GitHub release while gh release list shows v1.0.7 as latest; v1.0.6 (tag 2026-03-11) was released 2026-06-18 (~3 months late, and v1.0.7 was also ~5 weeks late — extra corroboration); CLAUDE.md:295 documents the development → master → GitHub release → Zenodo DOI flow; tags run v1.0.0 (2025-01-30) to v1.0.8 (2026-07-09), 9 in ~17 months. README.md:3 shows the Zenodo DOI badge and README.md:155-163 documents the manual 6-step release ceremony, confirming Zenodo depends on the (currently missing) GitHub release. The recommendation is feasible: npm run verify:federation exists (package.json:42) and is not part of npm run build; package.json version at tags matches (e.g. v1.0.8 → "1.0.8"), so the drift check is a safe guard; a tag-triggered release workflow with softprops/action-gh-release conflicts with nothing (Playwright container only applies to the integration-tests CI job), and Zenodo's webhook fires on releases created by actions and honors CITATION.cff metadata.

---

### 39. Add a format:check script and run it in the CI lint job

**Impact:** medium · **Effort:** low · **Area:** Code formatting enforcement

**Evidence**

package.json:57 defines only a write-mode script: "format": "prettier --write ..." — there is no check variant. CI's lint job (ci.yml:26) runs 'npm run lint' = run-s lint:tsc lint:eslint (package.json), and eslint.config.js:7 requires eslint-config-prettier, applied at line 62 with the comment 'Apply Prettier config (disables conflicting rules)' — i.e. it only turns OFF formatting rules; nothing checks formatting. eslint-plugin-prettier is installed (package.json:96) but never referenced in eslint.config.js. No husky/lint-staged/pre-commit hooks exist (verified). CLAUDE.md §3 claims formatting is 'enforced by Prettier', which is currently false.

**Recommendation**

Add "format:check": "prettier --check \"src/**/*.{js,jsx,ts,tsx}\"" to package.json and append it to the lint chain: "lint": "run-s lint:tsc lint:eslint format:check" (no ci.yml change needed since the lint job already runs npm run lint). First run 'npm run format' once and commit, so the check starts green. Prefer prettier --check in the run-s chain over enabling eslint-plugin-prettier, which is slower and pollutes ESLint output.

**Benefit**

Formatting drift can no longer merge, eliminating noisy reformat-diffs in later PRs and making the 'No semicolons / single quotes' style rules in CLAUDE.md actually machine-enforced. Near-zero CI cost (prettier --check on src/ takes seconds).

**Verification** — confirmed

Every evidence line checks out: package.json:57 has only a write-mode "format" script and no check variant; "lint" (package.json:53) = run-s lint:tsc lint:eslint; ci.yml:26 runs npm run lint and no CI step invokes prettier; eslint.config.js:7 requires eslint-config-prettier and applies it at line 62 with the exact quoted comment (it only disables conflicting rules, enforces nothing); eslint-plugin-prettier (package.json:96) is installed but never referenced in eslint.config.js; no husky/lint-staged hooks exist; CLAUDE.md §3 claims Prettier enforcement. Empirically confirmed the gap: `npx prettier --check "src/**/*.{js,jsx,ts,tsx}"` fails on 303 files today, and the check runs in seconds. The recommendation is compatible with this repo (run-s already used, .prettierrc.json at root, lint job needs no ci.yml change; no module-federation/workspaces/Playwright-container conflict).

**Verifier corrections (apply these over the recommendation above)**

Recommendation stands as written; one practical note: the prerequisite `npm run format` will reformat ~303 files, so land it as an isolated formatting-only commit (ideally on/coordinated with the default `development` branch before merging wincompat) to avoid large merge conflicts across open branches.

---

### 40. Gate AGENTS.md sync in CI using the existing check:agents script

**Impact:** medium · **Effort:** low · **Area:** Documentation/agent-context drift prevention

**Evidence**

package.json:32-34 already define the full check: "sync:agents" (node scripts/generate-agents-from-claude.js), "gitdiff:agents" (git diff --exit-code -- AGENTS.md), and "check:agents" (run-s of both). But no CI job runs it — ci.yml jobs run only npm run lint, build, test:unit, test:e2e (lines 26, 44, 62, 88). Drift is a demonstrated problem in this repo: CLAUDE.md/AGENTS.md still describe Webpack 5 + Jest (webpack.config.js, jest-setup.ts) while the repo actually uses vite.config.ts + vitest.config.ts.

**Recommendation**

Add one step to the lint job in ci.yml after 'Run lint': '- name: Check AGENTS.md is in sync' / 'run: npm run check:agents'. This fails the PR whenever someone edits CLAUDE.md without regenerating AGENTS.md (or edits AGENTS.md directly, which the generated-file banner forbids).

**Benefit**

The CLAUDE.md → AGENTS.md contract stated at the top of CLAUDE.md ('AGENTS.md is auto-generated... via npm run sync:agents') becomes enforced instead of honor-system. Every AI agent session in this repo consumes these files, so drift directly causes wrong agent behavior; the check costs ~1 second of CI.

**Verification** — confirmed

Verified: package.json:32-34 define sync:agents / check:agents / gitdiff:agents exactly as claimed, and .github/workflows/ci.yml runs only lint (line 26), build (44), test:unit (62), and test:e2e (88) — check:agents is run by no CI job. The recommendation works in this repo: the generator (scripts/generate-agents-from-claude.js) is a dependency-free offline Node script, the lint job already does npm ci on plain ubuntu-latest (not the Playwright container), run-s is already used by the lint script, and `git diff --exit-code -- AGENTS.md` needs no git history so shallow checkout is fine. I also ran `npm run check:agents` on the current tree: it exits 0 with a clean tree, so adding the gate would not immediately break CI. AGENTS.md carries the 'Do not edit directly' banner as claimed.

**Verifier corrections (apply these over the recommendation above)**

One evidence detail overreaches: the cited Webpack/Jest staleness is CLAUDE.md-vs-codebase drift that exists identically in both files (they are currently in sync), so check:agents would NOT have caught it — the check only enforces CLAUDE.md↔AGENTS.md sync, not doc accuracy. Corrected framing: 'The check:agents script exists (package.json:33) but is unenforced; add a step to the lint job in ci.yml after Run lint: `- name: Check AGENTS.md is in sync` / `run: npm run check:agents`. This enforces the generated-file contract (fails PRs that edit CLAUDE.md without regenerating AGENTS.md, or that hand-edit AGENTS.md), though it does not detect docs going stale relative to the code.' Also minor: package.json line order is sync:agents (32), check:agents (33), gitdiff:agents (34).

---

### 41. Add concurrency cancel-in-progress to ci.yml

**Impact:** medium · **Effort:** low · **Area:** CI runner utilization and feedback latency

**Evidence**

ci.yml has no 'concurrency' key anywhere (verified by grep). Each trigger spawns 6 jobs — lint, build, unit-tests, and a 3-browser integration matrix (ci.yml:69-72), each with timeout-minutes: 15 and its own npm ci. On pull_request, pushing a fixup commit leaves the previous run executing to completion; repo history shows multi-round PR review-fix cycles (e.g. PRs #505/#509/#510 addressing review comments in batches), so superseded runs are common.

**Recommendation**

Add at the top level of ci.yml:

concurrency:
  group: ci-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref != 'refs/heads/master' && github.ref != 'refs/heads/development' }}

This cancels superseded PR runs while letting protected-branch pushes always run to completion.

**Benefit**

Reclaims up to ~90 runner-minutes (6 jobs x 15 min) per superseded run and unclogs the shared runner queue, so the run that matters (latest commit) starts sooner. Four lines of YAML.

**Verification** — confirmed

Verified: .github/workflows/ci.yml has no 'concurrency' key (grep across .github/ returns nothing). Triggers are push/pull_request on [master, development] (ci.yml:3-7), and each trigger spawns exactly 6 jobs — lint, build, unit-tests, and a 3-browser integration matrix (ci.yml:69-72) — each with timeout-minutes: 15 (ci.yml:13,31,49,68) and its own npm ci (ci.yml:23,41,59,85). The multi-round review-fix history claim is real: git log shows PRs #509 (091497c3) and #510 (9e9e9477) merging batched fixes for PR #505 review comments. The recommended YAML is valid GitHub Actions syntax (expressions are supported in cancel-in-progress), correctly cancels superseded PR runs (github.ref is refs/pull/N/merge on PRs, unique per PR and non-matching the protected-branch guards) while letting in-progress master/development pushes complete, and has no conflict with Module Federation, npm workspaces, or the Playwright container job.

**Verifier corrections (apply these over the recommendation above)**

Recommendation works as written. Optional polish only: the 'ci-' prefix is redundant since ${{ github.workflow }} already identifies the workflow, and the guard can be simplified to cancel-in-progress: ${{ github.event_name == 'pull_request' }} because the only non-PR triggers are pushes to master/development. Note one nuance: even with cancel-in-progress false, GitHub still supersedes queued-but-not-started runs in the group on protected branches; in-progress runs always complete.

---

### 42. Add bundle-size regression tracking to the CI build job

**Impact:** medium · **Effort:** medium · **Area:** Performance budget / bundle bloat detection

**Evidence**

No size-limit, bundlesize, or bundlewatch config exists (grep of package.json found none). Bundle pressure is already acute: build:netlify needs NODE_OPTIONS=--max-old-space-size=6144 (package.json:47), and dependencies include three overlapping UI libraries (@mui/material, @mantine/core x6 packages, primereact) plus multiple graph engines (@antv/g6, @cosmograph/cosmos, cytoscape). The only size tooling is rollup-plugin-visualizer behind the manual ANALYZE=true flag (package.json:51 build:analyze) — nothing runs on PRs, so a stray 'import x from lodash'-style regression lands invisibly.

**Recommendation**

Cheapest version: in the existing build job after 'npm run build', add a step that computes gzipped dist size (e.g. 'du -sk dist' plus gzip -k on the main chunks) and fails if it exceeds a committed budget file, updating the budget deliberately. Better: add size-limit with @size-limit/file entries for dist/assets/index-*.js and remoteEntry.js and run 'npx size-limit' in the build job; the size-limit GitHub action can post the PR delta comment. Start with the current size + ~5% as the budget.

**Benefit**

Bundle growth becomes a visible, reviewable number on every PR instead of being discovered when Netlify builds start OOMing or load time degrades. Given the repo has already had to raise the build heap to 6GB, this bounds a cost that is demonstrably trending up.

**Verification** — confirmed

The premise fully checks out: no size-limit/bundlesize/bundlewatch config exists anywhere (package.json, .github/, packages/*, no dotfiles); the only size tooling is rollup-plugin-visualizer gated behind ANALYZE=true (package.json:51, vite.config.ts:86-96) and nothing size-related runs in CI (.github/workflows/ci.yml:28-44 build job just runs `npm run build`). Cited evidence is accurate: build:netlify raises the heap to 6144MB at exactly package.json:47; the three UI libraries (@mui/material:130, six @mantine packages:123-128, primereact:176) and three graph engines (@antv/g6:117, @cosmograph/cosmos:118, cytoscape:149) are all present. The recommendation is workable in this setup (build job runs on plain ubuntu-latest, not the Playwright container; adding a post-build step conflicts with nothing). However, the specific size-limit file entries are wrong for this repo's output shape: in an actual build, dist/assets/index-*.js is 2.4KB and dist/remoteEntry.js is 135 bytes — @module-federation/vite emits both as tiny loader stubs, while the real weight sits in ~123 hashed chunks (LayoutStore-*.js 1.6MB, registerCyImageExportExtensions-*.js 1.4MB) whose names shift between builds since manual chunking is disabled (vite.config.ts:130-133). Budgeting only those two files would miss virtually all regressions, so the correction below fixes the entry selection.

**Verifier corrections (apply these over the recommendation above)**

Add bundle-size regression tracking to the existing CI build job, but budget the aggregate output rather than individual entry files. With @module-federation/vite, dist/remoteEntry.js (135 bytes) and dist/assets/index-*.js (~2.4KB) are tiny loader stubs; the real weight is spread across ~123 hashed chunks whose names change between builds (manual chunking is disabled per vite.config.ts:130-133). Cheapest version: after 'npm run build' in ci.yml's build job, compute total gzipped size of dist/assets/*.js and fail if it exceeds a committed budget file (current dist is ~8.5MB raw; set budget at current gzipped total + ~5%). Better: use size-limit with a single @size-limit/file glob entry covering "dist/assets/*.js" (plus optionally "dist/*.js"), run 'npx size-limit' in the build job, and use the size-limit GitHub action for PR delta comments. Note: adding size-limit requires a package.json change, which per CLAUDE.md needs explicit user permission first.

---

### 43. Add PR/issue templates and CODEOWNERS under .github/

**Impact:** low · **Effort:** low · **Area:** PR review routing and contribution hygiene

**Evidence**

find .github -type f returns exactly one file: .github/workflows/ci.yml — no PULL_REQUEST_TEMPLATE.md, no ISSUE_TEMPLATE/, no CODEOWNERS. The repo has multiple active contributors and automation actors (git log shows jingjingbic, copilot/* branches, Claude co-authored commits; 68 remote branches) and sensitive areas with their own contracts (src/app-api/CLAUDE.md says 'Read ... before modifying any file in this directory'; src/data/db/migrations.ts for schema changes).

**Recommendation**

Add .github/PULL_REQUEST_TEMPLATE.md with a short checklist mirroring the repo's real gates: ran npm test, updated CLAUDE.md + npm run sync:agents if agent context changed, added DB migration if schema changed, noted Netlify preview URL (<branch>--incredible-meringue-aa83b1.netlify.app). Add .github/CODEOWNERS mapping src/app-api/ and src/data/db/ to their maintainers so those PRs auto-request the right reviewer. Optionally add ISSUE_TEMPLATE/bug_report.yml asking for browser + a way to reproduce (NDEx network ID / CX2 fixture).

**Benefit**

Review requests route themselves to the owner of contract-bearing directories, and the checklist automates reminders (agents-sync, migrations) that are currently only enforced by memory or post-hoc review comments. Small but permanent reduction in review round-trips.

**Verification** — confirmed

Gap confirmed: .github/ contains exactly one file (workflows/ci.yml); git ls-files has no CODEOWNERS, PR template, issue templates, or CONTRIBUTING anywhere in the repo. The multi-contributor/automation premise checks out (7 authors in last 200 commits incl. copilot-swe-agent[bot] and a jingjing* email; 30 Claude co-authored commits; 68 remote branches, 3 copilot/*). Contract-bearing areas exist as claimed (src/data/db/migrations.ts; the 'read before modifying' contract for src/app-api/). Checklist items map to real scripts: package.json:32 sync:agents, package.json:35 npm test, and the Netlify branch-preview pattern is documented in CLAUDE.md. The recommendation is purely GitHub-side config with no conflict with Vite/module federation/npm workspaces/Playwright container.

**Verifier corrections (apply these over the recommendation above)**

Minor evidence fix: the sentence 'Read src/app-api/CLAUDE.md before modifying any file in this directory' is in the root CLAUDE.md (line 162), not in src/app-api/CLAUDE.md itself (which says the equivalent: 'Read this before implementing any app API hook, core function, or event bus code'). Recommendation stands as written; note that CODEOWNERS auto-review-request requires listed owners to be GitHub users/teams with write access to the repo.

---

## Editor & environment ergonomics

### 44. Commit .vscode/extensions.json, settings.json, and launch.json (format-on-save, fix-on-save, dev-server debugging)

**Impact:** high · **Effort:** low · **Area:** Editor setup / daily edit-save-lint loop

**Evidence**

No .vscode/ directory exists in the repo root (verified via ls -la). The intent is already half-there: .gitignore:24-25 reads `.vscode/*` then `!.vscode/extensions.json` — the whitelist was added but the file never created. Formatting drift from missing format-on-save is observable today: `npx prettier --check playwright.config.ts vitest.config.ts vite.config.ts` fails on all 3 (playwright.config.ts uses tabs+semicolons against .prettierrc.json's `"semi": false, "tabWidth": 2`). eslint.config.js:57-58 sets simple-import-sort to only 'warn' (and eslint-plugin-prettier is installed in package.json:96 but never wired into eslint.config.js), so nothing except the editor enforces format/import order. vite.config.ts:104-106 pins `port: 5500, strictPort: true`, giving a stable URL for a browser-debug launch config.

**Recommendation**

Create .vscode/extensions.json recommending: dbaeumer.vscode-eslint, esbenp.prettier-vscode, ms-playwright.playwright, vitest.explorer. Create .vscode/settings.json with `"editor.defaultFormatter": "esbenp.prettier-vscode"`, `"editor.formatOnSave": true`, `"editor.codeActionsOnSave": {"source.fixAll.eslint": "explicit"}` (auto-fixes the warn-level simple-import-sort on save), and `"typescript.tsdk": "node_modules/typescript/lib"`. Create .vscode/launch.json with a Chrome launch config against http://localhost:5500 and a Vitest attach config (`"autoAttachChildProcesses": true` running `vitest --inspect-brk --no-file-parallelism`). Add `!.vscode/settings.json` and `!.vscode/launch.json` below .gitignore:25.

**Benefit**

Every contributor gets identical formatting/import-sorting on save instead of relying on remembering `npm run format` (which only covers src/**, per package.json:57); eliminates prettier-diff review noise like the 3 already-drifted root configs; breakpoint debugging of the app and unit tests becomes one keypress instead of manual devtools/CLI setup.

**Verification** — confirmed

Verified against actual files: no .vscode/ directory exists; .gitignore:24-25 reads exactly `.vscode/*` then `!.vscode/extensions.json` (whitelist without the file); `npx prettier --check playwright.config.ts vitest.config.ts vite.config.ts` fails on all 3, and playwright.config.ts genuinely uses tab indentation + semicolons against .prettierrc.json (`"semi": false, "tabWidth": 2`); eslint.config.js:57-58 sets simple-import-sort/imports and /exports to 'warn'; eslint-plugin-prettier is at package.json:96 but eslint.config.js only requires eslint-config-prettier (line 7), never the plugin; the format script (package.json:57) covers only src/**. The recommendation is workable in this repo: extension IDs are correct, typescript ^5.5.4 is a devDependency (typescript.tsdk valid), port 5500 + strictPort gives a stable debug URL, the `.vscode/*` glob permits per-file negations, and the Vitest --inspect-brk --no-file-parallelism attach pattern is valid for Vitest 4. Editor-only files cannot conflict with module federation, npm workspaces, or the Playwright container. One minor citation error: the dev-server port pin is at vite.config.ts:109-111, not 104-106.

**Verifier corrections (apply these over the recommendation above)**

Same recommendation, with corrected citation: `port: 5500, strictPort: true` is at vite.config.ts:109-111 (server block starts at line 109), not 104-106. All other evidence lines (.gitignore:24-25, eslint.config.js:57-58, package.json:57 and :96) are exact.

---

### 45. Fix stale jest-setup.ts include in tsconfig.eslint.json so root config files lint cleanly in-editor

**Impact:** medium · **Effort:** low · **Area:** In-editor linting (ESLint extension) and typed-lint correctness

**Evidence**

tsconfig.eslint.json:3 — `"include": ["src/**/*", "jest-setup.ts", "packages/**/*"]`. jest-setup.ts no longer exists (Vitest migration replaced it with vitest-setup.ts), and none of the root TS configs are included. Since eslint.config.js:23 sets `project: './tsconfig.eslint.json'` for all `**/*.{ts,tsx}` files, the ESLint extension errors on every root config file. Verified: `npx eslint vitest-setup.ts vitest.config.ts playwright.config.ts vite.config.ts` → 4x `Parsing error: "parserOptions.project" has been provided... The file was not found in any of the provided project(s)`. In VS Code this renders as a permanent red error banner whenever those files are open.

**Recommendation**

In tsconfig.eslint.json replace "jest-setup.ts" with "vitest-setup.ts" and add "vite.config.ts", "vitest.config.ts", "playwright.config.ts", "eslint.config.js". Alternatively (cleaner, typescript-eslint v8 is already in use per package.json:85-86): swap `project: './tsconfig.eslint.json'` for `projectService: { allowDefaultProject: ['*.ts', '*.js', '*.mjs'] }` in eslint.config.js:23 so root files never fall out of sync again.

**Benefit**

Removes false-positive parse errors that appear every time someone edits the Vite/Vitest/Playwright configs (files touched constantly during the current build-tooling work), and restores real lint coverage for those files.

**Verification** — confirmed

Verified in the repo: tsconfig.eslint.json:3 includes the nonexistent jest-setup.ts (Vitest migration left vitest-setup.ts, vite.config.ts, vitest.config.ts, playwright.config.ts at root, none included), eslint.config.js:23 sets project: './tsconfig.eslint.json', and running `npx eslint vitest-setup.ts vitest.config.ts playwright.config.ts vite.config.ts` reproduces exactly the 4 claimed 'file was not found in any of the provided project(s)' parsing errors. The gap is not fixed elsewhere — the CLI lint script (package.json:54) only lints src/, so this bites in-editor and on direct invocations. Both proposed fixes work here: typescript-eslint ^8.46.3 (package.json:85-86) supports projectService.allowDefaultProject, and tsconfig.json has allowJs: true so including eslint.config.js in the tsconfig is valid. No conflicts with module federation, npm workspaces, or the Playwright container (tsconfig.eslint.json is ESLint-only; lint:tsc uses tsconfig.json).

**Verifier corrections (apply these over the recommendation above)**

One evidence detail is slightly off in a way that strengthens the finding: the ESLint config block applies to `**/*.{js,jsx,ts,tsx}` (eslint.config.js:15), not `**/*.{ts,tsx}`, so eslint.config.js itself also fails to parse with the same error — the recommendation's inclusion of eslint.config.js (or '*.js' in allowDefaultProject) is therefore necessary, not optional. Otherwise the recommendation stands as written.

---

### 46. Add a @/ path alias to tsconfig and Vite to replace 3-5-level relative imports

**Impact:** medium · **Effort:** low · **Area:** Code navigation, auto-imports, file moves/refactoring

**Evidence**

No aliases exist anywhere: tsconfig.json:17 has `"baseUrl": "."` but no `paths`; vite.config.ts:101-103 `resolve:` block only sets `extensions`, no `alias`. Meanwhile grep counts 1,184 import lines in src/ with 3+ levels of `../` and 257 with 4+ levels, e.g. src/features/Vizmapper/Forms/MappingForm/ContinuousMappingForm/index.tsx:4 `import { useTableStore } from '../../../../../data/hooks/stores/TableStore'` (5 levels). vitest.config.ts:11 merges the resolved vite config via `mergeConfig`, so an alias defined once in vite.config.ts automatically applies to unit tests too.

**Recommendation**

Add `"paths": { "@/*": ["src/*"] }` to tsconfig.json compilerOptions and `alias: { '@': path.resolve(__dirname, 'src') }` to the resolve block at vite.config.ts:101 (path is already imported at vite.config.ts:4; no new dependency needed, avoiding the CLAUDE.md dependency-approval rule). Adopt in new/edited code; optionally run a one-time codemod on the 257 worst (4+ level) imports. Add the convention to CLAUDE.md so agents use it.

**Benefit**

VS Code auto-import generates readable `@/models/...` paths instead of counting `../` five deep; moving a file or feature directory stops breaking hundreds of relative chains (1,184 candidate lines today); imports become greppable by absolute module path.

**Verification** — confirmed

Every substantive claim checks out against the actual files. tsconfig.json:17 has baseUrl "." and no paths key. vite.config.ts's resolve block sets only extensions (no alias), and path is imported at line 4. vitest.config.ts:11 merges the resolved vite config via mergeConfig, so an alias defined once in vite.config.ts flows into unit tests automatically. Grep reproduces the counts almost exactly (1,183 lines with 3+ ../ levels vs claimed 1,184; exactly 257 with 4+), and the cited 5-level example import exists verbatim at src/features/Vizmapper/Forms/MappingForm/ContinuousMappingForm/index.tsx:4. The gap is not already implemented anywhere (the only paths entry in the repo, packages/api-types/tsconfig.json:11, is a package-local mapping, not a src alias). The recommendation works in this setup: lint:tsc is tsc --noEmit with moduleResolution "bundler" (paths type-check fine, no emit-rewriting concern); ESLint uses only simple-import-sort (no resolver to configure) and its type-aware parsing inherits paths via tsconfig.eslint.json extending the root tsconfig; Vite's string-key alias semantics ('@' matches only '@' or '@/...') won't collide with scoped packages like @mui/*; and @module-federation/vite exposes are config-level file paths unaffected by resolve.alias. No new dependency needed. Only defect: the cited line numbers for the resolve block are slightly off.

**Verifier corrections (apply these over the recommendation above)**

The resolve block in vite.config.ts is at lines 106-108, not 101-103 (line 101 falls inside the ANALYZE/rollup-plugin-visualizer block). Also, "no aliases exist anywhere" should be softened to "no aliases exist for the main app" — packages/api-types/tsconfig.json:11 contains a package-local paths mapping ("src/app-api/types"), though it does not implement this gap. Everything else in the finding (tsconfig.json:17, vitest.config.ts:11 mergeConfig inheritance, path imported at vite.config.ts:4, the 257 four-plus-level imports, and the 5-level example at src/features/Vizmapper/Forms/MappingForm/ContinuousMappingForm/index.tsx:4) is accurate as stated; the 3+-level count is 1,183 rather than 1,184.

---

### 47. Add .editorconfig and .gitattributes to pin whitespace and LF line endings across editors and Windows

**Impact:** medium · **Effort:** low · **Area:** Cross-editor / cross-OS consistency (directly serves the wincompat branch)

**Evidence**

Neither file exists (verified via ls -la; no .gitattributes anywhere). The repo is effectively all-LF today: `git ls-files --eol` shows 1,130 files i/lf and exactly 1 CRLF straggler (test/fixtures/tables/autori_mreza_edge (1).csv). .prettierrc.json omits endOfLine so Prettier enforces its LF default — on a Windows checkout with git's common `core.autocrlf=true`, every file arrives CRLF and format-on-save or `npm run format` then rewrites every line, producing whole-file diffs. Commit 186d52cf just fixed the last script-level Windows issues (quoting in `format`/`verify:federation`) and README.md:118-120 now claims "No Windows-specific setup is required", but line-ending normalization is the remaining unaddressed Windows friction. Prettier also can't protect non-VS Code editors (WebStorm/vim/Zed) on files outside the `format` script's src/** glob (package.json:57).

**Recommendation**

Add .gitattributes with `* text=auto eol=lf` plus binary exceptions (`*.png binary`, `*.cx2 -text` etc. for test/fixtures/), then `git add --renormalize .` to fix the one CRLF fixture. Add .editorconfig mirroring .prettierrc.json: `indent_style = space`, `indent_size = 2`, `end_of_line = lf`, `insert_final_newline = true`, `charset = utf-8`, `trim_trailing_whitespace = true`. Optionally set `"endOfLine": "lf"` explicitly in .prettierrc.json for documentation value.

**Benefit**

Windows clones become byte-identical to CI/macOS — no CRLF whole-file diffs, no phantom `git status` churn after formatting; non-VS Code editors get correct indent/newline behavior without Prettier integration. Closes the last practical gap behind the README's 'no Windows-specific setup' claim.

**Verification** — confirmed

Every evidence claim verified: no .editorconfig or .gitattributes exists anywhere in the repo; git ls-files --eol shows exactly 1130 i/lf and 1 i/crlf (test/fixtures/tables/autori_mreza_edge (1).csv); .prettierrc.json omits endOfLine; README.md:120 claims "No Windows-specific setup is required"; commit 186d52cf only fixed script quoting, not line endings; the format script (package.json:57) only covers src/**/*.{js,jsx,ts,tsx}. No local core.autocrlf override exists, so the Windows CRLF-checkout → Prettier whole-file-rewrite failure mode is real. The recommendation is safe: the lone CRLF fixture is referenced by no code or test (git grep autori_mreza is empty), so renormalizing it breaks nothing, and .gitattributes/.editorconfig have no interaction with module federation, npm workspaces, or the Playwright container.

**Verifier corrections (apply these over the recommendation above)**

Recommendation is sound as written; two minor refinements: (1) add a `[*.md] trim_trailing_whitespace = false` section to .editorconfig so Markdown hard line breaks in docs/ and *_docs/ (which the Prettier format script does not cover) are preserved; (2) the `*.cx2 -text` exception is optional — CX2 files are JSON text and already all-LF; git also already auto-detects the 8 existing binaries, so explicit binary attrs are defensive rather than required.

---

### 48. Build packages/api-types automatically on install via a prepare script

**Impact:** low · **Effort:** low · **Area:** npm workspaces / API-types publishing workflow

**Evidence**

packages/api-types/package.json declares `"types": "dist/index.d.ts"` and `"main": "dist/index.d.ts"` but its only scripts are `build` (tsup) and `postbuild`; there is no `prepare`, and the root package.json has no postinstall — dist/ is only produced by manually running `npm run build:api-types` (package.json:52). `git check-ignore packages/api-types/dist` confirms dist is gitignored, so a fresh clone has a workspace package whose declared entry points don't exist. (App code and tests are unaffected — src/app-api/federation/mfDeclarations.test.ts:10 reads `packages/api-types/src/mf-declarations.d.ts` directly — so the breakage surfaces only when packing/linking the package.)

**Recommendation**

Add `"prepare": "npm run build"` to packages/api-types/package.json. npm runs workspace prepare scripts during root `npm install`, so dist/ is always fresh after install; `npm pack`/`npm publish` also run prepare, guaranteeing the published tarball never ships a stale or missing dist. tsup is fast, so install-time cost is a few seconds.

**Benefit**

Removes the 'why are the types missing/stale?' failure mode when developing external apps against a linked or packed @cytoscape-web/api-types, and removes one manual step (`npm run build:api-types`) from the publish checklist.

**Verification** — confirmed

Every evidence claim checks out against the repo: packages/api-types/package.json:5-6 points main/types at dist/index.d.ts while its only scripts are build+postbuild (lines 13-16, no prepare); root package.json:52 is the manual build:api-types script and root has no postinstall/prepare; CI (.github/workflows/ci.yml) never builds api-types; dist is gitignored (git check-ignore exits 0, git ls-files shows no dist tracked), so a fresh clone has broken entry points — even the tracked packages/api-types/index.d.ts dangles, since it references ./dist/mf-declarations.d.ts. The 'app/tests unaffected' caveat is also correct: no src import of @cytoscape-web/api-types exists, and src/app-api/federation/mfDeclarations.test.ts:8-11 reads packages/api-types/src/mf-declarations.d.ts directly. The recommendation is workable here: the repo is an npm workspace (package.json:5-7) on node 24/npm 11, and npm 7+ runs workspace prepare scripts on root npm install and npm ci; tsup is a devDependency of the workspace so it is present, and `npm run build` still fires the postbuild hook that injects the mf-declarations reference. No conflict with module federation, Vite, or the Playwright container. Only minor side effect: all CI jobs run npm ci, so each would now spend a few extra seconds running tsup — acceptable, and it makes dist available in CI as a bonus.

**Verifier corrections (apply these over the recommendation above)**

Recommendation stands as written. Optional refinement: note that prepare will also run in every CI job's npm ci (6 jobs including the 3-browser Playwright matrix), adding a few seconds each; and that a production-only install (npm ci --omit=dev) would fail to run prepare's tsup since it is a devDependency — not an issue today because nothing in the repo does production-only installs.

---

### 49. Fix newly-found stale tooling claims in README and CLAUDE.md (Jest, format scope, import-sort severity)

**Impact:** low · **Effort:** low · **Area:** Onboarding docs accuracy

**Evidence**

Three specific stale claims beyond the already-known webpack/jest doc drift: (1) README.md:86 — "`test:unit`: run Jest unit tests" but package.json:36 runs `vitest run`; (2) README.md:85 — "`format`: format source code according to eslint and prettier configs" but package.json:57 runs prettier only, and only on `src/**` (root configs like playwright.config.ts are unformatted today, per prettier --check); (3) CLAUDE.md section 3 — "Import sorting via eslint-plugin-simple-import-sort (error level — builds will fail)" but eslint.config.js:57-58 sets both simple-import-sort rules to 'warn', and lint isn't part of `npm run build` at all (package.json:46).

**Recommendation**

Update README.md:85-86 to say Vitest and prettier-only; either fix CLAUDE.md's severity claim or (better) actually raise simple-import-sort to 'error' in eslint.config.js to match the documented intent, since fix-on-save/`lint:fix` auto-repairs it. Re-run `npm run sync:agents` afterwards so AGENTS.md stays in sync (package.json:32-34 enforces this via check:agents).

**Benefit**

New contributors and AI agents (which CLAUDE.md explicitly targets) stop acting on wrong facts — e.g. searching for jest config or assuming import order is build-enforced when it silently drifts as warnings.

**Verification** — confirmed

All three stale claims verified verbatim in the cited files: (1) README.md:86 says "run Jest unit tests" while package.json:36 runs `vitest run`; (2) README.md:85 says format uses "eslint and prettier configs" while package.json:57 runs prettier only, scoped to src/** — and `npx prettier --check` confirms playwright.config.ts, vite.config.ts, and vitest.config.ts are unformatted today; (3) CLAUDE.md:146 claims import sorting is "error level — builds will fail" while eslint.config.js:57-58 sets both simple-import-sort rules to 'warn', no --max-warnings flag exists anywhere (so warnings can never fail even the CI lint job), and `npm run build` (package.json:46 = run-s build:bundle copy:dist) contains no lint step. These are new, specific stale claims beyond the known generic webpack/jest drift. The recommendation (fix README, fix CLAUDE.md or raise the rule to 'error', re-run sync:agents) is workable and doesn't conflict with Vite/module-federation/workspaces.

**Verifier corrections (apply these over the recommendation above)**

One overstated detail: package.json:32-34 defines sync:agents/check:agents/gitdiff:agents, but check:agents is NOT wired into CI (.github/workflows/ci.yml never runs it) or any git hook (repo has no husky/lint-staged), so nothing automatically enforces AGENTS.md sync — it is a manual check. The corrected recommendation: update README.md:85-86 (Vitest; prettier-only and src/-scoped — or widen the format glob to include root configs, which prettier --check shows are unformatted), fix CLAUDE.md:146 or raise simple-import-sort/imports+exports to 'error' in eslint.config.js:57-58 (safe since lint:fix auto-repairs), manually run `npm run sync:agents` to regenerate AGENTS.md, and optionally add `npm run check:agents` to the CI lint job if automatic enforcement is desired.

---

### 50. Add a one-command E2E-ready setup script pinned to the CI Playwright version

**Impact:** low · **Effort:** low · **Area:** Onboarding / first-run experience

**Evidence**

Running E2E tests locally requires a manual, easy-to-forget step: README.md:90-103 documents `npx playwright install` and notes "You only need to re-run this when the @playwright/test version changes" — exactly the case people forget, causing 'Executable doesn't exist' failures after dependency bumps. @playwright/test is exact-pinned at 1.61.0 (package.json:64) and CI sidesteps this with the `mcr.microsoft.com/playwright:v1.61.0-noble` container (.github/workflows/ci.yml:73-74), so only local devs hit it. There is no devcontainer and no setup/postinstall script (verified in package.json:30-57).

**Recommendation**

Add to package.json scripts: `"setup": "npm install && playwright install chromium"` (chromium matches what `npm test` needs via test:e2e:chromium; devs running the full matrix can pass more browsers), and reference it as the first Quick Start command in README.md:47-53. Optionally also commit .devcontainer/devcontainer.json using the same mcr.microsoft.com/playwright:v1.61.0-noble image as ci.yml for full CI parity, but the npm script alone covers the common failure.

**Benefit**

Fresh-clone-to-passing-`npm test` becomes one command; eliminates the recurring post-upgrade 'browser binary missing' dead end that currently costs a context-switch to README.md:90 every time @playwright/test is bumped.

**Verification** — confirmed

All evidence verified: README.md:89-103 documents the manual `npx playwright install` step with the exact quoted "re-run when @playwright/test changes" sentence at line 103; @playwright/test is exact-pinned at 1.61.0 (package.json:64); CI sidesteps local installs via the mcr.microsoft.com/playwright:v1.61.0-noble container (.github/workflows/ci.yml:73-75); and there is no setup/postinstall/prepare script (package.json:30-57), no .devcontainer, no Makefile, and no other automation ("playwright install" greps only to README.md). The recommendation is workable: node_modules/.bin is on PATH when npm scripts run, so `playwright` resolves after `npm install` completes; `chromium` matches what `npm test` needs (test:e2e:chromium at package.json:35,40); CI is unaffected since it never runs `setup`; and the exact pin means plain `playwright install` automatically matches the CI container version. No conflicts with npm workspaces, module federation, or the Playwright container.

**Verifier corrections (apply these over the recommendation above)**

Recommendation stands with two refinements: (1) On Linux hosts the first install also needs OS libraries, so document `npm run setup -- --with-deps` or note that Linux users should run `npx playwright install --with-deps chromium` (requires sudo; unneeded on macOS, and CI's container already has deps). (2) For the optional devcontainer: ci.yml runs the container with `--user 1001` (ci.yml:75), so devcontainer.json should set a compatible remoteUser, and be aware it adds a third location (package.json:64, ci.yml:74, devcontainer.json) whose Playwright version must be bumped in lockstep — consider a comment in ci.yml linking the pin locations. Line-number nit: the README section actually starts at line 89 and the quoted sentence is line 103, not 90-103, but the content claim is accurate.

---

## Rejected by verification

### Ignore test/fixtures/remote-app/dist in the dev server watcher so e2e runs stop force-reloading open dev tabs

**Dimension:** dev-loop

The watcher premise is real but the claimed harm — the whole point of the finding — does not occur, and most of the recommended ignores are already Vite defaults. Verified true: test:e2e/test:e2e:chromium rebuild the fixture into test/fixtures/remote-app/dist (package.json:39-41; fixture vite.config.ts:37), playwright.config.ts:35 sets reuseExistingServer:true, vite.config.ts:104-110 has no server.watch, and Vite 8.0.13 watches the repo root so the rebuild triggers the observed '[vite] (client) page reload …' log (node_modules/vite/dist/node/chunks/node.js:26780-26788). However, that is a SERVER-side log; the broadcast carries path='/test/fixtures/remote-app/dist/index.html', and the HMR client (node_modules/vite/dist/client/client.mjs:978-985) only reloads a tab for an .html-path full-reload when location.pathname matches that HTML file. Tabs at '/' or '/:workspaceId/networks/:networkId' do NOT match, so open dev tabs are never force-reloaded and no in-progress state is lost — the finding's title and benefit are disproven by the installed client code. (The @module-federation/vite unconditional-reload relay is also inert here: it requires dev.remoteHmr plus configured remotes, index.js:2856,2867; the host federation() in vite.config.ts:64-79 has neither.) The recommendation is additionally redundant: Vite's default watcher ignores already include '**/test-results/**' (node.js:12445) and the root outDir dist/** via emptyOutDir handling (node.js:12449, 26089-26094), playwright-report/ is never generated (no reporter configured, directory absent), and the fixture dist is 17 files, not 'thousands'. What actually remains is cosmetic: a misleading 'page reload' server log emitted with clear:true (wipes dev-server terminal scrollback) on every e2e run.
