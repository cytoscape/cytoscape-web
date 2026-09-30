import { IdType } from '../IdType'
import { DiscreteRange } from '../PropertyModel/DiscreteRange'
import { NumberRange } from '../PropertyModel/NumberRange'
import { AttributeName, Table } from '../TableModel'
import { DiscreteFilterValue } from './DiscreteFilterValue'

/**
 * Interface to define the fuctions for applying filters.
 * Parameters will be extracted from the FilterConfig.
 */
export interface Filter {
  applyDiscreteFilter: (
    range: DiscreteRange<DiscreteFilterValue>,
    table: Table,
    attributeName: AttributeName,
  ) => IdType[]
  applyNumericFilter: (
    range: NumberRange,
    table: Table,
    attributeName: AttributeName,
  ) => IdType[]
}
