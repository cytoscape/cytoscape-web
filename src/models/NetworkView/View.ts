import { VisualProperty } from './VisualProperty'

export interface View {
  readonly key: BigInt // Associated model ID (e.g. Node ID)
  visualProperties: VisualProperty<unknown>[]
}
