import { ValueType } from '../../TableModel'
import { isMissingValue } from '../../TableModel/impl/valueTypeImpl'
import { DiscreteFilterValue } from '../DiscreteFilterValue'

/**
 * The discrete filter option a cell value belongs to: the value itself, or
 * null for a missing value (see isMissingValue).
 *
 * @param value A table cell value; rows may hold null or omit the column
 */
export const toDiscreteFilterValue = (
  value: ValueType | null | undefined,
): DiscreteFilterValue => (isMissingValue(value) ? null : (value as ValueType))
