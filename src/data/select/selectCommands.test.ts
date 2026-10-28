import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DisplayMode } from '../../models/FilterModel/DisplayMode'
import type { FilterConfig } from '../../models/FilterModel/FilterConfig'
import type { IdType } from '../../models/IdType'
import type { Network } from '../../models/NetworkModel'
import { GraphObjectType } from '../../models/NetworkModel/GraphObjectType'
import type { Table } from '../../models/TableModel'
import ViewModelFn from '../../models/ViewModel'
import { createVisualStyle } from '../../models/VisualStyleModel/impl/visualStyleFnImpl'
import {
  EdgeVisualPropertyName,
  NodeVisualPropertyName,
} from '../../models/VisualStyleModel/VisualPropertyName'
import { VisibilityType } from '../../models/VisualStyleModel/VisualPropertyValue/VisibilityType'
import { cancelAutoApply, scheduleAutoApply } from '../filter/pendingAutoApply'
import { useFilterStore } from '../hooks/stores/FilterStore'
import { useNetworkStore } from '../hooks/stores/NetworkStore'
import { useTableStore } from '../hooks/stores/TableStore'
import { useViewModelStore } from '../hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../hooks/stores/VisualStyleStore'
import { useWorkspaceStore } from '../hooks/stores/WorkspaceStore'
import {
  deselectAll,
  deselectAllEdges,
  deselectAllNodes,
  hasHiddenElementsInNetwork,
  hasSelection,
  hideSelected,
  selectAll,
  selectAllEdges,
  selectAllNodes,
  showAll,
} from './selectCommands'

const NET = 'net_1'

// n1 -e1-> n2 -e2-> n3, n4 isolated
const network: Network = {
  id: NET,
  nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }, { id: 'n4' }],
  edges: [
    { id: 'e1', s: 'n1', t: 'n2' },
    { id: 'e2', s: 'n2', t: 'n3' },
  ],
}

const nodeTable: Table = {
  id: NET,
  columns: [],
  rows: new Map([
    ['n1', {}],
    ['n2', {}],
    ['n3', {}],
    ['n4', {}],
  ]),
}

const edgeTable: Table = {
  id: NET,
  columns: [{ name: 'interaction', type: 'string' }],
  rows: new Map([
    ['e1', { interaction: 'pp' }],
    ['e2', { interaction: 'pd' }],
  ]),
}

const seedSelection = (nodes: IdType[], edges: IdType[]): void => {
  useViewModelStore.setState({
    viewModels: {
      [NET]: [
        ViewModelFn.exclusiveSelect(
          ViewModelFn.createViewModel(network),
          nodes,
          edges,
        ),
      ],
    },
  })
}

const selection = () => {
  const [view] = useViewModelStore.getState().viewModels[NET]
  return {
    nodes: [...view.selectedNodes].sort(),
    edges: [...view.selectedEdges].sort(),
  }
}

const visibility = (vp: string): Record<IdType, unknown> =>
  Object.fromEntries(
    (useVisualStyleStore.getState().visualStyles[NET] as any)[vp].bypassMap,
  )

const isModified = (): boolean =>
  useWorkspaceStore.getState().workspace.networkModified[NET] === true

const subnetworkConfig = (enabled?: boolean): FilterConfig => ({
  name: NET,
  target: GraphObjectType.EDGE,
  attributeName: 'interaction',
  label: 'Interaction',
  description: '',
  widgetType: 'checkbox',
  displayMode: DisplayMode.SELECT,
  range: { values: ['pp'] },
  ...(enabled === undefined ? {} : { enabled }),
})

