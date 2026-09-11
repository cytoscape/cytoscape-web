// @vitest-environment node
//
// Covers scripts/changelog-section.mjs, which the release workflow's guard, the
// annotated tag message and apiTypesRelease.test.ts all depend on.
//
// The CLI is invoked as a SUBPROCESS on purpose. Importing the module and
// calling the parser would pass even if the `main()` guard were wrong — and
// that guard is exactly the kind of thing that silently breaks: the naive
// `import.meta.url === process.argv[1]` compares a file:// URL against a plain
// path and is always false, which disables the CLI without any error.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const SCRIPT = resolve(__dirname, '../../../scripts/changelog-section.mjs')
const REAL_CHANGELOG = resolve(__dirname, '../../../packages/api-types/CHANGELOG.md')

interface RunResult {
  status: number
  stdout: string
  stderr: string
}

const run = (args: string[]): RunResult => {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT, ...args], {
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

let scratch: string
let fixture: string

beforeAll(() => {
  scratch = mkdtempSync(join(tmpdir(), 'changelog-section-'))
  fixture = join(scratch, 'CHANGELOG.md')
  writeFileSync(
    fixture,
    [
      '# Changelog',
      '',
      '## 2.0.0 (unpublished)',
      '',
      '### Added',
      '',
      '- a thing',
      '',
      '- a thing after a stray blank line',
      '',
      '## 1.5.0 (2026-01-02)',
      '',
      'body of 1.5.0',
      '',
      '## 1.4.0',
      '',
      'undated in a different way',
      '',
    ].join('\n'),
  )
})

afterAll(() => {
  rmSync(scratch, { recursive: true, force: true })
})

describe('changelog-section CLI', () => {
  it('runs at all — the main() guard resolves', () => {
    // A wrong guard makes the CLI print nothing and exit 0, which every other
    // assertion here would misread as a pass.
    const result = run(['--file', fixture, '--version', '1.5.0'])
    expect(result.status).toBe(0)
    expect(result.stdout.trim()).not.toBe('')
  })

  it('prints only the requested section', () => {
    const result = run(['--file', fixture, '--version', '1.5.0'])
    expect(result.stdout).toBe('body of 1.5.0\n')
  })

  it('keeps interior blank lines so a malformed list stays visible', () => {
    const result = run(['--file', fixture, '--version', '2.0.0'])
    expect(result.stdout).toBe(
      '### Added\n\n- a thing\n\n- a thing after a stray blank line\n',
    )
  })

  it('exits 1 when the version has no section', () => {
    const result = run(['--file', fixture, '--version', '9.9.9'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('no "## 9.9.9" section')
  })

  it('exits 2 for an (unpublished) section under --require-date', () => {
    const result = run(['--file', fixture, '--version', '2.0.0', '--require-date'])
    expect(result.status).toBe(2)
    expect(result.stderr).toContain('is not dated')
  })

  it('exits 2 for a heading with no parenthetical at all', () => {
    const result = run(['--file', fixture, '--version', '1.4.0', '--require-date'])
    expect(result.status).toBe(2)
  })

  it('accepts a dated section under --require-date', () => {
    const result = run(['--file', fixture, '--version', '1.5.0', '--require-date'])
    expect(result.status).toBe(0)
  })

  it('reports the date with --print-date', () => {
    const result = run(['--file', fixture, '--version', '1.5.0', '--print-date'])
    expect(result.stdout).toBe('2026-01-02\n')
  })

  it('reads the real changelog by default', () => {
    const result = run(['--version', '1.0.0-beta.3', '--print-date'])
    expect(result.status).toBe(0)
    expect(result.stdout.trim()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(REAL_CHANGELOG).toContain('CHANGELOG.md')
  })
})
