#!/usr/bin/env node
// Assert that this repository's CI succeeded for one commit.
//
// ci.yml runs on pushes and pull requests to master and development. A tag push
// runs nothing, so without this the release workflow would happily publish a
// commit whose CI never ran or failed.
//
// It asks the Actions API for runs OF ci.yml at this SHA, rather than asking
// the Checks API for check runs with matching display names. The distinction is
// the point: a check run named "Lint" can be produced by any workflow, or by
// any GitHub App with checks:write. Name-only matching accepts all of them and
// calls it a green CI. Going through the workflow file binds the answer to the
// jobs this repository actually defines.
//
// Two details that decide whether this is a real gate or decoration:
//
//   - The job names are a FIXED LIST, not "whatever ran". Iterating over
//     everything present would include the release run itself, which is
//     in_progress by definition, and the guard would deadlock.
//   - Missing and in_progress are both failures. A tag on a commit that never
//     reached development is exactly what "missing" looks like.
//
// Re-runs need no special handling here: a re-run adds an ATTEMPT to the same
// workflow run, and the jobs endpoint returns the latest attempt by default.
// (The earlier Checks-API version had to sort runs by timestamp, and shipped
// reading the oldest.)
//
// Needs `actions: read` in the workflow's permissions block: a permissions
// block sets every unlisted scope to none.

import { execFileSync } from 'node:child_process'

// Must match the `name:` of each job in .github/workflows/ci.yml.
const REQUIRED = ['Lint', 'Build', 'Unit Tests', 'API Types Package']
const DEFAULT_WORKFLOW = 'ci.yml'

// Overridable so tests can stand in a fake. This gate is only exercised for
// real during a release, and a release-critical guard should not be first
// exercised there.
const GH = process.env.CYWEB_GH_CLI ?? 'gh'

const fail = (message) => {
  console.error(`check-required-checks: ${message}`)
  process.exit(1)
}

const parseArgs = (argv) => {
  const options = {
    repo: process.env.GITHUB_REPOSITORY,
    workflow: DEFAULT_WORKFLOW,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--sha') options.sha = argv[(i += 1)]
    else if (arg === '--repo') options.repo = argv[(i += 1)]
    else if (arg === '--workflow') options.workflow = argv[(i += 1)]
    else fail(`unknown argument ${arg}`)
  }
  if (!options.sha) fail('--sha <commit> is required')
  if (!options.repo)
    fail('--repo <owner/name> is required (or set GITHUB_REPOSITORY)')
  return options
}

const ghJsonLines = (args, what) => {
  let raw
  try {
    raw = execFileSync(GH, args, { encoding: 'utf8' })
  } catch (error) {
    fail(
      `could not read ${what}\n  ${(error.stderr ?? error.message).toString().trim().split('\n')[0]}`,
    )
  }
  return raw
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line))
}

/** The newest run of `workflow` at `sha`, or null. */
const latestWorkflowRun = (repo, workflow, sha) => {
  const runs = ghJsonLines(
    [
      'api',
      '--paginate',
      `repos/${repo}/actions/workflows/${workflow}/runs?head_sha=${sha}&per_page=100`,
      '--jq',
      '.workflow_runs[] | {id, created_at, status, conclusion, run_attempt}',
    ],
    `runs of ${workflow} for ${sha}`,
  )
  if (runs.length === 0) return null
  // A push and a pull_request trigger can both produce a run for one SHA.
  return runs.sort(
    (a, b) =>
      Date.parse(b.created_at ?? 0) - Date.parse(a.created_at ?? 0) ||
      (b.id ?? 0) - (a.id ?? 0),
  )[0]
}

const jobsOf = (repo, runId) =>
  ghJsonLines(
    [
      'api',
      '--paginate',
      `repos/${repo}/actions/runs/${runId}/jobs?per_page=100`,
      '--jq',
      '.jobs[] | {name, status, conclusion}',
    ],
    `jobs of run ${runId}`,
  )

const main = () => {
  const options = parseArgs(process.argv.slice(2))

  const run = latestWorkflowRun(options.repo, options.workflow, options.sha)
  if (run === null) {
    fail(
      `no run of ${options.workflow} for ${options.sha}\n` +
        '  This usually means the tag is on a commit that never reached development.',
    )
  }
  console.log(
    `  ${options.workflow} run ${run.id} (attempt ${run.run_attempt}) — ${run.status}/${run.conclusion}`,
  )

  const jobs = jobsOf(options.repo, run.id)
  const problems = []
  for (const name of REQUIRED) {
    const job = jobs.find((candidate) => candidate.name === name)
    if (job === undefined) {
      problems.push(`${name}: not present in this run`)
    } else if (job.status !== 'completed') {
      problems.push(
        `${name}: still ${job.status} — re-run this release once CI finishes`,
      )
    } else if (job.conclusion !== 'success') {
      problems.push(`${name}: ${job.conclusion}`)
    } else {
      console.log(`  ${name}: success`)
    }
  }

  if (problems.length > 0) {
    fail(
      `required CI jobs did not pass for ${options.sha}\n` +
        problems.map((problem) => `  ${problem}`).join('\n'),
    )
  }

  console.log(
    `all ${REQUIRED.length} required jobs passed in ${options.workflow} for ${options.sha}`,
  )
}

main()