describe('selectCommands', () => {
  beforeEach(() => {
    useNetworkStore.setState({ networks: new Map([[NET, network]]) })
    useTableStore.setState({ tables: { [NET]: { nodeTable, edgeTable } } })
    useVisualStyleStore.setState({
      visualStyles: { [NET]: createVisualStyle() },
    })
    seedSelection(['n1'], ['e2'])
    useFilterStore.setState({ filterConfigs: {}, appliedWorkspaceFilters: {} })
    useWorkspaceStore.setState((state) => ({
      workspace: { ...state.workspace, networkModified: {} },
    }))
  })

  describe('selection', () => {
    it('selects all nodes and keeps the edge selection', () => {
      expect(selectAllNodes(NET)).toBe(true)
      expect(selection()).toEqual({
        nodes: ['n1', 'n2', 'n3', 'n4'],
        edges: ['e2'],
      })
    })

    it('selects all edges and keeps the node selection', () => {
      expect(selectAllEdges(NET)).toBe(true)
      expect(selection()).toEqual({ nodes: ['n1'], edges: ['e1', 'e2'] })
    })

    it('deselects all nodes and keeps the edge selection', () => {
      expect(deselectAllNodes(NET)).toBe(true)
      expect(selection()).toEqual({ nodes: [], edges: ['e2'] })
    })

    it('deselects all edges and keeps the node selection', () => {
      expect(deselectAllEdges(NET)).toBe(true)
      expect(selection()).toEqual({ nodes: ['n1'], edges: [] })
    })

    it('selects and deselects every node and edge', () => {
      expect(selectAll(NET)).toBe(true)
      expect(selection()).toEqual({
        nodes: ['n1', 'n2', 'n3', 'n4'],
        edges: ['e1', 'e2'],
      })
      expect(deselectAll(NET)).toBe(true)
      expect(selection()).toEqual({ nodes: [], edges: [] })
    })

    it('selects hidden elements too, as Cytoscape Desktop does', () => {
      useVisualStyleStore
        .getState()
        .setBypass(
          NET,
          NodeVisualPropertyName.NodeVisibility,
          ['n4'],
          VisibilityType.None,
        )
      selectAll(NET)
      expect(selection().nodes).toContain('n4')
    })

    it('does not mark the network modified', () => {
      selectAll(NET)
      deselectAll(NET)
      expect(isModified()).toBe(false)
    })

    it('changes nothing for a network that is not loaded', () => {
      expect(selectAll('missing')).toBe(false)
      expect(deselectAll('missing')).toBe(false)
      useViewModelStore.setState({ viewModels: {} })
      expect(selectAllNodes(NET)).toBe(false)
    })

    it('reports whether something is selected', () => {
      expect(hasSelection(NET)).toBe(true)
      deselectAll(NET)
      expect(hasSelection(NET)).toBe(false)
      expect(hasSelection('missing')).toBe(false)
    })
  })

  describe('hideSelected', () => {
    it('hides the selected nodes, their edges and the selected edges', () => {
      seedSelection(['n1'], ['e2'])
      expect(hideSelected(NET)).toBe(true)
      expect(visibility(NodeVisualPropertyName.NodeVisibility)).toEqual({
        n1: VisibilityType.None,
      })
      expect(visibility(EdgeVisualPropertyName.EdgeVisibility)).toEqual({
        e1: VisibilityType.None,
        e2: VisibilityType.None,
      })
    })

    it('deselects what it hid, including the edges of hidden nodes', () => {
      seedSelection(['n1', 'n3'], ['e1'])
      // n3's edge e2 is not selected; e1 is selected and touches n1
      hideSelected(NET)
      expect(selection()).toEqual({ nodes: [], edges: [] })
    })

    it('adds to the visibility bypasses already there', () => {
      useVisualStyleStore
        .getState()
        .setBypass(
          NET,
          NodeVisualPropertyName.NodeVisibility,
          ['n4'],
          VisibilityType.None,
        )
      seedSelection(['n3'], [])
      hideSelected(NET)
      expect(visibility(NodeVisualPropertyName.NodeVisibility)).toEqual({
        n3: VisibilityType.None,
        n4: VisibilityType.None,
      })
    })

    it('marks the network modified', () => {
      hideSelected(NET)
      expect(isModified()).toBe(true)
    })

    it('changes nothing when nothing is selected', () => {
      seedSelection([], [])
      expect(hideSelected(NET)).toBe(false)
      expect(hasHiddenElementsInNetwork(NET)).toBe(false)
      expect(isModified()).toBe(false)
    })

    it('changes nothing without the network style', () => {
      useVisualStyleStore.setState({ visualStyles: {} })
      expect(hideSelected(NET)).toBe(false)
      expect(selection()).toEqual({ nodes: ['n1'], edges: ['e2'] })
    })
  })

  describe('showAll', () => {
    beforeEach(() => {
      seedSelection(['n2'], ['e2'])
      hideSelected(NET)
      seedSelection(['n4'], [])
      useWorkspaceStore.setState((state) => ({
        workspace: { ...state.workspace, networkModified: {} },
      }))
    })

    it('removes every node and edge visibility bypass', () => {
      expect(hasHiddenElementsInNetwork(NET)).toBe(true)
      expect(showAll(NET)).toBe(true)
      expect(visibility(NodeVisualPropertyName.NodeVisibility)).toEqual({})
      expect(visibility(EdgeVisualPropertyName.EdgeVisibility)).toEqual({})
      expect(hasHiddenElementsInNetwork(NET)).toBe(false)
    })

    it('leaves the selection alone and marks the network modified', () => {
      showAll(NET)
      expect(selection()).toEqual({ nodes: ['n4'], edges: [] })
      expect(isModified()).toBe(true)
    })

    it('drops the record of a filter applied in show mode', () => {
      useFilterStore.setState({
        appliedWorkspaceFilters: {
          [NET]: { filterId: 'f', displayMode: DisplayMode.SHOW_HIDE },
          other: { filterId: 'f', displayMode: DisplayMode.SHOW_HIDE },
        },
      })
      showAll(NET)
      expect(useFilterStore.getState().appliedWorkspaceFilters).toEqual({
        other: { filterId: 'f', displayMode: DisplayMode.SHOW_HIDE },
      })
    })

    it('cancels the pending FILTER tab auto-apply of the network only', () => {
      vi.useFakeTimers()
      try {
        const runHere = vi.fn()
        const runOther = vi.fn()
        scheduleAutoApply(NET, runHere, 300)
        scheduleAutoApply('other', runOther, 300)

        showAll(NET)
        vi.advanceTimersByTime(300)

        expect(runHere).not.toHaveBeenCalled()
        expect(runOther).toHaveBeenCalledTimes(1)
      } finally {
        cancelAutoApply('other')
        vi.useRealTimers()
      }
    })

    it('keeps the record of a filter applied in select mode', () => {
      const applied = {
        [NET]: { filterId: 'f', displayMode: DisplayMode.SELECT },
      }
      useFilterStore.setState({ appliedWorkspaceFilters: applied })
      showAll(NET)
      expect(useFilterStore.getState().appliedWorkspaceFilters).toEqual(applied)
    })

    it("switches off the subnetwork's filterWidgets filter", () => {
      useFilterStore.setState({ filterConfigs: { [NET]: subnetworkConfig() } })
      showAll(NET)
      expect(useFilterStore.getState().filterConfigs[NET].enabled).toBe(false)
      expect(visibility(EdgeVisualPropertyName.EdgeVisibility)).toEqual({})
    })

    it('does not mark an unchanged network modified', () => {
      showAll(NET)
      useWorkspaceStore.setState((state) => ({
        workspace: { ...state.workspace, networkModified: {} },
      }))
      expect(showAll(NET)).toBe(true)
      expect(isModified()).toBe(false)
    })

    it('changes nothing without the network style', () => {
      useVisualStyleStore.setState({ visualStyles: {} })
      expect(showAll(NET)).toBe(false)
      expect(hasHiddenElementsInNetwork(NET)).toBe(false)
    })
  })
})
