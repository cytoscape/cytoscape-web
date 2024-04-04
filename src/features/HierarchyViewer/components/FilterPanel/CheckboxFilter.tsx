import Tooltip from '@mui/material/Tooltip'
import { Table, ValueType } from '../../../../models/TableModel'
import { Checkbox, FormControlLabel, FormGroup } from '@mui/material'
import { useEffect, useState } from 'react'
import { IdType } from '../../../../models/IdType'
import { DiscreteRange } from '../../../../models/PropertyModel/DiscreteRange'
import { useViewModelStore } from '../../../../store/ViewModelStore'
import { GraphObjectType } from '../../../../models/NetworkModel'
import { NetworkView } from '../../../../models/ViewModel'
import {
  DiscreteMappingFunction,
  VisualPropertyValueType,
} from '../../../../models/VisualStyleModel'
import { useFilterStore } from '../../../../store/FilterStore'
import {
  Filter,
  FilterConfig,
  getBasicFilter,
} from '../../../../models/FilterModel'
import { useSearchParams } from 'react-router-dom'
import { FilterUrlParams } from './FilterUrlParams'

interface CheckboxFilterProps {
  // The network to be filtered
  targetNetworkId: IdType

  filterConfig: FilterConfig
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
  // Updating URL by range
  const [searchParams, setSearchParams] = useSearchParams()

  const getViewModel = useViewModelStore((state) => state.getViewModel)
  const viewModel: NetworkView | undefined = getViewModel(targetNetworkId)
  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)
  const { description, attributeName } = filterConfig
  const updateRange = useFilterStore((state) => state.updateRange)

  // const [checkedOptions, setCheckedOptions] = useState<ValueType[]>([])

  // const [options, setOptions] = useState<string[]>([])
  const [allOptions, setAllOptions] = useState<string[]>([])

  // Check if all options are selected
  const currentSelectedOptions = filterConfig.range as DiscreteRange<ValueType>

  // Apply the filter to the table
  const applyFilter = () => {
    let filtered: IdType[] = []
    // Current range stored in the config
    const discreteRange: DiscreteRange<ValueType> =
      filterConfig.range as DiscreteRange<ValueType>
    const basicFilter: Filter = getBasicFilter()
    filtered = basicFilter.applyDiscreteFilter(
      discreteRange,
      table,
      attributeName,
    )
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

    if (filterConfig.target === GraphObjectType.NODE) {
      exclusiveSelect(targetNetworkId, filtered, [])
    } else {
      exclusiveSelect(targetNetworkId, [], filtered)
    }
  }

  useEffect(() => {
    const { rows } = table

    if (Object.keys(rows).length === 0) return

    const valueSet = new Set<string>()
    rows.forEach((row: Record<IdType, ValueType>) => {
      valueSet.add(row[attributeName] as string)
    })

    // Convert set to array and sort
    const newOptions = Array.from(valueSet).sort()
    setAllOptions(newOptions)
  }, [table, attributeName])

  /**
   * Pick the options that are selected and update the filter range
   *
   * @param value
   */
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

    // setCheckedOptions(newChecked)
    updateRange(filterConfig.name, {
      values: newChecked,
    })

    // Update URL (only when the selection is not empty)
    if (newChecked.length !== 0) {
      searchParams.set(FilterUrlParams.FILTER_RANGE, newChecked.join(',') || '')
      setSearchParams(searchParams)
    }
  }

  /**
   * Select / unselect all options
   *
   * @param checked
   */
  const handleToggleAll = (checked: boolean): void => {
    if (checked) {
      // setCheckedOptions(options)
      updateRange(filterConfig.name, {
        values: allOptions,
      })
    } else {
      // setCheckedOptions([])
      updateRange(filterConfig.name, {
        values: [],
      })
    }
  }

  /**
   * update the filter range when the target network changes
   */
  useEffect(() => {
    //Apply the filter from the existing filter store
    applyFilter()
  }, [targetNetworkId, currentSelectedOptions.values])

  const isAllSelected: boolean =
    allOptions.length > 0 &&
    currentSelectedOptions.values.length === allOptions.length

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
              indeterminate={
                currentSelectedOptions.values.length > 0 && !isAllSelected
              }
              onChange={(e) => handleToggleAll(e.target.checked)}
            />
          }
          label={isAllSelected ? 'Clear selection' : 'Select all'}
        />
        {allOptions.map((option: string) => {
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
                  checked={currentSelectedOptions.values.includes(option)}
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
