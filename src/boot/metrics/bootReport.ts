import { isDebugEnabled, logPerformance, registerDebugTool } from '@/debug'
import { BOOT_REPORT_REQUESTED } from './bootFlags'
import {
  bootNow,
  getBootMilestones,
  getBootSpans,
  type BootMilestoneRecord,
  type BootSpanRecord,
} from './bootMarks'

// Assembles the boot timeline into something a human can read, and folds in
// the metrics the browser already computes for free (FCP, TTFB, transfer
// sizes) so "did first paint regress?" is answerable from inside the app
// rather than only by hand in DevTools.
//
// REACT_APP_* are Vite `define` constants (see src/custom.d.ts).

export interface BootReport {
  build: {
    version: string
    commit: string
    buildTime: string
  }
  navigation: {
    /** Time to first byte. */
    ttfbMs?: number
    domContentLoadedMs?: number
    loadMs?: number
    transferBytes?: number
  }
  paint: {
    firstPaintMs?: number
    firstContentfulPaintMs?: number
  }
  milestones: BootMilestoneRecord[]
  spans: BootSpanRecord[]
  /** Gaps between consecutive milestones — where the boot time actually went. */
  intervals: Array<{ from: string; to: string; durationMs: number }>
  totalMs: number
}

const round = (value: number): number => Math.round(value * 10) / 10

const navigationEntry = (): PerformanceNavigationTiming | undefined => {
  try {
    return performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined
  } catch {
    return undefined
  }
}

const paintTime = (name: string): number | undefined => {
  try {
    const entry = performance.getEntriesByName(name, 'paint')[0]
    return entry === undefined ? undefined : round(entry.startTime)
  } catch {
    return undefined
  }
}

export const getBootReport = (): BootReport => {
  const milestones = getBootMilestones().map((m) => ({
    ...m,
    time: round(m.time),
  }))
  const nav = navigationEntry()

  const intervals = milestones.slice(1).map((m, i) => ({
    from: milestones[i].name,
    to: m.name,
    durationMs: round(m.time - milestones[i].time),
  }))

  return {
    build: {
      version:
        typeof REACT_APP_VERSION !== 'undefined'
          ? REACT_APP_VERSION
          : 'unknown',
      commit: process.env.REACT_APP_GIT_COMMIT ?? 'unknown',
      buildTime:
        typeof REACT_APP_BUILD_TIME !== 'undefined'
          ? REACT_APP_BUILD_TIME
          : 'unknown',
    },
    navigation: {
      ttfbMs: nav === undefined ? undefined : round(nav.responseStart),
      domContentLoadedMs:
        nav === undefined ? undefined : round(nav.domContentLoadedEventEnd),
      loadMs:
        nav === undefined || nav.loadEventEnd === 0
          ? undefined
          : round(nav.loadEventEnd),
      transferBytes: nav?.transferSize,
    },
    paint: {
      firstPaintMs: paintTime('first-paint'),
      firstContentfulPaintMs: paintTime('first-contentful-paint'),
    },
    milestones,
    spans: getBootSpans().map((s) => ({
      ...s,
      startTime: round(s.startTime),
      duration: round(s.duration),
    })),
    intervals,
    totalMs: round(milestones.at(-1)?.time ?? bootNow()),
  }
}

const OVERLAY_ID = 'cyweb-boot-report'

/**
 * Renders the report as a fixed panel. Plain DOM on purpose — this has to be
 * able to render when the reason you are looking at it is that React did not.
 */
const renderOverlay = (report: BootReport): void => {
  if (document.getElementById(OVERLAY_ID) !== null) {
    return
  }

  const row = (label: string, value: string): string =>
    `<tr><td style="padding:1px 10px 1px 0;white-space:nowrap">${label}</td><td style="text-align:right">${value}</td></tr>`

  const panel = document.createElement('div')
  panel.id = OVERLAY_ID
  panel.setAttribute(
    'style',
    [
      'position:fixed',
      'right:12px',
      'bottom:12px',
      'z-index:2147483647',
      'background:rgba(20,20,22,.94)',
      'color:#e8e8ea',
      'font:11px/1.5 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
      'padding:10px 12px',
      'border-radius:6px',
      'box-shadow:0 4px 16px rgba(0,0,0,.4)',
      'max-height:70vh',
      'overflow:auto',
    ].join(';'),
  )

  panel.innerHTML = `
    <div style="display:flex;gap:10px;align-items:baseline;margin-bottom:6px">
      <strong style="color:#ea9123">boot report</strong>
      <span style="opacity:.6">v${report.build.version} · ${report.build.commit}</span>
    </div>
    <table style="border-collapse:collapse">
      ${row('first paint', `${report.paint.firstPaintMs ?? '—'} ms`)}
      ${row('first contentful paint', `${report.paint.firstContentfulPaintMs ?? '—'} ms`)}
      ${row('ttfb', `${report.navigation.ttfbMs ?? '—'} ms`)}
      <tr><td colspan="2" style="padding-top:6px;opacity:.6">milestones</td></tr>
      ${report.milestones.map((m) => row(m.name, `${m.time} ms`)).join('')}
      <tr><td colspan="2" style="padding-top:6px;opacity:.6">intervals</td></tr>
      ${report.intervals
        .map((i) => row(`${i.from} → ${i.to}`, `${i.durationMs} ms`))
        .join('')}
      ${
        report.spans.length === 0
          ? ''
          : `<tr><td colspan="2" style="padding-top:6px;opacity:.6">phases</td></tr>` +
            report.spans
              .map((s) =>
                row(
                  s.status === 'error' ? `${s.name} (failed)` : s.name,
                  `${s.duration} ms`,
                ),
              )
              .join('')
      }
    </table>`

  document.body.appendChild(panel)
}

let finalized = false

/**
 * Publishes the boot report once the boot has reached its last milestone:
 * always on `window.debug.boot`, logged when debug mode is on, and rendered as
 * an overlay when `?bootReport` is present.
 */
export const publishBootReport = (): void => {
  if (finalized) {
    return
  }
  finalized = true

  const report = getBootReport()

  // Live getter, not a snapshot — later spans (lazy chunks, app mounts) keep
  // accumulating after this runs.
  registerDebugTool('boot', {
    get report() {
      return getBootReport()
    },
    show: () => {
      renderOverlay(getBootReport())
    },
  })

  if (isDebugEnabled()) {
    logPerformance.info(
      `[boot]: interactive in ${report.totalMs}ms ` +
        `(fcp ${report.paint.firstContentfulPaintMs ?? '?'}ms)`,
      report,
    )
  }

  // Snapshotted at first-chunk load: by the time this runs, AppShell's
  // navigate() has already stripped every search param from the URL.
  if (BOOT_REPORT_REQUESTED) {
    renderOverlay(report)
  }
}

export const resetBootReportForTesting = (): void => {
  finalized = false
  document.getElementById(OVERLAY_ID)?.remove()
}
