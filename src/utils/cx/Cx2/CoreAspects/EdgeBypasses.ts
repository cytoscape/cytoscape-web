import { Aspect } from '../Aspect'

export interface EdgeBypasses extends Aspect {
  edgeBypasses: EdgeBypass[]
}

export interface EdgeBypass {
  id: number
  v: BypassValue
}

export type BypassValue = Record<number, any>
