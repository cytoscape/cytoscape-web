import { ValueTypeName } from '../../../../TableModel'
import { LayoutAlgorithm } from '../../../LayoutAlgorithm'

export const concentric: LayoutAlgorithm = {
  name: 'concentric',
  engineName: 'Cytoscape.js',
  description: 'Circular Layout: A simple circular layout',
  parameters: {
    name: 'concentric',
    height: 1000,
    width: 1000,
    spacingFactor: 2,
  },
  editables: {
    spacingFactor: {
      name: 'spacingFactor',
      description:
        'Applies a multiplicative factor (>0) to expand or compress the overall area that the nodes take up',
      type: ValueTypeName.Double,
      value: 2,
      defaultValue: 2,
    },
  },
}
