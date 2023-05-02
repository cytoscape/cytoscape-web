import { View } from './View'

export interface NodeView extends View {
  x: number // X coordinate of the node
  y: number // Y coordinate of the node
  z?: number // (Optional) Z coordinate of the node
}
