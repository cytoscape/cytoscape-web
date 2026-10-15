// @vitest-environment node
import { existsSync, globSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { compile } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import { describe, expect, it } from 'vitest'

import { slugifyHeading } from './manualSlug'
import { MANUAL_PAGES } from './pages'

// Checks the manual's content against itself and the repository: every page
// compiles, every link and anchor resolves, every image exists, and every
// page's `sources` globs still match code. A rename that breaks the manual
// fails here, not in a reader's browser.

const ROOT = path.resolve(__dirname, '../../..')
const CONTENT = path.join(__dirname, 'content')
const PUBLIC = path.join(ROOT, 'public')

const read = (slug: string): string =>
  readFileSync(path.join(CONTENT, `${slug}.mdx`), 'utf8')

/** Text outside fenced code blocks, where links and headings are real. */
const prose = (source: string): string =>
  source.replace(/^```[\s\S]*?^```/gm, '')

const anchorsOf = (source: string): Set<string> => {
  const anchors = new Set<string>()
  for (const match of prose(source).matchAll(/^#{1,4}\s+(.+)$/gm)) {
    anchors.add(slugifyHeading(match[1].replace(/[*_`]/g, '')))
  }
  for (const match of source.matchAll(/<a\s+id=["']([^"']+)["']/g)) {
    anchors.add(match[1])
  }
  return anchors
}

/** `[text](target)` and `![alt](target)`, excluding code. */
const linksOf = (source: string): { image: boolean; target: string }[] =>
  Array.from(prose(source).matchAll(/(!?)\[[^\]]*\]\(([^)\s]+)\)/g)).map(
    (m) => ({ image: m[1] === '!', target: m[2] }),
  )

describe('manual content', () => {
  it('has exactly one content file per registered page', () => {
    const files = readdirSync(CONTENT)
      .filter((f) => f.endsWith('.mdx'))
      .map((f) => f.replace(/\.mdx$/, ''))
      .sort()
    expect(files).toEqual(MANUAL_PAGES.map((p) => p.slug).sort())
  })

  it.each(MANUAL_PAGES.map((p) => p.slug))('%s compiles', async (slug) => {
    await expect(
      compile(read(slug), { remarkPlugins: [remarkGfm] }),
    ).resolves.toBeDefined()
  })

  it.each(MANUAL_PAGES.map((p) => p.slug))(
    '%s starts with its title',
    (slug) => {
      const page = MANUAL_PAGES.find((p) => p.slug === slug)
      expect(read(slug).trimStart().split('\n')[0]).toBe(`# ${page?.title}`)
    },
  )

  it.each(MANUAL_PAGES.map((p) => p.slug))(
    '%s links only to pages and anchors that exist',
    (slug) => {
      const broken: string[] = []
      for (const { image, target } of linksOf(read(slug))) {
        if (image || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue
        if (target.startsWith('/')) continue // the editor
        const [pagePart, anchor] = target.split('#')
        const targetSlug = pagePart === '' ? slug : pagePart
        if (!MANUAL_PAGES.some((p) => p.slug === targetSlug)) {
          broken.push(`${target} (no page "${targetSlug}")`)
          continue
        }
        if (anchor !== undefined && !anchorsOf(read(targetSlug)).has(anchor)) {
          broken.push(`${target} (no anchor "${anchor}")`)
        }
      }
      expect(broken).toEqual([])
    },
  )

  it.each(MANUAL_PAGES.map((p) => p.slug))(
    '%s uses only images that exist in public/',
    (slug) => {
      const missing = linksOf(read(slug))
        .filter((l) => l.image && !/^[a-z]+:/i.test(l.target))
        .map((l) => l.target)
        .filter((target) => !existsSync(path.join(PUBLIC, target)))
      expect(missing).toEqual([])
    },
  )

  it.each(MANUAL_PAGES.map((p) => [p.slug, p.sources] as const))(
    '%s names sources that exist',
    (_slug, sources) => {
      const stale = sources.filter(
        (pattern) => globSync(pattern, { cwd: ROOT }).length === 0,
      )
      expect(stale).toEqual([])
    },
  )

  it('every image in public/manual-assets is used by a page', () => {
    const used = new Set(
      MANUAL_PAGES.flatMap((p) =>
        linksOf(read(p.slug))
          .filter((l) => l.image)
          .map((l) => l.target),
      ),
    )
    const unused = globSync('manual-assets/**/*.{jpg,png,gif,svg}', {
      cwd: PUBLIC,
    }).filter((file) => !used.has(file))
    expect(unused).toEqual([])
  })
})
