import {
  DiscreteFilterValue,
  FilterConfig,
  toDiscreteFilterValue,
} from '@/models/FilterModel'
import { IdType } from '@/models/IdType'
import { GraphObjectType } from '@/models/NetworkModel/GraphObjectType'
import { Table } from '@/models/TableModel'
import {
  DiscreteMappingFunction,
  VisualPropertyValueType,
  VisualStyle,
} from '@/models/VisualStyleModel'

/**
 * Ids the filter hides: rows whose value is not checked, as
 * CheckboxFilter.tsx applyFilter does. A missing value matches the null
 * option. With nothing checked every row is hidden.
 */
export const hiddenByFilter = (
  table: Table,
  attributeName: string,
  checked: readonly DiscreteFilterValue[],
): Set<IdType> => {
  const checkedSet = new Set<DiscreteFilterValue>(checked)
  const hidden = new Set<IdType>()
  table.rows.forEach((row, id) => {
    if (!checkedSet.has(toDiscreteFilterValue(row[attributeName]))) {
      hidden.add(id)
    }
  })
  return hidden
}

/** Visual properties whose discrete mapping colours the filter options. */
const COLOR_PROPERTIES = [
  'edgeLineColor',
  'nodeBorderColor',
  'nodeBackgroundColor',
] as const

/**
 * Option colours from the visual style's discrete colour mapping on the
 * filtered attribute, as FilterPanel.tsx getMapping finds it.
 */
export const optionColors = (
  style: VisualStyle,
  config: FilterConfig,
): Map<DiscreteFilterValue, string> => {
  const colors = new Map<DiscreteFilterValue, string>()
  COLOR_PROPERTIES.forEach((name) => {
    const vp = style[name]
    const mapping = vp?.mapping as DiscreteMappingFunction | undefined
    if (
      vp === undefined ||
      vp.group !== config.target ||
      mapping?.attribute !== config.attributeName ||
      mapping.vpValueMap === undefined
    ) {
      return
    }
    mapping.vpValueMap.forEach(
      (color: VisualPropertyValueType, value: DiscreteFilterValue) => {
        colors.set(value, String(color))
      },
    )
  })
  return colors
}

export const filterTable = (
  config: FilterConfig,
  nodeTable: Table,
  edgeTable: Table,
): Table => (config.target === GraphObjectType.NODE ? nodeTable : edgeTable)
