import { LayoutAlgorithm, LayoutAlgorithmType } from '../../../LayoutAlgorithm'

export const gForce: LayoutAlgorithm = {
  name: 'gForce',
  engineName: 'G6',
  displayName: 'gForce Layout (force-directed)',
  description: 'Force-directed layout',
  type: LayoutAlgorithmType.force,
  parameters: {
    type: 'gForce',
    maxIteration: 400,
    linkDistance: 200,
    nodeStrength: 650,
    edgeStrength: 50,
    nodeSize: 350,
    onTick: () => {},
    onLayoutEnd: () => {},
    preventOverlap: true,
    workerEnabled: true, // Whether to activate web-worker
    gpuEnabled: true,
  },
  // defaultValue equals the value in `parameters` (what the engine runs);
  // earlier editables advertised 1 / 1000 for linkDistance / nodeStrength
  // while the engine ran 200 / 650.
  editables: [
    {
      name: 'preventOverlap',
      displayName: 'Prevent Overlap',
      description: 'Avoid overlapping nodes',
      type: 'checkBox',
      defaultValue: true,
    },
    {
      name: 'maxIteration',
      displayName: 'Max Iterations',
      description: 'Maximum number of iterations',
      type: 'text',
      validationType: 'digits',
      defaultValue: 400,
    },
    {
      name: 'linkDistance',
      displayName: 'Link Distance',
      description: 'The edge length',
      type: 'text',
      validationType: 'digits',
      defaultValue: 200,
    },
    {
      name: 'nodeStrength',
      displayName: 'Node Strength',
      description: 'The strength of node force.',
      type: 'text',
      validationType: 'digits',
      defaultValue: 650,
    },
  ],
}
