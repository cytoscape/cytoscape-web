// @vitest-environment node
import cytoscape, { Core } from 'cytoscape'
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { getCyNetworkFromCx2 } from '../../../models/CxModel/impl'
import { CyNetwork } from '../../../models/CyNetworkModel'
import type { Edge } from '../../../models/NetworkModel'
import type { EdgeView, NetworkView, NodeView } from '../../../models/ViewModel'
import VisualStyleFn, { VisualStyle } from '../../../models/VisualStyleModel'
import { VisualEditorProperties } from '../../../models/VisualStyleModel/VisualStyleOptions'
import {
  BUNDLED_EDGE_CLASS,
  createCyElements,
  viewToCyData,
} from './cyjsFactoryUtil'
import { applyCyElementData, createCyjsDataMapper } from './cyjsRenderUtil'

const FIXTURE_DIRS = ['test/fixtures/cx2/valid', 'test/fixtures/ndex']

// Fixtures over 1 MB (the 12,000-edge DAS network) take ~15 s here
const MAX_FIXTURE_BYTES = 1_000_000
const TIMEOUT_MS = 20_000

const fixtures = FIXTURE_DIRS.flatMap((dir) =>
  fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.cx2'))
    .map((file) => path.join(dir, file))
    .filter((file) => fs.statSync(file).size <= MAX_FIXTURE_BYTES),
)

const EDITOR_PROPERTIES: VisualEditorProperties = {
  nodeSizeLocked: false,
  arrowColorMatchesEdge: false,
  tableDisplayConfiguration: {
    nodeTable: { columnConfiguration: [] },
    edgeTable: { columnConfiguration: [] },
  },
}

const editorProperties = (cyNetwork: CyNetwork): VisualEditorProperties =>
  cyNetwork.visualStyleOptions?.visualEditorProperties ?? EDITOR_PROPERTIES

const load = (file: string): CyNetwork =>
  getCyNetworkFromCx2('n', JSON.parse(fs.readFileSync(file, 'utf8')))

const styledView = (cyNetwork: CyNetwork, vs: VisualStyle): NetworkView =>
  VisualStyleFn.applyVisualStyle({
    network: cyNetwork.network,
    networkView: cyNetwork.networkViews[0],
    nodeTable: cyNetwork.nodeTable,
    edgeTable: cyNetwork.edgeTable,
    visualStyle: vs,
  })

/** The style with every mapping and bypass removed: every value shared. */
const defaultsOnly = (vs: VisualStyle): VisualStyle =>
  Object.fromEntries(
    Object.entries(vs).map(([name, vp]) => [
      name,
      { ...vp, mapping: undefined, bypassMap: new Map() },
    ]),
  ) as VisualStyle

const headless = (): Core => cytoscape({ headless: true, styleEnabled: true })

/**
 * Every element carries every visual property in its data, read by one
 * data rule per property: the stylesheet before shared values moved into
 * base rules.
 */
const drawUnfactored = (
  cyNetwork: CyNetwork,
  view: NetworkView,
  vs: VisualStyle,
  props: VisualEditorProperties,
): Core => {
  const cy = headless()
  cy.style(createCyjsDataMapper(vs) as any)
  cy.add(
    Object.values(view.nodeViews).map((nv) => ({
      group: 'nodes' as const,
      data: { id: nv.id, ...viewToCyData(nv, props) },
      position: { x: nv.x, y: nv.y },
    })),
  )
  cy.add(
    cyNetwork.network.edges.map((edge) => ({
      group: 'edges' as const,
      data: {
        id: edge.id,
        source: edge.s,
        target: edge.t,
        ...viewToCyData(view.edgeViews[edge.id], props),
      },
    })),
  )
  return cy
}

const draw = (
  cyNetwork: CyNetwork,
  view: NetworkView,
  vs: VisualStyle,
  props: VisualEditorProperties,
): Core => {
  const cy = headless()
  const { nodes, edges, stylesheet } = createCyElements(
    cyNetwork.network.edges,
    view,
    vs,
    props,
  )
  cy.style(stylesheet as any)
  cy.add(nodes)
  cy.add(edges)
  return cy
}

