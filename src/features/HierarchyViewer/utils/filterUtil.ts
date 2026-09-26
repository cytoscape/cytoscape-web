import {
  DisplayMode,
  FilterConfig,
  FilterWidgetType,
} from '../../../models/FilterModel'
import { IdType } from '../../../models/IdType'
import { GraphObjectType } from '../../../models/NetworkModel'
import { DiscreteRange } from '../../../models/PropertyModel/DiscreteRange'
import { ValueType } from '../../../models/TableModel'
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
    displayMode: DisplayMode.SELECT,
    visualMapping,
  }
  return filterConfig
}

const isDiscreteRange = (
  range: FilterConfig['range'],
): range is DiscreteRange<ValueType> =>
  Array.isArray((range as DiscreteRange<ValueType>).values)

/**
 * Restore the user's state from a filter config saved in an earlier session
 * onto the config just built from the subnetwork's filterWidgets aspect
 * (#774).
 *
 * The fresh config is the source of truth for the filter's definition. Only
 * the checked values and the on/off switch are carried over, and only while
 * the filter still targets the same attribute and object type. Saved values
 * that are no longer in the table are dropped, so the restored range is
 * always a subset of the fresh one.
 *
 * @param fresh Config built from the aspect; its range holds every value
 * @param saved Config restored from the database
 */
export const restoreFilterState = (
  fresh: FilterConfig,
  saved: FilterConfig,
): FilterConfig => {
  if (
    saved.attributeName !== fresh.attributeName ||
    saved.target !== fresh.target
  ) {
    return fresh
  }

  let { range } = fresh
  if (isDiscreteRange(fresh.range) && isDiscreteRange(saved.range)) {
    const available = new Set<ValueType>(fresh.range.values)
    range = {
      values: saved.range.values.filter((value) => available.has(value)),
    }
  }

  return {
    ...fresh,
    range,
    ...(typeof saved.enabled === 'boolean' ? { enabled: saved.enabled } : {}),
  }
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
