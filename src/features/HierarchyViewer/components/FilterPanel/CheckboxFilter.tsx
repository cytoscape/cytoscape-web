import { Checkbox, FormControlLabel, FormGroup } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import Tooltip from '@mui/material/Tooltip'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { useFilterStore } from '../../../../data/hooks/stores/FilterStore'
import { useViewModelStore } from '../../../../data/hooks/stores/ViewModelStore'
import { useVisualStyleStore } from '../../../../data/hooks/stores/VisualStyleStore'
import {
  Filter,
  FilterConfig,
  getBasicFilter,
} from '../../../../models/FilterModel'
import { DiscreteFilterDetails } from '../../../../models/FilterModel/DiscreteFilterDetails'
import { FilterUrlParams } from '../../../../models/FilterModel/FilterUrlParams'
import { IdType } from '../../../../models/IdType'
import { GraphObjectType } from '../../../../models/NetworkModel'
import { DiscreteRange } from '../../../../models/PropertyModel/DiscreteRange'
import { Table, ValueType } from '../../../../models/TableModel'
import { NetworkView } from '../../../../models/ViewModel'
import {
  DiscreteMappingFunction,
  VisualPropertyValueType,
} from '../../../../models/VisualStyleModel'
import {
  EdgeVisualPropertyName,
  NodeVisualPropertyName,
} from '../../../../models/VisualStyleModel/VisualPropertyName'
import { VisibilityType } from '../../../../models/VisualStyleModel/VisualPropertyValue/VisibilityType'
import { getAllDiscreteValues } from '../../utils/filterUtil'

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
  const theme = useTheme()
  const disabledColor = theme.palette.action.disabled

  // Updating URL by range
  const [searchParams] = useSearchParams()

  const setBypassMap = useVisualStyleStore((state) => state.setBypassMap)

  const getViewModel = useViewModelStore((state) => state.getViewModel)
  const visualStyleExists = useVisualStyleStore(
    (state) => state.visualStyles[targetNetworkId] !== undefined,
  )
  const viewModel: NetworkView | undefined = getViewModel(targetNetworkId)
  const exclusiveSelect = useViewModelStore((state) => state.exclusiveSelect)
  const { description, attributeName } = filterConfig
  const discreteFilterDetails = filterConfig.discreteFilterDetails ?? []
  const name2label = new Map<string, string>()
  discreteFilterDetails.forEach((details: DiscreteFilterDetails) => {
    name2label.set(details.criterion, details.description)
  })
  const updateRange = useFilterStore((state) => state.updateRange)

  const [allOptions, setAllOptions] = useState<string[]>([])

  // Check if all options are selected
  const currentSelectedOptions = filterConfig.range as DiscreteRange<ValueType>

  // Apply the filter to the table
  const applyFilter = () => {
    if (!visualStyleExists) {
      return
    }

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

    const idsToFilter: IdType[] = []
    const idsToExclude: IdType[] = []

    const rangeSet = new Set<ValueType>(discreteRange.values)

    if (rangeSet.size === 0) {
      // No options checked - hide all items
      const visibilityBypassMap = new Map<IdType, VisibilityType>()
      const { rows } = table
      const ids = [...rows.keys()]
      ids.forEach((id) => {
        visibilityBypassMap.set(id, VisibilityType.None)
      })

      const vpName =
        filterConfig.target === GraphObjectType.NODE
          ? NodeVisualPropertyName.NodeVisibility
          : EdgeVisualPropertyName.EdgeVisibility

      setBypassMap(targetNetworkId, vpName, visibilityBypassMap)
      return []
    }

    const { rows } = table
    const ids = [...rows.keys()]

    ids.forEach((id: string) => {
      const row = rows.get(id)
      const value = row?.[attributeName]

      if (value !== undefined && rangeSet.has(value)) {
        idsToFilter.push(id)
      } else {
        idsToExclude.push(id)
      }
    })

    const visibilityBypassMap = new Map<IdType, VisibilityType>()
    idsToFilter.forEach((id) => {
      visibilityBypassMap.set(id, VisibilityType.Element)
    })
    idsToExclude.forEach((id) => {
      visibilityBypassMap.set(id, VisibilityType.None)
    })

    const vpName =
      filterConfig.target === GraphObjectType.NODE
        ? NodeVisualPropertyName.NodeVisibility
        : EdgeVisualPropertyName.EdgeVisibility

    setBypassMap(targetNetworkId, vpName, visibilityBypassMap)
  }

  useEffect(() => {
    setAllOptions(getAllDiscreteValues(table.rows, attributeName))
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
    updateUrl(newChecked)
  }

  const updateUrl = (checked: ValueType[]): void => {
    if (checked.length !== 0) {
      searchParams.set(FilterUrlParams.FILTER_RANGE, checked.join(',') || '')
      // setSearchParams(searchParams)
    } else {
      // Remove the entire parameter if the selection is empty
      searchParams.delete(FilterUrlParams.FILTER_RANGE)
      // setSearchParams(searchParams)
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

    updateUrl(checked ? allOptions : [])
  }

  /**
   * update the filter range when the target network changes
   */
  useEffect(() => {
    //Apply the filter from the existing filter store
    if (enableFilter) {
      applyFilter()
    } else {
      // Select all nodes / edges
      exclusiveSelect(targetNetworkId, [], [])
    }
  }, [enableFilter, targetNetworkId, currentSelectedOptions.values])

  /**
   * Apply filter after initialization if the filter is enabled
   */
  useEffect(() => {
    if (enableFilter && visualStyleExists) {
      applyFilter()
    }
  }, [])

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
              data-testid="checkbox-filter-select-all"
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
              color: !enableFilter ? disabledColor : color,
              '&.Mui-checked': {
                color: !enableFilter ? disabledColor : color,
              },
              '&.Mui-disabled': {
                color: disabledColor,
              },
            }
          }
          return (
            <FormControlLabel
              key={option}
              control={
                <Checkbox
                  data-testid={`checkbox-filter-option-${option}`}
                  disabled={!enableFilter}
                  sx={checkboxStyle}
                  checked={currentSelectedOptions.values.includes(option)}
                  onChange={() => handleToggle(option)}
                />
              }
              label={name2label.get(option) ?? option}
            />
          )
        })}
      </FormGroup>
    </Tooltip>
  )
}
