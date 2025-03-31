import { ValueTypeName } from '../../../../TableModel'
import { LayoutAlgorithm, LayoutAlgorithmType } from '../../../LayoutAlgorithm'

export const cosmos: LayoutAlgorithm = {
  name: 'cosmos',
  engineName: 'Cosmos',
  displayName: 'Cosmos (GPU-based, nondeterministic layout)',
  description: 'Cosmos Layout: GPU-powered force-directed layout',
  type: LayoutAlgorithmType.force,
  parameters: {
    linkArrows: false,
    linkColor: (link: any) => link.color,
    nodeColor: (node: any) => node.color,
    simulation: {
      linkSpring: 0.1,
      linkDistance: 15,
      repulsion: 2.0,
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
      value: 15,
      defaultValue: 15,
    },
    repulsion: {
      name: 'repulsion',
      description: 'The repulsion of the nodes',
      type: ValueTypeName.Double,
      value: 2.0,
      defaultValue: 2.0,
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
