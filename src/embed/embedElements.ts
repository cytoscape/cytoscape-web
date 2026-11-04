import { ElementDefinition } from 'cytoscape'

import {
  createCyjsDataMapper,
  transformNodeShape,
  transformRotation,
} from '@/features/NetworkPanel/CyjsRenderer/cyjsRenderUtil'
import { CyNetwork } from '@/models/CyNetworkModel'
import { IdType } from '@/models/IdType'
import { NetworkView } from '@/models/ViewModel'
import { View } from '@/models/ViewModel/View'
import {
  EdgeArrowShapeType,
  EdgeVisualPropertyName,
  NodeShapeType,
  NodeVisualPropertyName,
  VisualPropertyName,
} from '@/models/VisualStyleModel'
import { SpecialPropertyName } from '@/models/VisualStyleModel/impl/CyjsProperties/CyjsStyleModels/directMappingSelector'
import { computeNodeLabelPosition } from '@/models/VisualStyleModel/impl/nodeLabelPositionMap'
import { VisualEditorProperties } from '@/models/VisualStyleModel/VisualStyleOptions'

type Rule = { selector: string; style: Record<string, unknown> }

export interface EmbedElements {
  nodes: ElementDefinition[]
  edges: ElementDefinition[]
  stylesheet: Rule[]
}

const DATA_REF = /^data\((\w+)\)$/

/**
 * The elements and stylesheet that draw `view`, styled as the full app's
 * pipeline styles them (addCyElements -> applyViewModel ->
 * createCyjsDataMapper), with less work for Cytoscape.js.
 *
 * The full app gives every element every visual property in its data, and
 * one `node[vp] { prop: data(vp) }` rule per property, so Cytoscape.js
 * resolves each property from each element's data. Here a property every
 * element of a group has moves its most common value into a `node` or
 * `edge` rule, and only the elements with another value keep it in their
 * data. The computed style of every element is unchanged
 * (embedElements.test.ts compares the two across the CX2 fixtures).
 */
export const buildEmbedElements = (
  cyNetwork: CyNetwork,
  view: NetworkView,
  editorProperties: VisualEditorProperties,
  positions?: ReadonlyMap<IdType, [number, number]>,
): EmbedElements => {
  const nodes: ElementDefinition[] = Object.values(view.nodeViews).map((nv) => {
    const [x, y] = positions?.get(nv.id) ?? [nv.x, nv.y]
    return {
      group: 'nodes',
      data: { id: nv.id, ...viewToCyData(nv, editorProperties) },
      position: { x, y },
    }
  })
  const edges: ElementDefinition[] = cyNetwork.network.edges.map((edge) => ({
    group: 'edges',
    data: {
      id: edge.id,
      source: edge.s,
      target: edge.t,
      ...viewToCyData(view.edgeViews[edge.id], editorProperties),
    },
  }))

  const rules = createCyjsDataMapper(cyNetwork.visualStyle) as Rule[]
  const defaults = [
    moveCommonValues('node', nodes, rules),
    moveCommonValues('edge', edges, rules),
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

  return { nodes, edges, stylesheet: rules }
}

/**
 * For each data key of `group` that only `group[key]` rules read, and that
 * every element has: put its most common value in a `group` rule and drop
 * it from the elements holding that value.
 */
const moveCommonValues = (
  group: 'node' | 'edge',
  elements: ElementDefinition[],
  rules: Rule[],
): Rule => {
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
 * The data applyViewModel (cyjsRenderUtil.ts) gives a new element, as a
 * plain object: each view value through the same transform as its vpHandler,
 * then the visual editor overrides. Building it up front lets the embed add
 * each element with its final data in one cy.add, instead of writing every
 * key to every element afterwards.
 *
 * Mirrors updateCyElements; embedElements.test.ts fails if the two drift.
 */
const viewToCyData = (
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
