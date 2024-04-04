import { IdType } from '../IdType'
import { DiscreteRange } from '../PropertyModel/DiscreteRange'
import { NumberRange } from '../PropertyModel/NumberRange'
import { AttributeName, Table, ValueType } from '../TableModel'

/**
 * Interface to define the fuctions for applying filters.
 * Parameters will be extracted from the FilterConfig.
 */
export interface Filter {
  applyDiscreteFilter: (
    range: DiscreteRange<ValueType>,
    table: Table,
    attributeName: AttributeName,
  ) => IdType[]
  applyNumericFilter: (
    range: NumberRange,
    table: Table,
    attributeName: AttributeName,
  ) => IdType[]
}

// export type DiscreteFilter<T> = Filter<DiscreteRange<T>>
// export type NumericFilter = Filter<NumberRange>

// export const createDiscreteFilter = <T>(
//   target: GraphObjectType,
//   attribute: string,
// ): IdType[] => {
//   return {
//     target,
//     attribute,
//     apply: (range: DiscreteRange<T>, table: Table): IdType[] => {
//       const rangeSet = new Set<T>(range.values)

//       if (rangeSet.size === 0) return []

//       const { rows } = table
//       const ids = [...rows.keys()]
//       const result: IdType[] = []

//       ids.forEach((id: string) => {
//         const row = rows.get(id)
//         const value = row?.[attribute]

//         if (value !== undefined && rangeSet.has(value as T)) {
//           result.push(id)
//         }
//       })
//       return result
//     },
//   }
// }

// export const createNumericFilter = (
//   target: GraphObjectType,
//   attribute: string,
// ): NumericFilter => {
//   return {
//     target,
//     attribute,
//     apply: (range: NumberRange, table: Table): IdType[] => {
//       const { rows } = table
//       const result: IdType[] = []
//       rows.forEach((row: Record<string, ValueType>) => {
//         const value = row[attribute] as number
//         if (value >= range.min && value <= range.max) {
//           result.push(row.id as IdType)
//         }
//       })
//       return result
//     },
//   }
// }
