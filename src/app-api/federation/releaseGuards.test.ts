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
