#!/usr/bin/env node
// Manual drift check: lists the in-app manual pages a branch's code changes
// ask someone to review (src/features/Manual/drift.ts holds the rules).
//
// A page is flagged when a file matching its `sources` globs
// (src/features/Manual/pages.ts) changed and the page did not. A commit
// trailer clears it:
//
//   Manual-Reviewed: merge (tooltip wording only)
//
// Usage:
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON \
//     scripts/check-manual-drift.mjs [--base <ref>] [--strict]
//
// Warning mode is the default: findings print, and the exit code is 0.
// --strict (or MANUAL_DRIFT_STRICT=1) exits 1 on findings. In CI, findings
// become GitHub warning annotations and a job summary. PR_BODY, when set, is
// read for trailers too, so a squash-merge PR can carry them in its
// description.

import { execFileSync } from 'node:child_process'
import { appendFileSync, readFileSync } from 'node:fs'

// Plain imports of TypeScript files: Node 24 strips the types. Both files
// have no relative imports, which is what makes this work.
const { MANUAL_PAGES } = await import('../src/features/Manual/pages.ts')
const {
  SCREENSHOT_RECIPES,
  SCREENSHOT_SEQUENCES,
  screenshotPath,
  sequenceFramePath,
} = await import('../src/features/Manual/screenshots/recipes.ts')
const { describeFinding, findManualDrift, parseReviewedTrailers } =
  await import('../src/features/Manual/drift.ts')

const args = process.argv.slice(2)
const baseIndex = args.indexOf('--base')
const base = baseIndex >= 0 ? args[baseIndex + 1] : 'origin/development'
const strict =
  args.includes('--strict') || process.env.MANUAL_DRIFT_STRICT === '1'

const git = (...gitArgs) =>
  execFileSync('git', gitArgs, { encoding: 'utf8', maxBuffer: 64 * 1024 ** 2 })

// Three dots: changes on this branch since it left the base, not changes the
// base gained since.
const changedFiles = git('diff', '--name-only', `${base}...HEAD`)
  .split('\n')
  .filter((line) => line !== '')
const messages = git('log', '--format=%B', `${base}..HEAD`)
const reviewed = parseReviewedTrailers(
  `${messages}\n${process.env.PR_BODY ?? ''}`,
)

const knownSlugs = new Set(MANUAL_PAGES.map((page) => page.slug))
const unknown = [...reviewed.slugs].filter((slug) => !knownSlugs.has(slug))

// Which pages show each screenshot or sequence: `<Screenshot id="…" />` or
// `<Steps sequence="…">` in their MDX.
const pagesWith = (marker) =>
  MANUAL_PAGES.filter((page) =>
    readFileSync(
      `src/features/Manual/content/${page.slug}.mdx`,
      'utf8',
    ).includes(marker),
  ).map((page) => page.slug)
const screenshots = [
  ...SCREENSHOT_RECIPES.map((recipe) => ({
    id: recipe.id,
    files: [`public/${screenshotPath(recipe.id)}`],
    sources: recipe.sources,
    pages: pagesWith(`<Screenshot id="${recipe.id}"`),
  })),
  ...SCREENSHOT_SEQUENCES.map((sequence) => ({
    id: sequence.id,
    files: sequence.frames.map(
      (frame) => `public/${sequenceFramePath(sequence.id, frame.id)}`,
    ),
    sources: sequence.sources,
    pages: pagesWith(`<Steps sequence="${sequence.id}"`),
  })),
]

const findings = findManualDrift({
  changedFiles,
  pages: MANUAL_PAGES,
  reviewed,
  screenshots,
})

const inCi = process.env.GITHUB_ACTIONS === 'true'
// GitHub annotations are one line; %0A is its escape for a newline.
const annotate = (title, text) =>
  console.log(`::warning title=${title}::${text.replaceAll('\n', '%0A')}`)

for (const slug of unknown) {
  const text = `Manual-Reviewed names "${slug}", which is not a manual page. Pages: ${[...knownSlugs].join(', ')}`
  if (inCi) annotate('Unknown manual page', text)
  else console.warn(`warning: ${text}`)
}

if (findings.length === 0) {
  console.log(
    `Manual drift check: ${changedFiles.length} changed file(s), no manual page needs review.`,
  )
} else {
  console.log(
    `Manual drift check: ${findings.length} manual page(s) to review.\n`,
  )
  for (const finding of findings) {
    const text = describeFinding(finding)
    if (inCi) annotate(`Review the manual: ${finding.title}`, text)
    console.log(`${text}\n`)
  }
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      '## Manual pages to review',
      '',
      'This branch changes code that these manual pages describe. Update each page, or add a commit trailer such as `Manual-Reviewed: merge (tooltip wording only)`.',
      '',
      ...findings.flatMap((finding) => [
        `### ${finding.title} — \`${finding.contentFile}\``,
        '',
        ...finding.triggeredBy.map((file) => `- \`${file}\``),
        ...(finding.screenshots.length > 0
          ? [
              '',
              `Screenshots to recapture: \`node scripts/capture-manual-screenshots.mjs ${finding.screenshots.join(' ')}\``,
            ]
          : []),
        ...(finding.demoCopies.length > 0
          ? [
              '',
              'Demo code that copies this logic:',
              ...finding.demoCopies.map((file) => `- \`${file}\``),
            ]
          : []),
        '',
      ]),
    ].join('\n')
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`)
  }
}

process.exit(strict && (findings.length > 0 || unknown.length > 0) ? 1 : 0)
