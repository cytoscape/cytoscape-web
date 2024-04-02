import Tooltip from '@mui/material/Tooltip'
import { FilterConfig } from '../../../../models/FilterModel/FilterConfig'
import { Table, ValueType } from '../../../../models/TableModel'
import { Checkbox, FormControlLabel, FormGroup } from '@mui/material'
import { useEffect, useState } from 'react'
import { IdType } from '../../../../models/IdType'
import { DiscreteRange } from '../../../../models/PropertyModel/DiscreteRange'
import { DiscreteFilter, Filter } from '../../../../models/FilterModel/Filter'
import { useViewModelStore } from '../../../../store/ViewModelStore'
import { GraphObjectType } from '../../../../models/NetworkModel'
import { NetworkView } from '../../../../models/ViewModel'
import {
  DiscreteMappingFunction,
  VisualPropertyValueType,
} from '../../../../models/VisualStyleModel'
import { useFilterStore } from '../../../../store/FilterStore'
import { use } from 'cytoscape'

interface CheckboxFilterProps {
  // The network to be filtered
  targetNetworkId: IdType

  filterConfig: FilterConfig<ValueType>
  table: Table
  enableFilter: boolean
}

/**
 * Checkbox filter component for multiple or single selection.
 * Users can select multiple options if the selection mode is "multiple".
 *
 */
export const CheckboxFilter = ({
  targetNetworkId,
  filterConfig,
  table,
  enableFilter,
}: CheckboxFilterProps): JSX.Element => {
  const getViewModel = useViewModelStore((state) => state.getViewModel)
  const viewModel: NetworkView | undefined = getViewModel(targetNetworkId)
  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)
  const { description, filter } = filterConfig
  const { attribute } = filter
  const updateRange = useFilterStore((state) => state.updateRange)

  const [checkedOptions, setCheckedOptions] = useState<ValueType[]>([])

  const [options, setOptions] = useState<string[]>([])

  // Apply the filter to the table
  const applyFilter = () => {
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
  }

  useEffect(() => {
    //Apply the filter from the existing filter store
    applyFilter()
  }, [targetNetworkId, checkedOptions])

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
    const discreteRange = filterConfig.range as DiscreteRange<ValueType>
    const currentSelection = discreteRange.values
    const currentIndex = currentSelection.indexOf(value)
    const newChecked = [...currentSelection]

    if (currentIndex === -1) {
      newChecked.push(value)
    } else {
      newChecked.splice(currentIndex, 1)
    }

    setCheckedOptions(newChecked)
    updateRange(filterConfig.name, {
      values: newChecked,
    })
  }

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

  const { visualMapping } = filterConfig
  let colorMap = new Map<ValueType, VisualPropertyValueType>()
  if (visualMapping !== undefined) {
    const mapping = visualMapping as DiscreteMappingFunction
    if (mapping !== undefined) {
      colorMap = mapping.vpValueMap
    }
  }
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
        {options.map((option: string) => {
          const color: string = colorMap.get(option) as string

          let checkboxStyle = {}
          if (color !== undefined) {
            checkboxStyle = {
              color,
              '&.Mui-checked': {
                color,
              },
            }
          }
          return (
            <FormControlLabel
              key={option}
              control={
                <Checkbox
                  disabled={!enableFilter}
                  sx={checkboxStyle}
                  checked={checkedOptions.includes(option)}
                  onChange={() => handleToggle(option)}
                />
              }
              label={option}
            />
          )
        })}
      </FormGroup>
    </Tooltip>
  )
}
