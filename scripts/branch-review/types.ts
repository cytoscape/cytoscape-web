/**
 * Payload contract for the Branch Review & Merge-Planning dashboard.
 *
 * The generator (generate.ts) assembles a `BranchReviewData` object from git
 * analysis and injects it into template.html as JSON. The template reads it
 * back with JSON.parse and renders entirely client-side — so this file is the
 * single source of truth for the shape shared across the two halves.
 *
 * Matrices are stored as upper-triangle arrays (a < b lexically). Both the
 * conflict and overlap relations are symmetric, so the template mirrors each
 * cell when drawing the N×N grids.
 */

export type PairStatus = 'clean' | 'conflict' | 'error'

/** Per-branch metadata and review-sizing signals, measured vs the base. */
export interface BranchMeta {
  name: string
  shortSha: string
  /** ISO-strict committer date of the branch tip. */
  committerDateISO: string
  /** e.g. "2 days ago" — git's committerdate:relative. */
  ageRelative: string
  /** Commits on the branch not in base (right side of rev-list --left-right). */
  ahead: number
  /** Commits on base not in the branch (left side). */
  behind: number
  filesChanged: number
  /** Summed insertions across the merge-base diff. */
  added: number
  /** Summed deletions across the merge-base diff. */
  deleted: number
  /** added + deleted — the review surface. */
  churn: number
  /** Count of binary files in the diff (they contribute 0 to churn). */
  binaryFiles: number
  /** churn > sizeThreshold — flags a branch as harder to review well. */
  oversized: boolean
  /** merge-tree(base, branch) produced no conflicts. */
  mergesCleanIntoBase: boolean
  /** Conflicting files vs base (empty when mergesCleanIntoBase). */
  baseConflictFiles: string[]
  /** True when the base conflict is only in low-signal files (lockfiles etc.). */
  baseConflictTrivial: boolean
  /** F(branch): the set of files changed vs the merge base. */
  files: string[]
  /** ahead === 0 — no unique commits; already integrated into base. */
  alreadyIntegrated: boolean
}

/** One off-diagonal cell of the pairwise conflict matrix (a < b). */
export interface ConflictCell {
  a: string
  b: string
  status: PairStatus
  /** name-only conflicting files; empty unless status === 'conflict'. */
  conflictFiles: string[]
  /** True when status is 'conflict' but every conflicting file is low-signal
   *  (lockfiles, .gitignore, CHANGELOG) — i.e. not a substantive collision. */
  trivialOnly: boolean
}

/** One off-diagonal cell of the pairwise file-overlap matrix (a < b). */
export interface OverlapCell {
  a: string
  b: string
  intersection: number
  union: number
  /** |A ∩ B| / |A ∪ B|, in 0..1. */
  jaccard: number
  /** Shared file paths (capped for tooltip display). */
  sharedFiles: string[]
}

/** A connected component of the conflict graph — branches that collide. */
export interface Cluster {
  id: number
  branches: string[]
  internalConflictPairs: number
}

/** One entry in the recommended merge sequence. */
export interface MergeStep {
  order: number
  branch: string
  /** 'independent' = clean into base and conflicts with nothing; 'sequenced' = inside a cluster. */
  tier: 'independent' | 'sequenced'
  clusterId: number | null
  /** Conflict partners not yet landed at this step. */
  conflictsWith: string[]
  /** High-Jaccard partners (heuristic signal only). */
  overlapsWith: string[]
  action: string
  reason: string
}

export interface BranchReviewMeta {
  generatedAt: string
  baseBranch: string
  /** Short sha of the base tip. */
  repoCommit: string
  /** Short sha of HEAD when the dashboard was generated. */
  generatorCommit: string
  /** Number of candidate branches analyzed. */
  branchCount: number
  /** Number of branch pairs compared, C(n, 2). */
  pairCount: number
  /** Churn threshold above which a branch is flagged oversized. */
  sizeThreshold: number
  /** Whether already-integrated (ahead === 0) branches were kept. */
  includeStale: boolean
  /** Age cutoff applied to branch tips, in days (null = no age filter). */
  maxAgeDays: number | null
  /** Count of branches excluded by the age filter. */
  excludedByAge: number
  gitVersion: string
}

export interface BranchReviewData {
  meta: BranchReviewMeta
  branches: BranchMeta[]
  conflictMatrix: ConflictCell[]
  overlapMatrix: OverlapCell[]
  clusters: Cluster[]
  mergePlan: MergeStep[]
  /** Honest limits, rendered in the methodology section. */
  caveats: string[]
}
