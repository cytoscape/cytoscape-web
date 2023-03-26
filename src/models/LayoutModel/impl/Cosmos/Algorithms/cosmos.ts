import { LayoutAlgorithm } from '../../../LayoutAlgorithm'

export const cosmos: LayoutAlgorithm = {
  name: 'cosmos',
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
}
