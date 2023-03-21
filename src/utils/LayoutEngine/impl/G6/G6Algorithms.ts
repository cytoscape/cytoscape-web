import { LayoutAlgorithm } from '../../LayoutAlgorithm'

export const G6Algorithms: Record<string, LayoutAlgorithm> = {
  dagre: {
    name: 'dagre',
    description: 'DAGRE layout',
    parameters: {
      type: 'dagre',
      rankdir: 'LR', // The center of the graph by default
      align: 'DL',
      nodesep: 5,
      ranksep: 15,
      controlPoints: true,
    },
  },
  gForce: {
    name: 'gForce',
    description: 'Force-directed layout with GPU acceleration',
    parameters: {
      type: 'gForce',
      maxIteration: 500,
      // center: [200, 200], // The center of the graph by default
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
  },
  radial: {
    name: 'radial',
    description: 'Radial layout',
    parameters: {
      type: 'radial',
      center: [200, 200], // The center of the graph by default
      linkDistance: 50, // The edge length
      maxIteration: 1000,
      focusNode: 'node11',
      unitRadius: 100,
      preventOverlap: true, // nodeSize or size in data is required for preventOverlap: true
      nodeSize: 30,
      strictRadial: false,
      workerEnabled: true, // Whether to activate web-worker
    },
  },
}
