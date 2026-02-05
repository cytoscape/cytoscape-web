import { LayoutAlgorithm } from '../../../LayoutAlgorithm'
import { dagre } from './dagre'
import { gForce } from './gForce'
import { radial } from './radial'

const G6Layouts: LayoutAlgorithm[] = [dagre, gForce, radial]

export const G6Algorithms: Record<string, LayoutAlgorithm> = G6Layouts.reduce<
  Record<string, LayoutAlgorithm>
>((acc, layout) => {
  acc[layout.name] = layout
  return acc
}, {})
