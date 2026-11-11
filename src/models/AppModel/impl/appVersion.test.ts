// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { AppCatalogEntry } from '../AppCatalogEntry'
import { appVersionChange, compareAppVersions } from './appVersion'

describe('compareAppVersions', () => {
  it('orders patch versions', () => {
    expect(compareAppVersions('3.1.2', '3.1.1')).toBeGreaterThan(0)
    expect(compareAppVersions('3.1.1', '3.1.0')).toBeGreaterThan(0)
    expect(compareAppVersions('3.1.0', '3.1.2')).toBeLessThan(0)
  })

  it('compares numerically, not as text', () => {
    // As strings "3.1.23" > "3.2.0"; as versions 3.2.0 is newer.
    expect(compareAppVersions('3.2.0', '3.1.23')).toBeGreaterThan(0)
    expect(compareAppVersions('3.10.0', '3.9.9')).toBeGreaterThan(0)
  })

  it('treats equal versions as equal', () => {
    expect(compareAppVersions('1.0.0', '1.0.0')).toBe(0)
  })

  it('puts a pre-release before its release', () => {
    expect(compareAppVersions('2.0.0-beta.1', '2.0.0')).toBeLessThan(0)
    expect(compareAppVersions('2.0.0-beta.1', '1.9.9')).toBeGreaterThan(0)
  })

  it('cannot compare a missing or non-semver version', () => {
    expect(compareAppVersions(undefined, '1.0.0')).toBeUndefined()
    expect(compareAppVersions('1.0.0', undefined)).toBeUndefined()
    expect(compareAppVersions('latest', '1.0.0')).toBeUndefined()
    expect(compareAppVersions('1.0', '1.0.0')).toBeUndefined()
  })
})

describe('appVersionChange', () => {
  const entry = (version?: string, url?: string): AppCatalogEntry => ({
    id: 'networkAnalyzer',
    author: 'Test',
    url:
      url ??
      `https://apps.cytoscape.org/web/networkanalyzer/${version ?? 'x'}/remoteEntry.js`,
    ...(version !== undefined && { version }),
  })

  it('is new when nothing is installed under the id', () => {
    expect(appVersionChange(entry('1.0.0'), undefined)).toEqual({
      kind: 'new',
    })
  })

  it('is an update when the offered version is newer', () => {
    expect(appVersionChange(entry('1.1.0'), entry('1.0.0'))).toEqual({
      kind: 'update',
      from: '1.0.0',
      to: '1.1.0',
    })
  })

  it('keeps the installed version when the offered one is older', () => {
    expect(appVersionChange(entry('1.0.0'), entry('1.1.0'))).toEqual({
      kind: 'older',
      installed: '1.1.0',
      offered: '1.0.0',
    })
  })

  it('is the same app when the versions match', () => {
    expect(appVersionChange(entry('1.1.0'), entry('1.1.0'))).toEqual({
      kind: 'same',
      version: '1.1.0',
    })
  })

  it('is the same app when the remote entry URL matches', () => {
    const url = 'https://apps.cytoscape.org/web/networkanalyzer/remoteEntry.js'
    expect(
      appVersionChange(entry(undefined, url), entry('1.0.0', url)),
    ).toEqual({ kind: 'same', version: '1.0.0' })
  })

  it('replaces, as before, when the versions cannot be compared', () => {
    // No usable version on one side: the link's entry wins, which is what an
    // install did before versions were compared.
    expect(appVersionChange(entry(undefined), entry('1.0.0'))).toEqual({
      kind: 'update',
      from: '1.0.0',
    })
    expect(appVersionChange(entry('2.0.0'), entry('nightly'))).toEqual({
      kind: 'update',
      from: 'nightly',
      to: '2.0.0',
    })
  })
})
