import { describe, expect, it } from 'vitest'
import { AppStatus } from '../../models/AppModel/AppStatus'
import { InstalledApp } from '../../models/AppModel/InstalledApp'
import { deriveAppOptions } from './useSaveWorkspaceToNDEx'

const installed = (id: string, status: AppStatus): InstalledApp => ({
  entry: {
    id,
    url: `https://apps.cytoscape.org/web/${id}/1.0.0/remoteEntry.js`,
    author: 'Test',
  },
  status,
  source: 'appstore',
  installedAt: '2026-06-01T00:00:00.000Z',
})

describe('deriveAppOptions', () => {
  it('returns empty options for undefined installedApps', () => {
    expect(deriveAppOptions(undefined)).toEqual({
      activeApps: [],
      installedApps: [],
    })
  })

  it('serializes the full installedApps list', () => {
    const list = [
      installed('a', AppStatus.Active),
      installed('b', AppStatus.Inactive),
    ]
    expect(deriveAppOptions(list).installedApps).toBe(list)
  })

  it('derives activeApps (ids) from entries with Active status', () => {
    const list = [
      installed('a', AppStatus.Active),
      installed('b', AppStatus.Inactive),
      installed('c', AppStatus.Active),
    ]
    expect(deriveAppOptions(list).activeApps).toEqual(['a', 'c'])
  })
})
