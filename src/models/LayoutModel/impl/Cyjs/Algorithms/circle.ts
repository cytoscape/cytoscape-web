import { LayoutAlgorithm } from '../../../LayoutAlgorithm'

export const circle: LayoutAlgorithm = {
  name: 'circle',
  engineName: 'Cytoscape.js',
  description: 'Circular Layout: A simple circular layout',
  parameters: {
    name: 'circle',
    radius: 1000,
  },
}
