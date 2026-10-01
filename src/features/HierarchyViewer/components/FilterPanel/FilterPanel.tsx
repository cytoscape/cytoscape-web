import { Box, Container, FormLabel, Switch, Typography } from '@mui/material'
import isEqual from 'lodash/isEqual'
import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useFilterStore } from '../../../../data/hooks/stores/FilterStore'
import { useTableStore } from '../../../../data/hooks/stores/TableStore'
import { useVisualStyleStore } from '../../../../data/hooks/stores/VisualStyleStore'
import { FilterConfig } from '../../../../models/FilterModel'
import { FilterUrlParams } from '../../../../models/FilterModel/FilterUrlParams'
import { IdType } from '../../../../models/IdType'
import { GraphObjectType } from '../../../../models/NetworkModel'
import { Table } from '../../../../models/TableModel'
import {
  VisualMappingFunction,
  VisualProperty,
  VisualPropertyValueType,
  VisualStyle,
} from '../../../../models/VisualStyleModel'
import { isSubnetwork } from '../../utils/hierarchyUtil'
import { CheckboxFilter } from './CheckboxFilter'
import { CompatibleVisualProperties } from './CompatibleVisualMappings'

interface FilterPanelProps {
  // The subnetwork to filter. Passed in rather than read from the active view
  // so the panel keeps showing when the user clicks into the tree view.
  networkId: IdType
}

/**
 * The color mapping of the style that colors the filter's elements by its
 * attribute, used for the checkboxes' swatches
 */
const getMapping = (
  style: VisualStyle,
  target: GraphObjectType,
  attrName: string,
): VisualMappingFunction | undefined => {
  let matchedMapping: VisualMappingFunction | undefined
  Object.values(CompatibleVisualProperties).forEach((propName: string) => {
    const vp: VisualProperty<VisualPropertyValueType> | undefined =
      style[propName as keyof VisualStyle]
    if (vp === undefined || vp.group !== target) return
    const { mapping } = vp
    if (mapping !== undefined && mapping.attribute === attrName) {
      matchedMapping = mapping
    }
  })
  return matchedMapping
}

/**
 * The subnetwork's filter, as defined by the `filterWidgets` aspect of its
 * interaction network (#798). The aspect fixes the attribute and the target,
 * so the panel offers no way to change them, only to switch the filter on
 * and off and to pick values.
 */
export const FilterPanel = ({ networkId }: FilterPanelProps) => {
  const selectedFilter: FilterConfig | undefined = useFilterStore(
    (state) => state.filterConfigs[networkId],
  )
  const updateFilterConfig = useFilterStore((state) => state.updateFilterConfig)
  const setFilterEnabled = useFilterStore((state) => state.setFilterEnabled)

  // URL search parameters
  const [searchParams] = useSearchParams()

  // Pick style for color coding
  const vs: VisualStyle | undefined = useVisualStyleStore(
    (state) => state.visualStyles[networkId],
  )

  // Hide the entire filter if it is not the main network
  const shouldApplyFilter: boolean = isSubnetwork(networkId)

  // Whether the filter is switched on. Stored on the subnetwork's filter
  // config rather than in component state, because this panel (and
  // MainPanel) unmounts while a subsystem loads, for subsystems without a
  // filter, and when another network is selected (#772). A config without a
  // stored value falls back to the filterEnabled URL parameter, then on.
  const isFilterEnabled: boolean =
    selectedFilter?.enabled ??
    searchParams.get(FilterUrlParams.FILTER_ENABLED) !== 'false'
  const setIsFilterEnabled = (enabled: boolean): void => {
    setFilterEnabled(networkId, enabled)
  }

  // Get target table from the store
  const tablePair = useTableStore((state) => state.tables[networkId])

  const target: GraphObjectType | undefined = selectedFilter?.target
  const attributeName: string | undefined = selectedFilter?.attributeName

  // The table of the elements the filter applies to. It must match the
  // config's target: CheckboxFilter reads the config's attribute from it and
  // writes the visibility bypass of that target for its rows.
  let table: Table | undefined
  if (tablePair !== undefined && target !== undefined) {
    table =
      target === GraphObjectType.NODE
        ? tablePair.nodeTable
        : tablePair.edgeTable
  }

  /**
   * Keep the config's color mapping in sync with the visual style
   */
  useEffect(() => {
    if (
      !shouldApplyFilter ||
      vs === undefined ||
      target === undefined ||
      attributeName === undefined
    )
      return

    // Read the config at execution time: this effect writes it back, so a
    // reactive dependency would loop.
    const currentConfig = useFilterStore.getState().filterConfigs[networkId]
    if (currentConfig === undefined) return

    const visualMapping = getMapping(vs, target, attributeName)
    if (!isEqual(currentConfig.visualMapping, visualMapping)) {
      updateFilterConfig(currentConfig.name, {
        ...currentConfig,
        visualMapping,
      })
    }
  }, [
    vs,
    target,
    attributeName,
    networkId,
    shouldApplyFilter,
    updateFilterConfig,
  ])

  /**
   * Set the URL parameters when the filter is enabled or disabled
   */
  useEffect(() => {
    searchParams.set(FilterUrlParams.FILTER_ENABLED, isFilterEnabled.toString())
    // setSearchParams(searchParams)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the toggle; searchParams is fresh each render
  }, [isFilterEnabled])

  if (!shouldApplyFilter || selectedFilter === undefined || table === undefined)
    return null

  return (
    <Container
      data-testid="filter-panel"
      disableGutters={true}
      sx={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        sx={{
          flex: '0 0 auto',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 48,
          px: 1,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography>
          <FormLabel component="span" sx={{ mr: 2 }}>
            Visibility Toggle:
          </FormLabel>{' '}
          {selectedFilter.label}
        </Typography>
        <Switch
          data-testid="filter-enable-switch"
          checked={isFilterEnabled}
          onChange={() => {
            setIsFilterEnabled(!isFilterEnabled)
          }}
        />
      </Box>
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0,
          boxSizing: 'border-box',
          width: '100%',
          overflow: 'auto',
        }}
      >
        <CheckboxFilter
          targetNetworkId={networkId}
          table={table}
          filterConfig={selectedFilter}
          enableFilter={isFilterEnabled}
        />
      </Box>
    </Container>
  )
}

export default FilterPanel
