import { fireEvent, render, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { useFilterStore } from '@/data/hooks/stores/FilterStore'
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

const renderFilterWith = (
  filterTable: Table,
  attributeName: string,
  values: unknown[],
) =>
  render(
    <MemoryRouter>
      <CheckboxFilter
        targetNetworkId={networkId}
        filterConfig={
          { ...filterConfig, attributeName, range: { values } } as FilterConfig
        }
        table={filterTable}
        enableFilter={true}
      />
    </MemoryRouter>,
  )

describe('CheckboxFilter', () => {
  beforeEach(() => {
    useVisualStyleStore.setState({
      visualStyles: { [networkId]: createVisualStyle() },
    })
    useFilterStore.setState({ appliedWorkspaceFilters: {} })
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

  it('clears the bypass an earlier mount wrote when it remounts disabled', () => {
    // The panel unmounts when the subsystem changes, but the network's
    // visual style (and its bypass) stays in the store.
    renderFilter(true).unmount()
    expect(edgeVisibilityBypass().size).toBe(3)

    renderFilter(false)

    expect(edgeVisibilityBypass().size).toBe(0)
  })

  it('leaves the visibility a FILTER tab filter in show mode owns when disabled', () => {
    renderFilter(true).unmount()
    // A workspace filter applied in show mode took over the visibility
    useFilterStore.setState({
      appliedWorkspaceFilters: {
        [networkId]: { filterId: 'f1', displayMode: DisplayMode.SHOW_HIDE },
      },
    })

    renderFilter(false)

    expect(edgeVisibilityBypass().size).toBe(3)
  })

  it('labels boolean options with their value', () => {
    const boolTable = {
      id: networkId,
      columns: [{ name: 'querynode', type: 'boolean' }],
      rows: new Map([
        ['e1', { querynode: true }],
        ['e2', { querynode: false }],
      ]),
    } as unknown as Table

    const { getByTestId } = renderFilterWith(boolTable, 'querynode', [
      true,
      false,
    ])

    expect(
      getByTestId('checkbox-filter-option-false').closest('label'),
    ).toHaveProperty('textContent', 'false')
    expect(
      getByTestId('checkbox-filter-option-true').closest('label'),
    ).toHaveProperty('textContent', 'true')
  })

  describe('elements without a value', () => {
    const tableWithNulls = {
      id: networkId,
      columns: [{ name: 'interaction', type: 'string' }],
      rows: new Map<string, Record<string, unknown>>([
        ['e1', { interaction: 'a' }],
        ['e2', { interaction: null }],
        ['e3', {}],
        // The table browser writes '' when a string cell is cleared
        ['e4', { interaction: '' }],
      ]),
    } as unknown as Table

    it('share one muted N/A option, listed last', () => {
      const { container } = renderFilterWith(tableWithNulls, 'interaction', [
        'a',
        null,
      ])

      const options = [
        ...container.querySelectorAll(
          '[data-testid^="checkbox-filter-option-"]',
        ),
      ]
      expect(
        options.map((option) => option.getAttribute('data-testid')),
      ).toEqual(['checkbox-filter-option-a', 'checkbox-filter-option-no-value'])
      const label = options[1].closest('label') as HTMLElement
      expect(label.textContent).toBe('N/A')
      expect(
        within(label)
          .getByTestId('attribute-value-empty')
          .getAttribute('title'),
      ).toBe('No value')
    })

    it('are shown while the N/A option is checked', () => {
      renderFilterWith(tableWithNulls, 'interaction', [null])

      const bypass = edgeVisibilityBypass()
      expect(bypass.get('e1')).toBe(VisibilityType.None)
      expect(bypass.get('e2')).toBe(VisibilityType.Element)
      expect(bypass.get('e3')).toBe(VisibilityType.Element)
      expect(bypass.get('e4')).toBe(VisibilityType.Element)
    })

    it('are hidden while the N/A option is unchecked', () => {
      renderFilterWith(tableWithNulls, 'interaction', ['a'])

      const bypass = edgeVisibilityBypass()
      expect(bypass.get('e1')).toBe(VisibilityType.Element)
      expect(bypass.get('e2')).toBe(VisibilityType.None)
      expect(bypass.get('e3')).toBe(VisibilityType.None)
      expect(bypass.get('e4')).toBe(VisibilityType.None)
    })

    it('count toward Select All, which checks the N/A option too', () => {
      const config = {
        ...filterConfig,
        range: { values: ['a'] },
      } as FilterConfig
      useFilterStore.setState({ filterConfigs: { [config.name]: config } })

      const { container } = render(
        <MemoryRouter>
          <CheckboxFilter
            targetNetworkId={networkId}
            filterConfig={config}
            table={tableWithNulls}
            enableFilter={true}
          />
        </MemoryRouter>,
      )
      const selectAll = container.querySelector(
        '[data-testid="checkbox-filter-select-all"] input',
      ) as HTMLInputElement
      // Only 'a' of ['a', null] is checked
      expect(selectAll.checked).toBe(false)
      expect(selectAll.getAttribute('data-indeterminate')).toBe('true')

      fireEvent.click(selectAll)

      expect(
        useFilterStore.getState().filterConfigs[config.name].range,
      ).toEqual({ values: ['a', null] })
    })

    it('Select All is checked when the N/A option is checked too', () => {
      const { container } = renderFilterWith(tableWithNulls, 'interaction', [
        'a',
        null,
      ])

      const selectAll = container.querySelector(
        '[data-testid="checkbox-filter-select-all"] input',
      ) as HTMLInputElement
      expect(selectAll.checked).toBe(true)
      const bypass = edgeVisibilityBypass()
      expect([...bypass.values()]).toEqual([
        VisibilityType.Element,
        VisibilityType.Element,
        VisibilityType.Element,
        VisibilityType.Element,
      ])
    })
  })

  it('lists number options in numeric order', () => {
    const numberTable = {
      id: networkId,
      columns: [{ name: 'rank', type: 'integer' }],
      rows: new Map([
        ['e1', { rank: 10 }],
        ['e2', { rank: 9 }],
        ['e3', { rank: 100 }],
      ]),
    } as unknown as Table

    const { container } = renderFilterWith(numberTable, 'rank', [9, 10, 100])

    const labels = [
      ...container.querySelectorAll('[data-testid^="checkbox-filter-option-"]'),
    ].map((option) => option.closest('label')?.textContent)
    expect(labels).toEqual(['9', '10', '100'])
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
