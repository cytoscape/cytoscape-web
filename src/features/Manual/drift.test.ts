// @vitest-environment node
import { existsSync, globSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  DEMO_COPIES,
  type DemoCopy,
  describeFinding,
  type DriftPage,
  findManualDrift,
  parseReviewedTrailers,
} from './drift'
import { MANUAL_PAGES } from './pages'

const PAGES: DriftPage[] = [
  {
    slug: 'merge',
    title: 'Merging Networks',
    sources: ['src/features/MergeNetworks/**'],
  },
  {
    slug: 'advanced',
    title: 'Advanced Topics',
    sources: ['src/boot/steps/**'],
  },
]
const COPIES: DemoCopy[] = [
  {
    page: 'advanced',
    copy: 'src/features/Manual/components/demo/DemoUrlPanel.tsx',
    sources: ['src/features/FloatingToolBar/shareUrl.ts'],
  },
]
const NONE = parseReviewedTrailers('')

const drift = (changedFiles: string[], reviewed = NONE) =>
  findManualDrift({
    changedFiles,
    pages: PAGES,
    reviewed,
    demoCopies: COPIES,
  })

describe('findManualDrift', () => {
  it('flags a page when its source changes and the page does not', () => {
    const findings = drift([
      'src/features/MergeNetworks/components/MergeDialog.tsx',
    ])
    expect(findings).toEqual([
      {
        slug: 'merge',
        title: 'Merging Networks',
        contentFile: 'src/features/Manual/content/merge.mdx',
        triggeredBy: ['src/features/MergeNetworks/components/MergeDialog.tsx'],
        demoCopies: [],
        screenshots: [],
      },
    ])
  })

  it('is satisfied when the page changes in the same PR', () => {
    expect(
      drift([
        'src/features/MergeNetworks/components/MergeDialog.tsx',
        'src/features/Manual/content/merge.mdx',
      ]),
    ).toEqual([])
  })

  it('ignores tests, e2e specs and the manual itself', () => {
    expect(
      drift([
        'src/features/MergeNetworks/components/MergeDialog.spec.tsx',
        'src/features/MergeNetworks/models/Impl/UnionMerge.test.ts',
        'test/playwright/manual.spec.ts',
        'src/features/Manual/ManualApp.tsx',
      ]),
    ).toEqual([])
  })

  it('ignores files no page names', () => {
    expect(drift(['src/features/Vizmapper/index.tsx', 'README.md'])).toEqual([])
  })

  it('accepts a Manual-Reviewed trailer for the page', () => {
    const reviewed = parseReviewedTrailers(
      'fix(merge): tooltip\n\nManual-Reviewed: merge (tooltip wording only)\n',
    )
    expect(
      drift(
        ['src/features/MergeNetworks/components/MergeDialog.tsx'],
        reviewed,
      ),
    ).toEqual([])
  })

  it('flags a demo copy whose source changed, even when the page changed', () => {
    const findings = drift([
      'src/features/FloatingToolBar/shareUrl.ts',
      'src/features/Manual/content/advanced.mdx',
    ])
    expect(findings).toHaveLength(1)
    expect(findings[0].demoCopies).toEqual([
      'src/features/Manual/components/demo/DemoUrlPanel.tsx',
    ])
    expect(findings[0].triggeredBy).toEqual([
      'src/features/FloatingToolBar/shareUrl.ts',
    ])
  })

  it('is satisfied when the demo copy changes too', () => {
    expect(
      drift([
        'src/features/FloatingToolBar/shareUrl.ts',
        'src/features/Manual/components/demo/DemoUrlPanel.tsx',
      ]),
    ).toEqual([])
  })

  it('asks for a recapture when a screenshot subject changes', () => {
    const shot = {
      id: 'merge-dialog',
      files: ['public/manual-assets/generated/merge-dialog.png'],
      pages: ['merge'],
      sources: ['src/features/MergeNetworks/components/**'],
    }
    const run = (changedFiles: string[]) =>
      findManualDrift({
        changedFiles,
        pages: PAGES,
        reviewed: NONE,
        demoCopies: [],
        screenshots: [shot],
      })

    // The page text changed, but the image still shows the old dialog.
    const [finding] = run([
      'src/features/MergeNetworks/components/MergeDialog.tsx',
      'src/features/Manual/content/merge.mdx',
    ])
    expect(finding.screenshots).toEqual(['merge-dialog'])
    expect(describeFinding(finding)).toContain(
      'node scripts/capture-manual-screenshots.mjs merge-dialog',
    )

    // Recaptured in the same PR, and the page updated: nothing to do.
    expect(
      run([
        'src/features/MergeNetworks/components/MergeDialog.tsx',
        'src/features/Manual/content/merge.mdx',
        'public/manual-assets/generated/merge-dialog.png',
      ]),
    ).toEqual([])
  })

  it('tells the reader what to do', () => {
    const [finding] = drift([
      'src/features/MergeNetworks/components/MergeDialog.tsx',
    ])
    expect(describeFinding(finding)).toContain(
      'Manual-Reviewed: merge (<why no change is needed>)',
    )
  })
})

describe('parseReviewedTrailers', () => {
  it('reads one page, several pages and all', () => {
    const reviewed = parseReviewedTrailers(
      [
        'Manual-Reviewed: merge (wording)',
        'Manual-Reviewed: export, quick-tour (internal rename)',
      ].join('\n'),
    )
    expect([...reviewed.slugs].sort()).toEqual([
      'export',
      'merge',
      'quick-tour',
    ])
    expect(reviewed.all).toBe(false)
    expect(
      parseReviewedTrailers('Manual-Reviewed: all (dependency bump)').all,
    ).toBe(true)
  })

  it('ignores a trailer without a reason', () => {
    expect(parseReviewedTrailers('Manual-Reviewed: merge').slugs.size).toBe(0)
    expect(parseReviewedTrailers('Manual-Reviewed: merge ()').slugs.size).toBe(
      0,
    )
  })

  it('ignores the text when it is not at the start of a line', () => {
    expect(
      parseReviewedTrailers('see Manual-Reviewed: merge (x)').slugs.size,
    ).toBe(0)
  })
})

describe('DEMO_COPIES', () => {
  const ROOT = path.resolve(__dirname, '../../..')

  it.each(DEMO_COPIES.map((c) => [c.copy, c] as const))(
    '%s names a real page, file and sources',
    (_name, copy) => {
      expect(MANUAL_PAGES.map((p) => p.slug)).toContain(copy.page)
      expect(existsSync(path.join(ROOT, copy.copy))).toBe(true)
      for (const source of copy.sources) {
        expect(globSync(source, { cwd: ROOT }).length).toBeGreaterThan(0)
      }
    },
  )
})
