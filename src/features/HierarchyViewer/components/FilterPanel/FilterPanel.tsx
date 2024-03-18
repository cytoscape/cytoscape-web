import Grid from '@mui/material/Grid'
import AttributeSelector from './AttributeSelector'
import { useEffect, useState } from 'react'
import { IdType } from '../../../../models/IdType'
import { useTableStore } from '../../../../store/TableStore'
import { useUiStateStore } from '../../../../store/UiStateStore'
import { useWorkspaceStore } from '../../../../store/WorkspaceStore'
import CheckboxFilter from './CheckboxFilter'
import {
  FilterUi,
  FilterWidgetType,
} from '../../../../models/FilterModel/FilterUi'
import { GraphObjectType } from '../../../../models/NetworkModel'
import {
  DiscreteFilter,
  createDiscreteFilter,
} from '../../../../models/FilterModel/Filter'
import { Box } from '@mui/material'

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
  const [filterProps, setFilterProps] = useState<FilterUi>()

  useEffect(() => {
    const discreteFilter: DiscreteFilter<string> = createDiscreteFilter<string>(
      selectedObjectType,
      selectedValue,
    )

    // Build the filter UI
    const filterUi: FilterUi = {
      widgetType: FilterWidgetType.CHECKBOX,
      description: 'Filter by name',
      filter: discreteFilter,
      label: 'Interaction edge filter',
      range: { values: [] },
      toCx: function () {
        throw new Error('Function not implemented.')
      },
    }

    setFilterProps(filterUi)
  }, [selectedValue])

  return (
    <Box
      position="relative"
      sx={{ backgroundColor: enableFilter ? 'red' : 'blue' }}
    >
      <Grid container spacing={1}>
        <Grid item xs={12} sm={6} md={4}>
          <h5>Selected: {selectedValue}</h5>
          <AttributeSelector
            nodeTable={tablePair.nodeTable}
            edgeTable={tablePair.edgeTable}
            defaultValue={selectedValue}
            selectedType={selectedObjectType}
            setSelectedValue={setSelectedValue}
            setSelectedType={setSelectedObjectType}
          />
          {filterProps === undefined ? (
            <div />
          ) : (
            <CheckboxFilter filterUi={filterProps} />
          )}
        </Grid>
      </Grid>
    </Box>
  )
}

export default FilterPanel
