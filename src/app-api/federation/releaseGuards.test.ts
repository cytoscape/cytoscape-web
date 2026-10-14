// @vitest-environment node
//
// Covers the two decision scripts the release workflow leans on. Both are
// driven as subprocesses, like changelogSection.test.ts, because what matters
// is the exit code and the message an operator reads at 2am.
//
// The branches asserted here only run when something has already gone wrong —
// a half-finished publish, a tampered artifact, a tag on the wrong commit.
// That is the worst moment to discover they were never exercised.
//
// The registry-backed cases are OPT-IN: `CYWEB_REGISTRY_TESTS=1 npx vitest run
// releaseGuards`. They are excluded from the default suite on purpose —
// vitest-setup.ts sets a 1-second test timeout because this repository's unit
// tests are meant to be fast and offline, and a live `npm view` plus a Sigstore
// bundle fetch is neither. Leaving them on would trade a deterministic suite
// for coverage that the release rehearsal already provides against the real
// registry.

import { execFileSync } from 'node:child_process'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const DECIDE = resolve(__dirname, '../../../scripts/decide-registry-action.mjs')
const CHECKS = resolve(__dirname, '../../../scripts/check-required-checks.mjs')
const WAIT = resolve(__dirname, '../../../scripts/wait-for-registry.mjs')

interface RunResult {
  status: number
  stdout: string
  stderr: string
}

const run = (
  script: string,
  args: string[],
  env: NodeJS.ProcessEnv = {},
): RunResult => {
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ...env },
    })
    return { status: 0, stdout, stderr: '' }
  } catch (error: any) {
    return {
      status: error.status ?? -1,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
    }
  }
}

/**
 * A stand-in for the `gh` CLI, branching on which endpoint is asked for.
 *
 * check-required-checks.mjs is the gate that decides whether a commit's CI
 * actually passed, and it was the one piece here with no coverage — which is
 * how it shipped reading the OLDEST run of each check name. Faking the binary
 * keeps the real argv path under test; a --runs-file flag would not.
 */
interface WorkflowRun {
  id: number
  created_at: string
  status: string
  conclusion: string | null
  run_attempt: number
}

interface Job {
  name: string
  status: string
  conclusion: string | null
}

