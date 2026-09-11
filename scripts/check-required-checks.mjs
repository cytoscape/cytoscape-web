#!/usr/bin/env node
// Assert that the required CI checks succeeded for one commit.
//
// ci.yml runs on pushes and pull requests to master and development. A tag push
// runs nothing, so without this the release workflow would happily publish a
// commit whose CI never ran or failed.
//
// Three details decide whether this is a real gate or decoration:
//
//   - The check names are a FIXED LIST, not "whatever ran". Iterating over
//     every check run for the SHA would include the release run itself, which
//     is in_progress by definition, and the guard would deadlock.
//   - The names are DISPLAY names, not job ids. ci.yml declares `lint:` with
//     `name: Lint`; the Checks API reports `Lint`. Matching on job ids reports
//     "no required check" against a perfectly green run.
//   - Missing and in_progress are both failures. A tag on a commit that never
//     reached development is exactly what "missing" looks like.
//
// Needs `checks: read` in the workflow's permissions block: a permissions block
// sets every unlisted scope to none.

import { execFileSync } from 'node:child_process'

// Must match the `name:` of each job in .github/workflows/ci.yml.
const REQUIRED = ['Lint', 'Build', 'Unit Tests', 'API Types Package']

const fail = (message) => {
  console.error(`check-required-checks: ${message}`)
  process.exit(1)
}

const parseArgs = (argv) => {
  const options = { repo: process.env.GITHUB_REPOSITORY }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--sha') options.sha = argv[(i += 1)]
    else if (arg === '--repo') options.repo = argv[(i += 1)]
    else fail(`unknown argument ${arg}`)
  }
  if (!options.sha) fail('--sha <commit> is required')
  if (!options.repo)
    fail('--repo <owner/name> is required (or set GITHUB_REPOSITORY)')
  return options
}

const fetchCheckRuns = (repo, sha) => {
  // gh paginates; 100 per page is plenty for this repo's job count.
  const raw = execFileSync(
    'gh',
    [
      'api',
      '--paginate',
      `repos/${repo}/commits/${sha}/check-runs?per_page=100`,
      '--jq',
      '.check_runs[] | {name, status, conclusion}',
    ],
    { encoding: 'utf8' },
  )
  return raw
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line))
}

const main = () => {
  const options = parseArgs(process.argv.slice(2))

  let runs
  try {
    runs = fetchCheckRuns(options.repo, options.sha)
  } catch (error) {
    fail(`could not read check runs for ${options.sha}\n  ${error.message}`)
  }

  const problems = []
  for (const name of REQUIRED) {
    // Latest run wins: a re-run appends rather than replacing.
    const matching = runs.filter((run) => run.name === name)
    if (matching.length === 0) {
      problems.push(`${name}: no run for this commit`)
      continue
    }
    const latest = matching[matching.length - 1]
    if (latest.status !== 'completed') {
      problems.push(
        `${name}: still ${latest.status} — re-run this release once CI finishes`,
      )
    } else if (latest.conclusion !== 'success') {
      problems.push(`${name}: ${latest.conclusion}`)
    } else {
      console.log(`  ${name}: success`)
    }
  }

  if (problems.length > 0) {
    fail(
      `required CI checks did not pass for ${options.sha}\n` +
        problems.map((p) => `  ${p}`).join('\n') +
        '\n  A missing check usually means the tag is on a commit that never reached development.',
    )
  }

  console.log(
    `all ${REQUIRED.length} required checks passed for ${options.sha}`,
  )
}

main()
