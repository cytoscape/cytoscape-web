/**
 * Shared markdown helpers for the api-docs generator.
 *
 * All markdown is rendered to HTML at build time (so the published page ships
 * no markdown parser) and, in parallel, flattened to plain text for the
 * client-side search index. Uses `marked@4` (a direct repo dependency, CJS).
 */
import { marked } from 'marked'

marked.setOptions({ gfm: true, breaks: false })

/** Render a markdown string to an HTML string. */
export function mdToHtml(md: string): string {
  return marked.parse(md.trim(), { async: false }) as string
}

/** Flatten markdown to searchable plain text (tags and entities stripped). */
export function mdToText(md: string): string {
  return htmlToText(mdToHtml(md))
}

/** Strip HTML tags and decode the handful of entities marked emits. */
export function htmlToText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Split a markdown document into sections keyed by ATX headings of a given
 * depth. Returns the preamble (text before the first heading at that depth)
 * plus one entry per heading with its raw body (everything up to the next
 * heading of the same-or-shallower depth).
 *
 * Fenced code blocks are respected, so a `#` inside a ``` block is never
 * mistaken for a heading.
 */
export interface Section {
  depth: number
  heading: string
  body: string
}

export function splitByHeadings(
  md: string,
  depth: number,
): { preamble: string; sections: Section[] } {
  const lines = md.split('\n')
  const headingRe = new RegExp(`^(#{1,6}) +(.*)$`)
  const sections: Section[] = []
  const preambleLines: string[] = []
  let current: { depth: number; heading: string; lines: string[] } | null = null
  let inFence = false

  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    const m = inFence ? null : line.match(headingRe)
    if (m && m[1].length <= depth) {
      // Close the current section when we hit a same-or-shallower heading.
      if (current && current.depth === depth) {
        sections.push({
          depth: current.depth,
          heading: current.heading,
          body: current.lines.join('\n').trim(),
        })
        current = null
      }
      if (m[1].length === depth) {
        current = { depth, heading: m[2].trim(), lines: [] }
        continue
      }
      // A shallower heading ends any open section; its own line is ignored
      // for the purposes of depth-`depth` splitting.
      if (current) {
        sections.push({
          depth: current.depth,
          heading: current.heading,
          body: current.lines.join('\n').trim(),
        })
        current = null
      }
      if (sections.length === 0) preambleLines.push(line)
      continue
    }
    if (current) current.lines.push(line)
    else if (sections.length === 0) preambleLines.push(line)
  }

  if (current) {
    sections.push({
      depth: current.depth,
      heading: current.heading,
      body: current.lines.join('\n').trim(),
    })
  }

  return { preamble: preambleLines.join('\n').trim(), sections }
}

/** Build a URL-safe anchor slug from arbitrary text. */
export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[`'"()<>]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
