import { ValueTypeName } from '../../../../TableModel'
import { LayoutAlgorithm } from '../../../LayoutAlgorithm'

export const gForce: LayoutAlgorithm = {
  name: 'gForce',
  engineName: 'G6',
  description: 'Force-directed layout with GPU acceleration',
  parameters: {
    type: 'gForce',
    maxIteration: 400,
    linkDistance: 1,
    nodeStrength: 1000,
    edgeStrength: 200,
    nodeSize: 40,
    onTick: () => {
      console.log('ticking')
    },
    onLayoutEnd: () => {
      console.log('* force layout done')
    },
    workerEnabled: true, // Whether to activate web-worker
    gpuEnabled: true,
  },
  editables: [
    {
      name: 'gpuEnabled',
      description: 'Whether to activate GPU acceleration',
      type: ValueTypeName.Boolean,
      value: true,
      defaultValue: true,
    },
    {
      name: 'maxIteration',
      description: 'Maximum number of iterations',
      type: ValueTypeName.Integer,
      value: 400,
      defaultValue: 400,
    },
    {
      name: 'nodeSize',
      description: 'Size of nodes used to detect collisions',
      type: ValueTypeName.Integer,
      value: 40,
      defaultValue: 40,
    },
  ],
}
