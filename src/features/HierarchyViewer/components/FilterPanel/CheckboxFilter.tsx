import Tooltip from '@mui/material/Tooltip'
import { FilterUiProps } from '../../../../models/FilterModel/FilterUiProps'
import { Table, ValueType } from '../../../../models/TableModel'
import { Checkbox, FormControlLabel, FormGroup } from '@mui/material'
import { useEffect, useState } from 'react'
import { useTableStore } from '../../../../store/TableStore'
import { useWorkspaceStore } from '../../../../store/WorkspaceStore'
import { IdType } from '../../../../models/IdType'
import { useUiStateStore } from '../../../../store/UiStateStore'
import { GraphObjectType } from '../../../../models/NetworkModel'

interface CheckboxFilterProps {
  filterUi: FilterUiProps
  enableFilter: boolean
}

/**
 * Checkbox filter component for multiple or single selection.
 * Users can select multiple options if the selection mode is "multiple".
 *
 */
export const CheckboxFilter = ({
  filterUi,
  enableFilter,
}: CheckboxFilterProps): JSX.Element => {
  const { widgetType, filter, description, table } = filterUi
  const { target, attribute } = filter

  const [checkedOptions, setCheckedOptions] = useState<string[]>([])

  const [options, setOptions] = useState<{ label: string; value: string }[]>([])

  useEffect(() => {
    const { rows } = table

    if (Object.keys(rows).length === 0) return

    const valueSet = new Set<string>()
    rows.forEach((row: Record<IdType, ValueType>) => {
      valueSet.add(row[attribute] as string)
    })

    const newOptions = Array.from(valueSet).map((value) => ({
      label: value,
      value,
    }))
    setOptions(newOptions)
  }, [table, attribute])

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
      setCheckedOptions(options.map((option) => option.value))
    } else {
      setCheckedOptions([])
    }
  }

  const isAllSelected =
    options.length > 0 && checkedOptions.length === options.length

  return (
    <FormGroup>
      <Tooltip title={description}>
        <FormControlLabel
          control={
            <Checkbox
              disabled={!enableFilter}
              checked={isAllSelected}
              indeterminate={checkedOptions.length > 0 && !isAllSelected}
              onChange={(e) => handleToggleAll(e.target.checked)}
            />
          }
          label={isAllSelected ? 'Clear selection' : 'Select all'}
        />
      </Tooltip>
      {options.map((option) => (
        <FormControlLabel
          key={option.value}
          control={
            <Checkbox
              disabled={!enableFilter}
              checked={checkedOptions.includes(option.value)}
              onChange={() => handleToggle(option.value)}
            />
          }
          label={option.label}
        />
      ))}
    </FormGroup>
  )
}

export default CheckboxFilter
