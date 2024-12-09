import { Node, Edge } from '../../../NetworkModel'
import { IdType } from '../../../IdType'
import { LayoutEngine } from '../../LayoutEngine'
import { CyjsAlgorithms } from './Algorithms/CyjsAlgorithms'
import { LayoutAlgorithm } from '../../LayoutAlgorithm'
import cytoscape from 'cytoscape'

export const CyjsLayout: LayoutEngine = {
  // Cytoscape.js Layout
  name: 'Cytoscape.js',
  defaultAlgorithmName: 'grid',
  algorithms: CyjsAlgorithms,

  apply: (
    nodes: Node[],
    edges: Edge[],
    afterLayout: (positionMap: Map<IdType, [number, number]>) => void,
    algorithm: LayoutAlgorithm,
  ): void => {
    // Check if nodes and edges are available, if not, return empty graph data
    if (!nodes || !edges) {
      alert('Please open a network first!')
      return;
    }

    const cy = cytoscape({
      headless: true,
      elements: {
        nodes: nodes.map((node) => ({ data: { id: node.id } })),
        edges: edges.map((edge) => ({
          data: { source: edge.s, target: edge.t },
        })),
      },
    })

    const cyLayout = cy.layout(algorithm.parameters as cytoscape.LayoutOptions)

    cyLayout.on('layoutstop', () => {
      const positions = new Map<IdType, [number, number]>()
      cy.nodes().forEach((node) => {
        const id = node.data('id') as string
        const { x, y } = node.position()

        positions.set(id, [x, y])
      })

      afterLayout(positions)
      cy.destroy()
    })

    cyLayout.run()
  },
}
