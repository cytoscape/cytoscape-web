import { ValueTypeName } from '../../../../TableModel'
import { LayoutAlgorithm } from '../../../LayoutAlgorithm'

export const dagre: LayoutAlgorithm = {
  name: 'dagre',
  engineName: 'G6',
  description: 'DAGRE layout, for DAGs and trees',
  parameters: {
    type: 'dagre',
    rankdir: 'LR', // The center of the graph by default
    align: 'DL',
    nodesep: 5,
    ranksep: 15,
    controlPoints: true,
  },

  editables: [
    {
      name: 'nodesep',
      description: 'The minimum distance between nodes',
      type: ValueTypeName.Integer,
      value: 5,
      defaultValue: 5,
    },
    {
      name: 'ranksep',
      description: 'The minimum distance between ranks',
      type: ValueTypeName.Integer,
      value: 15,
      defaultValue: 15,
    },
  ],
}
