import { Aspect } from '../Aspect'

export interface NodeBypasses extends Aspect {
  nodeBypasses: NodeBypass[]
}

export interface NodeBypass {
  id: number
  v: BypassValue
}

export type BypassValue = Record<number, any>
