import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DisplayMode } from '../../models/FilterModel/DisplayMode'
import type { FilterConfig } from '../../models/FilterModel/FilterConfig'
import { GraphObjectType } from '../../models/NetworkModel'
import {
  deleteAllNetworksFromAllStores,
  deleteNetworkFromAllStores,
} from './deleteNetworkOrchestrator'
import { useFilterStore } from './stores/FilterStore'

const deleteNetworkFiltersFromDb = vi.fn()
const clearFiltersFromDb = vi.fn()

vi.mock('../db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../db')>()),
  deleteNetworkFiltersFromDb: (...args: unknown[]) =>
    deleteNetworkFiltersFromDb(...args),
  clearFiltersFromDb: (...args: unknown[]) => clearFiltersFromDb(...args),
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
})

// #774: a network's filter configs (keyed by its subnetworks' ids) go with it
describe('network delete cascade: filter configs', () => {
  beforeEach(() => {
    deleteNetworkFiltersFromDb.mockReset().mockResolvedValue(undefined)
    clearFiltersFromDb.mockReset().mockResolvedValue(undefined)
    useFilterStore.setState({
      filterConfigs: {
        net1_1: config('net1_1'),
        net1_2: config('net1_2'),
        net2_1: config('net2_1'),
      },
    })
  })

  it('deletes the filter configs of the deleted network', () => {
    deleteNetworkFromAllStores('net1')

    expect(Object.keys(useFilterStore.getState().filterConfigs)).toEqual([
      'net2_1',
    ])
    expect(deleteNetworkFiltersFromDb).toHaveBeenCalledWith('net1')
  })

  it('deletes every filter config when the workspace is emptied', () => {
    deleteAllNetworksFromAllStores()

    expect(useFilterStore.getState().filterConfigs).toEqual({})
    expect(clearFiltersFromDb).toHaveBeenCalledTimes(1)
  })
})

describe('network delete cascade: applied workspace filters', () => {
  const applied = { filterId: 'f1', displayMode: DisplayMode.SHOW_HIDE }

  beforeEach(() => {
    deleteNetworkFiltersFromDb.mockReset().mockResolvedValue(undefined)
    clearFiltersFromDb.mockReset().mockResolvedValue(undefined)
    useFilterStore.setState({
      appliedWorkspaceFilters: {
        net1: applied,
        net1_1: applied,
        net2: applied,
      },
    })
  })

  it('forgets the filter applied to the network and its subnetworks', () => {
    deleteNetworkFromAllStores('net1')

    expect(
      Object.keys(useFilterStore.getState().appliedWorkspaceFilters),
    ).toEqual(['net2'])
  })

  it('forgets every applied filter when the workspace is emptied', () => {
    deleteAllNetworksFromAllStores()

    expect(useFilterStore.getState().appliedWorkspaceFilters).toEqual({})
  })
})
