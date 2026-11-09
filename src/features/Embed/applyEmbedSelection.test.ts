import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTableStore } from '@/data/hooks/stores/TableStore'
import { useViewModelStore } from '@/data/hooks/stores/ViewModelStore'
import { useSubNetworkStore } from '@/features/HierarchyViewer/store/SubNetworkStore'
import { applyEmbedSelection } from './applyEmbedSelection'
import { EmbedParams } from './embedParams'

const NET = 'net-1'
const exclusiveSelect = vi.fn()

const params = (overrides: Partial<EmbedParams>): EmbedParams => ({
  selectedNodes: [],
  selectedEdges: [],
  selectedSubnetworkNodes: [],
  ...overrides,
})

describe('applyEmbedSelection', () => {
  beforeEach(() => {
    exclusiveSelect.mockReset()
    useViewModelStore.setState({ exclusiveSelect } as any)
    useTableStore.setState({
      tables: {
        [NET]: {
          nodeTable: {
            rows: new Map([
              ['74', {}],
              ['134', {}],
              ['1', {}],
            ]),
          },
          edgeTable: { rows: new Map([['e1', {}]]) },
        },
      },
    } as any)
    useSubNetworkStore.setState({ urlSelection: null, cellViewFocus: null })
  })

  it('selects the nodes and edges of a plain network that it has', () => {
    applyEmbedSelection(
      NET,
      params({ selectedNodes: ['1', 'x'], selectedEdges: ['e1', 'y'] }),
      false,
    )
    expect(exclusiveSelect).toHaveBeenCalledWith(NET, ['1'], ['e1'])
  })

  it('selects nothing when the network has none of the ids', () => {
    applyEmbedSelection(NET, params({ selectedNodes: ['x'] }), false)
    expect(exclusiveSelect).not.toHaveBeenCalled()
  })

  it('selects the first subsystem of a hierarchy and zooms to it', () => {
    applyEmbedSelection(
      NET,
      params({ selectedNodes: ['x', '74', '134'] }),
      true,
    )
    expect(exclusiveSelect).toHaveBeenCalledWith(NET, ['74'], [])
    expect(useSubNetworkStore.getState().cellViewFocus).toBe('74')
    expect(useSubNetworkStore.getState().urlSelection).toBeNull()
  })

  it('asks the subsystem interaction network to select its nodes', () => {
    applyEmbedSelection(
      NET,
      params({ selectedNodes: ['74'], selectedSubnetworkNodes: ['616'] }),
      true,
    )
    expect(useSubNetworkStore.getState().urlSelection).toEqual({
      subNetworkId: 'net-1_74',
      nodeIds: ['616'],
      edgeIds: [],
    })
  })
})
