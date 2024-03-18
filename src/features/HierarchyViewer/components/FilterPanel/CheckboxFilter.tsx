import Tooltip from '@mui/material/Tooltip'
import { FilterUi } from '../../../../models/FilterModel/FilterUi'
import { Table } from '../../../../models/TableModel'
import { Checkbox, FormControlLabel, FormGroup } from '@mui/material'
import { useState } from 'react'
import { useTableStore } from '../../../../store/TableStore'
import { useWorkspaceManager } from '../../../../store/hooks/useWorkspaceManager'
import { useWorkspaceStore } from '../../../../store/WorkspaceStore'
import { IdType } from '../../../../models/IdType'
import { useUiStateStore } from '../../../../store/UiStateStore'
import { GraphObjectType } from '../../../../models/NetworkModel'

interface CheckboxFilterProps {
  filterUi: FilterUi
}

/**
 * Checkbox filter component for multiple or single selection.
 * Users can select multiple options if the selection mode is "multiple".
 *
 */
export const CheckboxFilter = ({
  filterUi,
}: CheckboxFilterProps): JSX.Element => {
  const { widgetType, filter, description } = filterUi
  const { target } = filter


  // Find the target network
  const currentNetworkId: IdType = useWorkspaceStore(
    (state) => state.workspace.currentNetworkId,
  )
  const activeNetworkId: IdType = useUiStateStore(
    (state) => state.ui.activeNetworkView,
  )

  // Use the active network if it exists, otherwise use the current network for filtering
  const targetNetworkId: IdType = activeNetworkId || currentNetworkId

  // Get target table from the store
  const tablePair = useTableStore((state) => state.tables[targetNetworkId])

  // This is the tab e to be filtered
  const table: Table =
    target === GraphObjectType.NODE
      ? tablePair?.nodeTable
      : tablePair?.edgeTable

  const [checkedOptions, setCheckedOptions] = useState<string[]>([])

  const handleToggle = (value: string) => {
    const currentIndex = checkedOptions.indexOf(value)
    const newChecked = [...checkedOptions]

    if (currentIndex === -1) {
      newChecked.push(value)
    } else {
      newChecked.splice(currentIndex, 1)
    }

    setCheckedOptions(newChecked)
  }

  /**
   * Select / unselect all options
   *
   * @param checked
   */
  const handleToggleAll = (checked: boolean): void => {
    if (checked) {
      // setCheckedOptions(options.map((option) => option.value))
    } else {
      setCheckedOptions([])
    }
  }

  const isAllSelected = false
  // options.length > 0 && checkedOptions.length === options.length

  return (
    <FormGroup>
      <Tooltip title={description}>
        <FormControlLabel
          control={
            <Checkbox
              checked={isAllSelected}
              indeterminate={checkedOptions.length > 0 && !isAllSelected}
              onChange={(e) => handleToggleAll(e.target.checked)}
            />
          }
          label={isAllSelected ? 'Unselect All' : 'Select All'}
        />
      </Tooltip>
      {/* {options.map((option) => (
        <FormControlLabel
          key={option.value}
          control={
            <Checkbox
              checked={checkedOptions.includes(option.value)}
              onChange={() => handleToggle(option.value)}
            />
          }
          label={option.label}
        />
      ))} */}
    </FormGroup>
  )
}

export default CheckboxFilter
