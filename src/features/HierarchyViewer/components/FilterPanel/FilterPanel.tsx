import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import SettingsIcon from '@mui/icons-material/Settings'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Container,
  FormLabel,
  Switch,
  Typography,
} from '@mui/material'
import Grid from '@mui/material/Grid'
import isEqual from 'lodash/isEqual'
import { useEffect, useState } from 'react'
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
import {
  getAllDiscreteValues,
  getDefaultCheckboxFilterConfig,
} from '../../utils/filterUtil'
import { AttributeSelector } from './AttributeSelector'
import { CheckboxFilter } from './CheckboxFilter'
import { CompatibleVisualProperties } from './CompatibleVisualMappings'

// Default filter name if none exists
export const DEFAULT_FILTER_NAME = 'checkboxFilter'

// TODO: Import from CX
const DEFAULT_EDGE_ATTR_NAME = 'interaction'

import { isSubnetwork } from '../../utils/hierarchyUtil'

interface FilterPanelProps {
  // The subnetwork to filter. Passed in rather than read from the active view
  // so the panel keeps showing when the user clicks into the tree view.
  networkId: IdType
}

export const FilterPanel = ({ networkId }: FilterPanelProps) => {
  const filterConfigs = useFilterStore((state) => state.filterConfigs)
  const addFilterConfig = useFilterStore((state) => state.addFilterConfig)
  const updateFilterConfig = useFilterStore((state) => state.updateFilterConfig)
  const setFilterEnabled = useFilterStore((state) => state.setFilterEnabled)

  // Show or hide the advanced options
  const [showOptions, setShowOptions] = useState<boolean>(false)

  // URL search parameters
  const [searchParams] = useSearchParams()

  // Pick style for color coding
  const styles = useVisualStyleStore((state) => state.visualStyles)

  const targetNetworkId: IdType = networkId

  // Hide the entire filter if it is not the main network
  const shouldApplyFilter: boolean = isSubnetwork(targetNetworkId)

  const vs: VisualStyle = styles[targetNetworkId]

  const selectedFilter: FilterConfig = filterConfigs[targetNetworkId]

  // Whether the filter is switched on. Stored on the subnetwork's filter
  // config rather than in component state, because this panel (and
  // MainPanel) unmounts while a subsystem loads, for subsystems without a
  // filter, and when another network is selected (#772). A config without a
  // stored value falls back to the filterEnabled URL parameter, then on.
  const isFilterEnabled: boolean =
    selectedFilter?.enabled ??
    searchParams.get(FilterUrlParams.FILTER_ENABLED) !== 'false'
  const setIsFilterEnabled = (enabled: boolean): void => {
    setFilterEnabled(targetNetworkId, enabled)
  }

  // Get target table from the store
  const tablePair = useTableStore((state) => state.tables[targetNetworkId])

  const [nodeAttrName, setNodeAttrName] = useState<string>('')
  const [edgeAttrName, setEdgeAttrName] = useState<string>(
    DEFAULT_EDGE_ATTR_NAME,
  )

  const [selectedObjectType, setSelectedObjectType] = useState<GraphObjectType>(
    GraphObjectType.EDGE,
  )

  const targetAttrName: string =
    selectedObjectType === GraphObjectType.NODE ? nodeAttrName : edgeAttrName

  const setFunction =
    selectedObjectType === GraphObjectType.NODE
      ? setNodeAttrName
      : setEdgeAttrName

  let table: Table | undefined
  if (tablePair !== undefined) {
    table =
      selectedObjectType === GraphObjectType.NODE
        ? tablePair.nodeTable
        : tablePair.edgeTable
  }

  const getMapping = (
    style: VisualStyle,
    attrName: string,
  ): VisualMappingFunction | undefined => {
    if (style === undefined) return

    let matchedMapping: VisualMappingFunction | undefined
    Object.values(CompatibleVisualProperties).forEach((propName: string) => {
      const vp: VisualProperty<VisualPropertyValueType> =
        style[propName as keyof VisualStyle]
      if (vp !== undefined) {
        const { mapping } = vp
        if (mapping !== undefined) {
          if (mapping.attribute === attrName) {
            matchedMapping = mapping
          }
        }
      }
    })
    return matchedMapping
  }

  /**
   * Register the default filter on mount.
   */
  useEffect(() => {
    const visualMapping = getMapping(vs, targetAttrName)

    const allValues =
      table !== undefined
        ? getAllDiscreteValues(table.rows, targetAttrName)
        : []
    const filterConfig: FilterConfig = getDefaultCheckboxFilterConfig(
      DEFAULT_FILTER_NAME,
      targetAttrName,
      selectedObjectType,
      allValues,
      visualMapping,
    )

    if (filterConfigs[DEFAULT_FILTER_NAME] === undefined) {
      // New filter. Add it to the store
      addFilterConfig(filterConfig)

      // Encode the filter settings into the URL
      searchParams.set(FilterUrlParams.FILTER_FOR, selectedObjectType)
      searchParams.set(FilterUrlParams.FILTER_BY, targetAttrName)
      searchParams.set(
        FilterUrlParams.FILTER_ENABLED,
        isFilterEnabled.toString(),
      )
      // setSearchParams(searchParams)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only URL-param init; re-runs would clobber the toggle
  }, [])

  useEffect(() => {
    if (selectedFilter === undefined) return

    const visualMapping = getMapping(vs, targetAttrName)

    if (visualMapping === undefined) return

    if (!isEqual(selectedFilter.visualMapping, visualMapping)) {
      const newFilterConfig = { ...selectedFilter, visualMapping }
      updateFilterConfig(newFilterConfig.name, newFilterConfig)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- vs trigger only; selectedFilter is written here (loop)
  }, [vs])

  /**
   * Set the URL parameters when the filter is enabled or disabled
   */
  useEffect(() => {
    searchParams.set(FilterUrlParams.FILTER_ENABLED, isFilterEnabled.toString())
    // setSearchParams(searchParams)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the toggle; searchParams is fresh each render
  }, [isFilterEnabled])

  useEffect(() => {
    if (!shouldApplyFilter) return

    // Read filterConfigs at execution time: this effect writes it back via
    // updateFilterConfig/addFilterConfig, so a reactive dep would loop.
    const { filterConfigs: currentFilterConfigs } = useFilterStore.getState()

    // Create a filter for the selected attribute if it does not exist
    const currentConfig = currentFilterConfigs[targetNetworkId]

    const visualMapping = getMapping(vs, targetAttrName)

    if (currentConfig !== undefined) {
      if (!isEqual(currentConfig.visualMapping, visualMapping)) {
        const newConfig = { ...currentConfig, visualMapping }
        updateFilterConfig(newConfig.name, newConfig)
      }

      searchParams.set(FilterUrlParams.FILTER_FOR, selectedObjectType)
      searchParams.set(FilterUrlParams.FILTER_BY, targetAttrName)
      searchParams.set(
        FilterUrlParams.FILTER_ENABLED,
        isFilterEnabled.toString(),
      )
      // setSearchParams(searchParams)
      return
    }

    // Specified filter is not available. Create a new filter

    const allValues =
      table !== undefined
        ? getAllDiscreteValues(table.rows, targetAttrName)
        : []
    const filterConfig: FilterConfig = getDefaultCheckboxFilterConfig(
      DEFAULT_FILTER_NAME,
      targetAttrName,
      selectedObjectType,
      allValues,
      visualMapping,
    )

    if (currentFilterConfigs[DEFAULT_FILTER_NAME] === undefined) {
      addFilterConfig(filterConfig)
      // Encode the filter settings into the URL
      searchParams.set(FilterUrlParams.FILTER_FOR, selectedObjectType)
      searchParams.set(FilterUrlParams.FILTER_BY, targetAttrName)
      searchParams.set(
        FilterUrlParams.FILTER_ENABLED,
        isFilterEnabled.toString(),
      )
      // setSearchParams(searchParams)
    } else {
      // updateFilterConfig(DEFAULT_FILTER_NAME, filterConfig)
    }
  }, [
    targetAttrName,
    selectedObjectType,
    vs,
    shouldApplyFilter,
    addFilterConfig,
    updateFilterConfig,
    table,
    targetNetworkId,
    searchParams,
    isFilterEnabled,
  ])

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
      <Grid item sx={{ flex: 1 }}>
        <Accordion
          disableGutters={true}
          sx={{
            boxShadow: 'none',
            px: 1,
            py: 0,
            m: 0,
          }}
          expanded={showOptions}
          onChange={(event, isExpanded) => {
            if (!isFilterEnabled) {
              event.stopPropagation()
              // setSwitchClicked(false)
            } else {
              setShowOptions(isExpanded)
            }
          }}
        >
          <AccordionSummary
            expandIcon={
              showOptions ? (
                <ExpandLessIcon />
              ) : (
                <SettingsIcon
                  color={isFilterEnabled ? 'inherit' : 'disabled'}
                />
              )
            }
            aria-controls="filter-option-panel"
            id="filter-option-header"
            sx={{ m: 0, p: 0 }}
          >
            <Grid
              item
              sx={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                p: 0,
                m: 0,
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
                onClick={(event) => {
                  event.stopPropagation()
                  // setSwitchClicked(true)
                }}
                onChange={(event) => {
                  event.stopPropagation()
                  setIsFilterEnabled(!isFilterEnabled)
                }}
              />
            </Grid>
          </AccordionSummary>
          <AccordionDetails>
            <Grid item sx={{ flex: 1 }}>
              <AttributeSelector
                enableFilter={true}
                nodeTable={tablePair.nodeTable}
                edgeTable={tablePair.edgeTable}
                selectedValue={targetAttrName}
                selectedType={selectedObjectType}
                setSelectedValue={setFunction}
                setSelectedType={setSelectedObjectType}
              />
            </Grid>
          </AccordionDetails>
        </Accordion>
      </Grid>
      <Grid
        item
        sx={{
          flexGrow: 1,
          boxSizing: 'border-box',
          width: '100%',
          height: '100%',
          overflow: 'auto',
        }}
      >
        {selectedFilter === undefined ? null : (
          <Box
            style={{
              width: '100%',
              height: '100%',
              overflow: 'auto',
            }}
          >
            <CheckboxFilter
              targetNetworkId={targetNetworkId}
              table={table}
              filterConfig={selectedFilter}
              enableFilter={isFilterEnabled}
            />
          </Box>
        )}
      </Grid>
    </Container>
  )
}

export default FilterPanel
