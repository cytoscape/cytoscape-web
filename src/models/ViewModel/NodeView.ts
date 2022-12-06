import { IdType } from '../IdType'
import { VisualPropertyValueType } from '../VisualStyleModel'

export interface NodeView {
  id: IdType // ID of the associated node
  x?: number // X coordinate of the node
  y?: number // Y coordinate of the node
  z?: number // Z coordinate of the node
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
