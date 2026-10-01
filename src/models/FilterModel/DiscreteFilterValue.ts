import { ValueType } from '../TableModel'

/**
 * One option of a discrete (checkbox) filter. `null` is the option for
 * elements without a value: a null value, no such attribute, or a blank
 * string (`isMissingValue`). It stands for all of them, so a filter shows
 * one "no value" option (#796).
 */
export type DiscreteFilterValue = ValueType | null
