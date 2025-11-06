import { LayoutAlgorithm } from '../../../LayoutAlgorithm'
import { circle } from './circle'
import { concentric } from './concentric'
import { cose } from './cose'
import { grid } from './grid'

const CyjsLayouts: LayoutAlgorithm[] = [grid, circle, cose, concentric]

export const CyjsAlgorithms: Record<string, LayoutAlgorithm> =
  CyjsLayouts.reduce<Record<string, LayoutAlgorithm>>((acc, layout) => {
    acc[layout.name] = layout
    return acc
  }, {})
