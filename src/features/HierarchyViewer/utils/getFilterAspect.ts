import { DisplayMode, FilterConfig } from '../../../models/FilterModel'
import { IdType } from '../../../models/IdType'
import { GraphObjectType } from '../../../models/NetworkModel'
import { Table } from '../../../models/TableModel'
import { FILTER_ASPECT_TAG, FilterAspect } from '../model/FilterAspects'
import { parseFilterAspects } from '../model/impl/filterAspectsSchema'
import { getAllDiscreteValues } from './filterUtil'

/**
 * Find the `filterWidgets` aspect among a network's opaque aspects
 *
 * Selects by key presence, not truthiness, so a malformed but falsy value
 * (`"filterWidgets": null`) still reaches validation and gets its warning.
 *
 * @param otherAspects The network's opaque aspects
 * @returns The raw, untrusted aspect value, or undefined when no aspect has it
 */
export const findFilterAspect = (
  otherAspects: readonly unknown[],
): { value: unknown } | undefined => {
  const aspect = otherAspects.find(
    (candidate: unknown): candidate is Record<string, unknown> =>
      typeof candidate === 'object' &&
      candidate !== null &&
      Object.hasOwn(candidate, FILTER_ASPECT_TAG),
  )
  return aspect === undefined ? undefined : { value: aspect[FILTER_ASPECT_TAG] }
}

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