/** Restyle `cy` in place, as CyjsRenderer's onStyleModelUpdate does. */
const restyle = (
  cy: Core,
  cyNetwork: CyNetwork,
  view: NetworkView,
  vs: VisualStyle,
  props: VisualEditorProperties,
): void => {
  const { nodes, edges, stylesheet } = createCyElements(
    cyNetwork.network.edges,
    view,
    vs,
    props,
  )
  cy.startBatch()
  cy.style(stylesheet as any)
  applyCyElementData(cy, nodes)
  applyCyElementData(cy, edges)
  cy.endBatch()
}

/**
 * Every computed style property that differs: [element, property, actual,
 * expected]. An edge outside a bundle may be `straight` where the expected
 * one is `bezier`: the two draw the same.
 */
const styleDiffs = (actual: Core, expected: Core): unknown[][] => {
  const diffs: unknown[][] = []
  expected.elements().forEach((expectedEle) => {
    const actualEle = actual.getElementById(expectedEle.id())
    const actualStyle = actualEle.style()
    Object.entries(expectedEle.style()).forEach(([prop, value]) => {
      const loneEdge =
        // style() lists each property under both spellings
        (prop === 'curve-style' || prop === 'curveStyle') &&
        value === 'bezier' &&
        actualStyle[prop] === 'straight' &&
        !actualEle.hasClass(BUNDLED_EDGE_CLASS)
      if (actualStyle[prop] !== value && !loneEdge) {
        diffs.push([expectedEle.id(), prop, actualStyle[prop], value])
      }
    })
  })
  return diffs.slice(0, 10)
}

describe('createCyElements', () => {
  it.each(fixtures)(
    'styles every element of %s as one data rule per property does',
    (file) => {
      const cyNetwork = load(file)
      const { visualStyle } = cyNetwork
      const view = styledView(cyNetwork, visualStyle)
      const props = editorProperties(cyNetwork)
      const expected = drawUnfactored(cyNetwork, view, visualStyle, props)
      const actual = draw(cyNetwork, view, visualStyle, props)

      expect(styleDiffs(actual, expected)).toEqual([])
      expected.elements().select()
      actual.elements().select()
      expect(styleDiffs(actual, expected)).toEqual([])
    },
    TIMEOUT_MS,
  )

  it('moves a value shared by every node out of the node data', () => {
    const cyNetwork = load('test/fixtures/cx2/valid/small-network.valid.cx2')
    const view = styledView(cyNetwork, cyNetwork.visualStyle)
    const { nodes, stylesheet } = createCyElements(
      cyNetwork.network.edges,
      view,
      cyNetwork.visualStyle,
      editorProperties(cyNetwork),
    )
    const nodeDefaults = stylesheet.find(
      (rule) => rule.selector === 'node' && 'shape' in rule.style,
    )
    expect(nodeDefaults).toBeDefined()
    expect(nodes.every((n) => n.data.nodeShape === undefined)).toBe(true)
  })

  it('draws only parallel edges and self-loops as bezier', () => {
    const cyNetwork = load('test/fixtures/cx2/valid/small-network.valid.cx2')
    const vs = cyNetwork.visualStyle
    const nodeView = (id: string): NodeView =>
      ({ id, x: 0, y: 0, values: new Map() }) as unknown as NodeView
    const edgeView = (id: string): EdgeView =>
      ({ id, values: new Map() }) as unknown as EdgeView
    const edges: Edge[] = [
      { id: 'lone', s: 'a', t: 'b' },
      { id: 'there', s: 'b', t: 'c' },
      { id: 'back', s: 'c', t: 'b' },
      { id: 'loop', s: 'a', t: 'a' },
    ]
    const view = {
      nodeViews: Object.fromEntries(
        ['a', 'b', 'c'].map((id) => [id, nodeView(id)]),
      ),
      edgeViews: Object.fromEntries(edges.map((e) => [e.id, edgeView(e.id)])),
    } as unknown as NetworkView

    const {
      nodes,
      edges: cyEdges,
      stylesheet,
    } = createCyElements(edges, view, vs, EDITOR_PROPERTIES)
    const cy = headless()
    cy.style(stylesheet as any)
    cy.add(nodes)
    cy.add(cyEdges)

    const curve = (id: string): string =>
      cy.getElementById(id).style('curve-style')
    expect(curve('lone')).toBe('straight')
    expect(curve('there')).toBe('bezier')
    expect(curve('back')).toBe('bezier')
    expect(curve('loop')).toBe('bezier')
  })

  it('places nodes at the given positions and selects the given elements', () => {
    const nodeView = (id: string, x: number, y: number): NodeView =>
      ({ id, x, y, values: new Map() }) as unknown as NodeView
    const edgeView = (id: string): EdgeView =>
      ({ id, values: new Map() }) as unknown as EdgeView
    const edges: Edge[] = [{ id: 'e1', s: 'n1', t: 'n2' }]
    const view = {
      nodeViews: { n1: nodeView('n1', 10, 20), n2: nodeView('n2', 30, 40) },
      edgeViews: { e1: edgeView('e1') },
    } as unknown as NetworkView

    const { nodes, edges: cyEdges } = createCyElements(
      edges,
      view,
      load('test/fixtures/cx2/valid/small-network.valid.cx2').visualStyle,
      EDITOR_PROPERTIES,
      {
        positions: new Map([['n2', [5, 6]]]),
        selection: { nodes: ['n1'], edges: ['e1'] },
      },
    )

    expect(nodes).toEqual([
      {
        group: 'nodes',
        data: { id: 'n1' },
        position: { x: 10, y: 20 },
        selected: true,
      },
      {
        group: 'nodes',
        data: { id: 'n2' },
        position: { x: 5, y: 6 },
        selected: false,
      },
    ])
    expect(cyEdges).toEqual([
      {
        group: 'edges',
        data: { id: 'e1', source: 'n1', target: 'n2' },
        selected: true,
      },
    ])
  })
})

