#!/usr/bin/env node
// Extract one version's section from a Keep-a-Changelog-style file.
//
// Used three ways, which is why the parser is exported rather than private:
//   - the release workflow's guard, which refuses an undated section
//   - the run summary and the annotated tag message
//   - src/app-api/federation/apiTypesRelease.test.ts, so there is exactly one
//     heading-parsing implementation
//
// Dependency-free on purpose: it has to run before `npm ci`.

import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const DEFAULT_FILE = 'packages/api-types/CHANGELOG.md'

// The parenthetical is optional so a malformed heading is FOUND and then
// REPORTED, rather than silently skipped and reported as "no such version".
const HEADING = /^## +(\S+?)(?: +\((.+?)\))?\s*$/
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export const EXIT_NOT_FOUND = 1
export const EXIT_NOT_DATED = 2

/**
 * Every `## ` heading in file order.
 * @returns {{ version: string, note: string | undefined, line: number }[]}
 */
export const parseHeadings = (text) => {
  const headings = []
  const lines = text.split(/\r?\n/)
  lines.forEach((line, index) => {
    const match = HEADING.exec(line)
    if (match !== null) {
      headings.push({ version: match[1], note: match[2], line: index })
    }
  })
  return headings
}

/**
 * One version's section, or null when that version has no heading.
 *
 * The body keeps its interior blank lines: a stray blank inside a list is a
 * defect a human should see, not something this tool should paper over.
 */
export const extractSection = (text, version) => {
  const lines = text.split(/\r?\n/)
  const headings = parseHeadings(text)
  const index = headings.findIndex((heading) => heading.version === version)
  if (index === -1) return null

  const start = headings[index].line + 1
  const end = index + 1 < headings.length ? headings[index + 1].line : lines.length
  const body = lines.slice(start, end)

  while (body.length > 0 && body[0].trim() === '') body.shift()
  while (body.length > 0 && body[body.length - 1].trim() === '') body.pop()

  return { version, note: headings[index].note, body: body.join('\n') }
}

export const isReleaseDate = (note) => note !== undefined && ISO_DATE.test(note)

const parseArgs = (argv) => {
  const options = { file: DEFAULT_FILE, requireDate: false, printDate: false }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--version') options.version = argv[(i += 1)]
    else if (arg === '--file') options.file = argv[(i += 1)]
    else if (arg === '--require-date') options.requireDate = true
    else if (arg === '--print-date') options.printDate = true
    else {
      console.error(`changelog-section: unknown argument ${arg}`)
      process.exit(64)
    }
  }
  return options
}

const main = () => {
  const options = parseArgs(process.argv.slice(2))
  if (options.version === undefined) {
    console.error(
      'changelog-section: --version <version> is required\n' +
        '  usage: node scripts/changelog-section.mjs --version 1.0.0-beta.4 [--file <path>] [--require-date] [--print-date]',
    )
    process.exit(64)
  }

  let text
  try {
    text = readFileSync(options.file, 'utf8')
  } catch {
    console.error(`changelog-section: cannot read ${options.file}`)
    process.exit(66)
  }

  const section = extractSection(text, options.version)
  if (section === null) {
    console.error(
      `changelog-section: no "## ${options.version}" section in ${options.file}\n` +
        '  Add the entry before releasing this version.',
    )
    process.exit(EXIT_NOT_FOUND)
  }

  if (options.requireDate && !isReleaseDate(section.note)) {
    const shown = section.note === undefined ? '(none)' : `(${section.note})`
    console.error(
      `changelog-section: "## ${options.version} ${shown}" is not dated\n` +
        '  Replace the marker with the release date, as YYYY-MM-DD, before releasing.',
    )
    process.exit(EXIT_NOT_DATED)
  }

  process.stdout.write(
    options.printDate ? `${section.note ?? ''}\n` : `${section.body}\n`,
  )
}

// pathToFileURL, not a bare comparison: import.meta.url is a file:// URL and
// process.argv[1] is a plain path, so `===` between them is always false and
// the CLI would silently never run.
if (import.meta.url === pathToFileURL(process.argv[1]).href) main()
