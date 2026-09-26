import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'

import { useFilterStore } from '../../../../data/hooks/stores/FilterStore'
import { useTableStore } from '../../../../data/hooks/stores/TableStore'
import { useVisualStyleStore } from '../../../../data/hooks/stores/VisualStyleStore'
import { FilterPanel } from './FilterPanel'
import { DisplayMode } from '../../../../models/FilterModel/DisplayMode'
import { GraphObjectType } from '../../../../models/NetworkModel'

// Mock child components to isolate the test to FilterPanel's useEffect behavior
vi.mock('./AttributeSelector', () => ({
  AttributeSelector: () => <div data-testid="mock-attr-selector" />,
}))

vi.mock('./CheckboxFilter', () => ({
  CheckboxFilter: ({ enableFilter }: { enableFilter: boolean }) => (
    <div
      data-testid="mock-checkbox-filter"
      data-enabled={String(enableFilter)}
    />
  ),
}))

describe('FilterPanel', () => {
  beforeEach(() => {
    // Reset stores
    useFilterStore.setState({ filterConfigs: {}, search: {} as any })
    useTableStore.setState({ tables: {} })
    useVisualStyleStore.setState({ visualStyles: {} })

    // Clear mocks
    vi.clearAllMocks()
  })

  it('does not infinitely loop when visual mapping has not changed', () => {
    const targetNetworkId = 'net1_sub1'

    const visualMappingForStore = {
      type: 'discrete',
      attribute: 'interaction',
    } as any

    const visualMappingForStyle = {
      type: 'discrete',
      attribute: 'interaction',
    } as any

    useFilterStore.setState({
      filterConfigs: {
        [targetNetworkId]: {
          name: targetNetworkId,
          label: 'Test Filter',
          attribute: 'interaction',
          type: 'checkbox',
          displayMode: DisplayMode.SELECT,
          targetObjectType: GraphObjectType.EDGE,
          visualMapping: visualMappingForStore,
        } as any,
      },
    })

    useTableStore.setState({
      tables: {
        [targetNetworkId]: {
          nodeTable: { rows: new Map(), columns: [] } as any,
          edgeTable: { rows: new Map(), columns: [] } as any,
        },
      },
    })

    useVisualStyleStore.setState({
      visualStyles: {
        [targetNetworkId]: {
          edgeLineColor: {
            mapping: visualMappingForStyle,
          },
        } as any,
      },
    })

    const updateSpy = vi.spyOn(useFilterStore.getState(), 'updateFilterConfig')

    render(
      <MemoryRouter>
        <FilterPanel networkId={targetNetworkId} />
      </MemoryRouter>,
    )

    // The component should mount without calling updateFilterConfig
    // because the visual mapping derived from the visual style is identical
    // to the one already in the filter config.
    expect(updateSpy).not.toHaveBeenCalled()
  })

  // #772: the on/off switch is stored on the subnetwork's filter config, so it
  // survives FilterPanel (and MainPanel) unmounting when the user selects
  // another network.
  describe('enabled state', () => {
    const networkId = 'net1_sub1'

    const setupFilter = (enabled?: boolean): void => {
      useFilterStore.setState({
        filterConfigs: {
          [networkId]: {
            name: networkId,
            label: 'Interaction',
            description: 'Filter by interaction',
            attributeName: 'interaction',
            target: GraphObjectType.EDGE,
            widgetType: 'checkbox',
            displayMode: DisplayMode.SELECT,
            range: { values: ['a'] },
            ...(enabled === undefined ? {} : { enabled }),
          } as any,
        },
      })
      useTableStore.setState({
        tables: {
          [networkId]: {
            nodeTable: { rows: new Map(), columns: [] } as any,
            edgeTable: {
              rows: new Map([['e1', { interaction: 'a' }]]),
              columns: [],
            } as any,
          },
        },
      })
    }

    const renderPanel = (url = '/') =>
      render(
        <MemoryRouter initialEntries={[url]}>
          <FilterPanel networkId={networkId} />
        </MemoryRouter>,
      )

    const switchInput = (): HTMLInputElement =>
      screen
        .getByTestId('filter-enable-switch')
        .querySelector('input') as HTMLInputElement

    const checkboxFilterEnabled = (): string | null =>
      screen.getByTestId('mock-checkbox-filter').getAttribute('data-enabled')

    it('is on when the config has no stored value', () => {
      setupFilter()
      renderPanel()

      expect(switchInput().checked).toBe(true)
      expect(checkboxFilterEnabled()).toBe('true')
    })

    it('reads the stored value from the filter config', () => {
      setupFilter(false)
      renderPanel()

      expect(switchInput().checked).toBe(false)
      expect(checkboxFilterEnabled()).toBe('false')
    })

    it('stores the switch on the filter config and keeps it across a remount', () => {
      setupFilter()
      const { unmount } = renderPanel()

      fireEvent.click(switchInput())

      expect(useFilterStore.getState().filterConfigs[networkId].enabled).toBe(
        false,
      )
      expect(checkboxFilterEnabled()).toBe('false')

      // Selecting another network closes the side panel and unmounts it
      unmount()
      renderPanel()

      expect(switchInput().checked).toBe(false)
      expect(checkboxFilterEnabled()).toBe('false')
    })

    it('falls back to the filterEnabled URL parameter when nothing is stored', () => {
      setupFilter()
      renderPanel('/?filterEnabled=false')

      expect(switchInput().checked).toBe(false)
    })

    it('prefers the stored value over the URL parameter', () => {
      setupFilter(true)
      renderPanel('/?filterEnabled=false')

      expect(switchInput().checked).toBe(true)
    })
  })
})
