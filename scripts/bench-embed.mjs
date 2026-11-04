#!/usr/bin/env node
// Measure how the embed loads and draws a fixed set of NDEx networks.
//
// Serves a built embed (dist folder) on a local port, with /embed/<uuid>
// rewritten to embed.html as the production server does, and drives it with
// Playwright. Each scenario runs --runs times in a fresh page; the report
// gives the median of each metric.
//
// Metrics, all in ms from the start of the scenario:
//   visible  the network's canvas (or the Cell View) is in the page
//   done     every edge is drawn: the progress bar has gone
//   blocked  main-thread time in tasks over 50 ms (Long Tasks API)
//   p95/max  frame intervals while the scenario runs
//   fetch    first NDEx request start to last NDEx response end
//
// Usage:
//   VITE_EMBED_MAX_ELEMENTS=200000 npx vite build \
//     --config vite.embed.config.ts --outDir /tmp/embed-bench
//   node scripts/bench-embed.mjs --dist /tmp/embed-bench [--runs 3]
//     [--headless] [--only root,das] [--json out.json]
//
// The scenarios marked `large` are over the embed's default 10,000-element
// limit; build with VITE_EMBED_MAX_ELEMENTS raised to draw them.
//
// Headed by default: headless Chromium renders WebGL in software, which
// misstates the WebGL path. The networks are public on dev1.ndexbio.org,
// so NDEx latency is in `visible`; `fetch` shows how much.

import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'

import { chromium } from 'playwright'

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const i = args.indexOf(name)
  return i === -1 ? fallback : args[i + 1]
}
const dist = option('--dist')
const runs = Number(option('--runs', '3'))
const headless = args.includes('--headless')
const only = option('--only')?.split(',')
const jsonOut = option('--json')
const PORT = 5503

if (!dist || !fs.existsSync(path.join(dist, 'embed.html'))) {
  console.error('--dist must name a folder with a built embed.html')
  process.exit(1)
}

const HIERARCHY = '1366ba85-9acc-11ef-9702-005056ae6f73' // MuSIC v1, dev1
const SCENARIOS = [
  {
    name: 'wp1742',
    about: 'WP1742 TP53 network: 57 nodes, 34 edges, annotations',
    url: '/embed/8ae4896f-5c68-11ec-b3be-0ac135e8bacf',
    run: (page) => waitForNetwork(page, 'embed-canvas'),
  },
  {
    name: 'das',
    about: 'DAS network: 336 nodes, 11,913 edges, 1.3 MB CX2 (WebGL)',
    large: true,
    url: '/embed/88521140-6a12-11ef-b816-005056ae6f73',
    run: (page) => waitForNetwork(page, 'embed-canvas'),
  },
  {
    name: 'sars2',
    about: 'BioGRID SARS-CoV-2: 5,781 nodes, 19,488 edges, 13.5 MB CX2',
    url: '/embed/6398ce70-cee6-11ea-aaef-0ac135e8bacf',
    large: true,
    run: (page) => waitForNetwork(page, 'embed-canvas'),
  },
  {
    name: 'celegans',
    about: 'BioGRID C. elegans: 8,790 nodes, 39,516 edges, 15 MB CX2',
    url: '/embed/eead7d32-23da-11e8-b939-0ac135e8bacf',
    large: true,
    run: (page) => waitForNetwork(page, 'embed-canvas'),
  },
  {
    name: 'mouse',
    about: 'BioGRID M. musculus: 17,260 nodes, 86,296 edges, 29.5 MB CX2',
    url: '/embed/52d57bf9-23dc-11e8-b939-0ac135e8bacf',
    large: true,
    run: (page) => waitForNetwork(page, 'embed-canvas'),
  },
  {
    name: 'hierarchy',
    about: 'MuSIC v1 hierarchy: Cell View built',
    url: `/embed/${HIERARCHY}`,
    run: async (page) => {
      await page
        .locator('[data-testid="embed-cell-view"] circle')
        .first()
        .waitFor({ timeout: 120000 })
      const visible = await now(page)
      return { visible, done: visible }
    },
  },
  {
    name: 'root',
    about: 'MuSIC v1 root "Cell" clicked: 661 nodes, 21,921 edges (WebGL)',
    url: `/embed/${HIERARCHY}`,
    setup: async (page) => {
      await page
        .locator('[data-testid="embed-cell-view"] circle')
        .first()
        .waitFor({ timeout: 120000 })
      await page.waitForTimeout(1500)
    },
    run: async (page) => {
      // The root circle sits behind its children; click near its top edge
      const point = await page.evaluate(() => {
        const r = document
          .querySelector('[data-testid="embed-cell-view"] circle')
          .getBoundingClientRect()
        return { x: r.x + r.width / 2, y: r.y + r.height * 0.04 }
      })
      await page.mouse.click(point.x, point.y)
      return waitForNetwork(page, 'embed-subsystem-canvas')
    },
  },
  {
    name: 'cytoplasm',
    about:
      'MuSIC v1 "Cytoplasm" clicked after the pointer rests on it for 600 ms',
    url: `/embed/${HIERARCHY}`,
    setup: async (page) => {
      await page
        .locator('[data-testid="embed-cell-view"] circle')
        .first()
        .waitFor({ timeout: 120000 })
      await page.waitForTimeout(1500)
      const point = await circleCentre(page, 'Cytoplasm')
      await page.mouse.move(point.x, point.y)
      await page.waitForTimeout(600)
    },
    run: async (page) => {
      const point = await circleCentre(page, 'Cytoplasm')
      await page.mouse.click(point.x, point.y)
      return waitForNetwork(page, 'embed-subsystem-canvas')
    },
  },
]

