import {
  DiscreteFilterValue,
  DisplayMode,
  FilterConfig,
  FilterWidgetType,
  toDiscreteFilterValue,
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
  values: DiscreteFilterValue[],
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
): range is DiscreteRange<DiscreteFilterValue> =>
  Array.isArray((range as DiscreteRange<DiscreteFilterValue>).values)

// Comparable key for a discrete value: typed, so 7 and '7' stay distinct,
// and by content for lists
const valueKey = (value: DiscreteFilterValue): string =>
  Array.isArray(value)
    ? `list:${JSON.stringify(value)}`
    : `${typeof value}:${String(value)}`

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
    // Match by content, and keep the fresh value: a list-valued attribute's
    // saved arrays are copies after the database round trip, while
    // CheckboxFilter matches row values against the range by identity.
    // Saved values are normalized first, since a blank string saved before
    // #796 now belongs to the null option; several can map to it, so each
    // fresh value is restored once.
    const available = new Map<string, DiscreteFilterValue>(
      fresh.range.values.map((value) => [valueKey(value), value]),
    )
    const restored = new Set<string>()
    const values: DiscreteFilterValue[] = []
    saved.range.values.forEach((value) => {
      const key = valueKey(toDiscreteFilterValue(value))
      const freshValue = available.get(key)
      if (freshValue !== undefined && !restored.has(key)) {
        restored.add(key)
        values.push(freshValue)
      }
    })
    range = { values }
  }

  return {
    ...fresh,
    range,
    ...(typeof saved.enabled === 'boolean' ? { enabled: saved.enabled } : {}),
  }
}

// Orders discrete values: numbers numerically, false before true, strings by
// code unit (as the default Array sort did). A column holds one type, but
// mixed values are grouped by type rather than left in an unstable order.
const compareDiscreteValues = (a: ValueType, b: ValueType): number => {
  const typeA = typeof a
  const typeB = typeof b
  if (typeA !== typeB) {
    return typeA < typeB ? -1 : 1
  }
  if (typeA === 'number') {
    return (a as number) - (b as number)
  }
  if (typeA === 'boolean') {
    return Number(a) - Number(b)
  }
  const textA = String(a)
  const textB = String(b)
  return textA < textB ? -1 : textA > textB ? 1 : 0
}

/**
 * Get all unique discrete values of the given attribute in the table,
 * sorted. Rows without a value (null, no such attribute, or a blank string)
 * share one option, null, which comes last.
 *
 * @param table
 * @param attributeName
 */
export const getAllDiscreteValues = (
  rows: Map<IdType, Record<string, ValueType>>,
  attributeName: string,
): DiscreteFilterValue[] => {
  const valueSet = new Set<ValueType>()
  let hasMissing = false
  rows.forEach((row: Record<string, ValueType>) => {
    const value: DiscreteFilterValue = toDiscreteFilterValue(row[attributeName])
    if (value === null) {
      hasMissing = true
    } else {
      valueSet.add(value)
    }
  })

  const values: DiscreteFilterValue[] = Array.from(valueSet).sort(
    compareDiscreteValues,
  )
  if (hasMissing) {
    values.push(null)
  }
  return values
}
