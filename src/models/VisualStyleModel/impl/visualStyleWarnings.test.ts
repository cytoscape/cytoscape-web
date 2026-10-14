// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { ValueTypeName } from '../../TableModel'
import { DiscreteMappingFunction } from '../VisualMappingFunction/DiscreteMappingFunction'
import { MappingFunctionType } from '../VisualMappingFunction/MappingFunctionType'
import { VisualPropertyValueTypeName } from '../VisualPropertyValueTypeName'
import { getDefaultVisualStyle } from './defaultVisualStyle'
import { collectVisualStyleWarnings } from './visualStyleWarnings'

// to run these: npx vitest src/models/VisualStyleModel/impl/visualStyleWarnings.test.ts

describe('collectVisualStyleWarnings', () => {
  it('returns no warnings for a plain default visual style', () => {
    const vs = getDefaultVisualStyle()
    expect(collectVisualStyleWarnings(vs)).toEqual([])
  })

  // CW-659
  it('warns when a discrete mapping is keyed on a list attribute', () => {
    const vs = getDefaultVisualStyle()
    const listMapping: DiscreteMappingFunction = {
      type: MappingFunctionType.Discrete,
      attribute: 'Interactor Type',
      vpValueMap: new Map([['pp', 'diamond']]),
      visualPropertyType: VisualPropertyValueTypeName.NodeShape,
      defaultValue: 'rectangle',
      attributeType: ValueTypeName.ListString,
    }
    vs.nodeShape.mapping = listMapping

    const warnings = collectVisualStyleWarnings(vs)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].code).toBe('discrete-mapping-list-attribute')
    expect(warnings[0].message).toContain('Interactor Type')
    expect(warnings[0].message).toContain('first element')
  })

  it('does not warn for a discrete mapping on a scalar attribute', () => {
    const vs = getDefaultVisualStyle()
    const scalarMapping: DiscreteMappingFunction = {
      type: MappingFunctionType.Discrete,
      attribute: 'type',
      vpValueMap: new Map([['a', 'diamond']]),
      visualPropertyType: VisualPropertyValueTypeName.NodeShape,
      defaultValue: 'rectangle',
      attributeType: ValueTypeName.String,
    }
    vs.nodeShape.mapping = scalarMapping

    expect(collectVisualStyleWarnings(vs)).toEqual([])
  })

  // CW-505
  it('warns for an unsupported edge line type default value', () => {
    const vs = getDefaultVisualStyle()
    vs.edgeLineType.defaultValue = 'EQUAL_DASH' as never

    const warnings = collectVisualStyleWarnings(vs)
    const lineWarning = warnings.find((w) => w.code === 'unsupported-line-type')
    expect(lineWarning).toBeDefined()
    expect(lineWarning?.message).toContain('EQUAL_DASH')
  })

  it('warns for unsupported line types inside a discrete mapping', () => {
    const vs = getDefaultVisualStyle()
    vs.edgeLineType.mapping = {
      type: MappingFunctionType.Discrete,
      attribute: 'interaction',
      vpValueMap: new Map([
        ['a', 'solid'],
        ['b', 'zigzag'],
      ]),
      visualPropertyType: VisualPropertyValueTypeName.EdgeLine,
      defaultValue: 'solid',
      attributeType: ValueTypeName.String,
    } as DiscreteMappingFunction

    const warnings = collectVisualStyleWarnings(vs)
    const lineWarning = warnings.find((w) => w.code === 'unsupported-line-type')
    expect(lineWarning).toBeDefined()
    // Only the unsupported value should appear in the list, not 'solid'.
    expect(lineWarning?.message).toContain('Unsupported line type(s): zigzag.')
  })

  it('warns for an unsupported line type in a bypass', () => {
    const vs = getDefaultVisualStyle()
    vs.edgeLineType.bypassMap.set('e1', 'sinewave' as never)

    const warnings = collectVisualStyleWarnings(vs)
    expect(
      warnings.some(
        (w) =>
          w.code === 'unsupported-line-type' && w.message.includes('sinewave'),
      ),
    ).toBe(true)
  })

  it('does not warn for supported line types', () => {
    const vs = getDefaultVisualStyle()
    vs.edgeLineType.defaultValue = 'dashed' as never
    vs.nodeBorderLineType.defaultValue = 'double' as never

    expect(
      collectVisualStyleWarnings(vs).some(
        (w) => w.code === 'unsupported-line-type',
      ),
    ).toBe(false)
  })
})
