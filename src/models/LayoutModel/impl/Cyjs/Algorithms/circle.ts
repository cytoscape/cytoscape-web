import { LayoutAlgorithm, LayoutAlgorithmType } from '../../../LayoutAlgorithm'

export const circle: LayoutAlgorithm = {
  name: 'circle',
  engineName: 'Cytoscape.js',
  displayName: 'Circular Layout',
  description: 'Circular Layout: A simple circular layout',
  type: LayoutAlgorithmType.geometric,
  parameters: {
    name: 'circle',
    radius: 1000,
    spacingFactor: 1,
  },
  editables: [
    {
      name: 'radius',
      displayName: 'Radius',
      description: 'Radius of the circle',
      type: 'text',
      validationType: 'digits',
      defaultValue: 1000,
    },
    {
      name: 'spacingFactor',
      displayName: 'Spacing Factor',
      description: 'Spacing factor between nodes',
      type: 'text',
      validationType: 'digits',
      defaultValue: 1,
    },
  ],
}
