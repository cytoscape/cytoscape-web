import { describe, expect, it } from 'vitest'
import {
  isNoiseFile,
  isTrivialOnly,
  makeNoiseMatcher,
  parseConflictFiles,
  parseNumstat,
} from './git-analysis'

const NUL = '\0'

describe('parseNumstat', () => {
  it('sums added and deleted for normal records', () => {
    const out = ['1\t0\t.gitignore', '4\t1\tsrc/a.ts'].join(NUL) + NUL
    expect(parseNumstat(out)).toEqual({ added: 5, deleted: 1, binaryFiles: 0 })
  })

  it('counts binary files separately and does not add them to churn', () => {
    const out = ['-\t-\tassets/logo.png', '2\t3\tsrc/a.ts'].join(NUL) + NUL
    expect(parseNumstat(out)).toEqual({ added: 2, deleted: 3, binaryFiles: 1 })
  })

  it('handles rename records (empty path then old/new path tokens)', () => {
    // "3\t2\t" has an empty path; the next two tokens are old/new paths.
    const out =
      ['3\t2\t', 'old/x.ts', 'new/x.ts', '5\t0\tsrc/b.ts'].join(NUL) + NUL
    expect(parseNumstat(out)).toEqual({ added: 8, deleted: 2, binaryFiles: 0 })
  })

  it('returns zeros for empty input', () => {
    expect(parseNumstat('')).toEqual({ added: 0, deleted: 0, binaryFiles: 0 })
  })
})

describe('parseConflictFiles', () => {
  it('returns no files for a clean merge (oid only)', () => {
    expect(parseConflictFiles('a50c68d4346d4295\n')).toEqual([])
  })

  it('lists conflicting files up to the blank line, ignoring messages', () => {
    const stdout = [
      'cb1194dcb33cfe70',
      '.gitignore',
      'src/a.ts',
      '',
      'Auto-merging .gitignore',
      'CONFLICT (content): Merge conflict in .gitignore',
    ].join('\n')
    expect(parseConflictFiles(stdout)).toEqual(['.gitignore', 'src/a.ts'])
  })
})

describe('isNoiseFile', () => {
  it('matches low-signal files by basename', () => {
    expect(isNoiseFile('.gitignore')).toBe(true)
    expect(isNoiseFile('package-lock.json')).toBe(true)
    expect(isNoiseFile('packages/api-types/CHANGELOG.md')).toBe(true)
    expect(isNoiseFile('pnpm-lock.yaml')).toBe(true)
  })

  it('does not match source files', () => {
    expect(isNoiseFile('src/data/hooks/useRegisterNetwork.ts')).toBe(false)
    expect(isNoiseFile('README.md')).toBe(false)
  })
})

describe('isTrivialOnly', () => {
  it('is true only when every conflicting file is low-signal', () => {
    expect(isTrivialOnly(['.gitignore'])).toBe(true)
    expect(isTrivialOnly(['package-lock.json', 'yarn.lock'])).toBe(true)
    expect(isTrivialOnly(['.gitignore', 'src/a.ts'])).toBe(false)
  })

  it('is false for an empty list', () => {
    expect(isTrivialOnly([])).toBe(false)
  })

  it('honors a custom matcher from makeNoiseMatcher', () => {
    const m = makeNoiseMatcher(['lessons.md'])
    expect(isTrivialOnly(['.serena/memories/lessons.md'], m)).toBe(true)
    expect(isTrivialOnly(['.serena/memories/lessons.md', 'src/a.ts'], m)).toBe(
      false,
    )
  })
})

describe('makeNoiseMatcher', () => {
  it('extends the default low-signal set with extra basenames', () => {
    const m = makeNoiseMatcher(['lessons.md', 'notes.txt'])
    expect(m('.serena/memories/lessons.md')).toBe(true)
    expect(m('notes.txt')).toBe(true)
    expect(m('.gitignore')).toBe(true) // defaults still apply
    expect(m('src/a.ts')).toBe(false)
  })
})
