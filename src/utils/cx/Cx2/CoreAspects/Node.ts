import { Attribute } from './Attribute'

export interface Node {
  readonly id: number // Long integer
  v?: Attribute
  x?: number
  y?: number
  z?: number
}
