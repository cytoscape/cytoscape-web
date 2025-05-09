import { LayoutAlgorithm } from '../../..'
import { ValueTypeName } from '../../../../TableModel'
import { LayoutAlgorithmType } from '../../../LayoutAlgorithm'

export const cose: LayoutAlgorithm = {
  name: 'cose',
  engineName: 'Cytoscape.js',
  displayName: 'Compound Spring Embedder Layout (CoSE)',
  type: LayoutAlgorithmType.force,
  threshold: 2000,
  description:
    'The cose (Compound Spring Embedder) layout uses a physics simulation to lay out graphs (CPU)',
  parameters: {
    name: 'cose',
    boundingBox: { x1: 0, y1: 0, w: 1000, h: 1000 },
    nodeDimensionsIncludeLabels: false,
    nodeOverlap: 6,
    gravity: 1,
    numIter: 1000,
    coolingFactor: 0.99,
    initialTemp: 1000,
    minTemp: 1.0,
  },
  editables: {
    nodeDimensionsIncludeLabels: {
      name: 'nodeDimensionsIncludeLabels',
      description:
        'Excludes the label when calculating node bounding boxes for the layout algorithm',
      type: ValueTypeName.Boolean,
      value: false,
      defaultValue: false,
    },
    numIter: {
      name: 'numIter',
      description: 'Maximum number of iterations to perform',
      type: ValueTypeName.Integer,
      value: 1000,
      defaultValue: 1000,
    },
    gravity: {
      name: 'gravity',
      description: 'Gravity force (constant)',
      type: ValueTypeName.Integer,
      value: 1,
      defaultValue: 1,
    },
    initialTemp: {
      name: 'initialTemp',
      description: 'Initial temperature (maximum node displacement)',
      type: ValueTypeName.Double,
      value: 1000,
      defaultValue: 1000,
    },
    coolingFactor: {
      name: 'coolingFactor',
      description:
        'Cooling factor (how the temperature is reduced between consecutive iterations)',
      type: ValueTypeName.Double,
      value: 0.99,
      defaultValue: 0.99,
    },
    minTemp: {
      name: 'minTemp',
      description:
        'Lower temperature threshold (below this point the layout will end)',
      type: ValueTypeName.Double,
      value: 1.0,
      defaultValue: 1.0,
    },
  },
}
