import { Cx2 } from '../../Cx2'
import {
  DisplayMode,
  FilterConfig,
  FilterWidgetType,
} from '../../../FilterModel'
import { IdType } from '../../../IdType'
import { GraphObjectType } from '../../../NetworkModel'
import { columnValueSet } from '../../../TableModel/impl/inMemoryTable'
import { Table } from '../../../TableModel'
import { getFilterWidgetsAspect } from '../extractor'
import {
  FilterAspect,
  FilterAspects,
} from '../../Cx2/OtherAspects/FilterWidgets'

/**
 * Get all unique discrete values from a table column as sorted strings
 *
 * @param table - The table to extract values from
 * @param attributeName - The column name to extract values from
 * @returns Sorted array of unique string values
 */
const getAllDiscreteValues = (
  table: Table,
  attributeName: string,
): string[] => {
  const valueSet = columnValueSet(table, attributeName)
  return Array.from(valueSet)
    .map((v) => String(v))
    .filter((v) => v !== 'null' && v !== 'undefined')
    .sort()
}

/**
 * Create FilterConfig objects from FilterAspects
 *
 * Converts CX2 FilterAspects format to application FilterConfig format.
 * This function extracts all discrete values from the table for each filter aspect.
 *
 * @param sourceNetworkId - The network ID that these filters belong to
 * @param filterAspects - Array of FilterAspects from CX2
 * @param nodeTable - Node table to extract values from
 * @param edgeTable - Edge table to extract values from
 * @returns Array of FilterConfig objects
 */
const createFilterConfigsFromFilterAspects = (
  sourceNetworkId: IdType,
  filterAspects: FilterAspects,
  nodeTable: Table,
  edgeTable: Table,
): FilterConfig[] => {
  const filterConfigs: FilterConfig[] = []

  filterAspects.forEach((filterAspect: FilterAspect) => {
    const { filter, label } = filterAspect
    const table: Table =
      filterAspect.appliesTo === GraphObjectType.NODE ? nodeTable : edgeTable
    const allValues: string[] = getAllDiscreteValues(
      table,
      filterAspect.attributeName,
    )
    const config: FilterConfig = {
      name: sourceNetworkId,
      attributeName: filterAspect.attributeName,
      target: filterAspect.appliesTo,
      widgetType: FilterWidgetType.CHECKBOX,
      description: 'Filter nodes / edges by selected values',
      label,
      range: { values: allValues },
      displayMode: DisplayMode.SELECT,
      discreteFilterDetails: filter,
    }

    filterConfigs.push(config)
  })

  return filterConfigs
}

/**
 * Create FilterConfig objects from CX2 data
 *
 * Extracts filterWidgets aspect from CX2 and converts to FilterConfig format.
 *
 * @param networkId - Unique identifier for the network
 * @param cxData - CX2 data object
 * @param nodeTable - Node table to extract filter values from
 * @param edgeTable - Edge table to extract filter values from
 * @returns Array of FilterConfig objects, empty array if no filterWidgets aspect found
 */
export const createFiltersFromCx = (
  networkId: string,
  cxData: Cx2,
  nodeTable: Table,
  edgeTable: Table,
): FilterConfig[] => {
  const filterWidgetsAspect = getFilterWidgetsAspect(cxData)
  if (filterWidgetsAspect === undefined) {
    return []
  }

  const filterAspects: FilterAspects = filterWidgetsAspect.filterWidgets
  return createFilterConfigsFromFilterAspects(
    networkId,
    filterAspects,
    nodeTable,
    edgeTable,
  )
}
