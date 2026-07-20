import { describe, expect, it } from 'vitest'
import { buildPlan } from './merge-plan'
import type { BranchMeta, ConflictCell, OverlapCell } from './types'

function mk(name: string, over: Partial<BranchMeta> = {}): BranchMeta {
  return {
    name,
    shortSha: 'abc1234',
    committerDateISO: '2026-07-01T00:00:00-04:00',
    ageRelative: '1 day ago',
    ahead: 1,
    behind: 0,
    filesChanged: 1,
    added: 10,
    deleted: 0,
    churn: 10,
    binaryFiles: 0,
    oversized: false,
    mergesCleanIntoBase: true,
    baseConflictFiles: [],
    baseConflictTrivial: false,
    files: [],
    alreadyIntegrated: false,
    ...over,
  }
}

function conflict(a: string, b: string): ConflictCell {
  return {
    a,
    b,
    status: 'conflict',
    conflictFiles: ['f.ts'],
    trivialOnly: false,
  }
}
function trivialConflict(a: string, b: string): ConflictCell {
  return {
    a,
    b,
    status: 'conflict',
    conflictFiles: ['.gitignore'],
    trivialOnly: true,
  }
}
function clean(a: string, b: string): ConflictCell {
  return { a, b, status: 'clean', conflictFiles: [], trivialOnly: false }
}
function overlap(a: string, b: string, jaccard: number): OverlapCell {
  return { a, b, intersection: 1, union: 1, jaccard, sharedFiles: ['f.ts'] }
}

const OPTS = { overlapThreshold: 0.15 }

