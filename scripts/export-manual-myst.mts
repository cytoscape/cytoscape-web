// Exports the in-app manual to the Read the Docs manual
// (cytoscape/web-cytoscape-manual, Sphinx with myst-parser), #868.
//
//   npx tsx scripts/export-manual-myst.mts <manual repo>
//   MANUAL_URL=http://localhost:5601 npx tsx scripts/export-manual-myst.mts <manual repo>
//
// Writes docs/<Page>.md for every page in src/features/Manual/pages.ts and the
// toctree in docs/index.rst, and copies public/manual-assets/ to
// docs/_static/images/. With MANUAL_URL (a running build of the app), it also
// captures the inline app icons (<UiIcon>); without it, the icons already in
// the repo stay. The conversion is src/features/Manual/mystExport.ts.

import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import {
  exportManualToMyst,
  IMAGE_DIR,
  UI_ICON_DIR,
  withToctree,
} from '../src/features/Manual/mystExport'

const ROOT = path.resolve(import.meta.dirname, '..')
const CONTENT = path.join(ROOT, 'src/features/Manual/content')

const outRoot = process.argv[2]
if (outRoot === undefined) {
  console.error('Usage: npx tsx scripts/export-manual-myst.mts <manual repo>')
  process.exit(1)
}
const DOCS = path.join(path.resolve(outRoot), 'docs')

const readPage = (slug: string): string =>
  readFileSync(path.join(CONTENT, `${slug}.mdx`), 'utf8')

const pages = exportManualToMyst(readPage)
for (const [name, text] of pages) {
  writeFileSync(path.join(DOCS, `${name}.md`), text)
}

const indexPath = path.join(DOCS, 'index.rst')
writeFileSync(
  indexPath,
  withToctree(
    readFileSync(indexPath, 'utf8'),
    pages.map(([name]) => name),
  ),
)

cpSync(path.join(ROOT, 'public/manual-assets'), path.join(DOCS, IMAGE_DIR), {
  recursive: true,
})

const manualUrl = process.env.MANUAL_URL
if (manualUrl !== undefined) {
  const { MANUAL_PAGES } = await import('../src/features/Manual/pages')
  const { chromium } = await import('@playwright/test')
  const out = path.join(DOCS, UI_ICON_DIR)
  mkdirSync(out, { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({
    colorScheme: 'light',
    deviceScaleFactor: 1,
    viewport: { width: 1280, height: 900 },
  })
  // COOKIE_NAME in src/features/CookieConsent.tsx.
  await context.addCookies([
    { name: 'cytoscapeWebCookieConsent', value: 'true', url: manualUrl },
  ])
  const page = await context.newPage()
  const icons = page.locator('[data-testid^="manual-ui-icon-"]')
  const captured = new Set<string>()
  for (const { slug } of MANUAL_PAGES) {
    if (!readPage(slug).includes('<UiIcon')) continue
    await page.goto(`${manualUrl}/manual/${slug}`)
    await icons.first().waitFor()
    for (const el of await icons.all()) {
      const testId = (await el.getAttribute('data-testid')) ?? ''
      const name = testId.replace('manual-ui-icon-', '')
      if (captured.has(name)) continue
      await el.scrollIntoViewIfNeeded()
      await el.screenshot({
        path: path.join(out, `${name}.png`),
        animations: 'disabled',
      })
      captured.add(name)
    }
  }
  await browser.close()
  console.log(`Captured ${captured.size} icons`)
}

console.log(`Wrote ${pages.length} pages to ${DOCS}`)
