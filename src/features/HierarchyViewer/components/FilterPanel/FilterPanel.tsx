import Grid from '@mui/material/Grid'
import { useEffect, useState } from 'react'
import { IdType } from '../../../../models/IdType'
import { useTableStore } from '../../../../store/TableStore'
import { useUiStateStore } from '../../../../store/UiStateStore'
import { useWorkspaceStore } from '../../../../store/WorkspaceStore'
import {
  DisplayMode,
  FilterSettings,
  FilterWidgetType,
} from '../../../../models/FilterModel/FilterUiProps'
import { GraphObjectType } from '../../../../models/NetworkModel'
import {
  DiscreteFilter,
  createDiscreteFilter,
} from '../../../../models/FilterModel/Filter'
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
import { ValueType } from '../../../../models/TableModel'
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

export const FilterPanel = () => {
  const [showOptions, setShowOptions] = useState<boolean>(false)

  // URL search parameters
  const [searchParams, setSearchParams] = useSearchParams()

  // Enable filter only when the target network has a specific type
  const [enableFilter, setEnableFilter] = useState<boolean>(false)

  // Find the target network
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const activeNetworkId: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )

  // Use the active network if it exists, otherwise use the current network for filtering
  const targetNetworkId: IdType = activeNetworkId || currentNetworkId

  // Pick style for color coding
  const styles = useVisualStyleStore((state) => state.visualStyles)
  const vs: VisualStyle = styles[activeNetworkId]

  // Enable the filter only when the target network is a temp network
  useEffect(() => {
    if (targetNetworkId === undefined || targetNetworkId === '') return

    if (targetNetworkId.includes('_')) {
      setEnableFilter(true)
    } else {
      setEnableFilter(false)
    }
  }, [targetNetworkId])

  // Get target table from the store
  const tablePair = useTableStore((state) => state.tables[targetNetworkId])

  const [nodeAttrName, setNodeAttrName] = useState<string>('')
  const [edgeAttrName, setEdgeAttrName] = useState<string>('')

  const [selectedObjectType, setSelectedObjectType] = useState<GraphObjectType>(
    GraphObjectType.NODE,
  )

  // Visualization mode for the filtered results
  const [displayMode, setDisplayMode] = useState<DisplayMode>(
    DisplayMode.SELECT,
  )

  const [filterProps, setFilterProps] = useState<FilterSettings<ValueType>>()

  const targetAttrName: string =
    selectedObjectType === GraphObjectType.NODE ? nodeAttrName : edgeAttrName
  const setFunction =
    selectedObjectType === GraphObjectType.NODE
      ? setNodeAttrName
      : setEdgeAttrName

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
    const discreteFilter: DiscreteFilter<string> = createDiscreteFilter<string>(
      selectedObjectType,
      targetAttrName,
    )

    const visualMapping = getMapping(vs, targetAttrName)

    // Build the filter UI settings
    const filterSettings: FilterSettings<ValueType> = {
      widgetType: FilterWidgetType.CHECKBOX,
      description: 'Filter nodes / edges by selected values',
      filter: discreteFilter,
      label: 'Interaction edge filter',
      range: { values: [] },
      displayMode: DisplayMode.SELECT,
      visualMapping,
      toCx: function () {
        throw new Error('Function not implemented.')
      },
    }

    setFilterProps(filterSettings)

    // Encode the filter settings into the URL
    searchParams.set('filterFor', selectedObjectType)
    searchParams.set('filterBy', targetAttrName)
    setSearchParams(searchParams)
  }, [targetAttrName, selectedObjectType, vs])

  const table =
    selectedObjectType === GraphObjectType.NODE
      ? tablePair.nodeTable
      : tablePair.edgeTable
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
                enableFilter={enableFilter}
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
                enableFilter={enableFilter}
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
        {filterProps === undefined ? null : (
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
              filterSettings={filterProps}
              enableFilter={enableFilter}
            />
          </Box>
        )}
      </Grid>
    </Container>
  )
}

export default FilterPanel
