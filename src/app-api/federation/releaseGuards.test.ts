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
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const DECIDE = resolve(__dirname, '../../../scripts/decide-registry-action.mjs')

interface RunResult {
  status: number
  stdout: string
  stderr: string
}

const run = (script: string, args: string[]): RunResult => {
  try {
    const stdout = execFileSync(process.execPath, [script, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
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
    '--version': '1.0.0-beta.4',
    '--integrity': 'sha512-placeholder',
    '--repository': 'cytoscape/cytoscape-web',
    '--workflow': '.github/workflows/release-api-types.yml',
    '--sha': '0'.repeat(40),
    '--dist-tag': 'latest',
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
      // 1.0.0-beta.4 is unpublished at the time of writing; once it ships this
      // assertion becomes "skip or stop", so pin the expectation to the branch
      // rather than the package.
      const result = run(DECIDE, decideArgs())
      if (result.stdout.includes('is not on the registry')) {
        expect(result.status).toBe(0)
        expect(result.stdout).toContain('action=publish')
      } else {
        // Already published: the run must not silently proceed.
        expect(result.status).toBe(1)
      }
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
      const result = run(DECIDE, decideArgs({ '--version': '1.0.0-beta.2' }))
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
