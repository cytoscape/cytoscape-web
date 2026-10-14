import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useFilterStore } from '../../../data/hooks/stores/FilterStore'
import type { FilterConfig } from '../../../models/FilterModel'
import { GraphObjectType } from '../../../models/NetworkModel'
import { getDefaultCheckboxFilterConfig } from './filterUtil'
import { registerFilterConfig } from './registerFilterConfig'

vi.mock('../../../data/db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../data/db')>()),
  putFilterToDb: vi.fn().mockResolvedValue(undefined),
}))

const fresh = (): FilterConfig =>
  getDefaultCheckboxFilterConfig(
    'net1_7',
    'interaction',
    GraphObjectType.EDGE,
    ['activates', 'binds'],
  )

// #774: a subsystem's filter is rebuilt from its filterWidgets aspect every
// time it loads; the user's saved state must survive that.
describe('registerFilterConfig', () => {
  beforeEach(() => {
    useFilterStore.setState({ filterConfigs: {} })
  })

  it('adds the config when none is stored', () => {
    registerFilterConfig(fresh())

    expect(useFilterStore.getState().filterConfigs['net1_7']).toEqual(fresh())
  })

  it('restores the stored checked values and switch onto the fresh config', () => {
    useFilterStore.setState({
      filterConfigs: {
        net1_7: {
          ...fresh(),
          label: 'Old label',
          range: { values: ['binds', 'gone'] },
          enabled: false,
        },
      },
    })

    registerFilterConfig(fresh())

    expect(useFilterStore.getState().filterConfigs['net1_7']).toEqual({
      ...fresh(),
      range: { values: ['binds'] },
      enabled: false,
    })
  })
})
