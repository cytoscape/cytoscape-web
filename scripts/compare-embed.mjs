#!/usr/bin/env node
// Compare how the embed and the full app draw the same NDEx networks.
//
// For each UUID, both pages load the network and the script reads their
// Cytoscape.js instances: the full app's from window.debug.cy, the embed's
// from window.__embedCy (dev server only). It compares every element's
// computed style and, when the network has saved positions, each node's
// position. It writes report.html with both renders side by side.
//
// cy.png() draws only Cytoscape's own canvas, so annotations are not in the
// images.
//
// Usage:
//   node scripts/compare-embed.mjs [--app http://localhost:5500]
//     [--embed http://localhost:5502] [--out dir] <uuid> [<uuid> ...]
//
// Needs the embed dev server (npx vite --config vite.embed.config.ts) and a
// full app on --app. Exits 1 when any network differs.

import fs from 'node:fs'
import path from 'node:path'

import { chromium } from 'playwright'

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const i = args.indexOf(name)
  if (i === -1) return fallback
  const [, value] = args.splice(i, 2)
  return value
}
const appUrl = option('--app', 'http://localhost:5500')
const embedUrl = option('--embed', 'http://localhost:5502')
const outDir = path.resolve(option('--out', 'test-results/compare-embed'))
const ids = args

if (ids.length === 0) {
  console.error('Usage: node scripts/compare-embed.mjs [options] <uuid> ...')
  process.exit(2)
}

const LOAD_TIMEOUT = 60_000
const POSITION_TOLERANCE = 0.01
const MAX_EXAMPLES = 5

// Runs in the page: wait until `getCy()` has `count` elements whose
// positions hold still for one interval (a layout may still be running).
const waitForStableCy = async (page, getCySource, count) => {
  await page.waitForFunction(
    ({ src, count }) => {
      const cy = new Function(`return ${src}`)()
      if (!cy || cy.elements().length !== count) return false
      const key = cy
        .nodes()
        .map((n) => `${n.position('x')},${n.position('y')}`)
        .join(';')
      const stable = window.__lastPositions === key
      window.__lastPositions = key
      return stable
    },
    { src: getCySource, count },
    { timeout: LOAD_TIMEOUT, polling: 500 },
  )
}

// Runs in the page: every element's style and position, plus a PNG.
const snapshot = (page, getCySource) =>
  page.evaluate((src) => {
    const cy = new Function(`return ${src}`)()
    const elements = {}
    cy.elements().forEach((ele) => {
      elements[ele.id()] = {
        style: ele.style(),
        position: ele.isNode() ? ele.position() : undefined,
      }
    })
    return {
      elements,
      png: cy.png({ full: true, maxWidth: 700, maxHeight: 700, bg: '#fff' }),
    }
  }, getCySource)

const compare = (app, embed, comparePositions) => {
  const styleDiffs = new Map()
  const positionDiffs = []
  const onlyIn = { app: [], embed: [] }

  for (const id of Object.keys(app.elements)) {
    if (!(id in embed.elements)) onlyIn.app.push(id)
  }
  for (const [id, e] of Object.entries(embed.elements)) {
    const a = app.elements[id]
    if (a === undefined) {
      onlyIn.embed.push(id)
      continue
    }
    for (const prop of new Set([
      ...Object.keys(a.style),
      ...Object.keys(e.style),
    ])) {
      if (a.style[prop] === e.style[prop]) continue
      const list = styleDiffs.get(prop) ?? []
      list.push({ id, app: a.style[prop], embed: e.style[prop] })
      styleDiffs.set(prop, list)
    }
    if (
      comparePositions &&
      a.position &&
      (Math.abs(a.position.x - e.position.x) > POSITION_TOLERANCE ||
        Math.abs(a.position.y - e.position.y) > POSITION_TOLERANCE)
    ) {
      positionDiffs.push({ id, app: a.position, embed: e.position })
    }
  }
  return { styleDiffs, positionDiffs, onlyIn }
}

const escape = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  )

fs.mkdirSync(outDir, { recursive: true })
const browser = await chromium.launch()
const sections = []
let anyDiff = false