describe('buildPlan', () => {
  it('puts branches that are clean-into-base with no peer conflicts in the independent tier, ordered by churn', () => {
    const branches = [
      mk('c', { churn: 300 }),
      mk('a', { churn: 100 }),
      mk('b', { churn: 200 }),
    ]
    const conflictMatrix = [clean('a', 'b'), clean('a', 'c'), clean('b', 'c')]
    const { clusters, mergePlan } = buildPlan(
      branches,
      conflictMatrix,
      [],
      OPTS,
    )

    expect(clusters).toHaveLength(0)
    expect(mergePlan.every((s) => s.tier === 'independent')).toBe(true)
    // ordered by ascending churn: a(100), b(200), c(300)
    expect(mergePlan.map((s) => s.branch)).toEqual(['a', 'b', 'c'])
    expect(mergePlan.map((s) => s.order)).toEqual([1, 2, 3])
  })

  it('groups conflicting branches into one cluster and sequences them', () => {
    const branches = [mk('a'), mk('b')]
    const conflictMatrix = [conflict('a', 'b')]
    const { clusters, mergePlan } = buildPlan(
      branches,
      conflictMatrix,
      [],
      OPTS,
    )

    expect(clusters).toHaveLength(1)
    expect(clusters[0].branches).toEqual(['a', 'b'])
    expect(clusters[0].internalConflictPairs).toBe(1)
    expect(mergePlan.every((s) => s.tier === 'sequenced')).toBe(true)
    expect(mergePlan.every((s) => s.clusterId === 0)).toBe(true)
  })

  it('separates disjoint conflict groups into distinct clusters', () => {
    const branches = [mk('a'), mk('b'), mk('c'), mk('d')]
    // two independent conflict pairs: a-b and c-d
    const conflictMatrix = [conflict('a', 'b'), conflict('c', 'd')]
    const { clusters } = buildPlan(branches, conflictMatrix, [], OPTS)

    expect(clusters).toHaveLength(2)
    const sizes = clusters.map((c) => c.branches.length).sort()
    expect(sizes).toEqual([2, 2])
  })

  it('greedy ordering lands the highest-degree hub last', () => {
    // d conflicts with a, b, c (degree 3); a/b/c conflict only with d (degree 1)
    const branches = [mk('a'), mk('b'), mk('c'), mk('d')]
    const conflictMatrix = [
      conflict('a', 'd'),
      conflict('b', 'd'),
      conflict('c', 'd'),
    ]
    const { mergePlan } = buildPlan(branches, conflictMatrix, [], OPTS)

    expect(mergePlan).toHaveLength(4)
    // all sequenced (each has a conflict edge), one cluster
    expect(mergePlan.every((s) => s.tier === 'sequenced')).toBe(true)
    // the hub d should be ordered last
    expect(mergePlan[mergePlan.length - 1].branch).toBe('d')
    // once a/b/c have landed, d has no remaining conflicts
    expect(mergePlan[3].conflictsWith).toEqual([])
    expect(mergePlan[3].action).toBe('Land now')
  })

  it('breaks equal-degree ties in the sequenced tier by smaller churn', () => {
    // x and y each conflict only with hub h (degree 1); h has degree 2.
    // churns chosen so the greedy pick is deterministic: y(100) < x(500) < h(1000).
    const branches = [
      mk('h', { churn: 1000 }),
      mk('x', { churn: 500 }),
      mk('y', { churn: 100 }),
    ]
    const conflictMatrix = [conflict('x', 'h'), conflict('y', 'h')]
    const { mergePlan } = buildPlan(branches, conflictMatrix, [], OPTS)

    // round 1: x,y tie at degree 1 -> smaller churn y first
    // round 2: x,h tie at degree 1 -> smaller churn x before h
    expect(mergePlan.map((s) => s.branch)).toEqual(['y', 'x', 'h'])
  })

  it('flags a branch that conflicts only with the base', () => {
    const branches = [
      mk('a', { mergesCleanIntoBase: false, baseConflictFiles: ['x.ts'] }),
    ]
    const { clusters, mergePlan } = buildPlan(branches, [], [], OPTS)

    // not independent (conflicts with base), no peers -> singleton cluster
    expect(mergePlan[0].tier).toBe('sequenced')
    expect(mergePlan[0].conflictsWith).toEqual([])
    expect(mergePlan[0].action).toBe('Resolve against base')
    expect(clusters).toHaveLength(1)
  })

  it('reports conflictsWith for the branch landed first in a cluster', () => {
    const branches = [mk('a'), mk('b')]
    const { mergePlan } = buildPlan(branches, [conflict('a', 'b')], [], OPTS)

    const first = mergePlan[0]
    const second = mergePlan[1]
    // first-landed still has its (unlanded) partner listed; second has none left
    expect(first.conflictsWith).toEqual([second.branch])
    expect(second.conflictsWith).toEqual([])
  })

  it('records overlap partners only at or above the threshold', () => {
    const branches = [mk('a'), mk('b'), mk('c')]
    const overlapMatrix = [
      overlap('a', 'b', 0.5), // above threshold
      overlap('a', 'c', 0.05), // below threshold
    ]
    const { mergePlan } = buildPlan(branches, [], overlapMatrix, OPTS)

    const a = mergePlan.find((s) => s.branch === 'a')!
    expect(a.overlapsWith).toEqual(['b'])
  })

  it('treats trivial-only conflicts as non-edges (branches stay independent)', () => {
    const branches = [mk('a'), mk('b')]
    // they "conflict" but only on .gitignore -> not a real obstacle
    const { clusters, mergePlan } = buildPlan(
      branches,
      [trivialConflict('a', 'b')],
      [],
      OPTS,
    )
    expect(clusters).toHaveLength(0)
    expect(mergePlan.every((s) => s.tier === 'independent')).toBe(true)
  })

  it('treats a trivial-only base conflict as effectively clean into base', () => {
    const branches = [
      mk('a', {
        mergesCleanIntoBase: false,
        baseConflictTrivial: true,
        baseConflictFiles: ['.gitignore'],
      }),
    ]
    const { mergePlan } = buildPlan(branches, [], [], OPTS)
    expect(mergePlan[0].tier).toBe('independent')
    expect(mergePlan[0].action).toBe('Land now (parallel-safe)')
  })

  it('handles an empty branch set', () => {
    const { clusters, mergePlan } = buildPlan([], [], [], OPTS)
    expect(clusters).toEqual([])
    expect(mergePlan).toEqual([])
  })

  it('assigns a contiguous 1-based order across both tiers', () => {
    const branches = [mk('indep'), mk('x'), mk('y')]
    const conflictMatrix = [conflict('x', 'y')]
    const { mergePlan } = buildPlan(branches, conflictMatrix, [], OPTS)

    expect(mergePlan.map((s) => s.order)).toEqual([1, 2, 3])
    // independent tier comes first
    expect(mergePlan[0].branch).toBe('indep')
    expect(mergePlan[0].tier).toBe('independent')
  })
})
