import { LayoutAlgorithm } from '../../LayoutAlgorithm'

export const CyjsAlgorithms: Record<string, LayoutAlgorithm> = {
  preset: {
    name: 'preset',
    description: 'Preset Layout: Use the positions specified in the data',
    parameters: {},
  },

  circle: {
    name: 'circle',
    description: 'Circular Layout: A simple circular layout',
    parameters: {
      name: 'circle',
      radius: 1000,
    },
  },

  grid: {
    name: 'grid',
    description: 'Grid Layout: A simple grid layout',
    parameters: {
      name: 'grid',
      boundingBox: { x1: 0, y1: 0, w: 1000, h: 1000 },
    },
  },
}
