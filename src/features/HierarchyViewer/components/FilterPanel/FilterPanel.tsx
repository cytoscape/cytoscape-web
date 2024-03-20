import Grid from '@mui/material/Grid'
import AttributeSelector from './AttributeSelector'
import { useEffect, useState } from 'react'
import { IdType } from '../../../../models/IdType'
import { useTableStore } from '../../../../store/TableStore'
import { useUiStateStore } from '../../../../store/UiStateStore'
import { useWorkspaceStore } from '../../../../store/WorkspaceStore'
import CheckboxFilter from './CheckboxFilter'
import {
  FilterUiProps,
  FilterWidgetType,
} from '../../../../models/FilterModel/FilterUiProps'
import { GraphObjectType } from '../../../../models/NetworkModel'
import {
  DiscreteFilter,
  createDiscreteFilter,
} from '../../../../models/FilterModel/Filter'
import { Box, Container } from '@mui/material'

export const FilterPanel = () => {
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
  const [selectedValue, setSelectedValue] = useState<string>('')
  const [selectedObjectType, setSelectedObjectType] = useState<GraphObjectType>(
    GraphObjectType.NODE,
  )
  const [filterProps, setFilterProps] = useState<FilterUiProps>()

  useEffect(() => {
    const discreteFilter: DiscreteFilter<string> = createDiscreteFilter<string>(
      selectedObjectType,
      selectedValue,
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
      table,
      toCx: function () {
        throw new Error('Function not implemented.')
      },
    }

    setFilterProps(filterUi)
  }, [selectedValue])

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
          defaultValue={selectedValue}
          selectedType={selectedObjectType}
          setSelectedValue={setSelectedValue}
          setSelectedType={setSelectedObjectType}
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
