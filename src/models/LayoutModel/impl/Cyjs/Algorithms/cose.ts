import { LayoutAlgorithm } from '../../..'
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
  editables: [
    {
      name: 'nodeDimensionsIncludeLabels',
      displayName: 'Include Labels in Node Size',
      description:
        'Excludes the label when calculating node bounding boxes for the layout algorithm',
      type: 'checkBox',
      defaultValue: false,
    },
    {
      name: 'numIter',
      displayName: 'Max Iterations',
      description: 'Maximum number of iterations to perform',
      type: 'text',
      validationType: 'digits',
      defaultValue: 1000,
    },
    {
      name: 'gravity',
      displayName: 'Gravity',
      description: 'Gravity force (constant)',
      type: 'text',
      validationType: 'digits',
      defaultValue: 1,
    },
    {
      name: 'initialTemp',
      displayName: 'Initial Temperature',
      description: 'Initial temperature (maximum node displacement)',
      type: 'text',
      validationType: 'number',
      defaultValue: 1000,
    },
    {
      name: 'coolingFactor',
      displayName: 'Cooling Factor',
      description:
        'Cooling factor (how the temperature is reduced between consecutive iterations)',
      type: 'text',
      validationType: 'number',
      defaultValue: 0.99,
    },
    {
      name: 'minTemp',
      displayName: 'Min Temperature',
      description:
        'Lower temperature threshold (below this point the layout will end)',
      type: 'text',
      validationType: 'number',
      defaultValue: 1.0,
    },
  ],
}
