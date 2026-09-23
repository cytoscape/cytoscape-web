import { AppParameter } from '../AppModel/AppParameter'

/**
 * One user-editable parameter of a layout algorithm: the shared
 * `AppParameter` spec (see docs/specifications/APP_PARAMETERS_SPECIFICATION.md)
 * plus `name`, the key of the corresponding entry in
 * `LayoutAlgorithm.parameters`, which holds the live value. For built-in
 * algorithms `name` is the engine's option name (`radius`); for
 * app-registered ones it is the key derived from `displayName` (see
 * `parameterKeys`). Editables are definitions only and never change; values
 * live in `parameters`.
 */
export type EditableParameter = AppParameter & { readonly name: string }

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

  // The user-editable parameters, in the order the Settings dialog shows
  // them (nested into fieldsets by `groups`). Each one's `name` is the key
  // of its live value in `parameters`.
  editables?: EditableParameter[]
}
