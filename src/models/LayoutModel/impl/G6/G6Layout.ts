/**
 * BACKUP FILE - Layout GPU Implementation
 *
 * This is a backup of G6Layout.ts that uses @antv/layout-gpu for layout calculations.
 *
 * Created: 2024-11-04
 * Purpose: Backup before switching to @antv/g6 package approach
 *
 * To restore this version, copy this file back to G6Layout.ts
 */

// import G6, { GraphData, NodeConfig, EdgeConfig, LayoutConfig } from '@antv/g6'
import { Graph } from '@antv/graphlib'
import { GForceLayout } from '@antv/layout-gpu'
import { IdType } from '../../../IdType'
import { Node, Edge } from '../../../NetworkModel'
import { LayoutAlgorithm } from '../../LayoutAlgorithm'
import { LayoutEngine } from '../../LayoutEngine'
import { G6Algorithms } from './Algorithms/G6Algorithms'

const DEFAULT_ALGORITHM: LayoutAlgorithm = G6Algorithms.gForce

export const G6Layout: LayoutEngine = {
  // G6 Layout
  name: 'G6',

  description: 'G6 Graph Visualization Engine by AntV.',

  defaultAlgorithmName: DEFAULT_ALGORITHM.name,

  algorithms: G6Algorithms,

  apply: (
    nodes: Node[],
    edges: Edge[],
    afterLayout: (positionMap: Map<IdType, [number, number]>) => void,
    algorithm: LayoutAlgorithm,
  ): void => {
    const runLayout = async () => {
      // Create graphlib graph (minimal data structure, much smaller bundle)
      const graph = new Graph({
        nodes: nodes.map((node) => ({ id: node.id, data: { id: node.id } })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.s,
          target: edge.t,
          data: { source: edge.s, target: edge.t },
        })),
      })

      // Extract layout options from algorithm parameters
      // These values come from gForce.ts and should already have good defaults
      const {
        linkDistance,
        nodeStrength,
        edgeStrength,
        maxIteration,
        coulombDisScale,
        damping,
        maxSpeed,
        minMovement,
        interval,
        factor,
        gravity,
        width: paramWidth,
        height: paramHeight,
        center: paramCenter,
        ...restOptions
      } = algorithm.parameters

      // Use same dimensions as G6 approach for consistency (4000x4000)
      // This matches what G6 uses internally and provides good layout space
      // Fallback to algorithm parameters if not explicitly set
      const layoutWidth = paramWidth ?? algorithm.parameters.width ?? 4000
      const layoutHeight = paramHeight ?? algorithm.parameters.height ?? 4000

      // Calculate center from dimensions (matches G6 behavior)
      const layoutCenter: [number, number] = paramCenter ?? [
        layoutWidth / 2,
        layoutHeight / 2,
      ]

      // Build layout options with all parameters from algorithm.parameters
      // Include all parameters that layout-gpu supports for better layout quality
      const layoutOptions: any = {
        // Core parameters
        linkDistance,
        nodeStrength,
        edgeStrength,
        maxIteration,
        // Layout dimensions (matching G6 container size)
        width: layoutWidth,
        height: layoutHeight,
        center: layoutCenter,
        // Advanced force parameters (include if defined in algorithm.parameters)
        ...(coulombDisScale !== undefined && { coulombDisScale }),
        ...(damping !== undefined && { damping }),
        ...(maxSpeed !== undefined && { maxSpeed }),
        ...(minMovement !== undefined && { minMovement }),
        ...(interval !== undefined && { interval }),
        ...(factor !== undefined && { factor }),
        ...(gravity !== undefined && { gravity }),
      }

      // Remove any undefined values to avoid issues
      Object.keys(layoutOptions).forEach((key) => {
        if (layoutOptions[key] === undefined) {
          delete layoutOptions[key]
        }
      })

      // Execute layout
      try {
        const layout = new GForceLayout(layoutOptions)
        const result = await layout.execute(graph)

        // Extract positions from result
        const positionMap = new Map<IdType, [number, number]>()

        // Try to get positions from the result first (layout-gpu returns nodes with positions)
        if (result && result.nodes && Array.isArray(result.nodes)) {
          result.nodes.forEach((node: any) => {
            const id = node.id as IdType
            const x = node.x ?? node.data?.x ?? 0
            const y = node.y ?? node.data?.y ?? 0
            if (id) {
              positionMap.set(id, [x, y])
            }
          })
        } else {
          // Fallback: get nodes from graph
          const graphNodes = graph.getAllNodes()
          graphNodes.forEach((node) => {
            const id = node.id as IdType
            const x = (node.data as any)?.x ?? (node as any).x ?? 0
            const y = (node.data as any)?.y ?? (node as any).y ?? 0
            if (id) {
              positionMap.set(id, [x, y])
            }
          })
        }

        // Ensure all nodes have positions (fallback to [0,0] if missing)
        if (positionMap.size < nodes.length) {
          nodes.forEach((node) => {
            if (!positionMap.has(node.id)) {
              positionMap.set(node.id, [0, 0])
            }
          })
          console.warn(
            `Layout GPU: Some nodes missing positions. Expected ${nodes.length}, got ${positionMap.size}`,
          )
        }

        afterLayout(positionMap)
      } catch (error) {
        console.error('Layout GPU execution error:', error)
        // Fallback: return default positions for all nodes
        const positionMap = new Map<IdType, [number, number]>()
        nodes.forEach((node) => {
          positionMap.set(node.id, [0, 0])
        })
        afterLayout(positionMap)
      }
    }

    runLayout()
  },
}
