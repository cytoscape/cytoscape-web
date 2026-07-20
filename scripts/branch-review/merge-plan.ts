/**
 * Merge-order planning — pure functions, no git, unit-testable.
 *
 * Conflict is a SYMMETRIC relation, not a dependency, so there is no DAG and
 * therefore no true topological sort. Finding the order that minimizes total
 * conflict cost is NP-hard (minimum feedback arc set / linear arrangement).
 * What we do instead:
 *
 *   1. Independent tier — branches that merge cleanly into base AND conflict
 *      with no other branch. Land these first, in any order / in parallel.
 *   2. Clusters — connected components of the conflict graph over the rest.
 *   3. Greedy min-degree ordering (Cassandra-flavored) — repeatedly land the
 *      unlanded branch with the fewest conflict edges to still-unlanded
 *      branches, shrinking what later branches must reconcile against.
 */
import type {
  BranchMeta,
  Cluster,
  ConflictCell,
  MergeStep,
  OverlapCell,
} from './types'

export interface PlanOptions {
  /** Jaccard at or above which two branches are reported as overlapping. */
  overlapThreshold: number
}

interface PlanContext {
  names: string[]
  /** name -> set of names it conflicts with (symmetric). */
  conflicts: Map<string, Set<string>>
  /** name -> set of names it overlaps with above threshold (symmetric). */
  overlaps: Map<string, Set<string>>
  byName: Map<string, BranchMeta>
}

function buildContext(
  branches: BranchMeta[],
  conflictMatrix: ConflictCell[],
  overlapMatrix: OverlapCell[],
  overlapThreshold: number,
): PlanContext {
  const names = branches.map((b) => b.name)
  const conflicts = new Map<string, Set<string>>()
  const overlaps = new Map<string, Set<string>>()
  for (const n of names) {
    conflicts.set(n, new Set())
    overlaps.set(n, new Set())
  }
  for (const c of conflictMatrix) {
    if (c.status !== 'conflict') continue
    conflicts.get(c.a)?.add(c.b)
    conflicts.get(c.b)?.add(c.a)
  }
  for (const o of overlapMatrix) {
    if (o.jaccard < overlapThreshold || o.intersection === 0) continue
    overlaps.get(o.a)?.add(o.b)
    overlaps.get(o.b)?.add(o.a)
  }
  const byName = new Map(branches.map((b) => [b.name, b]))
  return { names, conflicts, overlaps, byName }
}

/** Connected components of the conflict graph among the given branch names. */
function findClusters(ctx: PlanContext, sequenced: string[]): Cluster[] {
  const inScope = new Set(sequenced)
  const seen = new Set<string>()
  const clusters: Cluster[] = []
  let id = 0
  for (const start of sequenced) {
    if (seen.has(start)) continue
    const stack = [start]
    const members: string[] = []
    seen.add(start)
    while (stack.length) {
      const cur = stack.pop() as string
      members.push(cur)
      for (const nb of ctx.conflicts.get(cur) ?? []) {
        if (inScope.has(nb) && !seen.has(nb)) {
          seen.add(nb)
          stack.push(nb)
        }
      }
    }
    let internalConflictPairs = 0
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (ctx.conflicts.get(members[i])?.has(members[j])) {
          internalConflictPairs++
        }
      }
    }
    members.sort((a, b) => a.localeCompare(b))
    clusters.push({ id: id++, branches: members, internalConflictPairs })
  }
  return clusters
}

/** Tie-break comparator: smaller churn, then clean-into-base, then older. */
function preferOrder(ctx: PlanContext, a: string, b: string): number {
  const ma = ctx.byName.get(a) as BranchMeta
  const mb = ctx.byName.get(b) as BranchMeta
  if (ma.churn !== mb.churn) return ma.churn - mb.churn
  if (ma.mergesCleanIntoBase !== mb.mergesCleanIntoBase) {
    return ma.mergesCleanIntoBase ? -1 : 1
  }
  return ma.committerDateISO.localeCompare(mb.committerDateISO)
}

export function buildPlan(
  branches: BranchMeta[],
  conflictMatrix: ConflictCell[],
  overlapMatrix: OverlapCell[],
  opts: PlanOptions,
): { clusters: Cluster[]; mergePlan: MergeStep[] } {
  const ctx = buildContext(
    branches,
    conflictMatrix,
    overlapMatrix,
    opts.overlapThreshold,
  )

  const clusterIdOf = new Map<string, number>()

  // Tier 1: independent (clean into base, zero conflict edges).
  const independent = branches
    .filter(
      (b) =>
        b.mergesCleanIntoBase && (ctx.conflicts.get(b.name)?.size ?? 0) === 0,
    )
    .map((b) => b.name)
  const independentSet = new Set(independent)

  const sequenced = branches
    .map((b) => b.name)
    .filter((n) => !independentSet.has(n))

  const clusters = findClusters(ctx, sequenced)
  for (const cl of clusters) {
    for (const n of cl.branches) clusterIdOf.set(n, cl.id)
  }

  const steps: MergeStep[] = []
  let order = 1
  const landed = new Set<string>()

  // Independent tier first, ordered by preference (smallest review first).
  const independentOrdered = [...independent].sort((a, b) =>
    preferOrder(ctx, a, b),
  )
  for (const name of independentOrdered) {
    const overlapsWith = [...(ctx.overlaps.get(name) ?? [])].sort()
    steps.push({
      order: order++,
      branch: name,
      tier: 'independent',
      clusterId: null,
      conflictsWith: [],
      overlapsWith,
      action: 'Land now (parallel-safe)',
      reason: 'Merges cleanly into base and conflicts with no other branch.',
    })
    landed.add(name)
  }

  // Sequenced tier: greedy min live-degree.
  const remaining = new Set(sequenced)
  while (remaining.size) {
    let best: string | null = null
    let bestDegree = Infinity
    for (const name of remaining) {
      let liveDegree = 0
      for (const nb of ctx.conflicts.get(name) ?? []) {
        if (remaining.has(nb)) liveDegree++
      }
      if (
        liveDegree < bestDegree ||
        (liveDegree === bestDegree &&
          best !== null &&
          preferOrder(ctx, name, best) < 0)
      ) {
        best = name
        bestDegree = liveDegree
      }
    }
    const name = best as string
    remaining.delete(name)

    const partners = [...(ctx.conflicts.get(name) ?? [])]
    const conflictsWith = partners.filter((p) => !landed.has(p)).sort()
    const overlapsWith = [...(ctx.overlaps.get(name) ?? [])].sort()
    const meta = ctx.byName.get(name) as BranchMeta

    let action: string
    let reason: string
    if (conflictsWith.length > 0) {
      action = `Resolve against: ${conflictsWith.join(', ')}`
      reason = `Conflicts with ${conflictsWith.length} not-yet-landed branch(es); landed after lower-conflict peers to shrink cascading resolution.`
    } else if (!meta.mergesCleanIntoBase) {
      action = 'Resolve against base'
      reason =
        'No peer conflicts remain, but this branch conflicts with the base itself.'
    } else {
      action = 'Land now'
      reason = 'All conflicting peers already landed; merges cleanly now.'
    }

    steps.push({
      order: order++,
      branch: name,
      tier: 'sequenced',
      clusterId: clusterIdOf.get(name) ?? null,
      conflictsWith,
      overlapsWith,
      action,
      reason,
    })
    landed.add(name)
  }

  return { clusters, mergePlan: steps }
}
