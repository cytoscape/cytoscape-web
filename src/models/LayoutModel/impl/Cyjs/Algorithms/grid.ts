import { LayoutAlgorithm } from '../../..'

export const grid: LayoutAlgorithm = {
  name: 'grid',
  engineName: 'Cytoscape.js',
  description: 'Grid Layout: A simple grid layout',
  parameters: {
    name: 'grid',
    boundingBox: { x1: 0, y1: 0, w: 1000, h: 1000 },
  },
}
