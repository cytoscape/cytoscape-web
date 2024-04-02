import { IdType } from '../IdType'
import { GraphObjectType } from '../NetworkModel'
import { DiscreteRange } from '../PropertyModel/DiscreteRange'
import { NumberRange } from '../PropertyModel/NumberRange'
import { AttributeName, Table, ValueType } from '../TableModel'

/**
 * Base filter interface to be implemented by all filters
 */
export interface Filter<R> {
  target: GraphObjectType
  attribute: AttributeName
  apply: (range: R, table: Table) => IdType[]
}

export type DiscreteFilter<T> = Filter<DiscreteRange<T>>
export type NumericFilter = Filter<NumberRange>

export const createDiscreteFilter = <T>(
  target: GraphObjectType,
  attribute: string,
): DiscreteFilter<T> => {
  return {
    target,
    attribute,
    apply: (range: DiscreteRange<T>, table: Table): IdType[] => {
      const rangeSet = new Set<T>(range.values)

      if (rangeSet.size === 0) return []

      const { rows } = table
      const ids = [...rows.keys()]
      const result: IdType[] = []

      ids.forEach((id: string) => {
        const row = rows.get(id)
        const value = row?.[attribute]

        if (value !== undefined && rangeSet.has(value as T)) {
          result.push(id)
        }
      })
      return result
    },
  }
}

export const createNumericFilter = (
  target: GraphObjectType,
  attribute: string,
): NumericFilter => {
  return {
    target,
    attribute,
    apply: (range: NumberRange, table: Table): IdType[] => {
      const { rows } = table
      const result: IdType[] = []
      rows.forEach((row: Record<string, ValueType>) => {
        const value = row[attribute] as number
        if (value >= range.min && value <= range.max) {
          result.push(row.id as IdType)
        }
      })
      return result
    },
  }
}