/** Centre of the Cell View circle whose tooltip is `name`. */
const circleCentre = (page, name) =>
  page.evaluate((name) => {
    const circle = [
      ...document.querySelectorAll('[data-testid="embed-cell-view"] circle'),
    ].find((c) => c.querySelector('title')?.textContent === name)
    const r = circle.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 }
  }, name)

const now = (page) => page.evaluate(() => performance.now())

/** Wait for a network canvas, then for its edge progress bar to go. */
const waitForNetwork = async (page, testId) => {
  await page
    .locator(`[data-testid="${testId}"]`)
    .waitFor({ state: 'attached', timeout: 180000 })
  const visible = await now(page)
  // The progress bar mounts a frame after the canvas
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  )
  await page
    .locator(`[data-testid="${testId}-progress"]`)
    .waitFor({ state: 'detached', timeout: 180000 })
  return { visible, done: await now(page) }
}

const serve = () =>
  http
    .createServer((req, res) => {
      let url = req.url.split('?')[0]
      if (/^\/embed\/[^/]+\/?$/.test(url)) url = '/embed.html'
      const file = path.join(dist, decodeURIComponent(url))
      if (!file.startsWith(path.resolve(dist)) || !fs.existsSync(file)) {
        res.writeHead(404).end()
        return
      }
      const type = file.endsWith('.js')
        ? 'text/javascript'
        : file.endsWith('.css')
          ? 'text/css'
          : file.endsWith('.html')
            ? 'text/html'
            : 'application/octet-stream'
      res.writeHead(200, { 'Content-Type': type })
      fs.createReadStream(file).pipe(res)
    })
    .listen(PORT)

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const runOnce = async (browser, scenario) => {
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } })
  await page.addInitScript(() => {
    window.__longTasks = []
    new PerformanceObserver((list) =>
      list
        .getEntries()
        .forEach((e) => window.__longTasks.push([e.startTime, e.duration])),
    ).observe({ type: 'longtask', buffered: true })
  })
  const start = Date.now()
  await page.goto(`http://localhost:${PORT}${scenario.url}`)
  if (scenario.setup) await scenario.setup(page)
  // Scenario time starts here: at navigation, or after setup
  const t0 = scenario.setup ? await now(page) : 0
  await page.evaluate(() => {
    window.__frames = []
    let last = performance.now()
    const tick = (t) => {
      window.__frames.push(t - last)
      last = t
      window.__raf = requestAnimationFrame(tick)
    }
    window.__raf = requestAnimationFrame(tick)
  })
  const { visible, done } = await scenario.run(page)
  const stats = await page.evaluate(
    ([from, to]) => {
      cancelAnimationFrame(window.__raf)
      const frames = [...window.__frames].sort((a, b) => a - b)
      const blocked = window.__longTasks
        .filter(([s]) => s >= from && s <= to)
        .reduce((sum, [, d]) => sum + d, 0)
      const ndex = performance
        .getEntriesByType('resource')
        .filter((e) => /ndexbio/.test(e.name) && e.startTime >= from)
      const fetch =
        ndex.length === 0
          ? 0
          : Math.max(...ndex.map((e) => e.responseEnd)) -
            Math.min(...ndex.map((e) => e.startTime))
      return {
        blocked,
        p95: frames[Math.floor(frames.length * 0.95)] ?? 0,
        max: frames[frames.length - 1] ?? 0,
        fetch,
      }
    },
    [t0, done],
  )
  await page.close()
  if (Date.now() - start > 170000) throw new Error('scenario timed out')
  return { visible: visible - t0, done: done - t0, ...stats }
}

const server = serve()
const browser = await chromium.launch({ headless })
const results = {}
try {
  for (const scenario of SCENARIOS) {
    if (only && !only.includes(scenario.name)) continue
    const samples = []
    for (let i = 0; i < runs; i++)
      samples.push(await runOnce(browser, scenario))
    const keys = Object.keys(samples[0])
    results[scenario.name] = Object.fromEntries(
      keys.map((k) => [k, Math.round(median(samples.map((s) => s[k])))]),
    )
    console.log(
      scenario.name.padEnd(10),
      keys.map((k) => `${k} ${results[scenario.name][k]}`).join('  '),
      `  (${scenario.about})`,
    )
  }
} finally {
  await browser.close()
  server.close()
}
if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify(results, null, 2))
