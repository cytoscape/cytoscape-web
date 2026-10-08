import { logApi } from '../../../debug'
import {
  DiscreteFilterValue,
  DisplayMode,
  FilterConfig,
} from '../../../models/FilterModel'
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
 * Build the subnetwork's FilterConfig from the `filterWidgets` aspect
 *
 * The aspect comes straight from the CX2 document, so it is validated and
 * normalized here (`parseFilterAspects`); invalid entries are dropped.
 *
 * The filter panel shows one filter per subnetwork, so only the first valid
 * entry is used and any others are ignored with a warning (#798). They used
 * to be registered under the same name, so each overwrote the previous one.
 *
 * @param sourceNetworkId The subnetwork id, used as the config name
 * @param filterAspects The raw, untrusted aspect value
 * @returns The config, or undefined when the aspect has no valid entry
 */
export const createFilterFromAspect = (
  sourceNetworkId: IdType,
  filterAspects: unknown,
  nodeTable: Table,
  edgeTable: Table,
): FilterConfig | undefined => {
  const [filterAspect, ...ignored] = parseFilterAspects(filterAspects)
  if (filterAspect === undefined) {
    return undefined
  }
  if (ignored.length > 0) {
    logApi.warn(
      `[createFilterFromAspect]: ${sourceNetworkId}: using the first '${FILTER_ASPECT_TAG}' entry (${filterAspect.attributeName}) and ignoring ${ignored.length} more: ${ignored
        .map((aspect: FilterAspect) => aspect.attributeName)
        .join(', ')}`,
    )
  }

  const { filter, label } = filterAspect
  const table: Table =
    filterAspect.appliesTo === GraphObjectType.NODE ? nodeTable : edgeTable
  const allValues: DiscreteFilterValue[] = getAllDiscreteValues(
    table.rows,
    filterAspect.attributeName,
  )
  return {
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
}
