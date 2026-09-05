import cytoscape from 'cytoscape'
import { describe, expect, it } from 'vitest'

import { NetworkView } from '../../../models/ViewModel'
import VisualStyleFn, {
  EdgeVisualPropertyName,
  NodeShapeType,
  NodeVisualPropertyName,
  VisualStyle,
} from '../../../models/VisualStyleModel'
import { CustomGraphicsNameType } from '../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import { SpecialPropertyName } from '../../../models/VisualStyleModel/impl/CyjsProperties/CyjsStyleModels/directMappingSelector'
import {
  applyViewModel,
  createCyjsDataMapper,
  NodeShapeMapping,
  transformNodeShape,
  transformRotation,
} from './cyjsRenderUtil'

describe('transformNodeShape', () => {
  it('maps every app node shape to a cytoscape.js shape', () => {
    expect(transformNodeShape(NodeShapeType.Parallelogram)).toBe('rhomboid')
    expect(transformNodeShape(NodeShapeType.RoundRectangle)).toBe(
      'roundrectangle',
    )
    expect(transformNodeShape(NodeShapeType.Ellipse)).toBe('ellipse')
    // Exhaustiveness: every enum member has a mapping
    Object.values(NodeShapeType).forEach((shape) => {
      expect(NodeShapeMapping[shape]).toBeDefined()
    })
  })
})

describe('transformRotation', () => {
  it('converts degrees to radians', () => {
    expect(transformRotation(180)).toBeCloseTo(Math.PI)
    expect(transformRotation(0)).toBe(0)
    expect(transformRotation(-90)).toBeCloseTo(-Math.PI / 2)
  })
})

describe('createCyjsDataMapper', () => {
  const vs = VisualStyleFn.createVisualStyle()
  const cyStyle = createCyjsDataMapper(vs)
  // The state selectors (node:selected etc.) are outside the
  // DirectMappingSelector template type, so compare as plain strings
  const selectors: string[] = cyStyle.map((m) => m.selector as string)

  it('starts with the base edge and node styles', () => {
    expect(cyStyle[0]).toEqual({
      selector: 'edge',
      style: { 'curve-style': 'bezier', 'text-wrap': 'wrap' },
    })
    expect(cyStyle[1]).toEqual({
      selector: 'node',
      style: { 'text-wrap': 'wrap' },
    })
  })

  it('maps node visual properties as data() direct mappings', () => {
    const fillMapping = cyStyle.find(
      (m) => m.selector === 'node[nodeBackgroundColor]',
    )

    expect(fillMapping?.style).toEqual({
      'background-color': 'data(nodeBackgroundColor)',
    })
  })

  it('maps the selected node color through the node:selected state', () => {
    const selected = cyStyle.find(
      (m) => (m.selector as string) === 'node:selected',
    )

    expect(selected).toBeDefined()
    expect(Object.values(selected!.style)).toContain('data(nodeSelectedPaint)')
  })

  it('expands node label position into five style mappings', () => {
    const styleKeys = cyStyle.flatMap((m) => Object.keys(m.style))

    expect(styleKeys).toContain('text-margin-x')
    expect(styleKeys).toContain('text-margin-y')
    expect(styleKeys).toContain('text-justification')
    expect(styleKeys).toContain('text-halign')
    expect(styleKeys).toContain('text-valign')
  })

  it('creates shape and fill mappings for both edge arrow directions', () => {
    const styleKeys = cyStyle.flatMap((m) => Object.keys(m.style))

    expect(styleKeys).toContain('source-arrow-shape')
    expect(styleKeys).toContain('target-arrow-shape')
    expect(styleKeys).toContain('source-arrow-fill')
    expect(styleKeys).toContain('target-arrow-fill')
  })

  it('keeps edge:selected after every edge[...] mapping so selection wins', () => {
    const edgeSelectedIndex = selectors.indexOf('edge:selected')
    const lastEdgeAttrIndex = selectors.reduce(
      (last, s, i) => (s.startsWith('edge[') ? i : last),
      -1,
    )

    expect(edgeSelectedIndex).toBeGreaterThan(lastEdgeAttrIndex)
  })

  it('ends with the hover and edge-creation-target helper classes', () => {
    expect(selectors[selectors.length - 2]).toBe('.hover')
    expect(selectors[selectors.length - 1]).toBe('.edge-creation-target')
  })

  it('registers pie/ring mappings for the custom-graphics slots', () => {
    // Even empty (None) custom-graphics slots register the mappings so
    // that any node can use pie/ring charts via defaults or bypasses.
    const styleKeys = cyStyle.flatMap((m) => Object.keys(m.style))

    expect(styleKeys).toContain('pie-size')
    expect(styleKeys).toContain('pie-start-angle')
    expect(styleKeys).toContain('pie-hole')
    // 16 slices, each with a color and a size mapping
    expect(styleKeys).toContain('pie-1-background-color')
    expect(styleKeys).toContain('pie-16-background-size')
  })

  it('emits the same pie mappings when a pie chart is the slot default', () => {
    const pieVs: VisualStyle = {
      ...vs,
      nodeImageChart1: {
        ...vs.nodeImageChart1,
        defaultValue: {
          type: 'chart',
          name: CustomGraphicsNameType.PieChart,
          properties: {
            cy_range: [0, 1],
            cy_colorScheme: 'custom',
            cy_startAngle: 0,
            cy_colors: ['#ff0000'],
            cy_dataColumns: ['score'],
          },
        },
      },
    } as VisualStyle

    const pieStyleKeys = createCyjsDataMapper(pieVs).flatMap((m) =>
      Object.keys(m.style),
    )

    expect(pieStyleKeys).toContain('pie-size')
    expect(pieStyleKeys).toContain('pie-16-background-size')
  })
})

