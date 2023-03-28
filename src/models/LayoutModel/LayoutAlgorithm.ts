import { Property } from '../PropertyModel/Property'
import { ValueType } from '../TableModel'

export interface LayoutAlgorithm {
  // Name of the layout algorithm
  readonly name: string
  readonly engineName: string

  // Detailed description of the layout algorithm
  readonly description: string

  // Implementation-dependent parameters for the layout.
  // This may include callback functions.
  // This object will be directly passed to the layout engine.
  readonly parameters: Record<string, any>

  // List of editable parameters as Property with detailed information
  editables?: Array<Property<ValueType>>
}
