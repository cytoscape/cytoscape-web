import { Property } from '../PropertyModel/Property'
import { ValueType } from '../TableModel'

export const LayoutAlgorithmType = {
  force: 'force',
  geometric: 'geometric',
  hierarchical: 'hierarchical',
  other: 'other',
} as const

export type LayoutAlgorithmType =
  (typeof LayoutAlgorithmType)[keyof typeof LayoutAlgorithmType]

export interface LayoutAlgorithm {
  // Name of the layout algorithm
  readonly name: string
  readonly engineName: string

  // human-readable name of the layout algorithm
  readonly displayName: string

  // Type of the layout algorithm. This will be used to group the layout algorithms in the UI.
  readonly type: LayoutAlgorithmType

  // (Optional) Will be disabled if the number of objects is larger than this value
  readonly threshold?: number

  // Detailed description of the layout algorithm
  readonly description: string

  // Implementation-dependent parameters for the layout.
  // This may include callback functions.
  // This object will be directly passed to the layout engine.
  parameters: Record<string, any>

  // List of editable parameters as Property with detailed information
  editables?: Record<string, Property<ValueType>>
}
