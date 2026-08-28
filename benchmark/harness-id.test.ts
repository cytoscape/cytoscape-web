// @vitest-environment node
import { describe, it, expect } from 'vitest'
import {
  normaliseInput,
  harnessHash,
  sameEpoch,
  auditEquivalences,
  concurrentHash,
} from './harness-id.mjs'

describe('normaliseInput', () => {
  it('ignores comments and formatting', () => {
    const a = `// a comment\nconst x = f( 1, 2 );  /* block */\n`
    const b = `const x=f(1,2);`

    expect(normaliseInput(a)).toBe(normaliseInput(b))
  })

  it('spares URLs from line-comment stripping', () => {
    const withUrl = `const u = 'https://example.org/x'`

    expect(normaliseInput(withUrl)).toContain('example.org')
  })

  it('sees a token change', () => {
    expect(normaliseInput('f(1)')).not.toBe(normaliseInput('f(2)'))
  })
})

describe('harnessHash', () => {
  const read = (files: Record<string, string>) => (path: string) =>
    files[path] ?? null

  it('is stable across reformats and changes on token edits', () => {
    const base = { 'benchmark/x.mjs': 'const a = f(1)' }
    const reformatted = { 'benchmark/x.mjs': 'const a=f( 1 )  // hi' }
    const changed = { 'benchmark/x.mjs': 'const a = f(2)' }

    expect(harnessHash('x.mjs', read(base))).toBe(
      harnessHash('x.mjs', read(reformatted)),
    )
    expect(harnessHash('x.mjs', read(base))).not.toBe(
      harnessHash('x.mjs', read(changed)),
    )
  })

  it('follows ./ imports but not ../ imports', () => {
    const withDep = {
      'benchmark/x.mjs': "import './dep.mjs'\nimport '../src/app'\nf()",
      'benchmark/dep.mjs': 'const d = 1',
    }
    const depChanged = {
      ...withDep,
      'benchmark/dep.mjs': 'const d = 2',
    }

    expect(harnessHash('x.mjs', read(withDep))).not.toBe(
      harnessHash('x.mjs', read(depChanged)),
    )
  })

  it('returns null when the suite file is unreadable', () => {
    expect(harnessHash('missing.mjs', read({}))).toBeNull()
  })
})

describe('concurrentHash', () => {
  it('leaves a serial run alone and forks a concurrent one', () => {
    expect(concurrentHash('abcd1234', 1)).toBe('abcd1234')
    expect(concurrentHash('abcd1234', 4)).not.toBe('abcd1234')
    expect(concurrentHash('abcd1234', 4)).toBe(concurrentHash('abcd1234', 4))
  })
})

describe('sameEpoch', () => {
  it('equal hashes compare; null never does', () => {
    expect(sameEpoch('aa', 'aa')).toBe(true)
    expect(sameEpoch('aa', 'bb')).toBe(false)
    expect(sameEpoch(null, null)).toBe(false)
    expect(sameEpoch('aa', null)).toBe(false)
  })

  it('chains through the equivalence ledger', () => {
    const ledger = [
      { from: 'aa', to: 'bb', reason: 'reformat' },
      { from: 'bb', to: 'cc', reason: 'rename' },
    ]

    expect(sameEpoch('aa', 'cc', ledger as any)).toBe(true)
    expect(sameEpoch('aa', 'dd', ledger as any)).toBe(false)
  })
})

describe('auditEquivalences', () => {
  it('flags entries naming hashes not in use', () => {
    const ledger = [{ from: 'aa', to: 'bb', reason: 'x' }]

    expect(
      auditEquivalences(new Set(['aa', 'bb']), ledger as any),
    ).toHaveLength(0)
    expect(
      auditEquivalences(new Set(['aa']), ledger as any).length,
    ).toBeGreaterThan(0)
  })
})
