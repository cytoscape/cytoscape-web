/**
 * Biological Flow Layout Engine — contributed by Nodes Bio
 *
 * Pure TypeScript implementation of a layered graph layout algorithm
 * optimized for biological pathway visualization.
 *
 * Algorithm:
 * 1. Break cycles via DFS back-edge removal
 * 2. Assign layers via longest-path (Kahn's algorithm)
 * 3. Barycenter heuristic for crossing reduction (forward + backward pass)
 * 4. Assign x/y positions: layer → column (L→R), row within layer (vertical spread)
 *
 * @see docs/specs/SPEC_layout_optimizer.md
 */
import { IdType } from '../../../../IdType'
import { Edge, Node } from '../../../../NetworkModel'
import { LayoutAlgorithm } from '../../../LayoutAlgorithm'
import { LayoutEngine } from '../../../LayoutEngine'
import { biologicalFlow } from '../Algorithms/biologicalFlow'

const X_MARGIN = 150
const Y_MARGIN = 200
const X_SPACING = 300
const Y_SPACING = 250

export const BiologicalFlowLayout: LayoutEngine = {
  name: 'BiologicalFlow',
  description:
    'Layered layout with biological signal flow (left→right), ' +
    'topological sort, and barycenter crossing minimization.',
  defaultAlgorithmName: 'biological-flow',
  algorithms: { 'biological-flow': biologicalFlow },

  apply: (
    nodes: Node[],
    edges: Edge[],
    afterLayout: (positionMap: Map<IdType, [number, number]>) => void,
    _algorithm: LayoutAlgorithm,
  ): void => {
    const nodeIds = nodes.map((n) => n.id)
    const outEdges: Map<string, string[]> = new Map()
    const inEdges: Map<string, string[]> = new Map()

    for (const e of edges) {
      const src = e.s
      const tgt = e.t
      if (!outEdges.has(src)) outEdges.set(src, [])
      if (!inEdges.has(tgt)) inEdges.set(tgt, [])
      outEdges.get(src)!.push(tgt)
      inEdges.get(tgt)!.push(src)
    }

    // 1. Break cycles (DFS)
    const dagOut: Map<string, string[]> = new Map()
    const dagIn: Map<string, string[]> = new Map()
    const WHITE = 0, GRAY = 1, BLACK = 2
    const color: Map<string, number> = new Map()
    nodeIds.forEach((id) => color.set(id, WHITE))

    const dfs = (u: string): void => {
      color.set(u, GRAY)
      for (const v of outEdges.get(u) ?? []) {
        if (color.get(v) === WHITE) {
          if (!dagOut.has(u)) dagOut.set(u, [])
          if (!dagIn.has(v)) dagIn.set(v, [])
          dagOut.get(u)!.push(v)
          dagIn.get(v)!.push(u)
          dfs(v)
        } else if (color.get(v) === BLACK) {
          if (!dagOut.has(u)) dagOut.set(u, [])
          if (!dagIn.has(v)) dagIn.set(v, [])
          dagOut.get(u)!.push(v)
          dagIn.get(v)!.push(u)
        }
        // GRAY = back edge (cycle) → skip
      }
      color.set(u, BLACK)
    }
    nodeIds.forEach((id) => { if (color.get(id) === WHITE) dfs(id) })

    // 2. Assign layers via longest-path
    const layer: Map<string, number> = new Map()
    const inDegree: Map<string, number> = new Map()
    nodeIds.forEach((id) => {
      layer.set(id, 0)
      inDegree.set(id, (dagIn.get(id) ?? []).length)
    })

    const queue: string[] = nodeIds.filter((id) => inDegree.get(id) === 0)
    while (queue.length > 0) {
      const u = queue.shift()!
      for (const v of dagOut.get(u) ?? []) {
        layer.set(v, Math.max(layer.get(v)!, layer.get(u)! + 1))
        inDegree.set(v, inDegree.get(v)! - 1)
        if (inDegree.get(v) === 0) queue.push(v)
      }
    }

    // 3. Group by layer
    const layerGroups: Map<number, string[]> = new Map()
    for (const [id, l] of layer) {
      if (!layerGroups.has(l)) layerGroups.set(l, [])
      layerGroups.get(l)!.push(id)
    }
    const sortedLayers = [...layerGroups.keys()].sort((a, b) => a - b)

    // 4. Barycenter crossing reduction (forward + backward)
    const barycenter = (nid: string, neighbors: string[], pos: Map<string, number>): number => {
      const relevant = neighbors.filter((nb) => pos.has(nb)).map((nb) => pos.get(nb)!)
      return relevant.length > 0 ? relevant.reduce((a, b) => a + b, 0) / relevant.length : Infinity
    }

    // Forward pass
    for (let i = 1; i < sortedLayers.length; i++) {
      const l = sortedLayers[i]
      const prevL = sortedLayers[i - 1]
      const prevPos = new Map<string, number>()
      layerGroups.get(prevL)!.forEach((id, idx) => prevPos.set(id, idx))
      layerGroups.get(l)!.sort((a, b) =>
        barycenter(a, inEdges.get(a) ?? [], prevPos) - barycenter(b, inEdges.get(b) ?? [], prevPos)
      )
    }
    // Backward pass
    for (let i = sortedLayers.length - 2; i >= 0; i--) {
      const l = sortedLayers[i]
      const nextL = sortedLayers[i + 1]
      const nextPos = new Map<string, number>()
      layerGroups.get(nextL)!.forEach((id, idx) => nextPos.set(id, idx))
      layerGroups.get(l)!.sort((a, b) =>
        barycenter(a, outEdges.get(a) ?? [], nextPos) - barycenter(b, outEdges.get(b) ?? [], nextPos)
      )
    }

    // 5. Assign positions
    const maxLayerSize = Math.max(...sortedLayers.map((l) => layerGroups.get(l)!.length))
    const positions = new Map<IdType, [number, number]>()

    for (let col = 0; col < sortedLayers.length; col++) {
      const nodesInLayer = layerGroups.get(sortedLayers[col])!
      const n = nodesInLayer.length
      const totalHeight = (n - 1) * Y_SPACING
      const maxHeight = (maxLayerSize - 1) * Y_SPACING
      const yOffset = Y_MARGIN + (maxHeight - totalHeight) / 2
      const x = X_MARGIN + col * X_SPACING

      for (let row = 0; row < n; row++) {
        positions.set(nodesInLayer[row], [x, yOffset + row * Y_SPACING])
      }
    }

    afterLayout(positions)
  },
}
