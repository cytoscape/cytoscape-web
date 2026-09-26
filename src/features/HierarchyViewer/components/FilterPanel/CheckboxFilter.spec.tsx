import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { useViewModelStore } from '@/data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '@/data/hooks/stores/VisualStyleStore'
import { FilterConfig } from '@/models/FilterModel'
import { DisplayMode } from '@/models/FilterModel/DisplayMode'
import { GraphObjectType } from '@/models/NetworkModel'
import { Table } from '@/models/TableModel'
import { createVisualStyle } from '@/models/VisualStyleModel/impl/visualStyleFnImpl'
import { EdgeVisualPropertyName } from '@/models/VisualStyleModel/VisualPropertyName'
import { VisibilityType } from '@/models/VisualStyleModel/VisualPropertyValue/VisibilityType'

import { CheckboxFilter } from './CheckboxFilter'

const networkId = 'net1_sub1'

const table = {
  id: networkId,
  columns: [{ name: 'interaction', type: 'string' }],
  rows: new Map([
    ['e1', { interaction: 'a' }],
    ['e2', { interaction: 'b' }],
    ['e3', { interaction: 'b' }],
  ]),
} as unknown as Table

const filterConfig = {
  name: 'checkboxFilter',
  attributeName: 'interaction',
  label: 'Interaction',
  description: 'Filter by interaction',
  target: GraphObjectType.EDGE,
  widgetType: 'checkbox',
  displayMode: DisplayMode.SELECT,
  range: { values: ['a'] },
} as unknown as FilterConfig

const edgeVisibilityBypass = (): Map<string, VisibilityType> =>
  useVisualStyleStore.getState().visualStyles[networkId][
    EdgeVisualPropertyName.EdgeVisibility
  ].bypassMap as Map<string, VisibilityType>

const renderFilter = (enableFilter: boolean) =>
  render(
    <MemoryRouter>
      <CheckboxFilter
        targetNetworkId={networkId}
        filterConfig={filterConfig}
        table={table}
        enableFilter={enableFilter}
      />
    </MemoryRouter>,
  )

describe('CheckboxFilter', () => {
  beforeEach(() => {
    useVisualStyleStore.setState({
      visualStyles: { [networkId]: createVisualStyle() },
    })
  })

  it('hides the elements outside the range when enabled', () => {
    renderFilter(true)

    const bypass = edgeVisibilityBypass()
    expect(bypass.get('e1')).toBe(VisibilityType.Element)
    expect(bypass.get('e2')).toBe(VisibilityType.None)
    expect(bypass.get('e3')).toBe(VisibilityType.None)
  })

  it('removes its visibility bypass when disabled and reapplies it when re-enabled (#769)', () => {
    const { rerender } = renderFilter(true)
    expect(edgeVisibilityBypass().size).toBe(3)

    rerender(
      <MemoryRouter>
        <CheckboxFilter
          targetNetworkId={networkId}
          filterConfig={filterConfig}
          table={table}
          enableFilter={false}
        />
      </MemoryRouter>,
    )
    expect(edgeVisibilityBypass().size).toBe(0)

    rerender(
      <MemoryRouter>
        <CheckboxFilter
          targetNetworkId={networkId}
          filterConfig={filterConfig}
          table={table}
          enableFilter={true}
        />
      </MemoryRouter>,
    )
    const bypass = edgeVisibilityBypass()
    expect(bypass.get('e1')).toBe(VisibilityType.Element)
    expect(bypass.get('e2')).toBe(VisibilityType.None)
    expect(bypass.get('e3')).toBe(VisibilityType.None)
  })

  it('leaves visibility bypasses of elements outside its table alone when disabled', () => {
    const { rerender } = renderFilter(true)
    useVisualStyleStore
      .getState()
      .setBypass(
        networkId,
        EdgeVisualPropertyName.EdgeVisibility,
        ['other'],
        VisibilityType.None,
      )

    rerender(
      <MemoryRouter>
        <CheckboxFilter
          targetNetworkId={networkId}
          filterConfig={filterConfig}
          table={table}
          enableFilter={false}
        />
      </MemoryRouter>,
    )
    const bypass = edgeVisibilityBypass()
    expect([...bypass.keys()]).toEqual(['other'])
  })

  it('keeps visibility bypasses of elements outside its table when applied', () => {
    useVisualStyleStore
      .getState()
      .setBypass(
        networkId,
        EdgeVisualPropertyName.EdgeVisibility,
        ['other'],
        VisibilityType.None,
      )

    renderFilter(true)

    const bypass = edgeVisibilityBypass()
    expect(bypass.get('other')).toBe(VisibilityType.None)
    expect(bypass.get('e1')).toBe(VisibilityType.Element)
    expect(bypass.get('e2')).toBe(VisibilityType.None)
  })

  it('clears the bypass an earlier mount wrote when it remounts disabled', () => {
    // The panel unmounts when the subsystem changes, but the network's
    // visual style (and its bypass) stays in the store.
    renderFilter(true).unmount()
    expect(edgeVisibilityBypass().size).toBe(3)

    renderFilter(false)

    expect(edgeVisibilityBypass().size).toBe(0)
  })

  it('does not clear the selection when disabled', () => {
    const { rerender } = renderFilter(true)
    const calls: unknown[][] = []
    const original = useViewModelStore.getState().exclusiveSelect
    useViewModelStore.setState({
      exclusiveSelect: (...args: Parameters<typeof original>) => {
        calls.push(args)
      },
    })

    try {
      rerender(
        <MemoryRouter>
          <CheckboxFilter
            targetNetworkId={networkId}
            filterConfig={filterConfig}
            table={table}
            enableFilter={false}
          />
        </MemoryRouter>,
      )
      expect(calls).toEqual([])
    } finally {
      useViewModelStore.setState({ exclusiveSelect: original })
    }
  })
})
