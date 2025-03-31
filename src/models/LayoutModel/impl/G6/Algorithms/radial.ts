import { ValueTypeName } from '../../../../TableModel'
import { LayoutAlgorithm, LayoutAlgorithmType } from '../../../LayoutAlgorithm'

export const radial: LayoutAlgorithm = {
  name: 'radial',
  engineName: 'G6',
  displayName: 'Radial Layout (Concentric Layout by G6)',
  description: 'Radial layout',
  type: LayoutAlgorithmType.geometric,
  parameters: {
    type: 'radial',
    center: [200, 200], // The center of the graph by default
    linkDistance: 50, // The edge length
    maxIteration: 500,
    unitRadius: 100,
    preventOverlap: true, // nodeSize or size in data is required for preventOverlap: true
    nodeSize: 30,
    strictRadial: false,
    workerEnabled: true, // Whether to activate web-worker
  },
  editables: {
    unitRadius: {
      name: 'unitRadius',
      description: 'The radius of the circle',
      type: ValueTypeName.Integer,
      value: 100,
      defaultValue: 100,
    },
    maxIteration: {
      name: 'maxIteration',
      description: 'Maximum number of iterations',
      type: ValueTypeName.Integer,
      value: 500,
      defaultValue: 500,
    },
    nodeSize: {
      name: 'nodeSize',
      description: 'Size of nodes used to detect collisions',
      type: ValueTypeName.Integer,
      value: 30,
      defaultValue: 30,
    },
  },
}
