import { ValueTypeName } from '../../../../TableModel'
import { LayoutAlgorithm } from '../../../LayoutAlgorithm'

export const cosmos: LayoutAlgorithm = {
  name: 'cosmos',
  engineName: 'Cosmos',
  description: 'Cosmos Layout: GPU-powered force-directed layout',
  parameters: {
    linkArrows: false,
    linkColor: (link: any) => link.color,
    nodeColor: (node: any) => node.color,
    simulation: {
      linkSpring: 0.1,
      linkDistance: 10,
      repulsion: 1.0,
      gravity: 0.3,
    },
    events: {
      onClick: (node: any) => {
        console.log('Clicked node: %s', node)
      },
    },
  },
  editables: {
    linkSpring: {
      name: 'linkSpring',
      description: 'The spring constant of the links',
      type: ValueTypeName.Double,
      value: 0.1,
      defaultValue: 0.1,
    },
    linkDistance: {
      name: 'linkDistance',
      description: 'The distance of the links',
      type: ValueTypeName.Double,
      value: 10,
      defaultValue: 10,
    },
    repulsion: {
      name: 'repulsion',
      description: 'The repulsion of the nodes',
      type: ValueTypeName.Double,
      value: 1.0,
      defaultValue: 1.0,
    },
    gravity: {
      name: 'gravity',
      description: 'The gravity of the nodes',
      type: ValueTypeName.Double,
      value: 0.3,
      defaultValue: 0.3,
    },
  },
}
