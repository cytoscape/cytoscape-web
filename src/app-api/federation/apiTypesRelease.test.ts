// @vitest-environment node
//
// Keeps the three things a release reads in agreement: the package version, the
// lockfile's record of it, and the changelog.
//
// Lives under src/ rather than next to the package it checks because
// vitest.config.ts includes only `src/**` — a test placed under packages/ is
// silently ignored, which is worse than no test. mfDeclarations.test.ts, in
// this same directory, reads packages/api-types/ from disk for the same reason.
//
// Deliberately does NOT require a release date. `(unpublished)` is the correct
// state for a section still being written, and demanding a date on every pull
// request would mean re-dating the changelog on every commit. The date is
// required only by the release workflow, where it actually matters.

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import semver from 'semver'
import { describe, expect, it } from 'vitest'
// The same parser the release guard and the tag message use, so the heading
// grammar has exactly one implementation.
import {
  isReleaseDate,
  parseHeadings,
} from '../../../scripts/changelog-section.mjs'

const REPO_ROOT = resolve(__dirname, '../../..')
const PKG_DIR = 'packages/api-types'

const readJson = (relativePath: string): any =>
  JSON.parse(readFileSync(resolve(REPO_ROOT, relativePath), 'utf8'))

const manifest = readJson(`${PKG_DIR}/package.json`)
const lockfile = readJson('package-lock.json')
const changelog = readFileSync(
  resolve(REPO_ROOT, `${PKG_DIR}/CHANGELOG.md`),
  'utf8',
)
const headings = parseHeadings(changelog)

describe('api-types release consistency', () => {
  it('package.json and package-lock.json agree on the version', () => {
    // The highest-value assertion here: bumping the package without running
    // `npm install` leaves the lockfile behind, and the release workflow
    // refuses to publish on that mismatch. Catching it on the pull request
    // costs nothing; catching it at release time costs a re-tag.
    expect(lockfile.packages?.[PKG_DIR]?.version).toBe(manifest.version)
  })

  it('the changelog has a section for the current version', () => {
    const versions = headings.map(
      (heading: { version: string }) => heading.version,
    )
    expect(versions).toContain(manifest.version)
  })

  it('every heading is dated or explicitly unpublished', () => {
    // Nothing else. "(pending)", "(TBD)" and a bare heading all read as
    // "someone will remember", and nobody does.
    const bad = headings.filter(
      (heading: { note?: string }) =>
        !isReleaseDate(heading.note) && heading.note !== 'unpublished',
    )
    expect(
      bad.map(
        (h: { version: string; note?: string }) =>
          `${h.version} (${h.note ?? ''})`,
      ),
    ).toEqual([])
  })

  it('has at most one unpublished section, and it comes first', () => {
    const unpublished = headings
      .map((heading: { note?: string }, index: number) => ({
        note: heading.note,
        index,
      }))
      .filter((entry: { note?: string }) => entry.note === 'unpublished')

    expect(unpublished.length).toBeLessThanOrEqual(1)
    if (unpublished.length === 1) {
      // A resurrected older section, or a bad merge leaving two in flight,
      // both show up here.
      expect(unpublished[0].index).toBe(0)
    }
  })

  it('lists versions in strictly descending semver order', () => {
    const versions = headings.map(
      (heading: { version: string }) => heading.version,
    )
    for (const version of versions) {
      expect(
        semver.valid(version),
        `${version} is not valid semver`,
      ).not.toBeNull()
    }
    for (let i = 1; i < versions.length; i += 1) {
      expect(
        semver.lt(versions[i], versions[i - 1]),
        `${versions[i]} should sort below ${versions[i - 1]}`,
      ).toBe(true)
    }
  })

  it('ships the declarations it points at', () => {
    // `files` is an allowlist, so a types path outside it produces a package
    // that installs and then resolves to nothing.
    expect(manifest.files).toContain('dist')
    const typesRoot = String(manifest.types).split('/')[0]
    expect(manifest.files).toContain(typesRoot)
  })
})
