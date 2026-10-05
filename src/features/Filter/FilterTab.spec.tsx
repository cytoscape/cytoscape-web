import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useFilterStore } from '@/data/hooks/stores/FilterStore'
import { useNetworkStore } from '@/data/hooks/stores/NetworkStore'
import { useTableStore } from '@/data/hooks/stores/TableStore'
import { useViewModelStore } from '@/data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '@/data/hooks/stores/VisualStyleStore'
import { DisplayMode } from '@/models/FilterModel/DisplayMode'
import {
  FilterPredicate,
  MatchType,
  WorkspaceFilter,
} from '@/models/FilterModel/FilterTree'
import {
  createColumnFilter,
  createCompositeFilter,
  createWorkspaceFilter,
} from '@/models/FilterModel/impl/filterTreeImpl'
import type { Network } from '@/models/NetworkModel'
import type { Table } from '@/models/TableModel'
import ViewModelFn from '@/models/ViewModel'
import { createVisualStyle } from '@/models/VisualStyleModel/impl/visualStyleFnImpl'
import { NodeVisualPropertyName } from '@/models/VisualStyleModel/VisualPropertyName'
import { VisibilityType } from '@/models/VisualStyleModel/VisualPropertyValue/VisibilityType'

import { AUTO_APPLY_DELAY_MS, FilterTab } from './FilterTab'

const NET = 'net1'

const network: Network = {
  id: NET,
  nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
  edges: [{ id: 'e1', s: 'n1', t: 'n2' }],
}

const nodeTable: Table = {
  id: NET,
  columns: [
    { name: 'name', type: 'string' },
    { name: 'score', type: 'double' },
  ],
  rows: new Map([
    ['n1', { name: 'alpha', score: 1 }],
    ['n2', { name: 'beta', score: 5 }],
    ['n3', { name: 'gamma', score: 9 }],
  ]),
}

const edgeTable: Table = { id: NET, columns: [], rows: new Map() }

const nameContains = (text: string): WorkspaceFilter => ({
  ...createWorkspaceFilter('f1', 'Names'),
  root: createCompositeFilter(MatchType.ALL, [
    {
      ...createColumnFilter(),
      columnName: 'name',
      predicate: FilterPredicate.CONTAINS,
      criterion: text,
    },
  ]),
})

const selectedNodes = (): string[] =>
  useViewModelStore.getState().viewModels[NET][0].selectedNodes

// Opens an MUI Select by its input's test id and picks an option
const pick = (testId: string, option: string): void => {
  const input = screen.getByTestId(testId)
  const button = within(input.parentElement as HTMLElement).getByRole(
    'combobox',
  )
  fireEvent.mouseDown(button)
  fireEvent.click(screen.getByRole('option', { name: option }))
}

