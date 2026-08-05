// Deep imports on purpose: @antv/layout's barrel re-exports the GPU layouts,
// which drag @antv/g-webgpu and regl (~100 KB gzip) into the chunk. These
// three files are the only parts of the package this engine uses.
import { DagreLayout } from '@antv/layout/es/layout/dagre.js'
import { GForceLayout } from '@antv/layout/es/layout/gForce.js'
import { RadialLayout } from '@antv/layout/es/layout/radial/index.js'

import { IdType } from '../../../IdType'
import { Edge, Node } from '../../../NetworkModel'
import { LayoutAlgorithm } from '../../LayoutAlgorithm'

// Parity with the previous G6-based implementation, which laid out into a
// hidden 4000x4000 canvas.
const LAYOUT_SIZE = 4000

interface PositionedNode {
  id: IdType
  x?: number
  y?: number
}

interface HeadlessLayout {
  layout: (data: {
    nodes: PositionedNode[]
    edges: Array<{ source: IdType; target: IdType }>
  }) => unknown
}

// `any` for the constructor options: each class declares its own required
// options shape (with a mandatory `type` discriminant), but the parameters
// arrive as the persisted, user-editable record from the algorithm registry.
const LAYOUT_CLASSES: Record<string, new (cfg: any) => HeadlessLayout> = {
  dagre: DagreLayout,
  gForce: GForceLayout,
  radial: RadialLayout,
}

/**
 * Runs one of the @antv/layout algorithms (dagre, gForce, radial) headlessly
 * and reports the resulting node positions.
 *
 * All three run synchronously here: dagre and radial are synchronous by
 * design, and gForce iterates inline when `animate` is false (there is no
 * canvas to animate — the previous implementation animated into a hidden
 * div, paying the full @antv/g6 rendering stack for nothing).
 */
export const runAntvLayout = (
  nodes: Node[],
  edges: Edge[],
  afterLayout: (positionMap: Map<IdType, [number, number]>) => void,
  algorithm: LayoutAlgorithm,
): void => {
  const positions = new Map<IdType, [number, number]>()
  if (nodes.length === 0) {
    afterLayout(positions)
    return
  }

  const { type, ...parameters } = algorithm.parameters as Record<
    string,
    unknown
  > & { type: string }
  const LayoutClass = LAYOUT_CLASSES[type]
  if (LayoutClass === undefined) {
    throw new Error(`Unknown @antv/layout algorithm type: ${String(type)}`)
  }

  // Strip the G6-era control fields: callbacks are owned here, and the GPU /
  // worker toggles have no meaning for the headless synchronous run. Persisted
  // user-edited parameters may still carry them, so remove rather than assume.
  delete parameters.onTick
  delete parameters.onLayoutEnd
  delete parameters.gpuEnabled
  delete parameters.workerEnabled

  const layout = new LayoutClass({
    ...parameters,
    width: LAYOUT_SIZE,
    height: LAYOUT_SIZE,
    center: [LAYOUT_SIZE / 2, LAYOUT_SIZE / 2],
    animate: false,
  })

  const layoutNodes: PositionedNode[] = nodes.map((node: Node) => ({
    id: node.id,
  }))
  const layoutEdges = edges.map((edge: Edge) => ({
    source: edge.s,
    target: edge.t,
  }))

  layout.layout({ nodes: layoutNodes, edges: layoutEdges })

  layoutNodes.forEach((node) => {
    positions.set(node.id, [node.x ?? 0, node.y ?? 0])
  })
  afterLayout(positions)
}
