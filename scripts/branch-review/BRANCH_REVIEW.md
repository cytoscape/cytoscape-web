# Branch Review & Merge-Planning Dashboard

Generates a single self-contained HTML dashboard that answers, across all your
local branches:

- **Which branches conflict** with each other (ground truth) and with the base.
- **Which touch the same code** (file-overlap heuristic).
- **What order to merge** — land the easy, non-conflicting branches first.
- **How much there is to review** per branch (churn + oversized flags).

It performs **no merges and never touches the working tree** — every conflict
check is an in-memory `git merge-tree --write-tree`.

## Run it

```bash
npm run generate:branch-review
```

Writes to `scratch/branch-review/index.html` (gitignored — private by default).
Open it in any browser; it works fully offline.

### Options

```bash
npm run generate:branch-review -- [flags]
```

| Flag | Default | Meaning |
| --- | --- | --- |
| `--base <branch>` | `development` | Integration branch to compare every branch against. |
| `--out <path>` | `scratch/branch-review/index.html` | Output file (relative to repo root). |
| `--include-stale` | off | Keep branches with no unique commits (`ahead === 0`). |
| `--max-age-days <n>` | off | Exclude branches whose tip commit is older than `n` days — drops likely-abandoned branches so they don't skew the merge order. |
| `--max-loc <n>` | `400` | Churn above which a branch is flagged **oversized** (SmartBear/Cisco review-quality inflection). |
| `--overlap-threshold <0..1>` | `0.15` | Jaccard at/above which two branches are reported as overlapping in the plan. |

> **Publishing:** pointing `--out` at `docs-site/` deploys the dashboard to a
> **public** Netlify site — your branch names become world-readable. The default
> `scratch/` path keeps it local. The generator prints a warning if you target
> `docs-site/`.

## How it works

All data comes from read-only git plumbing (see the "Methodology" section in the
generated page for the exact commands):

- **Conflict matrix** — `git merge-tree --write-tree --name-only <A> <B>` per
  pair. Exit `0` = clean, `1` = conflict (stdout lists the conflicting files),
  other = error (e.g. no common merge base). This is a *real* 3-way merge, so it
  catches line-level and rename conflicts, not just same-file edits.
- **Overlap heatmap** — Jaccard similarity of each pair's changed-file sets
  (`git diff --name-only -z <base>...<branch>`).
- **Review sizing** — `git diff --numstat -z <base>...<branch>` summed to net
  added/deleted (uses `diff`, not `log`, to avoid double-counting files touched
  in multiple commits).
- **Merge order** — branches that merge cleanly into base and conflict with no
  peer are the *independent* tier (land first, any order). The rest are grouped
  into clusters (connected components of the conflict graph) and sequenced by a
  greedy min-conflict-degree heuristic.

## Limits (important)

- Conflict is **symmetric, not a dependency** — there is no true topological
  sort; the order is a greedy heuristic (optimal ordering is NP-hard).
- The analysis is a **snapshot** against current tips. Landing a branch changes
  the base, so **re-run after each merge**.
- Textual-clean ≠ semantically correct — merge-tree cannot see behavioral
  conflicts, test failures, or logic that breaks across disjoint files.
- Local `refs/heads` only.

## Files

| File | Role |
| --- | --- |
| `generate.ts` | Orchestrator: args → analysis → payload → inject into template → write. |
| `git-analysis.ts` | All git I/O + parsers; the conflict/overlap matrices. |
| `merge-plan.ts` | Pure clustering + greedy merge-order (no git; unit-testable). |
| `types.ts` | The JSON payload contract shared with the template. |
| `template.html` | Self-contained dashboard; injects at the `__DATA__` placeholder. |

Modeled on `scripts/generate-api-docs/` — same `execFileSync('git', …)` and
JSON-into-template pattern.
