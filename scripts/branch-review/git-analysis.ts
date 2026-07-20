/**
 * Git I/O and parsing for the Branch Review dashboard.
 *
 * Every merge check uses `git merge-tree --write-tree` — a real 3-way merge
 * performed fully in memory (no working tree, no index, no commit), so this
 * whole module is read-only with respect to the repo. We run one merge-tree
 * per branch pair and read the process exit code (0 = clean, 1 = conflict,
 * other = error). That is grammar-free and robust; the `--stdin -z` batch mode
 * is faster but its output framing differs between clean and conflict blocks,
 * so we favor correctness over the couple of seconds it would save.
 */
import { execFileSync } from 'child_process'
import * as path from 'path'
import type { BranchMeta, ConflictCell, OverlapCell, PairStatus } from './types'

const REPO_ROOT = path.resolve(__dirname, '../..')
const MAX_BUFFER = 64 * 1024 * 1024

export interface AnalyzeOptions {
  base: string
  sizeThreshold: number
  includeStale: boolean
  /** Max shared-file paths retained per overlap cell (for tooltips). */
  sharedFilesCap: number
}

export interface AnalyzeResult {
  branches: BranchMeta[]
  conflictMatrix: ConflictCell[]
  overlapMatrix: OverlapCell[]
}

interface PairResult {
  status: PairStatus
  conflictFiles: string[]
}

/** Run git, returning trimmed stdout; throws on nonzero exit. */
function git(args: string[]): string {
  return execFileSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER,
  }).trim()
}

/** Run git, capturing stdout AND exit status without throwing. */
function tryGit(args: string[]): { status: number; stdout: string } {
  try {
    const stdout = execFileSync('git', args, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      maxBuffer: MAX_BUFFER,
    })
    return { status: 0, stdout }
  } catch (err) {
    const e = err as { status?: number; stdout?: string }
    return {
      status: typeof e.status === 'number' ? e.status : -1,
      stdout: e.stdout ?? '',
    }
  }
}

export function gitVersion(): string {
  try {
    return git(['--version']).replace(/^git version /, '')
  } catch {
    return 'unknown'
  }
}

export function shortSha(ref: string): string {
  try {
    return git(['rev-parse', '--short', ref])
  } catch {
    return 'unknown'
  }
}

interface RawBranch {
  name: string
  shortSha: string
  committerDateISO: string
  ageRelative: string
}

/** All local heads (refs/heads), newest commit first, excluding the base. */
export function listBranches(base: string): RawBranch[] {
  const fmt = [
    '%(refname:short)',
    '%(objectname:short)',
    '%(committerdate:iso-strict)',
    '%(committerdate:relative)',
  ].join('%09')
  const out = git([
    'for-each-ref',
    '--sort=-committerdate',
    `--format=${fmt}`,
    'refs/heads/',
  ])
  return out
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [name, sha, iso, rel] = line.split('\t')
      return { name, shortSha: sha, committerDateISO: iso, ageRelative: rel }
    })
    .filter((b) => b.name !== base)
}

/** left = commits only on base (behind); right = only on branch (ahead). */
export function aheadBehind(
  base: string,
  branch: string,
): { behind: number; ahead: number } {
  try {
    const out = git([
      'rev-list',
      '--left-right',
      '--count',
      `${base}...${branch}`,
    ])
    const [behind, ahead] = out.split(/\s+/).map((n) => parseInt(n, 10) || 0)
    return { behind, ahead }
  } catch {
    return { behind: 0, ahead: 0 }
  }
}

/** Files changed by `branch` since it diverged from `base` (three-dot). */
export function changedFiles(base: string, branch: string): string[] {
  try {
    const out = git(['diff', '--name-only', '-z', `${base}...${branch}`])
    return out.split('\0').filter(Boolean)
  } catch {
    return []
  }
}