const withFakeGh = (
  runs: WorkflowRun[],
  jobsByRunId: Record<number, Job[]>,
  body: (env: NodeJS.ProcessEnv) => void,
): void => {
  const dir = mkdtempSync(join(tmpdir(), 'fake-gh-'))
  const bin = join(dir, 'gh')

  // The payloads are serialized HERE and embedded already-escaped, rather than
  // having the generated script build them. `gh --jq` emits one JSON object per
  // line, and writing that newline through two levels of source would need
  // escaping that is easy to get subtly wrong — the first attempt emitted a
  // literal newline into the generated file and produced a script that ran but
  // answered nothing.
  const lines = (rows: object[]): string =>
    rows.map((row) => JSON.stringify(row)).join('\n') +
    (rows.length ? '\n' : '')
  const jobPayloads = Object.fromEntries(
    Object.entries(jobsByRunId).map(([id, jobs]) => [id, lines(jobs)]),
  )

  writeFileSync(
    bin,
    [
      '#!/usr/bin/env node',
      `const runs = ${JSON.stringify(lines(runs))}`,
      `const jobs = ${JSON.stringify(jobPayloads)}`,
      'const url = process.argv.find((a) => a.includes("actions/")) ?? ""',
      'const m = /actions\\/runs\\/(\\d+)\\/jobs/.exec(url)',
      'process.stdout.write(m ? (jobs[m[1]] ?? "") : runs)',
      '',
    ].join('\n'),
  )
  chmodSync(bin, 0o755)
  try {
    body({ CYWEB_GH_CLI: bin })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * One answer from the fake `npm view <spec> ...`: the version the spec
 * resolves to, or the error code npm reports (E404 for "no such version").
 * `stallMs` holds the answer back first — a registry call that hangs.
 */
type NpmAnswer = ({ version: string } | { code: string }) & {
  stallMs?: number
}

/**
 * A stand-in for the `npm` CLI that answers `npm view <spec>` from a script.
 *
 * Each spec (`pkg@1.2.3`, `pkg@latest`) has a sequence of answers; every call
 * consumes the next one and the last repeats. That is what lets a test say
 * "a 404 twice, then the version" — the shape of a publish npm is still
 * processing. The call counts live in a file because every call is a separate
 * process.
 *
 * The answers mirror real npm 11 output under `--json`: a JSON string on
 * stdout and exit 0, or `{ "error": { "code": ... } }` on stdout and exit 1.
 */
const withFakeNpm = (
  plan: Record<string, NpmAnswer[]>,
  body: (env: NodeJS.ProcessEnv) => void,
): void => {
  const dir = mkdtempSync(join(tmpdir(), 'fake-npm-'))
  const bin = join(dir, 'npm')
  const counts = join(dir, 'counts.json')

  writeFileSync(
    bin,
    [
      '#!/usr/bin/env node',
      'const fs = require("node:fs")',
      `const plan = ${JSON.stringify(plan)}`,
      `const countsFile = ${JSON.stringify(counts)}`,
      'const counts = fs.existsSync(countsFile) ? JSON.parse(fs.readFileSync(countsFile, "utf8")) : {}',
      'const spec = process.argv[3]',
      'const answers = plan[spec] ?? [{ code: "E404" }]',
      'const n = counts[spec] ?? 0',
      'counts[spec] = n + 1',
      'fs.writeFileSync(countsFile, JSON.stringify(counts))',
      'const answer = answers[Math.min(n, answers.length - 1)]',
      'if (answer.stallMs) Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, answer.stallMs)',
      'if ("code" in answer) {',
      '  process.stdout.write(JSON.stringify({ error: { code: answer.code, summary: `fake ${answer.code}` } }))',
      '  process.exit(1)',
      '}',
      'process.stdout.write(JSON.stringify(answer.version))',
      '',
    ].join('\n'),
  )
  chmodSync(bin, 0o755)
  try {
    body({ CYWEB_NPM_CLI: bin })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

// Each case spawns the script, which spawns the fake npm twice per poll —
// a few hundred milliseconds, too close to the suite's 1-second default.
const SUBPROCESS_TIMEOUT = 10_000

const REQUIRED = ['Lint', 'Build', 'Unit Tests', 'API Types Package']
const green = (name: string): Job => ({
  name,
  status: 'completed',
  conclusion: 'success',
})
const RUN: WorkflowRun = {
  id: 1,
  created_at: '2026-09-10T01:00:00Z',
  status: 'completed',
  conclusion: 'success',
  run_attempt: 1,
}

// Opt in with CYWEB_REGISTRY_TESTS=1. See the header for why these are off by
// default.
const REGISTRY_TESTS = process.env.CYWEB_REGISTRY_TESTS === '1'
const registryIt = REGISTRY_TESTS ? it : it.skip

// Generous relative to the suite's 1-second default: each case shells out to
// npm and one of them fetches an attestation bundle over the network.
const NETWORK_TIMEOUT = 60_000

// A published version whose provenance this repository can check against known
// values. Chosen because it is a real OIDC publish from a sibling repository,
// so the parser is exercised against a genuine Sigstore bundle rather than a
// hand-written fixture that could agree with a wrong implementation.
const WITH_PROVENANCE = {
  pkg: '@cytoscape-web/app-runtime',
  version: '0.4.0-next.1',
  repository: 'cytoscape/cytoscape-web-app-examples',
  workflow: '.github/workflows/release-packages.yml',
  sha: '2986c443d46e53e30bd8735978f44326b89c390b',
  distTag: 'next',
}

const integrityOf = (pkg: string, version: string): string =>
  execFileSync('npm', ['view', `${pkg}@${version}`, 'dist.integrity'], {
    encoding: 'utf8',
  }).trim()

const decideArgs = (overrides: Record<string, string> = {}): string[] => {
  const base: Record<string, string> = {
    '--package': '@cytoscape-web/api-types',
    '--version': '0.0.0-never',
    '--integrity': 'sha512-placeholder',
    '--repository': 'cytoscape/cytoscape-web',
    '--workflow': '.github/workflows/release-api-types.yml',
    '--sha': '0'.repeat(40),
    // A dist-tag that does not exist: the rollback guard runs first, and
    // pointing at `latest` would make every beta.3 case below stop there —
    // which is what happened the day after beta.4 shipped and `latest` moved.
    '--dist-tag': 'cyweb-test-never',
    ...overrides,
  }
  return Object.entries(base).flatMap(([flag, value]) => [flag, value])
}

describe('decide-registry-action', () => {
  it(
    'requires every argument it depends on',
    () => {
      const result = run(DECIDE, ['--package', 'x'])
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('is required')
    },
    NETWORK_TIMEOUT,
  )

  it('names missing arguments by their flags', () => {
    // The internal keys are `pkg` and `distTag`; "--pkg is required" names a
    // flag that does not exist.
    expect(run(DECIDE, []).stderr).toContain('--package is required')
    expect(
      run(DECIDE, decideArgs().slice(0, -2)).stderr, // drops --dist-tag
    ).toContain('--dist-tag is required')
  })

  registryIt(
    'says publish when the version is absent',
    () => {
      // 0.0.0-never will not be published. The first version of this test
      // used the then-unpublished 1.0.0-beta.4 with a fallback branch for
      // "once it ships" — which meant that after it shipped, the test no
      // longer exercised the absent case at all.
      const result = run(DECIDE, decideArgs())
      expect(result.status).toBe(0)
      expect(result.stdout).toContain('is not on the registry')
      expect(result.stdout).toContain('action=publish')
    },
    NETWORK_TIMEOUT,
  )

  registryIt(
    'stops when the published bytes differ',
    () => {
      const result = run(
        DECIDE,
        decideArgs({
          '--version': '1.0.0-beta.3',
          '--integrity': 'sha512-definitely-not-it',
        }),
      )
      expect(result.status).toBe(1)
      expect(result.stderr).toContain(
        'already published with different content',
      )
      expect(result.stderr).toContain('immutable')
    },
    NETWORK_TIMEOUT,
  )

  registryIt(
    'stops when the bytes match but there is no provenance',
    () => {
      // beta.3 was published by hand, so it has none. Matching bytes alone must
      // not be enough to resume.
      const integrity = integrityOf('@cytoscape-web/api-types', '1.0.0-beta.3')
      const result = run(
        DECIDE,
        decideArgs({ '--version': '1.0.0-beta.3', '--integrity': integrity }),
      )
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('no provenance')
    },
    NETWORK_TIMEOUT,
  )

  registryIt(
    'refuses to roll a dist-tag backwards',
    () => {
      // This is the one test that is ABOUT the dist-tag, so it names `latest`
      // explicitly. 1.0.0-beta.2 is older than anything latest will ever
      // point at again.
      const result = run(
        DECIDE,
        decideArgs({ '--version': '1.0.0-beta.2', '--dist-tag': 'latest' }),
      )
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('Publishing would roll it backwards')
    },
    NETWORK_TIMEOUT,
  )

  registryIt(
    'says skip when repository, workflow and commit all match',
    () => {
      const integrity = integrityOf(
        WITH_PROVENANCE.pkg,
        WITH_PROVENANCE.version,
      )
      const result = run(DECIDE, [
        '--package',
        WITH_PROVENANCE.pkg,
        '--version',
        WITH_PROVENANCE.version,
        '--integrity',
        integrity,
        '--repository',
        WITH_PROVENANCE.repository,
        '--workflow',
        WITH_PROVENANCE.workflow,
        '--sha',
        WITH_PROVENANCE.sha,
        '--dist-tag',
        WITH_PROVENANCE.distTag,
      ])
      expect(result.status).toBe(0)
      expect(result.stdout).toContain('action=skip')
    },
    NETWORK_TIMEOUT,
  )

  registryIt(
    'stops when only the commit differs',
    () => {
      // The case a repository+workflow check would wave through: same workflow,
      // different commit. Resuming there adopts an artifact this run did not
      // produce.
      const integrity = integrityOf(
        WITH_PROVENANCE.pkg,
        WITH_PROVENANCE.version,
      )
      const result = run(DECIDE, [
        '--package',
        WITH_PROVENANCE.pkg,
        '--version',
        WITH_PROVENANCE.version,
        '--integrity',
        integrity,
        '--repository',
        WITH_PROVENANCE.repository,
        '--workflow',
        WITH_PROVENANCE.workflow,
        '--sha',
        '1'.repeat(40),
        '--dist-tag',
        WITH_PROVENANCE.distTag,
      ])
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('published by something else')
      expect(result.stderr).toContain('commit:')
    },
    NETWORK_TIMEOUT,
  )

  // Offline: the fake npm answers E404 for both the dist-tag and the version.
  it(
    'says publish when the version is absent (offline)',
    () => {
      withFakeNpm({}, (env) => {
        const result = run(DECIDE, decideArgs(), env)
        expect(result.status).toBe(0)
        expect(result.stdout).toContain('action=publish')
      })
    },
    SUBPROCESS_TIMEOUT,
  )

  it(
    'fails under --expect-published when the version is absent',
    () => {
      // The post-publish read-back. Without this flag an absent version exits
      // 0 with action=publish, and the beta.5 read-back went on to fail on the
      // dist-tag instead, with a message that pointed nowhere near the cause.
      withFakeNpm({}, (env) => {
        const result = run(DECIDE, [...decideArgs(), '--expect-published'], env)
        expect(result.status).toBe(1)
        expect(result.stdout).not.toContain('action=')
        expect(result.stderr).toContain('is not on the registry')
        expect(result.stderr).toContain('expected it to be published')
      })
    },
    SUBPROCESS_TIMEOUT,
  )
})

describe('wait-for-registry', () => {
  const PKG = '@cytoscape-web/api-types'
  const VERSION = '1.0.0-beta.9'
  const at = (v: string): NpmAnswer => ({ version: v })
  const E404: NpmAnswer = { code: 'E404' }

  // Short polls keep each case well under a second of waiting.
  const waitArgs = (timeout = '0.6'): string[] => [
    '--package',
    PKG,
    '--version',
    VERSION,
    '--dist-tag',
    'latest',
    '--timeout',
    timeout,
    '--interval',
    '0.05',
  ]

  it('requires every argument it depends on, named by its flag', () => {
    const result = run(WAIT, ['--package', PKG])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('--version is required')
    expect(run(WAIT, []).stderr).toContain('--package is required')
    expect(
      run(WAIT, ['--package', PKG, '--version', VERSION]).stderr,
    ).toContain('--dist-tag is required')
  })

  it(
    'holds its deadline when a registry call hangs',
    () => {
      // execFileSync has no timeout of its own. Without one, a stalled npm
      // call outlives the deadline, and in CI the job's hard timeout kills the
      // run before it can print the recovery instructions.
      withFakeNpm(
        {
          [`${PKG}@${VERSION}`]: [{ code: 'E404', stallMs: 8000 }],
          [`${PKG}@latest`]: [{ version: '1.0.0-beta.8', stallMs: 8000 }],
        },
        (env) => {
          const started = Date.now()
          const result = run(WAIT, waitArgs('1'), env)
          expect(result.status).toBe(1)
          expect(result.stderr).toContain('timed out')
          expect(result.stderr).toContain('do NOT delete or move the tag')
          expect(Date.now() - started).toBeLessThan(5000)
        },
      )
    },
    SUBPROCESS_TIMEOUT,
  )

  it(
    'returns at once when the version is visible and the dist-tag names it',
    () => {
      withFakeNpm(
        {
          [`${PKG}@${VERSION}`]: [at(VERSION)],
          [`${PKG}@latest`]: [at(VERSION)],
        },
        (env) => {
          const result = run(WAIT, waitArgs(), env)
          expect(result.status).toBe(0)
          expect(result.stdout).toContain('attempt 1')
          expect(result.stdout).not.toContain('not visible yet')
        },
      )
    },
    SUBPROCESS_TIMEOUT,
  )

  it(
    'keeps waiting while the version is still a 404',
    () => {
      // What beta.5 looked like: npm accepted the publish, then answered E404
      // for the version for over three minutes while it processed it.
      withFakeNpm(
        {
          [`${PKG}@${VERSION}`]: [E404, E404, at(VERSION)],
          [`${PKG}@latest`]: [
            at('1.0.0-beta.8'),
            at('1.0.0-beta.8'),
            at(VERSION),
          ],
        },
        (env) => {
          const result = run(WAIT, waitArgs('5'), env)
          expect(result.status).toBe(0)
          expect(result.stdout).toContain('not visible yet')
          expect(result.stdout).toContain('E404')
          expect(result.stdout).toContain('attempt 3')
        },
      )
    },
    SUBPROCESS_TIMEOUT,
  )

  it(
    'keeps waiting while the dist-tag still names the previous release',
    () => {
      // The version and the dist-tag are separate reads, and either can lag.
      withFakeNpm(
        {
          [`${PKG}@${VERSION}`]: [at(VERSION)],
          [`${PKG}@latest`]: [at('1.0.0-beta.8'), at(VERSION)],
        },
        (env) => {
          const result = run(WAIT, waitArgs('5'), env)
          expect(result.status).toBe(0)
          expect(result.stdout).toContain('latest → 1.0.0-beta.8')
          expect(result.stdout).toContain('attempt 2')
        },
      )
    },
    SUBPROCESS_TIMEOUT,
  )

  it(
    'retries a registry error instead of treating it as a verdict',
    () => {
      withFakeNpm(
        {
          [`${PKG}@${VERSION}`]: [{ code: 'E503' }, at(VERSION)],
          [`${PKG}@latest`]: [at(VERSION)],
        },
        (env) => {
          const result = run(WAIT, waitArgs('5'), env)
          expect(result.status).toBe(0)
          expect(result.stdout).toContain('E503')
        },
      )
    },
    SUBPROCESS_TIMEOUT,
  )

  it(
    'times out with a message that says not to undo the publish',
    () => {
      withFakeNpm(
        {
          [`${PKG}@${VERSION}`]: [E404],
          [`${PKG}@latest`]: [at('1.0.0-beta.8')],
        },
        (env) => {
          const result = run(
            WAIT,
            [
              ...waitArgs('0.3'),
              '--rerun-command',
              'gh workflow run release-api-types.yml --ref api-types-v1.0.0-beta.9 -f dry_run=false',
            ],
            env,
          )
          expect(result.status).toBe(1)
          expect(result.stderr).toContain('not visible')
          expect(result.stderr).toContain('asynchronously')
          expect(result.stderr).toContain('do NOT delete or move the tag')
          expect(result.stderr).toContain(
            'gh workflow run release-api-types.yml --ref api-types-v1.0.0-beta.9 -f dry_run=false',
          )
        },
      )
    },
    SUBPROCESS_TIMEOUT,
  )
})

describe('check-required-checks', () => {
  const allGreen = REQUIRED.map(green)

  it('passes when every required job succeeded', () => {
    withFakeGh([RUN], { 1: allGreen }, (env) => {
      const result = run(CHECKS, ['--sha', 'abc', '--repo', 'o/r'], env)
      expect(result.status).toBe(0)
      expect(result.stdout).toContain('all 4 required jobs passed')
    })
  })

  it('fails when ci.yml never ran for the commit', () => {
    // The shape of a tag placed on a commit that never reached development.
    withFakeGh([], {}, (env) => {
      const result = run(CHECKS, ['--sha', 'abc', '--repo', 'o/r'], env)
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('no run of ci.yml')
      expect(result.stderr).toContain('never reached development')
    })
  })

  it('fails and names a job missing from the run', () => {
    withFakeGh([RUN], { 1: allGreen.slice(0, 3) }, (env) => {
      const result = run(CHECKS, ['--sha', 'abc', '--repo', 'o/r'], env)
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('API Types Package: not present')
    })
  })

  it('fails on a failed job', () => {
    const jobs = [...allGreen]
    jobs[0] = { ...jobs[0], conclusion: 'failure' }
    withFakeGh([RUN], { 1: jobs }, (env) => {
      const result = run(CHECKS, ['--sha', 'abc', '--repo', 'o/r'], env)
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('Lint: failure')
    })
  })

  it('fails on a job still in progress rather than waiting', () => {
    const jobs = [...allGreen]
    jobs[1] = { ...jobs[1], status: 'in_progress', conclusion: null }
    withFakeGh([RUN], { 1: jobs }, (env) => {
      const result = run(CHECKS, ['--sha', 'abc', '--repo', 'o/r'], env)
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('still in_progress')
      expect(result.stderr).toContain('once CI finishes')
    })
  })

  it('uses the newest run when a SHA has more than one', () => {
    // push and pull_request triggers can both produce a run for one commit.
    const older: WorkflowRun = {
      ...RUN,
      id: 1,
      created_at: '2026-09-10T01:00:00Z',
    }
    const newer: WorkflowRun = {
      ...RUN,
      id: 2,
      created_at: '2026-09-10T02:00:00Z',
    }
    const failing = [
      { ...green('Lint'), conclusion: 'failure' },
      ...allGreen.slice(1),
    ]
    // Oldest-first on purpose: the result must not depend on array position.
    withFakeGh([older, newer], { 1: failing, 2: allGreen }, (env) => {
      const result = run(CHECKS, ['--sha', 'abc', '--repo', 'o/r'], env)
      expect(result.status).toBe(0)
      expect(result.stdout).toContain('run 2')
    })
  })

  it('ignores same-named jobs from a different workflow', () => {
    // The reason this queries ci.yml's runs rather than matching check-run
    // names: any workflow, or any app with checks:write, can publish a check
    // called "Lint". Asking for runs of ci.yml never sees them — here, an
    // unrelated workflow reports nothing for this SHA.
    withFakeGh([], {}, (env) => {
      const result = run(
        CHECKS,
        ['--sha', 'abc', '--repo', 'o/r', '--workflow', 'other.yml'],
        env,
      )
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('no run of other.yml')
    })
  })
})
