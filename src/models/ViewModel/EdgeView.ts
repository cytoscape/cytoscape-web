import { IdType } from '../IdType'
import { VisualPropertyValueType } from '../VisualStyleModel'
import { VisualPropertyName } from '../VisualStyleModel/VisualPropertyName'
export interface EdgeView {
  id: IdType // ID of the associated edge
}

export interface CyJsEdgeView {
  group: string
  data: {
    id: IdType
    source: IdType
    target: IdType
  }
  style: Record<string, VisualPropertyValueType>
}
