#!/usr/bin/env node
// Measure how the full app loads and draws a fixed set of NDEx networks.
//
// Serves a production build (dist folder) on a local port, with every
// unknown path rewritten to index.html as the production server does, and
// drives it with Playwright. Each scenario runs --runs times in a fresh
// browser context (empty IndexedDB, so every network comes from NDEx); the
// report gives the median of each metric.
//
// Metrics, all in ms from the start of the scenario:
//   visible  every node is in the Cytoscape.js instance (or the Cell View
//            has its circles)
//   done     every edge is in the instance, and a frame has been drawn
//   settled  the end of the last long task before 3 s without one (gives
//            up after 60 s)
//   blocked  main-thread time in tasks over 50 ms, up to `settled`
//   p95/max  frame intervals up to `settled` (for `zoom`: while zooming)
//   fetch    first NDEx request start to last NDEx response end
//
// Usage:
//   npx vite build --outDir /tmp/full-bench
//   node scripts/bench-full-app.mjs --dist /tmp/full-bench [--runs 3]
//     [--headless] [--only das,root] [--json out.json]
//
// Headed by default: headless Chromium renders WebGL in software. The
// networks are public on dev1.ndexbio.org, so NDEx latency is in `visible`;
// `fetch` shows how much. Port 5504, so a dev server on 5500 can keep
// running.

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
const PORT = 5504
const QUIET_MS = 3000
const MAX_SETTLE_MS = 60000

if (!dist || !fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('--dist must name a folder with a built index.html')
  process.exit(1)
}

const HIERARCHY = '1366ba85-9acc-11ef-9702-005056ae6f73' // MuSIC v1, dev1
const MAIN = '[data-testid="workspace-editor-center-pane"]'
const SIDE = '[data-testid="workspace-editor-right-pane"]'

const SCENARIOS = [
  {
    name: 'wp1742',
    about: 'WP1742 TP53 network: 57 nodes, 34 edges, annotations',
    url: `/bench/networks/8ae4896f-5c68-11ec-b3be-0ac135e8bacf`,
    run: (page) => waitForNetwork(page, MAIN, 57, 34),
  },
  {
    name: 'das',
    about: 'DAS network: 336 nodes, 11,913 edges, 1.3 MB CX2',
    url: `/bench/networks/88521140-6a12-11ef-b816-005056ae6f73`,
    run: (page) => waitForNetwork(page, MAIN, 336, 11913),
  },
  {
    name: 'sars2',
    about: 'BioGRID SARS-CoV-2: 5,781 nodes, 19,488 edges, 13.5 MB CX2',
    url: `/bench/networks/6398ce70-cee6-11ea-aaef-0ac135e8bacf`,
    run: (page) => waitForNetwork(page, MAIN, 5781, 19488),
  },
  {
    name: 'zoom',
    about: 'DAS network: 20 wheel steps in, 20 out, after it settles',
    url: `/bench/networks/88521140-6a12-11ef-b816-005056ae6f73`,
    setup: async (page) => {
      await waitForNetwork(page, MAIN, 336, 11913)
      await waitForQuiet(page)
    },
    run: async (page) => {
      const box = await page.locator(MAIN).boundingBox()
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      for (const dy of [...Array(20).fill(-120), ...Array(20).fill(120)]) {
        await page.mouse.wheel(0, dy)
        await page.waitForTimeout(50)
      }
      const t = await now(page)
      return { visible: t, done: t, settled: t }
    },
  },
  {
    name: 'hierarchy',
    about: 'MuSIC v1 hierarchy: Cell View drawn',
    url: `/bench/networks/${HIERARCHY}`,
    run: async (page) => {
      await openCellView(page)
      const visible = await now(page)
      return { visible, done: visible, settled: await waitForQuiet(page) }
    },
  },
  {
    name: 'root',
    about: 'MuSIC v1 root clicked: 661 nodes, 21,921 edges',
    url: `/bench/networks/${HIERARCHY}`,
    setup: async (page) => {
      await openCellView(page)
      await waitForQuiet(page)
    },
    run: async (page) => {
      // The root circle sits behind its children; click near its top edge
      const point = await page.evaluate(() => {
        const r = document
          .querySelector('[data-testid="circle-packing-svg"] circle')
          .getBoundingClientRect()
        return { x: r.x + r.width / 2, y: r.y + r.height * 0.02 }
      })
      await page.mouse.click(point.x, point.y)
      return waitForNetwork(page, SIDE, 661, 21921)
    },
  },
  {
    name: 'cytoplasm',
    about: 'MuSIC v1 "Cytoplasm" clicked after the pointer rests on it 600 ms',
    url: `/bench/networks/${HIERARCHY}`,
    setup: async (page) => {
      await openCellView(page)
      await waitForQuiet(page)
      const point = await circlePoint(page, 'Cytoplasm')
      await page.mouse.move(point.x, point.y)
      await page.waitForTimeout(600)
    },
    run: async (page) => {
      const point = await circlePoint(page, 'Cytoplasm')
      await page.mouse.click(point.x, point.y)
      const counts = await expectedSubsystemCounts(page)
      return waitForNetwork(page, SIDE, counts.nodes, counts.edges)
    },
  },
]

/** Show the hierarchy's Cell View tab and wait for its circles. */
const openCellView = async (page) => {
  const tab = page.getByRole('tab', { name: 'Cell View' })
  await tab.waitFor({ timeout: 120000 })
  await tab.click()
  await page
    .locator('[data-testid="circle-packing-svg"] circle')
    .first()
    .waitFor({ timeout: 120000 })
}

/**
 * A point inside the Cell View circle whose subsystem is named `name`, above
 * its label: the label takes the clicks at the centre.
 */
