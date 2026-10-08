import { ValueType, ValueTypeName } from '../TableModel'
import { DiscreteRange } from './DiscreteRange'
import { NumberRange } from './NumberRange'

/**
 * Tweakable property value for the editor
 *
 * Will be used to store values for
 * layout parameters, application settings, etc.
 *
 */
export interface Property<T extends ValueType | ValueType[]> {
  // Unique identifier of the property. When the property lives in a keyed
  // record (e.g. LayoutAlgorithm.editables) this must equal the record key:
  // the editors hand it back and the store looks the property up by it.
  readonly name: string

  // (Optional) Human-readable label shown in editors; falls back to `name`
  readonly displayName?: string

  // (Optional) Long description of the property
  readonly description?: string

  // Types (string, number, boolean, etc.) of the property
  readonly type: ValueTypeName

  // (Optional) Default value
  readonly defaultValue?: T

  // (Optional) Range of values that can be used for the property
  readonly range?: NumberRange | DiscreteRange<T>

  // This is the only tweakable field storing the actual value
  value: T
}
