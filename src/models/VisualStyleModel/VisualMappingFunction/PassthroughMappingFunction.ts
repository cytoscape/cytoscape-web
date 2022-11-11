import { VisualMappingFunction } from '.'
import { VisualPropertyValueType } from '../VisualPropertyValue'
export interface PassthroughMappingFunction
  extends VisualMappingFunction<VisualPropertyValueType> {}

// cx discrete mapping fn
// "NODE_LABEL": {
//   "definition": {
//     "attribute": "annot"
//   },
//   "type": "PASSTHROUGH"
// },
