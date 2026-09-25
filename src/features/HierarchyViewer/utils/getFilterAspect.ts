import { DisplayMode, FilterConfig } from '../../../models/FilterModel'
import { IdType } from '../../../models/IdType'
import { GraphObjectType } from '../../../models/NetworkModel'
import { Table } from '../../../models/TableModel'
import { FilterAspect } from '../model/FilterAspects'
import { parseFilterAspects } from '../model/impl/filterAspectsSchema'
import { getAllDiscreteValues } from './filterUtil'

/**
 * Build FilterConfig objects from the `filterWidgets` aspect
 *
 * The aspect comes straight from the CX2 document, so it is validated and
 * normalized here (`parseFilterAspects`); invalid entries are dropped.
 *
 * @param filterAspects The raw, untrusted aspect value
 */
export const createFilterFromAspect = (
  sourceNetworkId: IdType,
  filterAspects: unknown,
  nodeTable: Table,
  edgeTable: Table,
): FilterConfig[] => {
  const filterConfigs: FilterConfig[] = []

  parseFilterAspects(filterAspects).forEach((filterAspect: FilterAspect) => {
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
      widgetType: filterAspect.widgetType,
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
