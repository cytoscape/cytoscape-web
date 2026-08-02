import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Architecture guard for the three-layer rule in AGENTS.md §2.
 *
 * Dependencies run Models → Stores → Features. Nothing under `src/data` may
 * import from `src/features`.
 *
 * This is not hypothetical: cross-tab sync arrived with `tabViewState`,
 * `tabNetwork` and `databaseLifecycle` living under `src/features` while
 * `UiStateStore` and `WorkspaceStore` imported them, which made `features/` a
 * dependency of the store layer. They now live under `src/data/tabState`,
 * `src/data/sync` and `src/data/db`. oxlint has no `import/no-restricted-paths`
 * equivalent, so the rule is enforced here instead of at lint time.
 */

const SRC = join(__dirname, '..')
const DATA = __dirname

const collect = (dir: string, out: string[] = []): string[] => {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      collect(full, out)
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

/**
 * Forward slashes whatever the platform separator is, matching the sibling
 * `styleSetRegistration.test.ts`. BASELINE and the `data/hooks/stores/` prefix
 * check below are written with `/`, so on Windows every edge would miss.
 */
const toPosix = (p: string): string => p.split('\\').join('/')

/** Matches `from '<spec>'`, `import '<spec>'` and `import('<spec>')`. */
const SPECIFIER = /(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g

/** Resolves a specifier to a src-relative path, or null if it leaves src. */
const resolveWithinSrc = (fromFile: string, spec: string): string | null => {
  if (spec.startsWith('@/')) {
    return spec.slice(2)
  }
  if (spec.startsWith('.')) {
    const abs = join(fromFile, '..', spec)
    const rel = toPosix(relative(SRC, abs))
    return rel.startsWith('..') ? null : rel
  }
  return null // bare package specifier
}

/**
 * Pre-existing violations, recorded so the guard can block NEW ones today rather
 * than waiting for a cleanup that has not been scheduled.
 *
 * Every entry is a composed hook under `data/hooks/` reaching into a feature
 * module — `AppManager`, `HierarchyViewer`, `ServiceApps`, `DefaultRenderer`.
 * None are stores. Paying this down means either moving the feature logic those
 * hooks need into `data/`, or moving the hooks into the features that own them;
 * both are their own change. Shrink this list, never extend it.
 */
const BASELINE = new Set([
  'data/hooks/deleteNetworkOrchestrator.ts -> features/HierarchyViewer/store/HcxValidatorStore',
  'data/hooks/stores/RendererStore.ts -> features/DefaultRenderer',
  'data/hooks/stores/useAppManager.test.tsx -> features/AppManager/install/installGate',
  'data/hooks/stores/useAppManager.test.tsx -> features/AppManager/install/migrateLegacyApps',
  'data/hooks/stores/useAppManager.test.tsx -> features/AppManager/loader/loadRemoteApp',
  'data/hooks/stores/useAppManager.ts -> features/AppManager/install/installGate',
  'data/hooks/stores/useAppManager.ts -> features/AppManager/install/migrateLegacyApps',
  'data/hooks/stores/useAppManager.ts -> features/AppManager/loader/loadRemoteApp',
  'data/hooks/stores/useAppManager.ts -> features/AppManager/manifest/composeCatalog',
  'data/hooks/stores/useAppManager.ts -> features/AppManager/manifest/obtainCatalogEntries',
  'data/hooks/useLoadWorkspace.ts -> features/AppManager/install/installGate',
  'data/hooks/useLoadWorkspace.ts -> features/AppManager/manifest/parseManifest',
  'data/hooks/useRegisterNetwork.test.tsx -> features/HierarchyViewer/store/HcxValidatorStore',
  'data/hooks/useRegisterNetwork.ts -> features/HierarchyViewer/model/HcxMetaTag',
  'data/hooks/useRegisterNetwork.ts -> features/HierarchyViewer/model/impl/hcxValidators',
  'data/hooks/useRegisterNetwork.ts -> features/HierarchyViewer/store/HcxValidatorStore',
  'data/hooks/useRegisterNetwork.ts -> features/HierarchyViewer/utils/hierarchyUtil',
  'data/hooks/useServiceTaskRunner.ts -> features/HierarchyViewer/utils/hierarchyUtil',
  'data/hooks/useServiceTaskRunner.ts -> features/ServiceApps',
  'data/hooks/useServiceTaskRunner.ts -> features/ServiceApps/resultHandler/serviceResultHandlerManager',
])

/** Every `src/data` → `src/features` edge, as `<importer> -> <resolved target>`. */
const findFeatureImports = (files: readonly string[]): string[] => {
  const found: string[] = []
  for (const file of files) {
    const content = readFileSync(file, 'utf8')
    for (const match of content.matchAll(SPECIFIER)) {
      const target = resolveWithinSrc(file, match[1])
      if (target?.startsWith('features/') === true) {
        found.push(`${toPosix(relative(SRC, file))} -> ${target}`)
      }
    }
  }
  return found
}

// Scanned once at module scope, like styleSetRegistration.test.ts: the four
// tests below all read the same tree, and re-walking it per test was four
// full-directory reads for one answer.
const DATA_FILES = collect(DATA)
const FEATURE_IMPORTS = findFeatureImports(DATA_FILES)

describe('layering: src/data must not depend on src/features', () => {
  it('adds no new imports from features/ beyond the recorded baseline', () => {
    const offenders = FEATURE_IMPORTS.filter((edge) => !BASELINE.has(edge))

    expect(offenders).toEqual([])
  })

  it('keeps the baseline honest — no stale entries', () => {
    // A fixed violation must be removed from BASELINE, or the list quietly
    // becomes permission for edges nobody is actually adding.
    const live = new Set(FEATURE_IMPORTS)
    const stale = [...BASELINE].filter((edge) => !live.has(edge))

    expect(stale).toEqual([])
  })

  it('the store layer itself is clean', () => {
    // The part this guard exists to protect: stores are what everything above
    // them consumes, so an inverted dependency there is the expensive kind.
    // `useAppManager` is a composed hook that happens to live in stores/.
    const storeOffenders = FEATURE_IMPORTS.filter(
      (edge) =>
        edge.startsWith('data/hooks/stores/') &&
        !edge.startsWith('data/hooks/stores/useAppManager'),
    )

    expect(storeOffenders).toEqual([
      // Renderer registration, pre-dating this rule.
      'data/hooks/stores/RendererStore.ts -> features/DefaultRenderer',
    ])
  })

  it('scans a meaningful number of files', () => {
    // Guards the guard: a broken glob would make the assertion above vacuous.
    expect(DATA_FILES.length).toBeGreaterThan(50)
  })
})
