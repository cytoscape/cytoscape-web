import { ValueTypeName } from '../../../../TableModel'
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
  editables: {
    radius: {
      name: 'radius',
      description: 'Radius of the circle',
      type: ValueTypeName.Integer,
      value: 1000,
      defaultValue: 1000,
    },
    spacingFactor: {
      name: 'spacingFactor',
      description: 'Spacing factor between nodes',
      type: ValueTypeName.Integer,
      value: 1,
      defaultValue: 1,
    },
  },
}
