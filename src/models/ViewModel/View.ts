import { IdType } from '../IdType'
import {
  VisualPropertyName,
  VisualPropertyValueType,
} from '../VisualStyleModel'

/**
 * Base interface for all graph objects
 */
export interface View {
  // ID of the associated graph object
  id: IdType

  // Key-value pairs of visual variables.
  // E.g. { nodeBackgroundColor: "#ff0000", edgeWidth: 10 }
  values: Map<VisualPropertyName, VisualPropertyValueType>
}
