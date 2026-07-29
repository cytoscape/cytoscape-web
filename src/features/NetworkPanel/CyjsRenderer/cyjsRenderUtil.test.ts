import { describe, expect, it } from 'vitest'

import VisualStyleFn, {
  NodeShapeType,
  VisualStyle,
} from '../../../models/VisualStyleModel'
import { CustomGraphicsNameType } from '../../../models/VisualStyleModel/VisualPropertyValue/CustomGraphicsType'
import {
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
    expect(Object.values(selected!.style)).toContain(
      'data(nodeSelectedPaint)',
    )
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
