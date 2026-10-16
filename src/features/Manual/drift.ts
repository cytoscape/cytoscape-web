import { matchesGlob } from 'node:path'

// The manual drift check: which manual pages a change to the code asks a
// person to review. Run by scripts/check-manual-drift.mjs in CI; pure, so the
// rules are unit-tested in drift.test.ts.
//
// No relative imports: the CI script loads this file with Node's built-in
// TypeScript support, which needs explicit extensions. Pages come in as an
// argument instead.

export const MANUAL_CONTENT_DIR = 'src/features/Manual/content'

/** The part of a ManualPage the check reads. */
export interface DriftPage {
  readonly slug: string
  readonly title: string
  readonly sources: readonly string[]
}

/**
 * Manual code that re-implements app logic instead of importing it. A change
 * to `sources` may leave `copy` showing the old behavior, and no test fails.
 * Every other demo part imports the real component, so it updates itself.
 */
export interface DemoCopy {
  readonly page: string
  readonly copy: string
  readonly sources: readonly string[]
}

export const DEMO_COPIES: readonly DemoCopy[] = [
  {
    page: 'advanced',
    copy: 'src/features/Manual/components/demo/DemoUrlPanel.tsx',
    sources: [
      'src/features/FloatingToolBar/useCopyShareableNetworkUrl.ts',
      'src/features/FloatingToolBar/shareUrl.ts',
    ],
  },
  {
    page: 'extending',
    copy: 'src/features/Manual/components/demo/DemoApiPanel.tsx',
    sources: [
      'src/app-api/core/layoutApi.ts',
      'src/app-api/core/visualStyleApi.ts',
      'src/app-api/core/selectionApi.ts',
      'src/app-api/core/elementApi.ts',
    ],
  },
  // UiIcon redraws two icons; each copy belongs to the page that shows it.
  {
    page: 'menus',
    copy: 'src/features/Manual/components/UiIcon.tsx',
    sources: ['src/features/Login/LoginButton.tsx'],
  },
  {
    page: 'creating-networks',
    copy: 'src/features/Manual/components/UiIcon.tsx',
    sources: ['src/features/ToolBar/DataMenu/LoadFromNdexDialog.tsx'],
  },
  {
    page: 'privacy-policy',
    copy: 'src/features/Manual/components/BrowserStorageView.tsx',
    sources: [
      'src/features/Onboarding/store/onboardingPersistence.ts',
      'src/data/hooks/useCrashDataConsent.ts',
      'src/data/hooks/useCytoscapeDesktopPermissionNotice.ts',
      'src/features/NetworkSearch/store/networkSearchProviderSelectionStore.ts',
      'src/debug.ts',
    ],
  },
]

/** Changes that never ask for a manual review. */
const IGNORED = [
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
  'src/features/Manual/**',
  'test/**',
]

const matchesAny = (file: string, globs: readonly string[]): boolean =>
  globs.some((glob) => matchesGlob(file, glob))

/** A captured screenshot, the pages that show it, and what it depicts. */
export interface DriftScreenshot {
  readonly id: string
  /** The image file, from the repo root. */
  readonly file: string
  readonly pages: readonly string[]
  readonly sources: readonly string[]
}

export interface DriftFinding {
  readonly slug: string
  readonly title: string
  /** The page file to review. */
  readonly contentFile: string
  /** Changed source files that ask for the review. */
  readonly triggeredBy: readonly string[]
  /** Manual demo code that copies the changed logic, when any. */
  readonly demoCopies: readonly string[]
  /** Screenshots on the page whose subject changed: recapture them. */
  readonly screenshots: readonly string[]
}

/**
 * Pages whose sources changed while neither the page nor its demo copies
 * did, and that no `Manual-Reviewed` trailer covers.
 */
