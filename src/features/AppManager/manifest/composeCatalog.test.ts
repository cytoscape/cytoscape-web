// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { AppCatalogEntry } from '../../../models/AppModel/AppCatalogEntry'
import { AppStatus } from '../../../models/AppModel/AppStatus'
import { AppSource, InstalledApp } from '../../../models/AppModel/InstalledApp'
import { composeCatalog } from './composeCatalog'

const entry = (id: string, version = '1.0.0'): AppCatalogEntry => ({
  id,
  url: `https://apps.cytoscape.org/web/${id}/${version}/remoteEntry.js`,
  author: 'Test',
  version,
})

const installed = (
  id: string,
  source: AppSource,
  version = '2.0.0',
): InstalledApp => ({
  entry: entry(id, version),
  status: AppStatus.Inactive,
  source,
  installedAt: '2026-06-01T00:00:00.000Z',
})

describe('composeCatalog', () => {
  it('returns manifest entries tagged manifest when there are no installed apps', () => {
    const { entries, sources } = composeCatalog([entry('a'), entry('b')], [])
    expect(entries.map((e) => e.id).sort()).toEqual(['a', 'b'])
    expect(sources).toEqual({ a: 'manifest', b: 'manifest' })
  })

  it('defaults installedApps to empty when the argument is omitted', () => {
    const { entries, sources } = composeCatalog([entry('a')])
    expect(entries.map((e) => e.id)).toEqual(['a'])
    expect(sources.a).toBe('manifest')
  })

  it('includes installed-only apps with their source', () => {
    const { entries, sources } = composeCatalog(
      [entry('a')],
      [installed('z', 'appstore')],
    )
    expect(entries.map((e) => e.id).sort()).toEqual(['a', 'z'])
    expect(sources).toEqual({ a: 'manifest', z: 'appstore' })
  })

  it('lets the installed entry win on collision for appstore source (version pin)', () => {
    const { entries, sources } = composeCatalog(
      [entry('hello', '1.0.0')],
      [installed('hello', 'appstore', '2.0.0')],
    )
    const hello = entries.find((e) => e.id === 'hello')
    expect(hello?.version).toBe('2.0.0')
    expect(hello?.url).toContain('/2.0.0/')
    expect(sources.hello).toBe('appstore')
  })

  it('lets the installed entry win on collision for snapshot source', () => {
    const { entries, sources } = composeCatalog(
      [entry('hello', '1.0.0')],
      [installed('hello', 'snapshot', '2.0.0')],
    )
    expect(entries.find((e) => e.id === 'hello')?.version).toBe('2.0.0')
    expect(sources.hello).toBe('snapshot')
  })

  it('lets the manifest entry win on collision for manifest source', () => {
    const { entries, sources } = composeCatalog(
      [entry('hello', '1.0.0')],
      [installed('hello', 'manifest', '2.0.0')],
    )
    const hello = entries.find((e) => e.id === 'hello')
    expect(hello?.version).toBe('1.0.0')
    expect(sources.hello).toBe('manifest')
  })

  it('does not duplicate ids present in both sources', () => {
    const { entries } = composeCatalog(
      [entry('hello')],
      [installed('hello', 'appstore')],
    )
    expect(entries.filter((e) => e.id === 'hello')).toHaveLength(1)
  })

  describe('manifestIds', () => {
    it('lists every manifest id', () => {
      const { manifestIds } = composeCatalog([entry('a'), entry('b')], [])
      expect(manifestIds.sort()).toEqual(['a', 'b'])
    })

    it('is empty when the manifest is empty', () => {
      const { manifestIds } = composeCatalog([], [installed('z', 'appstore')])
      expect(manifestIds).toEqual([])
    })

    it('excludes installed-only ids', () => {
      const { manifestIds } = composeCatalog(
        [entry('a')],
        [installed('z', 'snapshot')],
      )
      expect(manifestIds).toEqual(['a'])
    })

    it('keeps a manifest id that a pinned appstore install shadows', () => {
      const { sources, manifestIds } = composeCatalog(
        [entry('hello', '1.0.0')],
        [installed('hello', 'appstore', '2.0.0')],
      )
      // The pinned entry wins the merge, so `sources` no longer says
      // 'manifest' — but the manifest still ships the app.
      expect(sources.hello).toBe('appstore')
      expect(manifestIds).toEqual(['hello'])
    })

    it('keeps a manifest id that a snapshot restore shadows', () => {
      const { sources, manifestIds } = composeCatalog(
        [entry('hello', '1.0.0')],
        [installed('hello', 'snapshot', '2.0.0')],
      )
      expect(sources.hello).toBe('snapshot')
      expect(manifestIds).toEqual(['hello'])
    })
  })
})
