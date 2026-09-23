import { LayoutAlgorithm } from '../../..'
import { LayoutAlgorithmType } from '../../../LayoutAlgorithm'

export const grid: LayoutAlgorithm = {
  name: 'grid',
  engineName: 'Cytoscape.js',
  displayName: 'Grid Layout',
  description: 'Grid Layout: A simple grid layout',
  type: LayoutAlgorithmType.geometric,
  parameters: {
    name: 'grid',
    boundingBox: { x1: 0, y1: 0, w: 1000, h: 1000 },
    padding: 30,
    condense: false,
  },
  editables: [
    {
      name: 'padding',
      displayName: 'Padding',
      description: 'Padding around the nodes',
      type: 'text',
      validationType: 'digits',
      defaultValue: 30,
    },
    {
      name: 'condense',
      displayName: 'Condense',
      description: 'uses minimal space on true',
      type: 'checkBox',
      defaultValue: false,
    },
  ],
}
