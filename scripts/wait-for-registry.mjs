#!/usr/bin/env node
// Wait until a version npm has accepted is visible on the registry and the
// dist-tag it was published under resolves to it.
//
// npm processes a publish asynchronously. `npm publish` prints
// `+ pkg@version` and "Your package is being processed and may take a few
// minutes to become available", and for those minutes `npm view` answers E404
// for the version while the dist-tag still names the previous release.
// 1.0.0-beta.5 took 3m14s (2026-10-05). The read-back this replaces allowed
// 60 seconds, so a successful publish ended in a failed run.
//
// Every failure while waiting is retried: a 404 is the expected state, and a
// transient registry error is not a verdict on the publish. Only the deadline
// ends the wait, and its message says what NOT to do — the publish already
// happened, so the tag stays where it is and the workflow is re-run against it.
//
// This only waits. Whether what became visible is THIS run's artifact is
// decide-registry-action.mjs --expect-published's question, asked next.

import { execFileSync } from 'node:child_process'

// Overridable so releaseGuards.test.ts can script the registry's answers.
const NPM = process.env.CYWEB_NPM_CLI ?? 'npm'

// Every npm call gets a budget: the time left before the deadline, at least a
// second (so the last poll can still answer) and at most a minute. Without
// one, execFileSync waits as long as npm does — its own fetch timeout is five
// minutes with retries — so a stalled registry call outlived the deadline and
// the job's hard timeout killed the run before it could print what to do.
const MIN_CALL_MS = 1_000
const MAX_CALL_MS = 60_000

const FLAGS = { pkg: '--package', version: '--version', distTag: '--dist-tag' }

const fail = (message) => {
  console.error(`wait-for-registry: ${message}`)
  process.exit(1)
}

const parseArgs = (argv) => {
  const options = { timeout: 600, interval: 15 }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--package') options.pkg = argv[(i += 1)]
    else if (arg === '--version') options.version = argv[(i += 1)]
    else if (arg === '--dist-tag') options.distTag = argv[(i += 1)]
    else if (arg === '--timeout') options.timeout = Number(argv[(i += 1)])
    else if (arg === '--interval') options.interval = Number(argv[(i += 1)])
    else if (arg === '--rerun-command') options.rerunCommand = argv[(i += 1)]
    else fail(`unknown argument ${arg}`)
  }
  for (const [key, flag] of Object.entries(FLAGS)) {
    if (!options[key]) fail(`${flag} is required`)
  }
  for (const key of ['timeout', 'interval']) {
    if (!(options[key] > 0))
      fail(`--${key} must be a positive number of seconds`)
  }
  return options
}

/**
 * What `npm view <spec> version --json` answers for an exact version or a
 * dist-tag within `budgetMs`: `{ version }`, or `{ error }` naming the npm
 * error code, or the timeout.
 */
const view = (spec, budgetMs) => {
  try {
    const stdout = execFileSync(NPM, ['view', spec, 'version', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: budgetMs,
    })
    const parsed = JSON.parse(stdout)
    return typeof parsed === 'string'
      ? { version: parsed }
      : { error: `unexpected answer ${stdout.trim()}` }
  } catch (error) {
    if (error.code === 'ETIMEDOUT') {
      return { error: `timed out after ${Math.round(budgetMs / 1000)}s` }
    }
    let parsed
    try {
      parsed = JSON.parse(error.stdout ?? '')
    } catch {
      // No JSON at all: a crash or a network failure before npm could answer.
    }
    const firstLine = (error.stderr ?? error.message ?? '')
      .toString()
      .trim()
      .split('\n')[0]
    return { error: parsed?.error?.code ?? (firstLine || 'unknown error') }
  }
}

const sleep = (ms) => new Promise((done) => setTimeout(done, ms))

const main = async () => {
  const options = parseArgs(process.argv.slice(2))
  const { pkg, version, distTag } = options
  const started = Date.now()
  const deadline = started + options.timeout * 1000
  const seconds = () => Math.round((Date.now() - started) / 1000)
  const budget = () =>
    Math.min(MAX_CALL_MS, Math.max(MIN_CALL_MS, deadline - Date.now()))

  let last = ''
  for (let attempt = 1; ; attempt += 1) {
    const published = view(`${pkg}@${version}`, budget())
    const tagged = view(`${pkg}@${distTag}`, budget())

    if (published.version === version && tagged.version === version) {
      console.log(
        `  attempt ${attempt} (${seconds()}s): ${pkg}@${version} is visible and ${distTag} resolves to it`,
      )
      return
    }

    last =
      `${version} → ${published.version ?? published.error}, ` +
      `${distTag} → ${tagged.version ?? tagged.error}`
    const remaining = deadline - Date.now()
    if (remaining <= 0) break
    const pause = Math.min(options.interval * 1000, remaining)
    console.log(
      `  attempt ${attempt} (${seconds()}s): not visible yet (${last}); waiting ${Math.round(pause / 1000)}s`,
    )
    await sleep(pause)
  }

  fail(
    `${pkg}@${version} was not visible with ${distTag} resolving to it after ${options.timeout}s\n` +
      `  last answer: ${last}\n` +
      '  npm processes a publish asynchronously, so this usually means "not yet", not "failed".\n' +
      '  If the publish step succeeded, do NOT delete or move the tag, and do not publish again.\n' +
      `  Once \`npm view ${pkg}@${version}\` answers and ${distTag} resolves to it, re-run against the existing tag` +
      (options.rerunCommand ? `:\n    ${options.rerunCommand}` : '.') +
      '\n  The re-run finds the version published from this commit and resumes at verification.',
  )
}

await main()
