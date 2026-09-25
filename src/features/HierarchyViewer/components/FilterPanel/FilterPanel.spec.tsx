import { render } from '@testing-library/react'
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
  CheckboxFilter: () => <div data-testid="mock-checkbox-filter" />,
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
        <FilterPanel
          networkId={targetNetworkId}
          enabled={true}
          onEnabledChange={() => {}}
        />
      </MemoryRouter>,
    )

    // The component should mount without calling updateFilterConfig
    // because the visual mapping derived from the visual style is identical
    // to the one already in the filter config.
    expect(updateSpy).not.toHaveBeenCalled()
  })
})
