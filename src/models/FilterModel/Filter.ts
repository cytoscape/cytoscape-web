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
