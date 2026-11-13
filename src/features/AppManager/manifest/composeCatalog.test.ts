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

/** Every entry runs here: sources and versions alone decide. */
const runsAnywhere = (): boolean => true

describe('composeCatalog', () => {
  it('returns manifest entries tagged manifest when there are no installed apps', () => {
    const { entries, sources } = composeCatalog(
      [entry('a'), entry('b')],
      [],
      runsAnywhere,
    )
    expect(entries.map((e) => e.id).sort()).toEqual(['a', 'b'])
    expect(sources).toEqual({ a: 'manifest', b: 'manifest' })
  })

  it('includes installed-only apps with their source', () => {
    const { entries, sources } = composeCatalog(
      [entry('a')],
      [installed('z', 'appstore')],
      runsAnywhere,
    )
    expect(entries.map((e) => e.id).sort()).toEqual(['a', 'z'])
    expect(sources).toEqual({ a: 'manifest', z: 'appstore' })
  })

  it('lets the installed entry win on collision for appstore source (version pin)', () => {
    const { entries, sources } = composeCatalog(
      [entry('hello', '1.0.0')],
      [installed('hello', 'appstore', '2.0.0')],
      runsAnywhere,
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
      runsAnywhere,
    )
    expect(entries.find((e) => e.id === 'hello')?.version).toBe('2.0.0')
    expect(sources.hello).toBe('snapshot')
  })

  // The newer version wins a collision, whichever side it is on: a newer
  // apps.json must replace an older App Store install, not stay hidden behind
  // its pin.
  describe('appstore and snapshot collisions are decided by version', () => {
    it('lets a newer manifest entry replace an older appstore install', () => {
      const { entries, sources } = composeCatalog(
        [entry('hello', '3.2.0')],
        [installed('hello', 'appstore', '3.1.23')],
        runsAnywhere,
      )
      const hello = entries.find((e) => e.id === 'hello')
      expect(hello?.version).toBe('3.2.0')
      expect(hello?.url).toContain('/3.2.0/')
      expect(sources.hello).toBe('manifest')
    })

    it('lets a newer manifest entry replace an older snapshot entry', () => {
      const { entries, sources } = composeCatalog(
        [entry('hello', '3.1.2')],
        [installed('hello', 'snapshot', '3.1.1')],
        runsAnywhere,
      )
      expect(entries.find((e) => e.id === 'hello')?.version).toBe('3.1.2')
      expect(sources.hello).toBe('manifest')
    })

    it('keeps the manifest entry when the versions are equal', () => {
      const { entries, sources } = composeCatalog(
        [entry('hello', '2.0.0')],
        [installed('hello', 'appstore', '2.0.0')],
        runsAnywhere,
      )
      expect(entries.find((e) => e.id === 'hello')?.url).toBe(
        entry('hello', '2.0.0').url,
      )
      expect(sources.hello).toBe('manifest')
    })

    // Review of the version change: a newer version this host cannot run
    // must not replace a working one. Compatibility is decided first.
    describe('compatibility comes before version', () => {
      const needsFutureHost = (e: AppCatalogEntry): AppCatalogEntry => ({
        ...e,
        compatibleHostVersions: '>=999.0.0',
      })
      const runsHere = (e: AppCatalogEntry): boolean =>
        e.compatibleHostVersions !== '>=999.0.0'

      it('keeps a working install over a newer manifest entry this host cannot run', () => {
        const { entries, sources } = composeCatalog(
          [needsFutureHost(entry('hello', '2.0.0'))],
          [installed('hello', 'appstore', '1.0.0')],
          runsHere,
        )
        expect(entries.find((e) => e.id === 'hello')?.version).toBe('1.0.0')
        expect(sources.hello).toBe('appstore')
      })

      it('takes the manifest entry over a newer install this host cannot run', () => {
        const unrunnable: InstalledApp = {
          ...installed('hello', 'appstore', '3.0.0'),
          entry: needsFutureHost(entry('hello', '3.0.0')),
        }
        const { entries, sources } = composeCatalog(
          [entry('hello', '1.0.0')],
          [unrunnable],
          runsHere,
        )
        expect(entries.find((e) => e.id === 'hello')?.version).toBe('1.0.0')
        expect(sources.hello).toBe('manifest')
      })
    })

    it('keeps the install pinned when the versions cannot be compared', () => {
      const unversioned: AppCatalogEntry = {
        id: 'hello',
        url: 'https://apps.cytoscape.org/web/hello/latest/remoteEntry.js',
        author: 'Test',
      }
      const { entries, sources } = composeCatalog(
        [unversioned],
        [installed('hello', 'appstore', '1.0.0')],
        runsAnywhere,
      )
      expect(entries.find((e) => e.id === 'hello')?.version).toBe('1.0.0')
      expect(sources.hello).toBe('appstore')
    })
  })

  it('lets the manifest entry win on collision for manifest source', () => {
    const { entries, sources } = composeCatalog(
      [entry('hello', '1.0.0')],
      [installed('hello', 'manifest', '2.0.0')],
      runsAnywhere,
    )
    const hello = entries.find((e) => e.id === 'hello')
    expect(hello?.version).toBe('1.0.0')
    expect(sources.hello).toBe('manifest')
  })

  it('does not duplicate ids present in both sources', () => {
    const { entries } = composeCatalog(
      [entry('hello')],
      [installed('hello', 'appstore')],
      runsAnywhere,
    )
    expect(entries.filter((e) => e.id === 'hello')).toHaveLength(1)
  })

  describe('manifestIds', () => {
    it('lists every manifest id', () => {
      const { manifestIds } = composeCatalog(
        [entry('a'), entry('b')],
        [],
        runsAnywhere,
      )
      expect(manifestIds.sort()).toEqual(['a', 'b'])
    })

    it('is empty when the manifest is empty', () => {
      const { manifestIds } = composeCatalog(
        [],
        [installed('z', 'appstore')],
        runsAnywhere,
      )
      expect(manifestIds).toEqual([])
    })

    it('excludes installed-only ids', () => {
      const { manifestIds } = composeCatalog(
        [entry('a')],
        [installed('z', 'snapshot')],
        runsAnywhere,
      )
      expect(manifestIds).toEqual(['a'])
    })

    it('keeps a manifest id that a pinned appstore install shadows', () => {
      const { sources, manifestIds } = composeCatalog(
        [entry('hello', '1.0.0')],
        [installed('hello', 'appstore', '2.0.0')],
        runsAnywhere,
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
        runsAnywhere,
      )
      expect(sources.hello).toBe('snapshot')
      expect(manifestIds).toEqual(['hello'])
    })
  })
})
