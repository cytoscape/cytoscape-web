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
  editables: [
    {
      name: 'unitRadius',
      displayName: 'Unit Radius',
      description: 'The radius of the circle',
      type: 'text',
      validationType: 'digits',
      defaultValue: 100,
    },
    {
      name: 'maxIteration',
      displayName: 'Max Iterations',
      description: 'Maximum number of iterations',
      type: 'text',
      validationType: 'digits',
      defaultValue: 500,
    },
    {
      name: 'nodeSize',
      displayName: 'Node Size',
      description: 'Size of nodes used to detect collisions',
      type: 'text',
      validationType: 'digits',
      defaultValue: 30,
    },
  ],
}
