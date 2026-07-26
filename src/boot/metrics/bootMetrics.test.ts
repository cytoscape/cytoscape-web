import { afterEach, describe, expect, it, vi } from 'vitest'

import { initializeDebug } from '../../debug'
import {
  BOOT_MARK_PREFIX,
  getBootMilestones,
  getBootSpans,
  markBoot,
  measureBoot,
  resetBootMetricsForTesting,
} from './bootMarks'
import { BOOT_REPORT_REQUESTED } from './bootFlags'
import {
  getBootReport,
  publishBootReport,
  resetBootReportForTesting,
} from './bootReport'

afterEach(() => {
  resetBootMetricsForTesting()
  resetBootReportForTesting()
  performance.clearMarks?.()
  performance.clearMeasures?.()
  vi.restoreAllMocks()
})

describe('markBoot', () => {
  it('records milestones in call order with a User Timing mark', () => {
    markBoot('shell-painted')
    markBoot('init-exec')

    expect(getBootMilestones().map((m) => m.name)).toEqual([
      'shell-painted',
      'init-exec',
    ])
    expect(
      performance.getEntriesByName(`${BOOT_MARK_PREFIX}shell-painted`, 'mark'),
    ).toHaveLength(1)
  })

  it('keeps the first time when the same milestone is marked twice', () => {
    // React StrictMode invokes effects twice in development; the second pass
    // must not overwrite the real timing.
    markBoot('app-shell-mounted')
    const first = getBootMilestones()[0].time

    markBoot('app-shell-mounted')

    expect(getBootMilestones()).toHaveLength(1)
    expect(getBootMilestones()[0].time).toBe(first)
  })

  it('survives a performance.mark that throws', () => {
    vi.spyOn(performance, 'mark').mockImplementation(() => {
      throw new Error('nope')
    })

    expect(() => markBoot('react-render')).not.toThrow()
    expect(getBootMilestones()).toHaveLength(1)
  })
})

describe('measureBoot', () => {
  it('records a span and emits a measure', () => {
    measureBoot('database', 10, 35)

    expect(getBootSpans()).toEqual([
      { name: 'database', startTime: 10, duration: 25, status: 'ok' },
    ])
    expect(
      performance.getEntriesByName(`${BOOT_MARK_PREFIX}database`, 'measure'),
    ).toHaveLength(1)
  })

  it('records failed spans distinctly', () => {
    measureBoot('imports', 5, 8, 'error')

    expect(getBootSpans()[0].status).toBe('error')
  })

  it('survives a performance.measure that throws', () => {
    vi.spyOn(performance, 'measure').mockImplementation(() => {
      throw new Error('no options-object form')
    })

    expect(() => measureBoot('workspace', 0, 5)).not.toThrow()
    expect(getBootSpans()).toHaveLength(1)
  })
})

describe('getBootReport', () => {
  it('derives intervals between consecutive milestones', () => {
    markBoot('shell-painted')
    markBoot('init-exec')
    markBoot('react-render')

    const { intervals, milestones } = getBootReport()

    expect(intervals.map((i) => `${i.from}->${i.to}`)).toEqual([
      'shell-painted->init-exec',
      'init-exec->react-render',
    ])
    // Intervals must reconstruct the timeline.
    const total = intervals.reduce((sum, i) => sum + i.durationMs, 0)
    expect(total).toBeCloseTo(milestones[2].time - milestones[0].time, 1)
  })

  it('includes build identity so a pasted report names its build', () => {
    const { build } = getBootReport()

    expect(build.version).not.toBe('')
    expect(build).toHaveProperty('commit')
    expect(build).toHaveProperty('buildTime')
  })

  it('tolerates an environment with no navigation or paint entries', () => {
    vi.spyOn(performance, 'getEntriesByType').mockReturnValue([])
    vi.spyOn(performance, 'getEntriesByName').mockReturnValue([])

    const report = getBootReport()

    expect(report.paint.firstContentfulPaintMs).toBeUndefined()
    expect(report.navigation.ttfbMs).toBeUndefined()
  })
})

describe('publishBootReport', () => {
  // registerDebugTool only attaches to window.debug while debug mode is on
  // (same contract as window.debug.db), so the tool tests must enable it.
  let stopDebug: (() => void) | undefined

  const enableDebug = (): void => {
    stopDebug = initializeDebug({
      defaultEnabled: true,
      enableRenderTracking: false,
    })
  }

  afterEach(() => {
    stopDebug?.()
    stopDebug = undefined
    localStorage.clear()
  })

  it('exposes a live report on window.debug.boot', () => {
    enableDebug()
    markBoot('shell-painted')
    publishBootReport()

    const tool = (window as any).debug?.boot
    expect(tool).toBeDefined()

    // Live getter, not a snapshot: milestones recorded after publish must show.
    markBoot('workspace-hydrated')
    expect(tool.report.milestones.map((m: any) => m.name)).toContain(
      'workspace-hydrated',
    )
  })

  it('only publishes once', () => {
    enableDebug()
    publishBootReport()
    const first = (window as any).debug?.boot
    publishBootReport()

    expect((window as any).debug?.boot).toBe(first)
  })

  it('renders no overlay unless ?bootReport is present', () => {
    publishBootReport()

    expect(document.getElementById('cyweb-boot-report')).toBeNull()
  })

  it('renders the overlay on demand via the debug tool', () => {
    enableDebug()
    markBoot('shell-painted')
    publishBootReport()
    ;(window as any).debug.boot.show()

    const overlay = document.getElementById('cyweb-boot-report')
    expect(overlay).not.toBeNull()
    expect(overlay?.textContent).toContain('shell-painted')
  })
})

describe('boot URL flags', () => {
  it('snapshots ?bootReport at module load rather than reading it later', () => {
    // The value has to be captured before AppShell's navigate() wipes the
    // search params, which is why it is a constant and not a function.
    expect(BOOT_REPORT_REQUESTED).toBe(false)

    window.history.replaceState({}, '', '/?bootReport')
    // Still false: re-reading the URL is exactly the bug this guards against.
    expect(BOOT_REPORT_REQUESTED).toBe(false)
    window.history.replaceState({}, '', '/')
  })
})
