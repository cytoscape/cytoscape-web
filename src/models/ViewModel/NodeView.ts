import { IdType } from '../IdType'
import { VisualPropertyValueType } from '../VisualStyleModel'
export interface NodeView {
  id: IdType // ID of the associated node
}

export interface CyJsNodeView {
  group: string
  data: {
    id: IdType
  }
  position: {
    x: number
    y: number
  }
  style: Record<string, VisualPropertyValueType>
}
