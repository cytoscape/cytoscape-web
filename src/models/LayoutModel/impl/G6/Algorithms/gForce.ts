import { ValueTypeName } from '../../../../TableModel'
import { LayoutAlgorithm } from '../../../LayoutAlgorithm'

export const gForce: LayoutAlgorithm = {
  name: 'gForce',
  engineName: 'G6',
  description: 'Force-directed layout with GPU acceleration',
  parameters: {
    type: 'gForce',
    maxIteration: 400,
    linkDistance: 200,
    nodeStrength: 650,
    edgeStrength: 50,
    nodeSize: 350,
    onTick: () => {
      console.log('ticking')
    },
    onLayoutEnd: () => {
      console.log('* force layout done')
    },
    preventOverlap: true,
    workerEnabled: true, // Whether to activate web-worker
    gpuEnabled: true,
  },
  editables: {
    preventOverlap: {
      name: 'preventOverlap',
      description: 'Avoid overlapping nodes',
      type: ValueTypeName.Boolean,
      value: true,
      defaultValue: true,
    },
    gpuEnabled: {
      name: 'gpuEnabled',
      description: 'Whether to activate GPU acceleration',
      type: ValueTypeName.Boolean,
      value: true,
      defaultValue: true,
    },
    maxIteration: {
      name: 'maxIteration',
      description: 'Maximum number of iterations',
      type: ValueTypeName.Integer,
      value: 400,
      defaultValue: 400,
    },
    linkDistance: {
      name: 'linkDistance',
      description: 'The edge length',
      type: ValueTypeName.Integer,
      value: 1,
      defaultValue: 1,
    },
    nodeStrength: {
      name: 'nodeStrength',
      description: 'The strength of node force.',
      type: ValueTypeName.Integer,
      value: 1000,
      defaultValue: 1000,
    },
  },
}
