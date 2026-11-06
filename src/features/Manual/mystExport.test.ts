// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { UI_ICON_NAMES } from './components/uiIconNames'
import { slugifyHeading } from './manualSlug'
import {
  exportManualToMyst,
  IMAGE_DIR,
  mdxToMyst,
  UI_ICON_DIR,
  withToctree,
} from './mystExport'
import { MANUAL_PAGES } from './pages'

const ROOT = path.resolve(__dirname, '../../..')
const readPage = (slug: string): string =>
  readFileSync(path.join(__dirname, 'content', `${slug}.mdx`), 'utf8')

const pages = exportManualToMyst(readPage)
const byName = new Map(pages)

const NO_ANCHORS = new Map<string, ReadonlySet<string>>()

describe('exportManualToMyst', () => {
  it('writes every page, in page order', () => {
    expect(pages).toHaveLength(MANUAL_PAGES.length)
    expect(pages[0][0]).toBe('Introduction')
    expect(byName.has('Styles')).toBe(true)
    expect(byName.has('Workspace_Panels')).toBe(true)
  })

  it.each(pages)('%s refers only to images that exist', (_name, text) => {
    const images = [...text.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(
      (m) => m[1],
    )
    for (const src of images) {
      if (src.startsWith(`${UI_ICON_DIR}/`)) {
        const name = path.basename(src, '.png')
        expect(UI_ICON_NAMES as readonly string[]).toContain(name)
        continue
      }
      expect(src.startsWith(`${IMAGE_DIR}/`), src).toBe(true)
      const file = src.replace(`${IMAGE_DIR}/`, 'public/manual-assets/')
      expect(existsSync(path.join(ROOT, file)), file).toBe(true)
    }
  })

  it.each(pages)(
    '%s links only to labels and headings that exist',
    (_n, text) => {
      for (const [, label] of text.matchAll(/\{ref\}`[^`<]*<([^>]+)>`/g)) {
        const page = label.slice(0, label.indexOf('-'))
        expect(byName.get(page), label).toContain(`(${label})=`)
      }
      for (const [, page, anchor] of text.matchAll(
        /\]\((\w+)\.md#([^)]+)\)/g,
      )) {
        const headings = [...(byName.get(page) ?? '').matchAll(/^#+ (.+)$/gm)]
        expect(
          headings.map((h) => slugifyHeading(h[1])),
          `${page}#${anchor}`,
        ).toContain(anchor)
      }
    },
  )
})

describe('mdxToMyst', () => {
  it('puts each frame image under the step it belongs to', () => {
    const mdx = [
      '<Steps sequence="merge">',
      '',
      '1. First',
      '2. Second',
      '3. Third',
      '',
      '</Steps>',
    ].join('\n')
    const out = mdxToMyst(mdx, 'merge', NO_ANCHORS)
    const lines = out.split('\n')
    expect(lines[0]).toBe('1. First')
    expect(out).not.toContain('Steps')
    // The image lines are indented into their list item.
    expect(lines.filter((l) => l.startsWith('   ![')).length).toBeGreaterThan(0)
  })

  it('turns a warning note into a warning admonition', () => {
    const out = mdxToMyst(
      '<Note severity="warning">\n\nCareful.\n\n</Note>',
      'merge',
      NO_ANCHORS,
    )
    expect(out).toBe('````{warning}\nCareful.\n````\n')
  })

  it('leaves out live demos and keeps the text shown without them', () => {
    const out = mdxToMyst(
      '<DemoOnly>\n\n<LiveDemo />\n\n</DemoOnly>\n\n<WithoutDemo>\n\nFollow along.\n\n</WithoutDemo>',
      'styles',
      NO_ANCHORS,
    )
    expect(out).toBe('Follow along.\n')
  })

  it('links to a raw anchor through its page-prefixed label', () => {
    const out = mdxToMyst(
      'See [Cell View](network-view#cell_view).',
      'quick-tour',
      new Map([['network-view', new Set(['cell_view'])]]),
    )
    expect(out).toBe('See {ref}`Cell View <Network_View-cell_view>`.\n')
  })

  it('links to a heading by file name and anchor', () => {
    expect(
      mdxToMyst('[Mappings](styles#how-mappings-work)', 'merge', NO_ANCHORS),
    ).toBe('[Mappings](Styles.md#how-mappings-work)\n')
  })

  it('fails on a component it does not convert', () => {
    expect(() =>
      mdxToMyst('<NewWidget foo="1" />', 'merge', NO_ANCHORS),
    ).toThrow('merge: unconverted <NewWidget>')
  })
})

describe('withToctree', () => {
  it('replaces the numbered toctree entries', () => {
    const index = '.. toctree::\n   :numbered: 2\n\n   Old\n   Older\n..\n'
    expect(withToctree(index, ['A', 'B'])).toBe(
      '.. toctree::\n   :numbered: 2\n\n   A\n   B\n..\n',
    )
  })
})