for (const id of ids) {
  const embedPage = await browser.newPage()
  await embedPage.goto(`${embedUrl}/embed/${id}`)
  await embedPage.waitForFunction(
    () =>
      window.__embedCy || document.querySelector('[data-testid=embed-error]'),
    undefined,
    { timeout: LOAD_TIMEOUT },
  )
  const embedError = await embedPage.evaluate(
    () =>
      document.querySelector('[data-testid=embed-error]')?.textContent ?? null,
  )
  if (embedError !== null) {
    console.log(`${id}: skipped, embed shows "${embedError}"`)
    sections.push(
      `<section><h2>${escape(id)} — skipped</h2><p>Embed shows: ${escape(embedError)}</p></section>`,
    )
    await embedPage.close()
    continue
  }
  const count = await embedPage.evaluate(
    () => window.__embedCy.elements().length,
  )
  await waitForStableCy(embedPage, 'window.__embedCy', count)
  const embed = await snapshot(embedPage, 'window.__embedCy')
  const hasLayout = await embedPage.evaluate(
    () => window.__embedSummary?.hasLayout,
  )
  await embedPage.close()

  const appPage = await browser.newPage({
    viewport: { width: 1400, height: 900 },
  })
  // Puts the Cytoscape instance on window.debug.cy, in dev and prod builds.
  await appPage.addInitScript(() =>
    localStorage.setItem('cyweb-debug-enabled', 'true'),
  )
  await appPage.goto(`${appUrl}/0/networks/${id}`)
  await waitForStableCy(appPage, 'window.debug?.cy', count)
  const app = await snapshot(appPage, 'window.debug.cy')
  await appPage.close()

  const { styleDiffs, positionDiffs, onlyIn } = compare(
    app,
    embed,
    hasLayout !== false,
  )
  const differs =
    styleDiffs.size > 0 ||
    positionDiffs.length > 0 ||
    onlyIn.app.length > 0 ||
    onlyIn.embed.length > 0
  anyDiff ||= differs

  console.log(
    `${id}: ${count} elements, ${differs ? 'DIFFERS' : 'same'}` +
      (hasLayout === false ? ' (no saved layout; positions not compared)' : ''),
  )
  for (const [prop, list] of styleDiffs) {
    const ex = list[0]
    console.log(
      `  style ${prop}: ${list.length} elements, e.g. ${ex.id} app=${ex.app} embed=${ex.embed}`,
    )
  }
  if (positionDiffs.length > 0) {
    const ex = positionDiffs[0]
    console.log(
      `  position: ${positionDiffs.length} nodes, e.g. ${ex.id} app=${JSON.stringify(ex.app)} embed=${JSON.stringify(ex.embed)}`,
    )
  }
  if (onlyIn.app.length > 0)
    console.log(`  only in app: ${onlyIn.app.slice(0, MAX_EXAMPLES)}`)
  if (onlyIn.embed.length > 0)
    console.log(`  only in embed: ${onlyIn.embed.slice(0, MAX_EXAMPLES)}`)

  const rows = [...styleDiffs]
    .map(
      ([prop, list]) =>
        `<tr><td>${escape(prop)}</td><td>${list.length}</td><td>${list
          .slice(0, MAX_EXAMPLES)
          .map(
            (d) =>
              `${escape(d.id)}: app <code>${escape(d.app)}</code> embed <code>${escape(d.embed)}</code>`,
          )
          .join('<br>')}</td></tr>`,
    )
    .join('')
  sections.push(`
    <section>
      <h2>${escape(id)} — ${differs ? 'differs' : 'same'}</h2>
      <div class="pair">
        <figure><img src="${app.png}"><figcaption>Full app</figcaption></figure>
        <figure><img src="${embed.png}"><figcaption>Embed</figcaption></figure>
      </div>
      ${rows ? `<table><tr><th>Style property</th><th>Elements</th><th>Examples</th></tr>${rows}</table>` : ''}
      ${positionDiffs.length ? `<p>${positionDiffs.length} nodes at different positions.</p>` : ''}
    </section>`)
}

await browser.close()

const reportPath = path.join(outDir, 'report.html')
fs.writeFileSync(
  reportPath,
  `<!doctype html><meta charset="utf-8"><title>Embed vs full app</title>
<style>
  body { font: 14px system-ui, sans-serif; margin: 16px; }
  .pair { display: flex; gap: 16px; flex-wrap: wrap; }
  figure { margin: 0; border: 1px solid #ddd; }
  img { display: block; max-width: 100%; }
  figcaption { padding: 4px 8px; background: #f5f5f5; }
  table { border-collapse: collapse; margin-top: 8px; }
  td, th { border: 1px solid #ddd; padding: 4px 8px; text-align: left; vertical-align: top; }
</style>
<h1>Embed vs full app</h1>${sections.join('')}`,
)
console.log(`Report: ${reportPath}`)
process.exit(anyDiff ? 1 : 0)
