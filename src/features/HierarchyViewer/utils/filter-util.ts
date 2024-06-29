import {
  FilterConfig,
  FilterWidgetType,
  DisplayMode,
} from '../../../models/FilterModel'
import { IdType } from '../../../models/IdType'
import { GraphObjectType } from '../../../models/NetworkModel'
import { Table, ValueType } from '../../../models/TableModel'
import { VisualMappingFunction } from '../../../models/VisualStyleModel'

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
  rows: Map<IdType, Record<string, ValueType>>,
  attributeName: string,
): string[] => {
  const ids: IdType[] = [...rows.keys()]
  if (ids.length === 0) return []

  const valueSet = new Set<string>()
  ids.forEach((id: IdType) => {
    const row: Record<string, ValueType> = rows.get(id) ?? {}
    valueSet.add(row[attributeName] as string)
  })

  // Convert set to array and sort
  return Array.from(valueSet).sort()
}
