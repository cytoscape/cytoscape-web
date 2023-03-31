import { LayoutAlgorithm } from '../../../LayoutAlgorithm'
import { cosmos } from './cosmos'

const CosmosLayouts: LayoutAlgorithm[] = [cosmos]

export const CosmosAlgorithms: Record<string, LayoutAlgorithm> =
  CosmosLayouts.reduce<Record<string, LayoutAlgorithm>>((acc, layout) => {
    acc[layout.name] = layout
    return acc
  }, {})
