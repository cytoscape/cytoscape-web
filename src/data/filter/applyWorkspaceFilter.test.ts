import { beforeEach, describe, expect, it } from 'vitest'

import { DisplayMode } from '../../models/FilterModel/DisplayMode'
import type { FilterConfig } from '../../models/FilterModel/FilterConfig'
import {
  ColumnFilterTarget,
  CompositeFilterNode,
  FilterPredicate,
  MatchType,
  WorkspaceFilter,
} from '../../models/FilterModel/FilterTree'
import {
  createColumnFilter,
  createCompositeFilter,
} from '../../models/FilterModel/impl/filterTreeImpl'
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
import { useFilterStore } from '../hooks/stores/FilterStore'
import { useNetworkStore } from '../hooks/stores/NetworkStore'
import { useTableStore } from '../hooks/stores/TableStore'
import { useViewModelStore } from '../hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../hooks/stores/VisualStyleStore'
import {
  ApplyFilterError,
  applyWorkspaceFilter,
  releaseWorkspaceFilter,
  setWorkspaceFilterDisplayModeAndApply,
} from './applyWorkspaceFilter'

const NET = 'net_1'

// n1 -e1-> n2 -e2-> n3
const network: Network = {
  id: NET,
  nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
  edges: [
    { id: 'e1', s: 'n1', t: 'n2' },
    { id: 'e2', s: 'n2', t: 'n3' },
  ],
}

