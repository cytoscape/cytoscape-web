// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { renderReport, fmtTime } from './report-html.mjs'

const stats = (p50: number, extra: Record<string, any> = {}) => ({
  min: p50 * 0.8,
  max: p50 * 3,
  p25: p50 * 0.9,
  p50,
  p75: p50 * 1.2,
  p99: p50 * 2,
  p999: p50 * 2.5,
  avg: p50 * 1.1,
  ticks: 1000,
  samples: 200,
  ...extra,
})

const canned = {
  meta: {
    date: '2026-08-26T12:00:00.000Z',
    commit: 'abc1234',
    branch: 'feature/benchmark',
    profile: 'quick',
    totalMs: 24000,
    failures: [],
    machine: {
      cpu: { model: 'Test CPU', physicalCores: 8, logicalCores: 16 },
      memory: { totalBytes: 32e9 },
      os: { platform: 'linux', arch: 'x64' },
      gpus: [],
      fingerprint: 'deadbeef',
    },
  },
  jobs: [
    {
      suite: 'load',
      n: 2000,
      durationMs: 12000,
      harness: 'aaaa1111',
      groups: [
        {
          name: 'load: convert',
          benches: [
            { name: 'createCyNetworkFromCx2', stats: stats(2_000_000) },
            { name: 'control', stats: stats(500_000) },
          ],
        },
        {
          name: 'load: validate',
          benches: [
            { name: 'structure', stats: stats(1_000) },
            { name: 'attributes', stats: stats(200_000) },
          ],
        },
      ],
    },
    {
      suite: 'load',
      n: 10000,
      durationMs: 30000,
      harness: 'aaaa1111',
      groups: [
        {
          name: 'load: convert',
          benches: [
            { name: 'createCyNetworkFromCx2', stats: stats(11_000_000) },
          ],
        },
      ],
    },
  ],
}

describe('renderReport', () => {
  const html = renderReport(canned as any)

  it('renders a standalone page with every row labelled', () => {
    expect(html).toContain('<!doctype html>')
    expect(html).toContain('Cytoscape Web benchmarks')
    expect(html).toContain('load: convert — createCyNetworkFromCx2')
    expect(html).toContain('load: validate — structure')
  })

  it('marks control rows as the frozen yardstick, never a speedup', () => {
    expect(html).toContain('control (frozen yardstick)')
    expect(html).not.toContain('faster than')
  })

  it('renders a p50 scaling table for a suite at multiple N', () => {
    expect(html).toContain('Scaling')
    expect(html).toContain('p50 @ N=10k')
  })

  it('shows machine provenance', () => {
    expect(html).toContain('Test CPU')
    expect(html).toContain('deadbeef')
  })

  it('survives an empty results file', () => {
    expect(renderReport({ meta: {}, jobs: [] } as any)).toContain(
      '<!doctype html>',
    )
  })
})

describe('fmtTime', () => {
  it('picks sensible units', () => {
    expect(fmtTime(950)).toBe('950 ns')
    expect(fmtTime(1500)).toBe('1.50 µs')
    expect(fmtTime(2_500_000)).toBe('2.50 ms')
    expect(fmtTime(3_000_000_000)).toBe('3.00 s')
  })
})
