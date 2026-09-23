import { LayoutAlgorithm, LayoutAlgorithmType } from '../../../LayoutAlgorithm'

export const dagre: LayoutAlgorithm = {
  name: 'dagre',
  engineName: 'G6',
  displayName: 'Hierarchical Layout (DAGRE)',
  description: 'DAGRE layout, for DAGs and trees',
  type: LayoutAlgorithmType.hierarchical,
  parameters: {
    type: 'dagre',
    rankdir: 'TB', // The center of the graph by default
    align: 'DR',
    nodesep: 8,
    ranksep: 25,
    controlPoints: true,
  },

  editables: [
    {
      name: 'nodesep',
      displayName: 'Node Separation',
      description: 'The minimum distance between nodes',
      type: 'text',
      validationType: 'digits',
      defaultValue: 8,
    },
    {
      name: 'ranksep',
      displayName: 'Rank Separation',
      description: 'The minimum distance between ranks',
      type: 'text',
      validationType: 'digits',
      defaultValue: 25,
    },
    {
      name: 'rankdir',
      displayName: 'Rank Direction',
      description: 'The layout direction. T:top; B:bottom; L:left; R:right',
      type: 'dropDown',
      valueList: ['TB', 'BT', 'LR', 'RL'],
      defaultValue: 'TB',
    },
    {
      name: 'align',
      displayName: 'Alignment',
      description:
        'The alignment of the nodes. U: upper; D: down; L: left; R: right',
      type: 'dropDown',
      valueList: ['UL', 'UR', 'DL', 'DR'],
      defaultValue: 'DR',
    },
  ],
}
