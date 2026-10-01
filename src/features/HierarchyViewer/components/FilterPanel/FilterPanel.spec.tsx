import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'

import { useFilterStore } from '../../../../data/hooks/stores/FilterStore'
import { useTableStore } from '../../../../data/hooks/stores/TableStore'
import { useVisualStyleStore } from '../../../../data/hooks/stores/VisualStyleStore'
import { FilterPanel } from './FilterPanel'
import { DisplayMode } from '../../../../models/FilterModel/DisplayMode'
import { GraphObjectType } from '../../../../models/NetworkModel'

// Mock the child component to isolate the test to FilterPanel's behavior
vi.mock('./CheckboxFilter', () => ({
  CheckboxFilter: ({
    enableFilter,
    table,
  }: {
    enableFilter: boolean
    table: { rows: Map<string, unknown> }
  }) => (
    <div
      data-testid="mock-checkbox-filter"
      data-enabled={String(enableFilter)}
      data-table-rows={[...table.rows.keys()].join(',')}
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
          attributeName: 'interaction',
          target: GraphObjectType.EDGE,
          widgetType: 'checkbox',
          displayMode: DisplayMode.SELECT,
          range: { values: [] },
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
            group: 'edge',
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

    // Adds a filter config and edge table for `id`, keeping those of other
    // subnetworks already set up
    const setupFilter = (enabled?: boolean, id: string = networkId): void => {
      useFilterStore.setState({
        filterConfigs: {
          ...useFilterStore.getState().filterConfigs,
          [id]: {
            name: id,
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
          ...useTableStore.getState().tables,
          [id]: {
            nodeTable: { rows: new Map(), columns: [] } as any,
            edgeTable: {
              rows: new Map([['e1', { interaction: 'a' }]]),
              columns: [],
            } as any,
          },
        },
      })
    }

    const renderPanel = (url = '/', id: string = networkId) =>
      render(
        <MemoryRouter initialEntries={[url]}>
          <FilterPanel networkId={id} />
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

    it('keeps the switch of each subnetwork separate', () => {
      const otherId = 'net1_sub2'
      setupFilter()
      setupFilter(undefined, otherId)

      const first = renderPanel()
      fireEvent.click(switchInput())
      first.unmount()

      // Another subnetwork with no stored value uses its own fallback
      const second = renderPanel('/', otherId)
      expect(switchInput().checked).toBe(true)
      expect(checkboxFilterEnabled()).toBe('true')
      second.unmount()

      // Returning to the first one finds it still switched off
      renderPanel()
      expect(switchInput().checked).toBe(false)
      expect(checkboxFilterEnabled()).toBe('false')
      const { filterConfigs } = useFilterStore.getState()
      expect(filterConfigs[networkId].enabled).toBe(false)
      expect(filterConfigs[otherId].enabled).toBeUndefined()
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

  // #798: the filter is the one the subnetwork's filterWidgets aspect
  // defines. There is no attribute switcher, and the panel takes the target
  // table and the color mapping from the stored config.
  describe('filter defined by the aspect', () => {
    const networkId = 'net1_sub1'

    const nodeMapping = {
      type: 'discrete',
      attribute: 'filename',
      vpValueMap: new Map(),
    } as any

    const setupNodeFilter = (): void => {
      useFilterStore.setState({
        filterConfigs: {
          [networkId]: {
            name: networkId,
            label: 'Image file',
            description: 'Filter by image file',
            attributeName: 'filename',
            target: GraphObjectType.NODE,
            widgetType: 'checkbox',
            displayMode: DisplayMode.SELECT,
            range: { values: ['a.jpg', 'b.jpg'] },
          } as any,
        },
      })
      useTableStore.setState({
        tables: {
          [networkId]: {
            nodeTable: {
              rows: new Map([
                ['n1', { filename: 'a.jpg' }],
                ['n2', { filename: 'b.jpg' }],
              ]),
              columns: [],
            } as any,
            edgeTable: {
              rows: new Map([['e1', { interaction: 'pp' }]]),
              columns: [],
            } as any,
          },
        },
      })
      useVisualStyleStore.setState({
        visualStyles: {
          [networkId]: {
            nodeBackgroundColor: { group: 'node', mapping: nodeMapping },
          } as any,
        },
      })
    }

    const renderPanel = () =>
      render(
        <MemoryRouter>
          <FilterPanel networkId={networkId} />
        </MemoryRouter>,
      )

    it('passes the table of the config target to CheckboxFilter', () => {
      setupNodeFilter()
      renderPanel()

      expect(
        screen
          .getByTestId('mock-checkbox-filter')
          .getAttribute('data-table-rows'),
      ).toBe('n1,n2')
    })

    it('shows the label without an attribute switcher or options button', () => {
      setupNodeFilter()
      renderPanel()

      expect(screen.getByText('Image file')).toBeTruthy()
      expect(screen.queryByTestId('attribute-selector-dropdown')).toBeNull()
      expect(screen.queryByTestId('attribute-selector-node-radio')).toBeNull()
      expect(screen.queryByTestId('SettingsIcon')).toBeNull()
      expect(screen.queryByTestId('ExpandLessIcon')).toBeNull()
    })

    it('takes the color mapping for the config attribute', () => {
      setupNodeFilter()
      renderPanel()

      expect(
        useFilterStore.getState().filterConfigs[networkId].visualMapping,
      ).toEqual(nodeMapping)
    })

    it('ignores a mapping of the same attribute on the other target', () => {
      setupNodeFilter()
      useVisualStyleStore.setState({
        visualStyles: {
          [networkId]: {
            edgeLineColor: { group: 'edge', mapping: nodeMapping },
          } as any,
        },
      })
      renderPanel()

      expect(
        useFilterStore.getState().filterConfigs[networkId].visualMapping,
      ).toBeUndefined()
    })
  })
})