const circlePoint = (page, name) =>
  page.evaluate((name) => {
    const circle = [
      ...document.querySelectorAll('[data-testid="circle-packing-svg"] circle'),
    ].find((c) => c.__data__?.data?.name === name)
    const r = circle.getBoundingClientRect()
    return { x: r.x + r.width / 2, y: r.y + r.height * 0.2 }
  }, name)

/**
 * The size of a subsystem network is not known up front: wait until the
 * side panel's instance has nodes, then until its counts stop changing.
 */
const expectedSubsystemCounts = async (page) => {
  let last = ''
  const start = Date.now()
  for (;;) {
    if (Date.now() - start > 120000) throw new Error('no subsystem network')
    const counts = await page.evaluate((sel) => {
      const cy = document.querySelector(`${sel} [data-testid="cyjs-renderer"]`)
        ?._cyreg?.cy
      return { nodes: cy?.nodes().length ?? 0, edges: cy?.edges().length ?? 0 }
    }, SIDE)
    const key = JSON.stringify(counts)
    if (counts.nodes > 0 && key === last) return counts
    last = key
    await page.waitForTimeout(250)
  }
}

const now = (page) => page.evaluate(() => performance.now())

/**
 * Times at which the instance under `container` first holds every node,
 * and every edge plus one drawn frame. Polled once per frame in the page.
 */
const waitForNetwork = async (page, container, nodes, edges) => {
  const times = await page.evaluate(
    ([sel, nodes, edges]) =>
      new Promise((resolve, reject) => {
        let visible
        const giveUp = performance.now() + 180000
        const tick = () => {
          if (performance.now() > giveUp) {
            reject(new Error(`${sel}: not every node and edge drawn`))
            return
          }
          const cy = document.querySelector(
            `${sel} [data-testid="cyjs-renderer"]`,
          )?._cyreg?.cy
          const t = performance.now()
          if (cy !== undefined && !cy.destroyed()) {
            if (visible === undefined && cy.nodes().length >= nodes) visible = t
            if (visible !== undefined && cy.edges().length >= edges) {
              requestAnimationFrame(() =>
                resolve({ visible, done: performance.now() }),
              )
              return
            }
          }
          requestAnimationFrame(tick)
        }
        tick()
      }),
    [container, nodes, edges],
  )
  return { ...times, settled: await waitForQuiet(page) }
}

/**
 * The end of the last long task, once none has started for QUIET_MS, or
 * after MAX_SETTLE_MS of waiting.
 */
const waitForQuiet = async (page) => {
  const start = Date.now()
  for (;;) {
    const [t, lastEnd] = await page.evaluate(() => {
      const ends = window.__longTasks.map(([s, d]) => s + d)
      return [performance.now(), Math.max(0, ...ends)]
    })
    if (t - lastEnd >= QUIET_MS || Date.now() - start > MAX_SETTLE_MS) {
      return lastEnd
    }
    await page.waitForTimeout(500)
  }
}

const serve = () =>
  http
    .createServer((req, res) => {
      let file = path.join(dist, decodeURIComponent(req.url.split('?')[0]))
      if (
        !file.startsWith(path.resolve(dist)) ||
        !fs.existsSync(file) ||
        fs.statSync(file).isDirectory()
      ) {
        file = path.join(dist, 'index.html')
      }
      const type =
        {
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.html': 'text/html',
          '.json': 'application/json',
          '.svg': 'image/svg+xml',
          '.wasm': 'application/wasm',
        }[path.extname(file)] ?? 'application/octet-stream'
      res.writeHead(200, { 'Content-Type': type })
      fs.createReadStream(file).pipe(res)
    })
    .listen(PORT)

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

const runOnce = async (browser, scenario) => {
  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
  })
  const page = await context.newPage()
  await page.addInitScript(() => {
    localStorage.setItem(
      'cyweb.onboarding',
      JSON.stringify({
        hasSeenWelcome: true,
        completedTours: [],
        dismissedHints: [],
      }),
    )
    window.__longTasks = []
    new PerformanceObserver((list) =>
      list
        .getEntries()
        .forEach((e) => window.__longTasks.push([e.startTime, e.duration])),
    ).observe({ type: 'longtask', buffered: true })
  })
  const start = Date.now()
  await page.goto(`http://localhost:${PORT}${scenario.url}`)
  // The consent banner covers the bottom of the page
  page
    .locator('[data-testid="cookie-consent-decline-button"]')
    .click({ timeout: 60000 })
    .catch(() => {})
  if (scenario.setup) await scenario.setup(page)
  // Scenario time starts here: at navigation, or after setup
  const t0 = scenario.setup ? await now(page) : 0
  await page.evaluate(() => {
    window.__frames = []
    let last = performance.now()
    const tick = (t) => {
      window.__frames.push([t, t - last])
      last = t
      window.__raf = requestAnimationFrame(tick)
    }
    window.__raf = requestAnimationFrame(tick)
  })
  const { visible, done, settled } = await scenario.run(page)
  const end = Math.max(done, settled)
  const stats = await page.evaluate(
    ([from, to]) => {
      cancelAnimationFrame(window.__raf)
      const frames = window.__frames
        .filter(([t]) => t <= to)
        .map(([, d]) => d)
        .sort((a, b) => a - b)
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
    [t0, end],
  )
  await context.close()
  if (Date.now() - start > 240000) throw new Error('scenario timed out')
  return {
    visible: visible - t0,
    done: done - t0,
    settled: Math.max(0, end - t0),
    ...stats,
  }
}

const server = serve()
const browser = await chromium.launch({ headless })
const results = {}
try {
  for (const scenario of SCENARIOS) {
    if (only && !only.includes(scenario.name)) continue
    const samples = []
    console.error(`${scenario.name}...`)
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
