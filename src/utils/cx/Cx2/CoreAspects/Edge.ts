import { Attribute } from './Attribute'

export interface Edge {
  readonly id: number
  s: number
  t: number
  v?: Attribute
}
