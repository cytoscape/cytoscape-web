import { IdType } from '../../IdType'
import { DiscreteRange } from '../../PropertyModel/DiscreteRange'
import { NumberRange } from '../../PropertyModel/NumberRange'
import { AttributeName, Table, ValueType } from '../../TableModel'
import { Filter } from '../Filter'

const SimpleFilter: Filter = {
  applyDiscreteFilter: (
    range: DiscreteRange<ValueType>,
    table: Table,
    attributeName: AttributeName,
  ): IdType[] => {
    const rangeSet = new Set<ValueType>(range.values)

    if (rangeSet.size === 0) return []

    const { rows } = table
    const ids = [...rows.keys()]
    const result: IdType[] = []

    ids.forEach((id: string) => {
      const row = rows.get(id)
      const value = row?.[attributeName]

      if (value !== undefined && rangeSet.has(value)) {
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
