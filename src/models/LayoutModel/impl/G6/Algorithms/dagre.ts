import { ValueTypeName } from '../../../../TableModel'
import { LayoutAlgorithm } from '../../../LayoutAlgorithm'

export const dagre: LayoutAlgorithm = {
  name: 'dagre',
  engineName: 'G6',
  description: 'DAGRE layout, for DAGs and trees',
  parameters: {
    type: 'dagre',
    rankdir: 'TB', // The center of the graph by default
    align: 'DR',
    nodesep: 8,
    ranksep: 25,
    controlPoints: true,
  },

  editables: {
    nodesep: {
      name: 'nodesep',
      description: 'The minimum distance between nodes',
      type: ValueTypeName.Integer,
      value: 8,
      defaultValue: 8,
    },
    ranksep: {
      name: 'ranksep',
      description: 'The minimum distance between ranks',
      type: ValueTypeName.Integer,
      value: 25,
      defaultValue: 25,
    },
    rankdir: {
      name: 'rankdir',
      description:
        'The layout direction. T:top; B:bottom; L:left; R:right. Valid values: TB, BT, LR, RL',
      type: ValueTypeName.String,
      value: 'TB',
      defaultValue: 'TB',
    },
    align: {
      name: 'align',
      description:
        'The alignment of the nodes. U: upper; D: down; L: left; R: right. Valid values: UL, UR, DL, DR',
      type: ValueTypeName.String,
      value: 'DR',
      defaultValue: 'DR',
    },
  },
}
