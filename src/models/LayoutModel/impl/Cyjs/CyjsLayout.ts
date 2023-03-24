import { Node, Edge } from '../../../NetworkModel'
import { IdType } from '../../../IdType'
import { LayoutEngine } from '../../LayoutEngine'
import { CyjsAlgorithms } from './Algorithms/CyjsAlgorithms'
import { LayoutAlgorithm } from '../../LayoutAlgorithm'
import cytoscape from 'cytoscape'

export const CyjsLayout: LayoutEngine = {
  // Cytoscape.js Layout
  name: 'Cytoscape.js',
  algorithmNames: Object.keys(CyjsAlgorithms),
  getAlgorithm: (name: string): LayoutAlgorithm => {
    return CyjsAlgorithms[name] ?? CyjsAlgorithms.preset
  },
  apply: (
    nodes: Node[],
    edges: Edge[],
    afterLayout: (positionMap: Map<IdType, [number, number]>) => void,
    name?: string,
  ): void => {
    const cy = cytoscape({
      headless: true,
      elements: {
        nodes: nodes.map((node) => ({ data: { id: node.id } })),
        edges: edges.map((edge) => ({
          data: { source: edge.s, target: edge.t },
        })),
      },
    })

    const layoutName = name ?? 'preset'
    const layoutAlgorithm: LayoutAlgorithm =
      CyjsAlgorithms[layoutName] ?? CyjsAlgorithms.preset
    const cyLayout = cy.layout(
      layoutAlgorithm.parameters as cytoscape.LayoutOptions,
    )

    cyLayout.on('layoutstop', () => {
      const positions = new Map<IdType, [number, number]>()
      cy.nodes().forEach((node) => {
        const id = node.data('id') as string
        const { x, y } = node.position()

        positions.set(id, [x, y])
      })

      afterLayout(positions)
      console.log('cyLayout.stop() called)))))))))))))))')
      cy.destroy()
    })

    cyLayout.run()
  },
}
