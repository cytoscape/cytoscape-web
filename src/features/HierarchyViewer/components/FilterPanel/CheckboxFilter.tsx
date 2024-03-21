import Tooltip from '@mui/material/Tooltip'
import { FilterUiProps } from '../../../../models/FilterModel/FilterUiProps'
import { ValueType } from '../../../../models/TableModel'
import { Checkbox, FormControlLabel, FormGroup } from '@mui/material'
import { useEffect, useState } from 'react'
import { IdType } from '../../../../models/IdType'
import { DiscreteRange } from '../../../../models/PropertyModel/DiscreteRange'
import { DiscreteFilter } from '../../../../models/FilterModel/Filter'
import { useViewModelStore } from '../../../../store/ViewModelStore'
import { filterProps } from '@mantine/core'
import { GraphObjectType } from '../../../../models/NetworkModel'
import { NetworkView } from '../../../../models/ViewModel'

interface CheckboxFilterProps {
  targetNetworkId: IdType
  filterUi: FilterUiProps
  enableFilter: boolean
}

/**
 * Checkbox filter component for multiple or single selection.
 * Users can select multiple options if the selection mode is "multiple".
 *
 */
export const CheckboxFilter = ({
  targetNetworkId,
  filterUi,
  enableFilter,
}: CheckboxFilterProps): JSX.Element => {
  const getViewModel = useViewModelStore((state) => state.getViewModel)
  const viewModel: NetworkView | undefined = getViewModel(targetNetworkId)
  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)
  const { filter, description, table } = filterUi
  const { attribute } = filter

  const [checkedOptions, setCheckedOptions] = useState<string[]>([])

  const [options, setOptions] = useState<string[]>([])

  useEffect(() => {
    const { rows } = table

    if (Object.keys(rows).length === 0) return

    const valueSet = new Set<string>()
    rows.forEach((row: Record<IdType, ValueType>) => {
      valueSet.add(row[attribute] as string)
    })

    // Convert set to array and sort
    const newOptions = Array.from(valueSet).sort()
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

  useEffect(() => {
    let filtered: IdType[] = []
    const discreteFilter = filter as DiscreteFilter<ValueType>
    let discreteRange: DiscreteRange<ValueType> = {
      values: [],
    }
    // Apply filter
    if (checkedOptions.length === 0) {
      // Clear filter

      discreteRange = {
        values: [],
      }
    } else {
      discreteRange = {
        values: checkedOptions,
      }
    }
    filtered = discreteFilter.apply(discreteRange, table)
    console.log('Filtered: ', filtered)
    if (filtered.length === 0) {
      if (
        viewModel !== undefined &&
        (viewModel.selectedNodes.length > 0 ||
          viewModel.selectedEdges.length > 0)
      ) {
        exclusiveSelect(targetNetworkId, [''], [])
      }
      return
    }

    if (filter.target === GraphObjectType.NODE) {
      exclusiveSelect(targetNetworkId, filtered, [])
    } else {
      exclusiveSelect(targetNetworkId, [], filtered)
    }
  }, [checkedOptions])

  /**
   * Select / unselect all options
   *
   * @param checked
   */
  const handleToggleAll = (checked: boolean): void => {
    if (checked) {
      setCheckedOptions(options)
    } else {
      setCheckedOptions([])
    }
  }

  const isAllSelected =
    options.length > 0 && checkedOptions.length === options.length

  return (
    <Tooltip title={description}>
      <FormGroup>
        <FormControlLabel
          sx={{
            borderTop: '1px solid #A0A0A0',
            borderBottom: '1px solid #A0A0A0',
          }}
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
        {options.map((option: string) => (
          <FormControlLabel
            key={option}
            control={
              <Checkbox
                disabled={!enableFilter}
                checked={checkedOptions.includes(option)}
                onChange={() => handleToggle(option)}
              />
            }
            label={option}
          />
        ))}
      </FormGroup>
    </Tooltip>
  )
}

export default CheckboxFilter
