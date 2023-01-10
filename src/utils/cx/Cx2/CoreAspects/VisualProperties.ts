import { Aspect } from '../Aspect'

export interface VisualProperties extends Aspect {
  visualProperties: VisualProperty[]
}

export interface VisualProperty {
  default: DefaultVisualProperty
  nodeMapping: Record<string, object>
  edgeMapping: Record<string, object>
}

export interface DefaultVisualProperty {
  node: Record<string, object>
  edge: Record<string, object>
  network: Record<string, object>
}