/** Added/deleted line counts over the merge-base diff (three-dot). */
export function churn(
  base: string,
  branch: string,
): { added: number; deleted: number; binaryFiles: number } {
  let added = 0
  let deleted = 0
  let binaryFiles = 0
  let out = ''
  try {
    out = git(['diff', '--numstat', '-z', `${base}...${branch}`])
  } catch {
    return { added, deleted, binaryFiles }
  }
  const tokens = out.split('\0')
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i]
    if (!tok) continue
    const parts = tok.split('\t')
    if (parts.length < 3) continue
    const [a, d, p] = parts
    // Rename/copy: numstat emits "added\tdeleted\t" with an empty path, then
    // two NUL-separated path tokens (old, new) follow. Skip them.
    if (p === '') i += 2
    if (a === '-' || d === '-') {
      binaryFiles++
      continue
    }
    added += parseInt(a, 10) || 0
    deleted += parseInt(d, 10) || 0
  }
  return { added, deleted, binaryFiles }
}

/** Parse the conflicted-file list from `merge-tree --write-tree --name-only`
 *  conflict output: line 0 is the tree OID, then filenames until a blank line. */
function parseConflictFiles(stdout: string): string[] {
  const lines = stdout.split('\n')
  const files: string[] = []
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '') break
    files.push(lines[i])
  }
  return files
}

/** In-memory 3-way merge of two branch tips; reports clean/conflict/error. */
export function mergePair(a: string, b: string): PairResult {
  const { status, stdout } = tryGit([
    'merge-tree',
    '--write-tree',
    '--name-only',
    a,
    b,
  ])
  if (status === 0) return { status: 'clean', conflictFiles: [] }
  if (status === 1)
    return { status: 'conflict', conflictFiles: parseConflictFiles(stdout) }
  return { status: 'error', conflictFiles: [] }
}

function jaccard(a: string[], b: string[]): OverlapCell {
  const setA = new Set(a)
  const shared: string[] = []
  for (const f of b) if (setA.has(f)) shared.push(f)
  const intersection = shared.length
  const union = new Set([...a, ...b]).size
  return {
    a: '',
    b: '',
    intersection,
    union,
    jaccard: union === 0 ? 0 : intersection / union,
    sharedFiles: shared,
  }
}

/**
 * Run the full analysis: per-branch metadata + sizing, the pairwise conflict
 * matrix (ground truth), and the pairwise file-overlap matrix (heuristic).
 * `onProgress` is called as pairs complete so the CLI can show a heartbeat.
 */
export function analyze(
  opts: AnalyzeOptions,
  onProgress?: (done: number, total: number) => void,
): AnalyzeResult {
  const { base, sizeThreshold, includeStale, sharedFilesCap } = opts

  const raw = listBranches(base)
  const candidates: BranchMeta[] = []
  for (const b of raw) {
    const { behind, ahead } = aheadBehind(base, b.name)
    const alreadyIntegrated = ahead === 0
    if (alreadyIntegrated && !includeStale) continue

    const files = changedFiles(base, b.name)
    const { added, deleted, binaryFiles } = churn(base, b.name)
    const intoBase = mergePair(base, b.name)
    candidates.push({
      name: b.name,
      shortSha: b.shortSha,
      committerDateISO: b.committerDateISO,
      ageRelative: b.ageRelative,
      ahead,
      behind,
      filesChanged: files.length,
      added,
      deleted,
      churn: added + deleted,
      binaryFiles,
      oversized: added + deleted > sizeThreshold,
      mergesCleanIntoBase: intoBase.status === 'clean',
      baseConflictFiles: intoBase.conflictFiles,
      files,
      alreadyIntegrated,
    })
  }

  // Stable display order: by name, so the matrices are deterministic.
  candidates.sort((x, y) => x.name.localeCompare(y.name))

  const conflictMatrix: ConflictCell[] = []
  const overlapMatrix: OverlapCell[] = []
  const total = (candidates.length * (candidates.length - 1)) / 2
  let done = 0
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const A = candidates[i]
      const B = candidates[j]
      const merge = mergePair(A.name, B.name)
      conflictMatrix.push({
        a: A.name,
        b: B.name,
        status: merge.status,
        conflictFiles: merge.conflictFiles,
      })
      const ov = jaccard(A.files, B.files)
      overlapMatrix.push({
        a: A.name,
        b: B.name,
        intersection: ov.intersection,
        union: ov.union,
        jaccard: ov.jaccard,
        sharedFiles: ov.sharedFiles.slice(0, sharedFilesCap),
      })
      done++
      if (onProgress) onProgress(done, total)
    }
  }

  return { branches: candidates, conflictMatrix, overlapMatrix }
}
