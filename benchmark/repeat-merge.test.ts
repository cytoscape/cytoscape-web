// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { mergeRepeats } from './repeat-merge.mjs'

const job = (groups: any[], extra: Record<string, any> = {}) => ({
  suite: 'load',
  n: 2000,
  op: null,
  context: {},
  durationMs: 100,
  groups,
  ...extra,
})

const row = (p50: number, extra: Record<string, any> = {}) => ({
  p50,
  p25: p50 * 0.9,
  p99: p50 * 2,
  avg: p50 * 1.1,
  min: p50 * 0.8,
  max: p50 * 3,
  samples: 100,
  ...extra,
})

const oneBench = (p50: number) =>
  job([{ name: 'g', benches: [{ name: 'b', stats: row(p50) }] }])

describe('mergeRepeats', () => {
  it('returns null for no runs and the run itself for one', () => {
    expect(mergeRepeats([])).toBeNull()
    expect(mergeRepeats([null, null])).toBeNull()

    const only = oneBench(10)
    expect(mergeRepeats([only, null])).toBe(only)
  })

  it('picks the median repeat whole, never a per-key mixture', () => {
    const runs = [oneBench(30), oneBench(10), oneBench(20)]
    const merged = mergeRepeats(runs)!
    const stats = merged.groups[0].benches[0].stats

    expect(stats.p50).toBe(20)
    // the whole stats object comes from the p50=20 repeat
    expect(stats.p99).toBe(40)
    expect(stats.min).toBe(16)
  })

  it('takes the HIGH side of an even count', () => {
    const merged = mergeRepeats([oneBench(10), oneBench(30)])!

    expect(merged.groups[0].benches[0].stats.p50).toBe(30)
  })

  it('records repeats and repeatSpread per row', () => {
    const merged = mergeRepeats([oneBench(10), oneBench(15), oneBench(12)])!
    const stats = merged.groups[0].benches[0].stats

    expect(stats.repeats).toBe(3)
    expect(stats.repeatSpread).toBeCloseTo(1.5)
  })

  it('keeps a row only some repeats emitted, with its own repeats count', () => {
    const withExtra = job([
      {
        name: 'g',
        benches: [
          { name: 'b', stats: row(10) },
          { name: 'rare', stats: row(5) },
        ],
      },
    ])
    const merged = mergeRepeats([oneBench(20), withExtra, oneBench(30)])!
    const rare = merged.groups[0].benches.find((b: any) => b.name === 'rare')

    expect(rare).toBeDefined()
    expect(rare.stats.repeats).toBe(1)
  })

  it('sums durationMs across the passes', () => {
    const merged = mergeRepeats([oneBench(10), oneBench(20), oneBench(30)])!

    expect(merged.durationMs).toBe(300)
  })
})
