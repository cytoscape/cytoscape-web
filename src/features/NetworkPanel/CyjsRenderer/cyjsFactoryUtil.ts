/**
 * cyjsFactoryUtil.ts
 *
 * Builds the Cytoscape.js elements and stylesheet that draw a network view.
 * Each element gets its final data in one pass: every visual property goes
 * through its Cytoscape.js transform (shape names, degrees to radians, arrow
 * fills) and the visual editor overrides before the element is added.
 *
 * The full app (CyjsRenderer), the style previews and the embed all draw
 * through createCyElements, so the three style a network the same way.
 */

import { ElementDefinition } from 'cytoscape'

import { IdType } from '../../../models/IdType'
import { Edge } from '../../../models/NetworkModel'
import { NetworkView } from '../../../models/ViewModel'
import { View } from '../../../models/ViewModel/View'
import {
  EdgeArrowShapeType,
  EdgeVisualPropertyName,
  NodeShapeType,
  NodeVisualPropertyName,
  VisualPropertyName,
  VisualStyle,
} from '../../../models/VisualStyleModel'
import { SpecialPropertyName } from '../../../models/VisualStyleModel/impl/CyjsProperties/CyjsStyleModels/directMappingSelector'
import { computeNodeLabelPosition } from '../../../models/VisualStyleModel/impl/nodeLabelPositionMap'
import { VisualEditorProperties } from '../../../models/VisualStyleModel/VisualStyleOptions'
import {
  createCyjsDataMapper,
  transformNodeShape,
  transformRotation,
} from './cyjsRenderUtil'

/** One rule of a Cytoscape.js stylesheet. */
export interface CyRule {
  selector: string
  style: Record<string, unknown>
}

/** Everything Cytoscape.js needs to draw a network view. */
export interface CyElements {
  nodes: ElementDefinition[]
  edges: ElementDefinition[]
  stylesheet: CyRule[]
}

export interface CreateCyElementsOptions {
  /** Replace the view's node positions. */
  positions?: ReadonlyMap<IdType, [number, number]>
  /** Elements created selected. */
  selection?: {
    nodes: readonly IdType[]
    edges: readonly IdType[]
  }
}

const DATA_REF = /^data\((\w+)\)$/

/**
 * Class of the edges drawn as a bezier bundle: those sharing their two
 * nodes with another edge, in either direction, and self-loops.
 */
export const BUNDLED_EDGE_CLASS = 'bundled'

/**
 * The elements and stylesheet that draw `view`, a view with the visual style
 * applied (VisualStyleFn.applyVisualStyle).
 *
 * createCyjsDataMapper gives one `node[vp] { prop: data(vp) }` rule per
 * visual property, so Cytoscape.js resolves each property from each
 * element's data. A property every element of a group has moves its most
 * common value into a `node` or `edge` rule, and only the elements with
 * another value keep it in their data: for a network whose nodes share a
 * shape, the shape is resolved once, not once per node. The computed style
 * of every element is unchanged (cyjsFactoryUtil.test.ts compares the two
 * across the CX2 fixtures).
 */
export const createCyElements = (
  edges: Edge[],
  view: NetworkView,
  visualStyle: VisualStyle,
  editorProperties: VisualEditorProperties,
  { positions, selection }: CreateCyElementsOptions = {},
): CyElements => {
  const selectedNodes = new Set(selection?.nodes)
  const selectedEdges = new Set(selection?.edges)
  const bundled = bundledEdgeIds(edges)

  const nodes: ElementDefinition[] = Object.values(view.nodeViews).map((nv) => {
    const [x, y] = positions?.get(nv.id) ?? [nv.x, nv.y]
    return {
      group: 'nodes',
      data: { id: nv.id, ...viewToCyData(nv, editorProperties) },
      position: { x, y },
      selected: selectedNodes.has(nv.id),
    }
  })
  const cyEdges: ElementDefinition[] = edges.map((edge) => ({
    group: 'edges',
    data: {
      id: edge.id,
      source: edge.s,
      target: edge.t,
      ...viewToCyData(view.edgeViews[edge.id], editorProperties),
    },
    selected: selectedEdges.has(edge.id),
    ...(bundled.has(edge.id) ? { classes: BUNDLED_EDGE_CLASS } : {}),
  }))

  const rules = drawLoneEdgesStraight(
    createCyjsDataMapper(visualStyle) as CyRule[],
  )
  const defaults = [
    moveCommonValues('node', nodes, rules),
    moveCommonValues('edge', cyEdges, rules),
  ].filter((rule) => Object.keys(rule.style).length > 0)
  // After the base node and edge rules, before every data rule
  const firstDataRule = rules.findIndex(
    (rule) => rule.selector !== 'node' && rule.selector !== 'edge',
  )
  rules.splice(
    firstDataRule === -1 ? rules.length : firstDataRule,
    0,
    ...defaults,
  )

  return { nodes, edges: cyEdges, stylesheet: rules }
}

/**
 * IDs of the edges that share their two nodes with another edge, in either
 * direction, and of self-loops.
 */
const bundledEdgeIds = (edges: Edge[]): Set<IdType> => {
  const pairKey = (edge: Edge): string =>
    edge.s < edge.t ? `${edge.s}\u0000${edge.t}` : `${edge.t}\u0000${edge.s}`
  const counts = new Map<string, number>()
  edges.forEach((edge) => {
    const key = pairKey(edge)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })
  return new Set(
    edges
      .filter(
        (edge) => edge.s === edge.t || (counts.get(pairKey(edge)) ?? 0) > 1,
      )
      .map((edge) => edge.id),
  )
}

