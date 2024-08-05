import { VisualPropertyName } from '../../../VisualPropertyName'
import { SelectorType } from './SelectorType'

/**
 * Selector need to be in the format of '<node or edge>[<Common visual property name>]'
 */
export type DirectMappingSelector =
  | `${SelectorType}[${VisualPropertyName}]`
  | `${SelectorType}[${string}]`