describe('applyCyElementData', () => {
  it.each(fixtures)(
    'restyles %s in place as a fresh draw styles it, both ways',
    (file) => {
      const cyNetwork = load(file)
      const mapped = cyNetwork.visualStyle
      const shared = defaultsOnly(mapped)
      const props = editorProperties(cyNetwork)
      const toggled: VisualEditorProperties = {
        ...props,
        nodeSizeLocked: !props.nodeSizeLocked,
        arrowColorMatchesEdge: !props.arrowColorMatchesEdge,
      }

      const cy = draw(cyNetwork, styledView(cyNetwork, mapped), mapped, props)
      // Mapped values give way to shared ones, which move into base rules
      restyle(cy, cyNetwork, styledView(cyNetwork, shared), shared, toggled)
      expect(
        styleDiffs(
          cy,
          draw(cyNetwork, styledView(cyNetwork, shared), shared, toggled),
        ),
      ).toEqual([])
      // And back: values leave the base rules for the element data again
      restyle(cy, cyNetwork, styledView(cyNetwork, mapped), mapped, props)
      expect(
        styleDiffs(
          cy,
          draw(cyNetwork, styledView(cyNetwork, mapped), mapped, props),
        ),
      ).toEqual([])
    },
    TIMEOUT_MS,
  )

  it('removes keys the new data lacks and keeps id, source and target', () => {
    const cy = headless()
    cy.add([
      { group: 'nodes', data: { id: 'a', old: 1, kept: 1 } },
      { group: 'nodes', data: { id: 'b' } },
      { group: 'edges', data: { id: 'e', source: 'a', target: 'b', w: 1 } },
    ])

    applyCyElementData(cy, [
      { data: { id: 'a', kept: 2, added: 3 } },
      { data: { id: 'missing', x: 1 } },
    ])
    applyCyElementData(cy, [{ data: { id: 'e', source: 'a', target: 'b' } }])

    expect(cy.getElementById('a').data()).toEqual({
      id: 'a',
      kept: 2,
      added: 3,
    })
    expect(cy.getElementById('e').data()).toEqual({
      id: 'e',
      source: 'a',
      target: 'b',
    })
    expect(cy.getElementById('missing').empty()).toBe(true)
  })
})
