// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  rowsOf,
  buildComparison,
  renderComparison,
  comparePageName,
} from './report-compare.mjs'

const stats = (p50: number, extra: Record<string, any> = {}) => ({
  p50,
  avg: p50,
  p99: p50 * 2,
  min: p50 * 0.8,
  samples: 100,
  ...extra,
})

const results = (
  benches: Array<[string, ReturnType<typeof stats>]>,
  harness = 'aaaa1111',
) => ({
  meta: {},
  jobs: [
    {
      suite: 'load',
      n: 2000,
      harness,
      groups: [
        {
          name: 'load: convert',
          benches: benches.map(([name, s]) => ({ name, stats: s })),
        },
      ],
    },
  ],
})

const run = (
  benches: Array<[string, ReturnType<typeof stats>]>,
  opts: Record<string, any> = {},
) => ({
  file: `results-${opts.date ?? '2026-01-01'}.json`,
  date: opts.date ?? '2026-01-01',
  commit: opts.commit ?? 'abc1234',
  fingerprint: opts.fingerprint ?? '2d2ea233',
  profile: 'quick',
  results: results(benches, opts.harness ?? 'aaaa1111'),
})

describe('rowsOf', () => {
  it('flattens jobs to keyed rows, skipping p50 <= 0', () => {
    const rows = rowsOf(
      results([
        ['convert', stats(100)],
        ['broken', stats(0)],
      ]),
    )

    const values = [...rows.values()]
    expect(values).toHaveLength(1)
    expect(values[0]).toMatchObject({
      suite: 'load',
      group: 'load: convert',
      bench: 'convert',
      p50: 100,
    })
  })
})

describe('buildComparison', () => {
  it('throws on mixed machine fingerprints', () => {
    expect(() =>
      buildComparison([
        run([['convert', stats(100)]], { fingerprint: 'aaaa' }),
        run([['convert', stats(100)]], { fingerprint: 'bbbb' }),
      ]),
    ).toThrow(/fingerprints/)
  })

  it('screens a mover against its own repeat band and finds its control twin', () => {
    const old = run(
      [
        ['convert', stats(100, { repeats: 3, repeatSpread: 1.05 })],
        ['control', stats(50, { repeats: 3, repeatSpread: 1.04 })],
      ],
      { date: '2026-01-01' },
    )
    const nowRun = run(
      [
        ['convert', stats(150, { repeats: 3, repeatSpread: 1.05 })],
        ['control', stats(50, { repeats: 3, repeatSpread: 1.04 })],
      ],
      { date: '2026-01-02' },
    )

    const cmp = buildComparison([old, nowRun])

    expect(cmp.movers.regressions).toHaveLength(1)
    const mover = cmp.movers.regressions[0]
    expect(mover.row.bench).toBe('convert')
    expect(mover.row.change).toBeCloseTo(1.5)
    // the control twin's change is the noise-control column
    expect(mover.controlBench).toBe('control')
    expect(mover.control).toBeCloseTo(1)
    // the control row itself never appears as a mover
    expect(
      cmp.movers.regressions.some((m: any) => m.row.bench === 'control'),
    ).toBe(false)
  })

  it('lists a one-shot mover as unscreened, not ranked', () => {
    const old = run([['boot', stats(100, { samples: 1 })]], {
      date: '2026-01-01',
    })
    const nowRun = run([['boot', stats(200, { samples: 1 })]], {
      date: '2026-01-02',
    })

    const cmp = buildComparison([old, nowRun])

    expect(cmp.movers.regressions).toHaveLength(0)
    expect(cmp.movers.unscreened).toHaveLength(1)
  })

  it('refuses a change across a harness break', () => {
    const old = run(
      [['convert', stats(100, { repeats: 3, repeatSpread: 1.02 })]],
      {
        date: '2026-01-01',
        harness: 'aaaa1111',
      },
    )
    const nowRun = run(
      [['convert', stats(200, { repeats: 3, repeatSpread: 1.02 })]],
      { date: '2026-01-02', harness: 'bbbb2222' },
    )

    const cmp = buildComparison([old, nowRun])
    const row = cmp.rows.find((r: any) => r.bench === 'convert')

    expect(row.epochBreak).toBe(true)
    expect(row.change).toBeNull()
    expect(cmp.movers.regressions).toHaveLength(0)
    expect(cmp.epochBreaks).toBeGreaterThan(0)
  })

  it('renders to standalone HTML', () => {
    const cmp = buildComparison([
      run([['convert', stats(100, { repeats: 3, repeatSpread: 1.05 })]], {
        date: '2026-01-01',
      }),
      run([['convert', stats(160, { repeats: 3, repeatSpread: 1.05 })]], {
        date: '2026-01-02',
      }),
    ])
    const html = renderComparison(cmp, {
      machine: 'test box',
      fingerprint: '2d2ea233',
    })

    expect(html).toContain('<!doctype html>')
    expect(html).toContain('load: convert')
  })
})

describe('comparePageName', () => {
  it('slugs fingerprint and profile', () => {
    expect(comparePageName('2d2ea233', 'quick')).toBe(
      'benchmark/compare-2d2ea233-quick.html',
    )
  })
})
