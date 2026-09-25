import { Box, Checkbox, FormControlLabel, FormGroup } from '@mui/material'
import Tooltip from '@mui/material/Tooltip'
import { useCallback, useEffect, useState } from 'react'
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
  // Updating URL by range
  const [searchParams] = useSearchParams()

  const setBypassMap = useVisualStyleStore((state) => state.setBypassMap)

  const visualStyleExists = useVisualStyleStore(
    (state) => state.visualStyles[targetNetworkId] !== undefined,
  )
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

  // Apply the filter to the table. Memoized so effects can depend on it:
  // its identity changes exactly when its inputs change — including
  // visualStyleExists, which re-applies the filter once a late-loading
  // visual style arrives (previously the mount-only apply ran before the
  // style existed and the filter never took effect).
  const applyFilter = useCallback(() => {
    if (!visualStyleExists) {
      return
    }

    // Current range stored in the config
    const discreteRange: DiscreteRange<ValueType> =
      filterConfig.range as DiscreteRange<ValueType>
    const basicFilter: Filter = getBasicFilter()
    basicFilter.applyDiscreteFilter(discreteRange, table, attributeName)

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
  }, [
    visualStyleExists,
    filterConfig,
    table,
    attributeName,
    targetNetworkId,
    setBypassMap,
  ])

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
   * Apply the filter when it is enabled, the target network changes, the
   * selected range changes, or applyFilter's inputs (table, config, a
   * late-loading visual style) change. This also covers the initial apply
   * on mount.
   */
  useEffect(() => {
    //Apply the filter from the existing filter store
    if (enableFilter) {
      applyFilter()
    } else {
      // Select all nodes / edges
      exclusiveSelect(targetNetworkId, [], [])
    }
  }, [
    enableFilter,
    targetNetworkId,
    currentSelectedOptions.values,
    applyFilter,
    exclusiveSelect,
  ])

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
            m: 0,
            backgroundColor: (theme) => theme.palette.background.default,
            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
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
          label={isAllSelected ? 'Deselect All' : 'Select All'}
        />
        {allOptions.map((option: string) => {
          const color: string = colorMap.get(option) as string

          return (
            <FormControlLabel
              key={option}
              sx={{ m: 0 }}
              control={
                <Checkbox
                  data-testid={`checkbox-filter-option-${option}`}
                  disabled={!enableFilter}
                  checked={currentSelectedOptions.values.includes(option)}
                  onChange={() => handleToggle(option)}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: '1em',
                      height: '1em',
                      backgroundColor: color ?? 'transparent',
                      border: (theme) =>
                        `1px solid ${theme.palette.text.secondary}`,
                      borderRadius: '50%',
                      mr: 0.5,
                    }}
                  />
                  {name2label.get(option) ?? option}
                </Box>
              }
            />
          )
        })}
      </FormGroup>
    </Tooltip>
  )
}
