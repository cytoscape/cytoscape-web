import {
  DisplayMode,
  FilterConfig,
  FilterWidgetType,
} from '../../../../models/FilterModel'
import { GraphObjectType } from '../../../../models/NetworkModel'
import { VisualMappingFunction } from '../../../../models/VisualStyleModel'
import { Table, ValueType } from '../../../../models/TableModel'
import { IdType } from '../../../../models/IdType'

export const getDefaultCheckboxFilterConfig = (
  name: string,
  attributeName: string,
  target: GraphObjectType,
  values: string[],
  visualMapping?: VisualMappingFunction,
): FilterConfig => {
  const filterConfig: FilterConfig = {
    name,
    attributeName,
    target,
    widgetType: FilterWidgetType.CHECKBOX,
    description: 'Filter nodes / edges by selected values',
    label: 'Interaction edge filter',
    range: { values },
    displayMode: DisplayMode.SHOW_HIDE,
    visualMapping,
  }
  return filterConfig
}

/**
 * Get all unique discrete values of the given attribute in the table.
 *
 * @param table
 * @param attributeName
 */
export const getAllDiscreteValues = (
  table: Table,
  attributeName: string,
): string[] => {
  const { rows } = table

  if (Object.keys(rows).length === 0) return []

  const valueSet = new Set<string>()
  rows.forEach((row: Record<IdType, ValueType>) => {
    valueSet.add(row[attributeName] as string)
  })

  // Convert set to array and sort
  return Array.from(valueSet).sort()
}
