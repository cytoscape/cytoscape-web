import {
  DisplayMode,
  FilterConfig,
  FilterWidgetType,
} from '../../../models/FilterModel'
import { IdType } from '../../../models/IdType'
import { GraphObjectType } from '../../../models/NetworkModel'
import { Table } from '../../../models/TableModel'
import { FilterAspect, FilterAspects } from '../model/FilterAspects'
import { getAllDiscreteValues } from './filter-util'

/**
 * Build FilterConfig objects from FilterAspects
 *
 * @param filterAspects
 */
export const createFilterFromAspect = (
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
      table.rows,
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
      displayMode: DisplayMode.SHOW_HIDE,
      discreteFilterDetails: filter,
    }

    filterConfigs.push(config)
  })

  return filterConfigs
}