export const findManualDrift = (input: {
  changedFiles: readonly string[]
  pages: readonly DriftPage[]
  reviewed: ReviewedPages
  demoCopies?: readonly DemoCopy[]
  screenshots?: readonly DriftScreenshot[]
}): DriftFinding[] => {
  const {
    changedFiles,
    pages,
    reviewed,
    demoCopies = DEMO_COPIES,
    screenshots = [],
  } = input
  const changed = new Set(changedFiles)
  const relevant = changedFiles.filter((file) => !matchesAny(file, IGNORED))

  return pages.flatMap((page) => {
    const contentFile = `${MANUAL_CONTENT_DIR}/${page.slug}.mdx`
    if (reviewed.all || reviewed.slugs.has(page.slug)) return []

    // Editing the page answers its sources; editing a copy answers that
    // copy's sources. Neither answers the other.
    const pageTriggers = changed.has(contentFile)
      ? []
      : relevant.filter((f) => matchesAny(f, page.sources))
    const staleCopies = demoCopies.filter(
      (c) =>
        c.page === page.slug &&
        !changed.has(c.copy) &&
        relevant.some((f) => matchesAny(f, c.sources)),
    )
    const copyTriggers = staleCopies.flatMap((c) =>
      relevant.filter((f) => matchesAny(f, c.sources)),
    )
    // A recaptured image answers its own sources, as an edited copy does.
    const staleShots = screenshots.filter(
      (shot) =>
        shot.pages.includes(page.slug) &&
        !changed.has(shot.file) &&
        relevant.some((f) => matchesAny(f, shot.sources)),
    )
    const shotTriggers = staleShots.flatMap((shot) =>
      relevant.filter((f) => matchesAny(f, shot.sources)),
    )
    const triggeredBy = [
      ...new Set([...pageTriggers, ...copyTriggers, ...shotTriggers]),
    ].sort()
    if (triggeredBy.length === 0) return []

    return [
      {
        slug: page.slug,
        title: page.title,
        contentFile,
        triggeredBy,
        demoCopies: staleCopies.map((c) => c.copy),
        screenshots: staleShots.map((shot) => shot.id),
      },
    ]
  })
}

export interface ReviewedPages {
  readonly all: boolean
  readonly slugs: ReadonlySet<string>
}

/**
 * Reads `Manual-Reviewed:` trailers from commit messages or a PR body.
 *
 *     Manual-Reviewed: merge (tooltip wording only)
 *     Manual-Reviewed: merge, export (renamed an internal hook)
 *     Manual-Reviewed: all (dependency bump, no UI change)
 *
 * The reason in parentheses is required: it is the record of why the page
 * needed no change. A trailer without one is ignored.
 */
export const parseReviewedTrailers = (text: string): ReviewedPages => {
  const slugs = new Set<string>()
  let all = false
  for (const match of text.matchAll(
    /^Manual-Reviewed:[ \t]*([a-z0-9][a-z0-9 ,-]*?)[ \t]*\(([^)\n]*\S[^)\n]*)\)[ \t]*$/gim,
  )) {
    for (const slug of match[1].split(',').map((s) => s.trim())) {
      if (slug === 'all') all = true
      else if (slug !== '') slugs.add(slug)
    }
  }
  return { all, slugs }
}

/** The message CI prints for one finding. */
export const describeFinding = (finding: DriftFinding): string => {
  const lines = [
    `${finding.title} (${finding.contentFile}) may be out of date. Changed:`,
    ...finding.triggeredBy.map((f) => `  - ${f}`),
  ]
  if (finding.demoCopies.length > 0) {
    lines.push(
      'Manual demo code that copies this logic, check it too:',
      ...finding.demoCopies.map((f) => `  - ${f}`),
    )
  }
  if (finding.screenshots.length > 0) {
    lines.push(
      'Screenshots that show this, recapture them:',
      `  node scripts/capture-manual-screenshots.mjs ${finding.screenshots.join(' ')}`,
    )
  }
  lines.push(
    `Update the page, or add a commit trailer: Manual-Reviewed: ${finding.slug} (<why no change is needed>)`,
  )
  return lines.join('\n')
}
