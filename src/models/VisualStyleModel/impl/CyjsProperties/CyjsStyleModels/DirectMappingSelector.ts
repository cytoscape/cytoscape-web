import { CyjsVisualPropertyType } from '../CyjsVisualPropertyName'
import { SelectorType } from './SelectorType'

/**
 * Selector need to be in the format of '<node or edge>[<cyjs visual property name>]'
 */
export type DirectMappingSelector = `${SelectorType}[${CyjsVisualPropertyType}]`
