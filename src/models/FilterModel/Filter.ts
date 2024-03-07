import { DiscreteRange } from '../PropertyModel/DiscreteRange'
import { NumberRange } from '../PropertyModel/NumberRange'
import { ValueType, ValueTypeName } from '../TableModel'

/**
 * Type of filters
 */
type FilterType = 'discrete' | 'continuous'

/**
 * Base filter interface to be implemented by all filters
 */
export interface Filter<T extends ValueTypeName> {
  type: FilterType

  // Human readable name of the filter
  name: string

  target: 'nodes' | 'edges'
  attribute: string
  attributeType: T
  readonly range?: NumberRange | DiscreteRange<T>
}
