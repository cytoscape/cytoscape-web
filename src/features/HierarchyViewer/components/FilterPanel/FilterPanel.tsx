import Grid from '@mui/material/Grid'
import { useEffect, useState } from 'react'
import { IdType } from '../../../../models/IdType'
import { useTableStore } from '../../../../store/TableStore'
import { useUiStateStore } from '../../../../store/UiStateStore'
import { useWorkspaceStore } from '../../../../store/WorkspaceStore'
import CheckboxFilter from './CheckboxFilter'
import {
  FilterUiProps,
  FilterWidgetType,
  FilteringMode,
} from '../../../../models/FilterModel/FilterUiProps'
import { GraphObjectType } from '../../../../models/NetworkModel'
import {
  DiscreteFilter,
  createDiscreteFilter,
} from '../../../../models/FilterModel/Filter'
import { Box, Container } from '@mui/material'
import { AttributeSelector } from './AttributeSelector'
import { Mode } from '@mui/icons-material'
import { ModeSelector } from './ModeSelector'

export const FilterPanel = () => {
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
  const [filteringMode, setFilteringMode] = useState<FilteringMode>(
    FilteringMode.SELECTION,
  )

  const [filterProps, setFilterProps] = useState<FilterUiProps>()

  const targetAttrName: string =
    selectedObjectType === GraphObjectType.NODE ? nodeAttrName : edgeAttrName
  const setFunction =
    selectedObjectType === GraphObjectType.NODE
      ? setNodeAttrName
      : setEdgeAttrName

  useEffect(() => {
    const discreteFilter: DiscreteFilter<string> = createDiscreteFilter<string>(
      selectedObjectType,
      targetAttrName,
    )

    const table =
      selectedObjectType === GraphObjectType.NODE
        ? tablePair.nodeTable
        : tablePair.edgeTable

    // Build the filter UI
    const filterUi: FilterUiProps = {
      widgetType: FilterWidgetType.CHECKBOX,
      description: 'Filter by name',
      filter: discreteFilter,
      label: 'Interaction edge filter',
      range: { values: [] },
      mode: FilteringMode.SELECTION,
      table,
      toCx: function () {
        throw new Error('Function not implemented.')
      },
    }

    setFilterProps(filterUi)
  }, [nodeAttrName, edgeAttrName, selectedObjectType])

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
        <AttributeSelector
          enableFilter={enableFilter}
          nodeTable={tablePair.nodeTable}
          edgeTable={tablePair.edgeTable}
          defaultValue={targetAttrName}
          selectedType={selectedObjectType}
          setSelectedValue={setFunction}
          setSelectedType={setSelectedObjectType}
        />
      </Grid>
      <Grid item sx={{ flex: 1 }}>
        <ModeSelector
          enableFilter={enableFilter}
          selectedMode={filteringMode}
          setSelectedMode={setFilteringMode}
        />
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
              filterUi={filterProps}
              enableFilter={enableFilter}
            />
          </Box>
        )}
      </Grid>
    </Container>
  )
}

export default FilterPanel