const defaultVisualEditorProps = {
  nodeSizeLocked: false,
  arrowColorMatchesEdge: false,
  tableDisplayConfiguration: {
    nodeTable: { columnConfiguration: [] },
    edgeTable: { columnConfiguration: [] },
  },
}

describe('applyViewModel', () => {
  it('updates element data from view model values', () => {
    const cy = cytoscape({
      headless: true,
      elements: [
        { group: 'nodes', data: { id: 'n1' } },
        { group: 'edges', data: { id: 'e1', source: 'n1', target: 'n1' } },
      ],
    })

    const networkView: NetworkView = {
      id: 'v1',
      values: new Map(),
      nodeViews: {
        n1: {
          id: 'n1',
          x: 10,
          y: 20,
          values: new Map<any, any>([
            [NodeVisualPropertyName.NodeLabel, 'Node 1'],
            [NodeVisualPropertyName.NodeBackgroundColor, '#ff0000'],
          ]),
        },
      },
      edgeViews: {
        e1: {
          id: 'e1',
          values: new Map<any, any>([
            [EdgeVisualPropertyName.EdgeLineColor, '#00ff00'],
          ]),
        },
      },
      selectedNodes: [],
      selectedEdges: [],
    }

    applyViewModel(cy, networkView, defaultVisualEditorProps)

    expect(cy.$('#n1').data(NodeVisualPropertyName.NodeLabel)).toBe('Node 1')
    expect(cy.$('#n1').data(NodeVisualPropertyName.NodeBackgroundColor)).toBe(
      '#ff0000',
    )
    expect(cy.$('#e1').data(EdgeVisualPropertyName.EdgeLineColor)).toBe(
      '#00ff00',
    )
  })

  it('removes custom graphics properties when absent from view model values', () => {
    const cy = cytoscape({
      headless: true,
      elements: [
        {
          group: 'nodes',
          data: {
            id: 'n1',
            [SpecialPropertyName.PieSize]: '100%',
            [SpecialPropertyName.Pie1BackgroundColor]: '#ff0000',
          },
        },
      ],
    })

    expect(cy.$('#n1').data(SpecialPropertyName.PieSize)).toBeDefined()
    expect(
      cy.$('#n1').data(SpecialPropertyName.Pie1BackgroundColor),
    ).toBeDefined()

    const networkView: NetworkView = {
      id: 'v1',
      values: new Map(),
      nodeViews: {
        n1: {
          id: 'n1',
          x: 0,
          y: 0,
          values: new Map<any, any>([
            [NodeVisualPropertyName.NodeBackgroundColor, '#ffffff'],
          ]),
        },
      },
      edgeViews: {},
      selectedNodes: [],
      selectedEdges: [],
    }

    applyViewModel(cy, networkView, defaultVisualEditorProps)

    expect(cy.$('#n1').data(SpecialPropertyName.PieSize)).toBeUndefined()
    expect(
      cy.$('#n1').data(SpecialPropertyName.Pie1BackgroundColor),
    ).toBeUndefined()
  })

  it('preserves elements present in Cytoscape but absent from view model', () => {
    const cy = cytoscape({
      headless: true,
      elements: [
        { group: 'nodes', data: { id: 'n1', customData: 'keep-me' } },
        { group: 'nodes', data: { id: 'n2', customData: 'keep-me-too' } },
      ],
    })

    const networkView: NetworkView = {
      id: 'v1',
      values: new Map(),
      nodeViews: {
        n1: {
          id: 'n1',
          x: 0,
          y: 0,
          values: new Map<any, any>([
            [NodeVisualPropertyName.NodeLabel, 'Updated N1'],
          ]),
        },
        // n2 is absent from view model
      },
      edgeViews: {},
      selectedNodes: [],
      selectedEdges: [],
    }

    applyViewModel(cy, networkView, defaultVisualEditorProps)

    expect(cy.$('#n1').data(NodeVisualPropertyName.NodeLabel)).toBe(
      'Updated N1',
    )
    expect(cy.$('#n2').data('customData')).toBe('keep-me-too')
    expect(cy.nodes().length).toBe(2)
  })

  it('applies nodeSizeLocked override by setting width equal to height', () => {
    const cy = cytoscape({
      headless: true,
      elements: [{ group: 'nodes', data: { id: 'n1' } }],
    })

    const networkView: NetworkView = {
      id: 'v1',
      values: new Map(),
      nodeViews: {
        n1: {
          id: 'n1',
          x: 0,
          y: 0,
          values: new Map<any, any>([
            [NodeVisualPropertyName.NodeWidth, 100],
            [NodeVisualPropertyName.NodeHeight, 42],
          ]),
        },
      },
      edgeViews: {},
      selectedNodes: [],
      selectedEdges: [],
    }

    applyViewModel(cy, networkView, {
      ...defaultVisualEditorProps,
      nodeSizeLocked: true,
    })

    expect(cy.$('#n1').data(NodeVisualPropertyName.NodeHeight)).toBe(42)
    expect(cy.$('#n1').data(NodeVisualPropertyName.NodeWidth)).toBe(42)
  })

  it('applies arrowColorMatchesEdge override by synchronizing arrow colors with edge line color', () => {
    const cy = cytoscape({
      headless: true,
      elements: [
        { group: 'nodes', data: { id: 'n1' } },
        { group: 'nodes', data: { id: 'n2' } },
        { group: 'edges', data: { id: 'e1', source: 'n1', target: 'n2' } },
      ],
    })

    const networkView: NetworkView = {
      id: 'v1',
      values: new Map(),
      nodeViews: {},
      edgeViews: {
        e1: {
          id: 'e1',
          values: new Map<any, any>([
            [EdgeVisualPropertyName.EdgeLineColor, '#336699'],
            [EdgeVisualPropertyName.EdgeSourceArrowColor, '#ff0000'],
            [EdgeVisualPropertyName.EdgeTargetArrowColor, '#00ff00'],
          ]),
        },
      },
      selectedNodes: [],
      selectedEdges: [],
    }

    applyViewModel(cy, networkView, {
      ...defaultVisualEditorProps,
      arrowColorMatchesEdge: true,
    })

    expect(cy.$('#e1').data(EdgeVisualPropertyName.EdgeLineColor)).toBe(
      '#336699',
    )
    expect(cy.$('#e1').data(EdgeVisualPropertyName.EdgeSourceArrowColor)).toBe(
      '#336699',
    )
    expect(cy.$('#e1').data(EdgeVisualPropertyName.EdgeTargetArrowColor)).toBe(
      '#336699',
    )
  })
})