describe('FilterTab', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useNetworkStore.setState({ networks: new Map([[NET, network]]) })
    useTableStore.setState({ tables: { [NET]: { nodeTable, edgeTable } } })
    useVisualStyleStore.setState({
      visualStyles: { [NET]: createVisualStyle() },
    })
    useViewModelStore.setState({
      viewModels: { [NET]: [ViewModelFn.createViewModel(network)] },
    })
    useFilterStore.setState({
      workspaceFilters: {},
      appliedWorkspaceFilters: {},
      selectedWorkspaceFilterId: undefined,
      workspaceFilterAutoApply: {},
      filterConfigs: {},
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with a default filter and applies nothing on opening', () => {
    render(<FilterTab networkId={NET} />)
    act(() => {
      vi.advanceTimersByTime(AUTO_APPLY_DELAY_MS)
    })

    expect(
      Object.values(useFilterStore.getState().workspaceFilters).map(
        (filter) => filter.name,
      ),
    ).toEqual(['Default filter'])
    expect(screen.getByTestId('filter-status').textContent).toBe('')
    expect(selectedNodes()).toEqual([])
  })

  it('builds a column condition and applies it when the filter changes', () => {
    render(<FilterTab networkId={NET} />)

    fireEvent.click(screen.getByTestId('filter-condition-root-add'))
    fireEvent.click(screen.getByTestId('filter-condition-root-add-column'))
    pick('filter-condition-0-column', 'Node: name')
    fireEvent.change(screen.getByTestId('filter-condition-0-text'), {
      target: { value: 'et' },
    })
    act(() => {
      vi.advanceTimersByTime(AUTO_APPLY_DELAY_MS)
    })

    expect(selectedNodes()).toEqual(['n2'])
    expect(screen.getByTestId('filter-status').textContent).toBe(
      'Selected 1 node and 0 edges in 0 ms',
    )
  })

  it('applies only on Apply when "Apply when filter changes" is off', () => {
    useFilterStore.setState({
      workspaceFilters: { f1: nameContains('a') },
      selectedWorkspaceFilterId: 'f1',
    })
    render(<FilterTab networkId={NET} />)

    fireEvent.click(
      within(screen.getByTestId('filter-auto-apply-checkbox')).getByRole(
        'checkbox',
      ),
    )
    fireEvent.change(screen.getByTestId('filter-condition-0-text'), {
      target: { value: 'gam' },
    })
    act(() => {
      vi.advanceTimersByTime(AUTO_APPLY_DELAY_MS)
    })
    expect(selectedNodes()).toEqual([])

    fireEvent.click(screen.getByTestId('filter-apply-button'))
    expect(selectedNodes()).toEqual(['n3'])
  })

  it('switches to show mode and applies at once', () => {
    useFilterStore.setState({
      workspaceFilters: { f1: nameContains('alpha') },
      selectedWorkspaceFilterId: 'f1',
    })
    render(<FilterTab networkId={NET} />)

    fireEvent.click(
      within(screen.getByTestId('filter-display-mode-show')).getByRole('radio'),
    )

    expect(useFilterStore.getState().workspaceFilters.f1.displayMode).toBe(
      DisplayMode.SHOW_HIDE,
    )
    const bypass =
      useVisualStyleStore.getState().visualStyles[NET][
        NodeVisualPropertyName.NodeVisibility
      ].bypassMap
    expect(Object.fromEntries(bypass)).toEqual({
      n2: VisibilityType.None,
      n3: VisibilityType.None,
    })
    expect(screen.getByTestId('filter-status').textContent).toBe(
      'Showing 1 node and 1 edge in 0 ms',
    )
  })

  it('warns about a condition on a column the network does not have', () => {
    useFilterStore.setState({
      workspaceFilters: {
        f1: {
          ...nameContains('a'),
          root: createCompositeFilter(MatchType.ALL, [
            {
              ...createColumnFilter(),
              columnName: 'missing',
              predicate: FilterPredicate.IS,
              criterion: 'x',
            },
          ]),
        },
      },
    })
    render(<FilterTab networkId={NET} />)

    expect(screen.getByTestId('filter-condition-0-warning')).toBeTruthy()
  })

  it('combines several conditions, nested groups and topology conditions', () => {
    render(<FilterTab networkId={NET} />)
    const add = (parent: string, kind: string): void => {
      fireEvent.click(screen.getByTestId(`filter-condition-${parent}-add`))
      fireEvent.click(
        screen.getByTestId(`filter-condition-${parent}-add-${kind}`),
      )
    }

    add('root', 'degree')
    add('root', 'group')
    add('1', 'topology')
    add('1-0', 'column')
    pick('filter-condition-root-match-type', 'Match any (OR)')

    const [filter] = Object.values(useFilterStore.getState().workspaceFilters)
    expect(filter.root.matchType).toBe(MatchType.ANY)
    expect(filter.root.children.map((child) => child.type)).toEqual([
      'org.cytoscape.DegreeFilter',
      'org.cytoscape.CompositeFilter',
    ])
    expect(filter.root.children[1]).toMatchObject({
      children: [
        {
          type: 'org.cytoscape.TopologyFilter',
          children: [{ type: 'org.cytoscape.ColumnFilter' }],
        },
      ],
    })

    // Removing the group's only condition removes the emptied group too
    fireEvent.click(screen.getByTestId('filter-condition-1-0-remove'))
    const [after] = Object.values(useFilterStore.getState().workspaceFilters)
    expect(after.root.children).toHaveLength(1)
  })

  it('asks for a network when the target is not loaded', () => {
    render(<FilterTab networkId="not-loaded" />)

    expect(screen.getByTestId('filter-no-network')).toBeTruthy()
    expect(
      (screen.getByTestId('filter-apply-button') as HTMLButtonElement).disabled,
    ).toBe(true)
  })
})
