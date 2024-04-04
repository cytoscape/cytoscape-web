import Grid from '@mui/material/Grid'
import { useEffect, useState } from 'react'
import { IdType } from '../../../../models/IdType'
import { useTableStore } from '../../../../store/TableStore'
import { useUiStateStore } from '../../../../store/UiStateStore'
import { useWorkspaceStore } from '../../../../store/WorkspaceStore'
import { GraphObjectType } from '../../../../models/NetworkModel'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Container,
  Typography,
} from '@mui/material'
import { AttributeSelector } from './AttributeSelector'
import { ModeSelector } from './ModeSelector'

import SettingsIcon from '@mui/icons-material/Settings'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import { useSearchParams } from 'react-router-dom'
import { useVisualStyleStore } from '../../../../store/VisualStyleStore'
import {
  VisualMappingFunction,
  VisualProperty,
  VisualPropertyValueType,
  VisualStyle,
} from '../../../../models/VisualStyleModel'
import { CompatibleVisualProperties } from './CompatibleVisualMappings'
import { CheckboxFilter } from './CheckboxFilter'
import { useFilterStore } from '../../../../store/FilterStore'
import {
  DisplayMode,
  FilterConfig,
  FilterWidgetType,
} from '../../../../models/FilterModel'
import { FilterUrlParams } from './FilterUrlParams'

export const DEFAULT_FILTER_NAME = 'checkboxFilter'

// TODO: Import from CX
const DEFAULT_EDGE_ATTR_NAME = 'interaction'

// TODO: document this
const isInteractionNetwork = (networkId: IdType): boolean => {
  return networkId.includes('_')
}

export const FilterPanel = () => {
  const filterConfigs = useFilterStore((state) => state.filterConfigs)
  const addFilterConfig = useFilterStore((state) => state.addFilterConfig)

  // Show or hide the advanced options
  const [showOptions, setShowOptions] = useState<boolean>(false)

  // URL search parameters
  const [searchParams, setSearchParams] = useSearchParams()

  // Pick style for color coding
  const styles = useVisualStyleStore((state) => state.visualStyles)

  // Find the target network
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const activeNetworkId: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )

  // Use the active network if it exists, otherwise use the current network for filtering
  const targetNetworkId: IdType = activeNetworkId || currentNetworkId

  const shouldApplyFilter: boolean = isInteractionNetwork(targetNetworkId)

  const vs: VisualStyle = styles[activeNetworkId]

  // Get target table from the store
  const tablePair = useTableStore((state) => state.tables[targetNetworkId])

  const [nodeAttrName, setNodeAttrName] = useState<string>('')
  const [edgeAttrName, setEdgeAttrName] = useState<string>(
    DEFAULT_EDGE_ATTR_NAME,
  )

  const [selectedObjectType, setSelectedObjectType] = useState<GraphObjectType>(
    GraphObjectType.EDGE,
  )

  // Visualization mode for the filtered results
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    DisplayMode.SHOW_HIDE,
  )

  const targetAttrName: string =
    selectedObjectType === GraphObjectType.NODE ? nodeAttrName : edgeAttrName

  const setFunction =
    selectedObjectType === GraphObjectType.NODE
      ? setNodeAttrName
      : setEdgeAttrName

  const table =
    selectedObjectType === GraphObjectType.NODE
      ? tablePair.nodeTable
      : tablePair.edgeTable

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

  useEffect(() => {
    if (!shouldApplyFilter) return

    // Create a filter for the selected attribute if it does not exist

    const currentConfig: FilterConfig = filterConfigs[DEFAULT_FILTER_NAME]

    if (currentConfig !== undefined) {
      return
    }

    const visualMapping = getMapping(vs, targetAttrName)

    // Build the filter UI settings
    const filterConfig: FilterConfig = {
      name: DEFAULT_FILTER_NAME,
      attributeName: targetAttrName,
      target: selectedObjectType,
      widgetType: FilterWidgetType.CHECKBOX,
      description: 'Filter nodes / edges by selected values',
      label: 'Interaction edge filter',
      range: { values: [] },
      displayMode,
      visualMapping,
    }

    if (filterConfigs[DEFAULT_FILTER_NAME] === undefined) {
      addFilterConfig(filterConfig)
      // Encode the filter settings into the URL
      searchParams.set(FilterUrlParams.FILTER_FOR, selectedObjectType)
      searchParams.set(FilterUrlParams.FILTER_BY, targetAttrName)
      setSearchParams(searchParams)
    } else {
      // updateFilterConfig(DEFAULT_FILTER_NAME, filterConfig)
    }
  }, [targetAttrName, selectedObjectType, vs, displayMode])

  if (!shouldApplyFilter) return null

  return (
    <Container
      disableGutters={true}
      sx={{
        width: '100%',
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        padding: '0.5em',
      }}
    >
      <Grid item sx={{ flex: 1 }}>
        <Accordion
          disableGutters={true}
          sx={{
            boxShadow: 'none',
            padding: 0,
            margin: 0,
          }}
          expanded={showOptions}
          onChange={() => setShowOptions(!showOptions)}
        >
          <AccordionSummary
            expandIcon={showOptions ? <ArrowDropDownIcon /> : <SettingsIcon />}
            aria-controls="filter-option-panel"
            id="filter-option-header"
          >
            <Typography>Filter:</Typography>
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
            <Grid item sx={{ flex: 1 }}>
              <ModeSelector
                enableFilter={true}
                displayMode={displayMode}
                setDisplayMode={setDisplayMode}
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
        {filterConfigs[DEFAULT_FILTER_NAME] === undefined ? null : (
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
              filterConfig={filterConfigs[DEFAULT_FILTER_NAME]}
              enableFilter={true}
            />
          </Box>
        )}
      </Grid>
    </Container>
  )
}

export default FilterPanel
