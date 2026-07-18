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
})
