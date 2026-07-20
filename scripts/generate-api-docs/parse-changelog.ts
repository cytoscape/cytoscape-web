/**
 * Parse `packages/api-types/CHANGELOG.md` (Keep-a-Changelog style) into the
 * `versions[]` array of the docs-data payload.
 *
 *   ## 1.0.0-beta.4 (2026-07-19)
 *   ### Added
 *   ### Changed — BREAKING
 *   ### Fixed
 *
 * Subsection headings vary (`### Added — Step 3.7 (TSV Table I/O)`), so the
 * machine `kind` is taken from the first word and the full suffix is kept as a
 * display `label`.
 */
import { mdToHtml, mdToText, splitByHeadings } from './markdown'
import type { ChangelogSection, ChangelogVersion } from './types'

const VERSION_RE = /^([0-9][\w.-]*?)\s+\((\d{4}-\d{2}-\d{2})\)\s*$/
const VERSION_NO_DATE_RE = /^([0-9][\w.-]*?)\s*$/

export function parseChangelog(md: string): ChangelogVersion[] {
  const { sections: versionSections } = splitByHeadings(md, 2)
  const versions: ChangelogVersion[] = []

  for (const vs of versionSections) {
    let version: string
    let date: string | null = null
    const dated = vs.heading.match(VERSION_RE)
    if (dated) {
      version = dated[1]
      date = dated[2]
    } else {
      const bare = vs.heading.match(VERSION_NO_DATE_RE)
      if (!bare) continue
      version = bare[1]
    }

    const { sections: subSections } = splitByHeadings(vs.body, 3)
    const sections: ChangelogSection[] = subSections.map((s) => {
      const kind = (s.heading.split(/\s+/)[0] || '').toLowerCase()
      return {
        kind,
        breaking: /breaking/i.test(s.heading),
        label: s.heading,
        html: mdToHtml(s.body),
        text: mdToText(s.body),
      }
    })

    versions.push({ version, date, sections })
  }

  return versions
}
