import { IdType } from '../../IdType'
import { DiscreteRange } from '../../PropertyModel/DiscreteRange'
import { NumberRange } from '../../PropertyModel/NumberRange'
import { AttributeName, Table, ValueType } from '../../TableModel'
import { DiscreteFilterValue } from '../DiscreteFilterValue'
import { Filter } from '../Filter'
import { toDiscreteFilterValue } from './discreteFilterValue'

const SimpleFilter: Filter = {
  applyDiscreteFilter: (
    range: DiscreteRange<DiscreteFilterValue>,
    table: Table,
    attributeName: AttributeName,
  ): IdType[] => {
    const rangeSet = new Set<DiscreteFilterValue>(range.values)

    if (rangeSet.size === 0) return []

    const { rows } = table
    const ids = [...rows.keys()]
    const result: IdType[] = []

    ids.forEach((id: string) => {
      const row = rows.get(id)
      // A missing value (null, no attribute, blank) matches the null option
      const value: DiscreteFilterValue = toDiscreteFilterValue(
        row?.[attributeName],
      )

      if (rangeSet.has(value)) {
        result.push(id)
      }
    })
    return result
  },
  applyNumericFilter: (
    range: NumberRange,
    table: Table,
    attributeName: AttributeName,
  ): IdType[] => {
    const { rows } = table
    const result: IdType[] = []
    rows.forEach((row: Record<string, ValueType>) => {
      const value = row[attributeName] as number
      if (value >= range.min && value <= range.max) {
        result.push(row.id as IdType)
      }
    })
    return result
  },
}

export const getBasicFilter = (): Filter => {
  return SimpleFilter
}