/**
 * Draw only bundled edges (BUNDLED_EDGE_CLASS) as `bezier`, every other edge
 * as `straight`.
 *
 * A lone `bezier` edge already draws as a straight line, but costs as much
 * as a bundle: Cytoscape.js 3.34 looks up its parallel edges, by scanning
 * every edge of its source node, when its curve style is first applied and
 * again when its control points are computed. Around a node with thousands
 * of edges that is quadratic: seconds of a 20,000-edge network's first draw.
 * A `straight` edge skips both.
 */
const drawLoneEdgesStraight = (rules: CyRule[]): CyRule[] => {
  const base = rules.findIndex(
    (rule) => rule.selector === 'edge' && 'curve-style' in rule.style,
  )
  if (base === -1) return rules
  const bundledStyle = rules[base].style['curve-style']
  rules[base] = {
    ...rules[base],
    style: { ...rules[base].style, 'curve-style': 'straight' },
  }
  rules.splice(base + 1, 0, {
    selector: `edge.${BUNDLED_EDGE_CLASS}`,
    style: { 'curve-style': bundledStyle },
  })
  return rules
}

/**
 * For each data key of `group` that only `group[key]` rules read, and that
 * every element has: put its most common value in a `group` rule and drop
 * it from the elements holding that value.
 */
const moveCommonValues = (
  group: 'node' | 'edge',
  elements: ElementDefinition[],
  rules: CyRule[],
): CyRule => {
  // Style properties each data key sets, and the keys some other rule
  // (such as node:selected) also reads, which must stay in the data
  const propsOf = new Map<string, string[]>()
  const pinned = new Set<string>()
  rules.forEach((rule) => {
    Object.entries(rule.style).forEach(([prop, value]) => {
      const key =
        typeof value === 'string' ? DATA_REF.exec(value)?.[1] : undefined
      if (key === undefined) return
      if (rule.selector === `${group}[${key}]`) {
        propsOf.set(key, [...(propsOf.get(key) ?? []), prop])
      } else {
        pinned.add(key)
      }
    })
  })

  const style: Record<string, unknown> = {}
  propsOf.forEach((props, key) => {
    if (pinned.has(key)) return
    const counts = new Map<unknown, number>()
    for (const element of elements) {
      const value = element.data[key]
      // Only primitives compare by value; an element without the key
      // matches no rule today, and a default would change it
      if (value === undefined || (typeof value === 'object' && value !== null))
        return
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
    let common: unknown
    let best = 0
    counts.forEach((count, value) => {
      if (count > best) {
        best = count
        common = value
      }
    })
    if (best === 0) return
    props.forEach((prop) => {
      style[prop] = common
    })
    elements.forEach((element) => {
      if (element.data[key] === common) delete element.data[key]
    })
  })
  return { selector: group, style }
}

/**
 * The Cytoscape.js data of one element, as a plain object: each view value
 * through its Cytoscape.js transform, then the visual editor overrides.
 */
export const viewToCyData = (
  view: View,
  editorProperties: VisualEditorProperties,
): Record<string, unknown> => {
  const data: Record<string, unknown> = {}
  view.values.forEach((value: any, key) => {
    switch (key) {
      case VisualPropertyName.NodeLabelPosition: {
        // computeView expands this key, so it does not reach here today
        const { horizontalAlign, verticalAlign } =
          computeNodeLabelPosition(value)
        data[SpecialPropertyName.NodeLabelHorizontalAlign] = horizontalAlign
        data[SpecialPropertyName.NodeLabelVerticalAlign] = verticalAlign
        data[SpecialPropertyName.NodeLabelMarginX] = value.MARGIN_X
        data[SpecialPropertyName.NodeLabelMarginY] = value.MARGIN_Y
        data[SpecialPropertyName.NodeLabelJustification] = value.JUSTIFICATION
        break
      }
      case VisualPropertyName.EdgeSourceArrowShape:
      case VisualPropertyName.EdgeTargetArrowShape: {
        const fill =
          key === VisualPropertyName.EdgeSourceArrowShape
            ? SpecialPropertyName.SourceArrowFill
            : SpecialPropertyName.TargetArrowFill
        // Cytoscape.js has no 'arrow' shape
        data[key] =
          value === EdgeArrowShapeType.Arrow
            ? EdgeArrowShapeType.Triangle
            : value
        const fillValue = view.values.get(fill as VisualPropertyName)
        if (fillValue !== undefined) data[fill] = fillValue
        break
      }
      case VisualPropertyName.NodeShape:
        data[key] = transformNodeShape(value as NodeShapeType)
        break
      case VisualPropertyName.NodeLabelRotation:
      case VisualPropertyName.EdgeLabelRotation:
        data[key] = transformRotation(value)
        break
      default:
        // Cytoscape.js ignores a write of undefined
        if (value !== undefined) data[key] = value
    }
  })
  if (editorProperties?.nodeSizeLocked) {
    const height = data[NodeVisualPropertyName.NodeHeight]
    if (height !== undefined) data[NodeVisualPropertyName.NodeWidth] = height
  }
  if (editorProperties?.arrowColorMatchesEdge) {
    const color = data[EdgeVisualPropertyName.EdgeLineColor]
    if (color !== undefined) {
      data[EdgeVisualPropertyName.EdgeSourceArrowColor] = color
      data[EdgeVisualPropertyName.EdgeTargetArrowColor] = color
    }
  }
  return data
}