const nodeTable: Table = {
  id: NET,
  columns: [{ name: 'score', type: 'double' }],
  rows: new Map([
    ['n1', { score: 1 }],
    ['n2', { score: 5 }],
    ['n3', { score: 9 }],
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

// score > 4: n2 and n3
const scoreFilter: CompositeFilterNode = createCompositeFilter(MatchType.ALL, [
  {
    ...createColumnFilter(),
    columnName: 'score',
    predicate: FilterPredicate.GREATER_THAN,
    criterion: 4,
  },
])

const workspaceFilter = (
  id: IdType,
  displayMode: DisplayMode,
  root: CompositeFilterNode = scoreFilter,
): WorkspaceFilter => ({ id, name: id, root, displayMode })

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

const visibility = (vp: string): Record<IdType, unknown> =>
  Object.fromEntries(
    (useVisualStyleStore.getState().visualStyles[NET] as any)[vp].bypassMap,
  )

const selection = () => {
  const [view] = useViewModelStore.getState().viewModels[NET]
  return { nodes: view.selectedNodes, edges: view.selectedEdges }
}

describe('applyWorkspaceFilter', () => {
  beforeEach(() => {
    useNetworkStore.setState({ networks: new Map([[NET, network]]) })
    useTableStore.setState({ tables: { [NET]: { nodeTable, edgeTable } } })
    useVisualStyleStore.setState({
      visualStyles: { [NET]: createVisualStyle() },
    })
    useViewModelStore.setState({
      viewModels: {
        [NET]: [
          ViewModelFn.exclusiveSelect(
            ViewModelFn.createViewModel(network),
            ['n1'],
            ['e1'],
          ),
        ],
      },
    })
    useFilterStore.setState({
      filterConfigs: {},
      appliedWorkspaceFilters: {},
      workspaceFilters: {
        select: workspaceFilter('select', DisplayMode.SELECT),
        show: workspaceFilter('show', DisplayMode.SHOW_HIDE),
        empty: workspaceFilter(
          'empty',
          DisplayMode.SHOW_HIDE,
          createCompositeFilter(),
        ),
      },
    })
  })

  it('replaces the selection in select mode; a node filter selects no edge', () => {
    const result = applyWorkspaceFilter(NET, 'select')

    expect(result).toMatchObject({
      success: true,
      applied: true,
      displayMode: DisplayMode.SELECT,
      nodeCount: 2,
      edgeCount: 0,
    })
    expect(selection()).toEqual({ nodes: ['n2', 'n3'], edges: [] })
    expect(visibility(NodeVisualPropertyName.NodeVisibility)).toEqual({})
    expect(useFilterStore.getState().appliedWorkspaceFilters[NET]).toEqual({
      filterId: 'select',
      displayMode: DisplayMode.SELECT,
    })
  })

  it('hides what does not pass in show mode and leaves the selection', () => {
    useVisualStyleStore
      .getState()
      .setBypassMap(
        NET,
        NodeVisualPropertyName.NodeVisibility,
        new Map([['n3', VisibilityType.None]]),
      )

    const result = applyWorkspaceFilter(NET, 'show')

    // Every edge stays: the filter is about nodes only
    expect(result).toMatchObject({ success: true, nodeCount: 2, edgeCount: 2 })
    // n3 passes, so the bypass hiding it before goes
    expect(visibility(NodeVisualPropertyName.NodeVisibility)).toEqual({
      n1: VisibilityType.None,
    })
    expect(visibility(EdgeVisualPropertyName.EdgeVisibility)).toEqual({})
    expect(selection()).toEqual({ nodes: ['n1'], edges: ['e1'] })
  })

  it('shows every element again when a select filter follows a show filter', () => {
    applyWorkspaceFilter(NET, 'show')
    applyWorkspaceFilter(NET, 'select')

    expect(visibility(NodeVisualPropertyName.NodeVisibility)).toEqual({})
    expect(selection()).toEqual({ nodes: ['n2', 'n3'], edges: [] })
  })

  it('switches the display mode and applies at once', () => {
    applyWorkspaceFilter(NET, 'show')
    const result = setWorkspaceFilterDisplayModeAndApply(
      NET,
      'show',
      DisplayMode.SELECT,
    )

    expect(result).toMatchObject({ success: true, displayMode: 'select' })
    expect(useFilterStore.getState().workspaceFilters.show.displayMode).toBe(
      DisplayMode.SELECT,
    )
    expect(visibility(NodeVisualPropertyName.NodeVisibility)).toEqual({})
    expect(selection().nodes).toEqual(['n2', 'n3'])
  })

  it('changes nothing for a filter without conditions', () => {
    useFilterStore.setState({ filterConfigs: { [NET]: subnetworkConfig() } })

    expect(applyWorkspaceFilter(NET, 'empty')).toMatchObject({
      success: true,
      applied: false,
    })
    expect(selection()).toEqual({ nodes: ['n1'], edges: ['e1'] })
    expect(useFilterStore.getState().filterConfigs[NET].enabled).toBe(undefined)
    expect(useFilterStore.getState().appliedWorkspaceFilters).toEqual({})
  })

  it.each([DisplayMode.SELECT, DisplayMode.SHOW_HIDE])(
    'switches off the subnetwork filter in %s mode',
    (displayMode) => {
      useFilterStore.setState({ filterConfigs: { [NET]: subnetworkConfig() } })
      useVisualStyleStore.getState().setBypassMap(
        NET,
        EdgeVisualPropertyName.EdgeVisibility,
        new Map([
          ['e1', VisibilityType.Element],
          ['e2', VisibilityType.None],
        ]),
      )

      applyWorkspaceFilter(
        NET,
        displayMode === DisplayMode.SELECT ? 'select' : 'show',
      )

      expect(useFilterStore.getState().filterConfigs[NET].enabled).toBe(false)
      // Its bypass is gone; the score filter hides no edge
      expect(visibility(EdgeVisualPropertyName.EdgeVisibility)).toEqual({})
    },
  )

  it('reports a missing filter, network or style', () => {
    expect(applyWorkspaceFilter(NET, 'nope')).toEqual({
      success: false,
      error: ApplyFilterError.FILTER_NOT_FOUND,
    })
    expect(applyWorkspaceFilter('other', 'select')).toEqual({
      success: false,
      error: ApplyFilterError.NETWORK_NOT_FOUND,
    })
    useVisualStyleStore.setState({ visualStyles: {} })
    expect(applyWorkspaceFilter(NET, 'show')).toEqual({
      success: false,
      error: ApplyFilterError.STYLE_NOT_FOUND,
    })
    expect(
      setWorkspaceFilterDisplayModeAndApply(NET, 'nope', DisplayMode.SELECT),
    ).toEqual({ success: false, error: ApplyFilterError.FILTER_NOT_FOUND })
  })

  it('applies an edge filter in show mode to edges only', () => {
    useFilterStore.getState().putWorkspaceFilter(
      workspaceFilter(
        'edges',
        DisplayMode.SHOW_HIDE,
        createCompositeFilter(MatchType.ALL, [
          {
            ...createColumnFilter(),
            columnName: 'interaction',
            target: ColumnFilterTarget.EDGES,
            predicate: FilterPredicate.IS,
            criterion: 'pp',
          },
        ]),
      ),
    )

    applyWorkspaceFilter(NET, 'edges')

    expect(visibility(NodeVisualPropertyName.NodeVisibility)).toEqual({})
    expect(visibility(EdgeVisualPropertyName.EdgeVisibility)).toEqual({
      e2: VisibilityType.None,
    })
  })
})

describe('releaseWorkspaceFilter', () => {
  beforeEach(() => {
    useVisualStyleStore.setState({
      visualStyles: { [NET]: createVisualStyle() },
    })
    useVisualStyleStore
      .getState()
      .setBypassMap(
        NET,
        NodeVisualPropertyName.NodeVisibility,
        new Map([['n1', VisibilityType.None]]),
      )
  })

  it('shows every element when the filter was applied in show mode', () => {
    useFilterStore.setState({
      appliedWorkspaceFilters: {
        [NET]: { filterId: 'show', displayMode: DisplayMode.SHOW_HIDE },
      },
    })

    releaseWorkspaceFilter(NET)

    expect(visibility(NodeVisualPropertyName.NodeVisibility)).toEqual({})
    expect(useFilterStore.getState().appliedWorkspaceFilters).toEqual({})
  })

  it('leaves visibility alone after a select filter', () => {
    useFilterStore.setState({
      appliedWorkspaceFilters: {
        [NET]: { filterId: 'select', displayMode: DisplayMode.SELECT },
      },
    })

    releaseWorkspaceFilter(NET)

    expect(visibility(NodeVisualPropertyName.NodeVisibility)).toEqual({
      n1: VisibilityType.None,
    })
    expect(useFilterStore.getState().appliedWorkspaceFilters).toEqual({})
  })
})
