// @vitest-environment node
import { existsSync, globSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { compile } from '@mdx-js/mdx'
import remarkGfm from 'remark-gfm'
import { describe, expect, it } from 'vitest'

import { UI_ICON_NAMES } from './components/uiIconNames'
import { slugifyHeading } from './manualSlug'
import {
  SCREENSHOT_RECIPES,
  SCREENSHOT_SEQUENCES,
  screenshotPath,
  sequenceFramePath,
} from './screenshots/recipes'
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
const screenshotsOf = (source: string): string[] =>
  Array.from(prose(source).matchAll(/<Screenshot\s+id="([^"]+)"/g), (m) => m[1])

/** `<Steps sequence="…">` blocks: the sequence id and its list's item count. */
const stepBlocksOf = (source: string): { sequence: string; items: number }[] =>
  Array.from(
    prose(source).matchAll(/<Steps\s+sequence="([^"]+)">([\s\S]*?)<\/Steps>/g),
    (m) => ({
      sequence: m[1],
      // Top-level items only: nested lists are indented.
      items: (m[2].match(/^\d+\.\s/gm) ?? []).length,
    }),
  )

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

  it.each(MANUAL_PAGES.map((p) => p.slug))(
    '%s uses only UiIcon names that exist',
    (slug) => {
      const unknown = Array.from(
        read(slug).matchAll(/<UiIcon\s+name="([^"]+)"/g),
        (m) => m[1],
      ).filter((name) => !(UI_ICON_NAMES as readonly string[]).includes(name))
      expect(unknown).toEqual([])
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

  it.each(
    MANUAL_PAGES.flatMap((page) =>
      Object.entries(page.movedAnchors ?? {}).map(
        ([anchor, target]) =>
          [`${page.slug}#${anchor}`, target, anchor] as const,
      ),
    ),
  )('moved anchor %s exists on %s', (_link, target, anchor) => {
    expect(anchorsOf(read(target)).has(anchor)).toBe(true)
  })

  it('carries the privacy policy text of docs/privacy-policy.md', () => {
    // Two copies of one legal text: the repository file and the manual page.
    // Everything from the "Last Updated" line on must be identical.
    const policyBody = (source: string): string =>
      source.slice(source.indexOf('**Last Updated'))
    expect(policyBody(read('privacy-policy'))).toBe(
      policyBody(
        readFileSync(path.join(ROOT, 'docs/privacy-policy.md'), 'utf8'),
      ),
    )
  })

  it.each(MANUAL_PAGES.map((p) => p.slug))(
    '%s shows only screenshots that have a recipe',
    (slug) => {
      const known = new Set(SCREENSHOT_RECIPES.map((r) => r.id))
      expect(screenshotsOf(read(slug)).filter((id) => !known.has(id))).toEqual(
        [],
      )
    },
  )

  it.each(SCREENSHOT_RECIPES.map((r) => r.id))(
    'screenshot %s is captured and used by a page',
    (id) => {
      // Missing file: run `node scripts/capture-manual-screenshots.mjs <id>`.
      expect(existsSync(path.join(PUBLIC, screenshotPath(id)))).toBe(true)
      expect(
        MANUAL_PAGES.some((p) => screenshotsOf(read(p.slug)).includes(id)),
      ).toBe(true)
    },
  )

  it.each(SCREENSHOT_RECIPES.map((r) => [r.id, r.sources] as const))(
    'screenshot %s names sources that exist',
    (_id, sources) => {
      const stale = sources.filter(
        (pattern) => globSync(pattern, { cwd: ROOT }).length === 0,
      )
      expect(stale).toEqual([])
    },
  )

  it.each(MANUAL_PAGES.map((p) => p.slug))(
    '%s uses only step sequences that exist, at most one',
    (slug) => {
      // The page's pinned column shows one sequence.
      const blocks = stepBlocksOf(read(slug))
      expect(blocks.length).toBeLessThanOrEqual(1)
      const known = new Set(SCREENSHOT_SEQUENCES.map((q) => q.id))
      expect(
        blocks.map((b) => b.sequence).filter((id) => !known.has(id)),
      ).toEqual([])
    },
  )

  it.each(SCREENSHOT_SEQUENCES.map((q) => q.id))(
    'sequence %s is captured and fits the list it illustrates',
    (id) => {
      const sequence = SCREENSHOT_SEQUENCES.find((q) => q.id === id)
      if (sequence === undefined) throw new Error(id)
      // Missing file: run `node scripts/capture-manual-screenshots.mjs <id>`.
      const missing = sequence.frames
        .map((frame) => sequenceFramePath(id, frame.id))
        .filter((file) => !existsSync(path.join(PUBLIC, file)))
      expect(missing).toEqual([])

      const uses = MANUAL_PAGES.flatMap((page) =>
        stepBlocksOf(read(page.slug))
          .filter((b) => b.sequence === id)
          .map((b) => ({ slug: page.slug, items: b.items })),
      )
      expect(uses).toHaveLength(1)
      const [{ slug, items }] = uses
      // Frames name list items in order, each within the list.
      const steps = sequence.frames.map((frame) => frame.step)
      expect(steps).toEqual([...steps].sort((a, b) => a - b))
      expect(new Set(steps).size).toBe(steps.length)
      expect(Math.min(...steps)).toBeGreaterThanOrEqual(1)
      expect(Math.max(...steps)).toBeLessThanOrEqual(items)
      // The title names the section the list is in.
      expect(anchorsOf(read(slug)).has(slugifyHeading(sequence.title))).toBe(
        true,
      )
    },
  )

  it.each(SCREENSHOT_SEQUENCES.map((q) => [q.id, q.sources] as const))(
    'sequence %s names sources that exist',
    (_id, sources) => {
      const stale = sources.filter(
        (pattern) => globSync(pattern, { cwd: ROOT }).length === 0,
      )
      expect(stale).toEqual([])
    },
  )

  it('every image in public/manual-assets is used by a page', () => {
    const used = new Set([
      ...MANUAL_PAGES.flatMap((p) =>
        linksOf(read(p.slug))
          .filter((l) => l.image)
          .map((l) => l.target),
      ),
      ...SCREENSHOT_RECIPES.map((r) => screenshotPath(r.id)),
      ...SCREENSHOT_SEQUENCES.flatMap((q) =>
        q.frames.map((frame) => sequenceFramePath(q.id, frame.id)),
      ),
    ])
    const unused = globSync('manual-assets/**/*.{jpg,png,gif,svg}', {
      cwd: PUBLIC,
    }).filter((file) => !used.has(file))
    expect(unused).toEqual([])
  })
})
