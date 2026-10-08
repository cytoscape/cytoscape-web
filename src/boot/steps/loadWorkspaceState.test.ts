import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFilterStore } from '@/data/hooks/stores/FilterStore'
import { DisplayMode } from '@/models/FilterModel/DisplayMode'
import type { FilterConfig } from '@/models/FilterModel/FilterConfig'
import { GraphObjectType } from '@/models/NetworkModel'
import { createWorkspace } from '@/models/WorkspaceModel/impl/workspaceImpl'
import type { AppShellBootContext } from './appShellBootContext'
import { loadWorkspaceState } from './loadWorkspaceState'

const getWorkspaceFromDb = vi.fn()
const getUiStateFromDb = vi.fn()
const getAllFilterConfigsFromDb = vi.fn()
const deleteFiltersFromDb = vi.fn()

// Partial mock: UiStateStore persists on every set, so the rest of the db
// module stays real (see runAppShellBoot.test.ts).
vi.mock('../../data/db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../data/db')>()),
  getWorkspaceFromDb: (...args: unknown[]) => getWorkspaceFromDb(...args),
  getUiStateFromDb: (...args: unknown[]) => getUiStateFromDb(...args),
  getAllFilterConfigsFromDb: (...args: unknown[]) =>
    getAllFilterConfigsFromDb(...args),
  deleteFiltersFromDb: (...args: unknown[]) => deleteFiltersFromDb(...args),
}))

const config = (name: string): FilterConfig => ({
  name,
  target: GraphObjectType.EDGE,
  attributeName: 'interaction',
  label: 'Filter',
  description: 'Test filter',
  widgetType: 'checkbox',
  displayMode: DisplayMode.SELECT,
  range: { values: ['a'] },
  enabled: false,
})

const ctx = (): AppShellBootContext =>
  ({
    search: new URLSearchParams(),
    pathname: '/',
    navigate: vi.fn(),
    loadNetworkSummaries: vi.fn().mockResolvedValue({}),
    appInstallAllowedOrigins: [],
  }) as unknown as AppShellBootContext

describe('loadWorkspaceState', () => {
  beforeEach(() => {
    useFilterStore.setState({ filterConfigs: {} })
    getUiStateFromDb.mockResolvedValue(undefined)
    deleteFiltersFromDb.mockReset().mockResolvedValue(undefined)
  })

  // #774: filter settings survive a reload
  it('restores the saved filter configs of the workspace networks', async () => {
    getWorkspaceFromDb.mockResolvedValue({
      ...createWorkspace(),
      networkIds: ['net1'],
    })
    const saved = config('net1_7')
    getAllFilterConfigsFromDb.mockResolvedValue([saved, config('gone_1')])

    await loadWorkspaceState(ctx())

    expect(useFilterStore.getState().filterConfigs).toEqual({ net1_7: saved })
    expect(deleteFiltersFromDb).toHaveBeenCalledWith(['gone_1'])
  })
})
