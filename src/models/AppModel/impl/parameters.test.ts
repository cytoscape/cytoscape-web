// @vitest-environment node
// src/models/AppModel/impl/parameters.test.ts
//
// Pure helpers behind the shared parameter spec (AppParameter): the key
// rule, value typing and coercion, value validation, presentation grouping,
// and definition validation. Spec: docs/specifications/APP_PARAMETERS_SPECIFICATION.md
import { describe, expect, it } from 'vitest'

import { AppParameter } from '../AppParameter'
import {
  coerceParameterValue,
  duplicateParameterKeys,
  groupParameters,
  parameterDefinitionProblem,
  parameterKeys,
  parameterValueType,
  validateParameterValue,
} from './parameters'

const text = (
  displayName: string,
  overrides: Partial<AppParameter> = {},
): AppParameter => ({ displayName, type: 'text', ...overrides })

describe('parameterKeys / duplicateParameterKeys', () => {
  it('uses displayName when it is unique', () => {
    expect(
      parameterKeys([
        text('Spacing'),
        text('Gap', { groups: ['Layout'] }),
        text('Reverse', { groups: ['Layout', 'Order'] }),
      ]),
    ).toEqual(['Spacing', 'Gap', 'Reverse'])
  })

  it('group-qualifies only the colliding names', () => {
    expect(
      parameterKeys([
        text('Name', {
          groups: ['Company', 'Department', 'Office', 'Identity'],
        }),
        text('Spacing'),
        text('Name', { groups: ['Company', 'Department'] }),
      ]),
    ).toEqual([
      'Company/Department/Office/Identity/Name',
      'Spacing',
      'Company/Department/Name',
    ])
  })

  it('reports keys that are still duplicated after qualification', () => {
    expect(
      duplicateParameterKeys([
        text('Name', { groups: ['A'] }),
        text('Name', { groups: ['A'] }),
        text('Other'),
        text('Plain'),
        text('Plain'),
      ]),
    ).toEqual(['A/Name', 'Plain'])
    expect(duplicateParameterKeys([text('A'), text('B')])).toEqual([])
  })

  it('ignores null groups', () => {
    expect(
      parameterKeys([
        text('X', { groups: null }),
        text('X', { groups: ['G'] }),
      ]),
    ).toEqual(['X', 'G/X'])
  })
})

describe('parameterValueType', () => {
  it('maps the declaration onto a value type', () => {
    expect(parameterValueType({ displayName: 'a', type: 'checkBox' })).toBe(
      'boolean',
    )
    expect(parameterValueType(text('a', { validationType: 'number' }))).toBe(
      'double',
    )
    expect(parameterValueType(text('a', { validationType: 'digits' }))).toBe(
      'integer',
    )
    expect(parameterValueType(text('a', { validationType: 'string' }))).toBe(
      'string',
    )
    expect(parameterValueType(text('a'))).toBe('string')
    expect(
      parameterValueType({
        displayName: 'a',
        type: 'dropDown',
        valueList: ['x'],
      }),
    ).toBe('string')
    expect(parameterValueType({ displayName: 'a', type: 'nodeColumn' })).toBe(
      'string',
    )
    // validationType is ignored for anything but text
    expect(
      parameterValueType({
        displayName: 'a',
        type: 'radio',
        validationType: 'number',
      }),
    ).toBe('string')
  })
})

describe('coerceParameterValue', () => {
  it('turns text-field strings into typed values', () => {
    expect(
      coerceParameterValue(text('a', { validationType: 'digits' }), '10'),
    ).toBe(10)
    expect(
      coerceParameterValue(text('a', { validationType: 'number' }), '1.5'),
    ).toBe(1.5)
    expect(
      coerceParameterValue({ displayName: 'a', type: 'checkBox' }, 'true'),
    ).toBe(true)
    expect(
      coerceParameterValue({ displayName: 'a', type: 'checkBox' }, 'false'),
    ).toBe(false)
    expect(coerceParameterValue(text('a'), 'x')).toBe('x')
  })

  it('passes already-typed values through and stringifies for string types', () => {
    expect(
      coerceParameterValue({ displayName: 'a', type: 'checkBox' }, true),
    ).toBe(true)
    expect(
      coerceParameterValue(text('a', { validationType: 'digits' }), 7),
    ).toBe(7)
    expect(coerceParameterValue(text('a'), 5)).toBe('5')
    expect(
      coerceParameterValue({ displayName: 'a', type: 'dropDown' }, true),
    ).toBe('true')
  })

  it('falls back to the default, then to the type zero value, for null', () => {
    expect(
      coerceParameterValue(
        text('a', { validationType: 'digits', defaultValue: 3 }),
        null,
      ),
    ).toBe(3)
    expect(
      coerceParameterValue(
        text('a', { validationType: 'digits', defaultValue: '4' }),
        undefined,
      ),
    ).toBe(4)
    expect(
      coerceParameterValue(text('a', { validationType: 'number' }), null),
    ).toBe(0)
    expect(
      coerceParameterValue({ displayName: 'a', type: 'checkBox' }, null),
    ).toBe(false)
    expect(coerceParameterValue(text('a'), null)).toBe('')
  })

  it('keeps an unparseable number as NaN so validation can reject it', () => {
    expect(
      coerceParameterValue(text('a', { validationType: 'number' }), 'abc'),
    ).toBeNaN()
  })
})

describe('validateParameterValue', () => {
  it('accepts anything for types that carry no validation', () => {
    expect(
      validateParameterValue({ displayName: 'a', type: 'checkBox' }, 'nope'),
    ).toBeUndefined()
    expect(
      validateParameterValue({ displayName: 'a', type: 'nodeColumn' }, ''),
    ).toBeUndefined()
    expect(validateParameterValue(text('a'), 'anything')).toBeUndefined()
  })

  describe('text + string regex (moved from validateParameter)', () => {
    it('passes without a regex, or with a blank one', () => {
      expect(
        validateParameterValue(text('a', { validationRegex: '' }), 'value'),
      ).toBeUndefined()
      expect(
        validateParameterValue(text('a', { validationRegex: null }), 'value'),
      ).toBeUndefined()
    })

    it('matches and mismatches, reporting validationHelp or a default', () => {
      const p = text('a', {
        validationType: 'string',
        validationRegex: '^v.*e$',
        validationHelp: 'Must start with v and end with e',
      })
      expect(validateParameterValue(p, 'value')).toBeUndefined()
      expect(validateParameterValue(p, 'wrong')).toBe(
        'Must start with v and end with e',
      )
      expect(
        validateParameterValue(
          text('a', { validationRegex: '^v.*e$' }),
          'wrong',
        ),
      ).toMatch(/\^v\.\*e\$/)
    })

    it('is lenient on an unparseable regex', () => {
      expect(
        validateParameterValue(text('a', { validationRegex: '[' }), 'value'),
      ).toBeUndefined()
    })

    it('rejects an over-long or unsafe regex', () => {
      expect(
        validateParameterValue(
          text('a', { validationRegex: 'a'.repeat(1001) }),
          'value',
        ),
      ).toBeDefined()
      expect(
        validateParameterValue(
          text('a', { validationRegex: '(a+)+$' }),
          'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaac',
        ),
      ).toBeDefined()
    })
  })

  describe('text + number / digits', () => {
    it('requires a number, a whole number for digits', () => {
      const num = text('a', { validationType: 'number' })
      const dig = text('a', { validationType: 'digits' })
      expect(validateParameterValue(num, 1.5)).toBeUndefined()
      expect(validateParameterValue(num, '-12.5')).toBeUndefined()
      expect(validateParameterValue(num, 'abc')).toMatch(/number/)
      expect(validateParameterValue(num, NaN)).toMatch(/number/)
      expect(validateParameterValue(dig, -3)).toBeUndefined()
      expect(validateParameterValue(dig, '42')).toBeUndefined()
      expect(validateParameterValue(dig, 1.5)).toMatch(/whole/)
      expect(validateParameterValue(dig, '')).toMatch(/whole/)
    })

    it('applies minValue and maxValue, with validationHelp when given', () => {
      const bounded = text('a', {
        validationType: 'number',
        minValue: 0,
        maxValue: 10,
      })
      expect(validateParameterValue(bounded, 0)).toBeUndefined()
      expect(validateParameterValue(bounded, 10)).toBeUndefined()
      expect(validateParameterValue(bounded, -1)).toMatch(/at least 0/)
      expect(validateParameterValue(bounded, 11)).toMatch(/at most 10/)
      expect(
        validateParameterValue(
          { ...bounded, validationHelp: 'Between 0 and 10' },
          11,
        ),
      ).toBe('Between 0 and 10')
      // null bounds are "no bound"
      expect(
        validateParameterValue(
          text('a', {
            validationType: 'number',
            minValue: null,
            maxValue: null,
          }),
          1e9,
        ),
      ).toBeUndefined()
    })
  })

  it('checks dropDown / radio values against a non-empty valueList', () => {
    const dd: AppParameter = {
      displayName: 'a',
      type: 'dropDown',
      valueList: ['louvain', 'leiden'],
    }
    expect(validateParameterValue(dd, 'leiden')).toBeUndefined()
    expect(validateParameterValue(dd, 'other')).toMatch(/louvain, leiden/)
    expect(
      validateParameterValue({ ...dd, type: 'radio', valueList: [] }, 'x'),
    ).toBeUndefined()
  })
})

describe('groupParameters', () => {
  it('keeps top-level parameters in array order', () => {
    const tree = groupParameters([text('A'), text('B')])
    expect(tree.path).toEqual([])
    expect(tree.children).toEqual([
      { kind: 'parameter', index: 0 },
      { kind: 'parameter', index: 1 },
    ])
  })

  it('nests by groups in first-appearance order and keeps a group together', () => {
    const tree = groupParameters([
      text('Last name', { groups: ['Company', 'Department', 'Office'] }),
      text('First name', {
        groups: ['Company', 'Department', 'Office', 'Identity'],
      }),
      text('Top level'),
      text('Office name', { groups: ['Company', 'Department', 'Office'] }),
      text('Unrelated', { groups: ['Other'] }),
    ])

    expect(tree.children.map((c) => c.kind)).toEqual([
      'group',
      'parameter',
      'group',
    ])
    const company = tree.children[0]
    if (company.kind !== 'group') throw new Error('expected group')
    expect(company.node.path).toEqual(['Company'])
    const department = company.node.children[0]
    if (department.kind !== 'group') throw new Error('expected group')
    const office = department.node.children[0]
    if (office.kind !== 'group') throw new Error('expected group')
    expect(office.node.path).toEqual(['Company', 'Department', 'Office'])
    // Last name, then the Identity subgroup (first seen after it), then
    // Office name — which the flat array had after "Top level".
    expect(office.node.children).toEqual([
      { kind: 'parameter', index: 0 },
      {
        kind: 'group',
        node: {
          path: ['Company', 'Department', 'Office', 'Identity'],
          children: [{ kind: 'parameter', index: 1 }],
        },
      },
      { kind: 'parameter', index: 3 },
    ])
    expect(tree.children[1]).toEqual({ kind: 'parameter', index: 2 })
    const other = tree.children[2]
    if (other.kind !== 'group') throw new Error('expected group')
    expect(other.node.path).toEqual(['Other'])
  })

  it('treats null and empty groups as top level', () => {
    const tree = groupParameters([
      text('A', { groups: null }),
      text('B', { groups: [] }),
    ])
    expect(tree.children).toHaveLength(2)
    expect(tree.children.every((c) => c.kind === 'parameter')).toBe(true)
  })
})

describe('parameterDefinitionProblem', () => {
  const ok = (p: unknown, strict = false): void => {
    expect(parameterDefinitionProblem(p, 0, { strict })).toBeUndefined()
  }
  const bad = (p: unknown, pattern: RegExp, strict = false): void => {
    expect(parameterDefinitionProblem(p, 0, { strict })).toMatch(pattern)
  }

  it('accepts well-formed definitions, service-style and layout-style', () => {
    ok({
      displayName: 'Configuration Model',
      type: 'text',
      defaultValue: 'Default',
      validationType: 'string',
      validationRegex: 'RB|CPM',
      validationHelp: 'x',
      valueList: null,
      columnTypeFilter: null,
      minValue: null,
      maxValue: null,
    })
    ok({
      displayName: 'Algorithm',
      type: 'dropDown',
      valueList: ['louvain', 'leiden'],
      defaultValue: 'louvain',
    })
    ok({ displayName: 'Token', type: 'accessToken' })
    ok(
      {
        displayName: 'Gap',
        type: 'text',
        validationType: 'digits',
        defaultValue: 60,
        groups: ['Spacing'],
      },
      true,
    )
    ok({ displayName: 'On', type: 'checkBox', defaultValue: true }, true)
    ok(
      {
        displayName: 'Mode',
        type: 'radio',
        valueList: ['a', 'b'],
        defaultValue: 'b',
      },
      true,
    )
  })

  it('rejects structural problems for every consumer', () => {
    bad(null, /object/)
    bad({ type: 'text' }, /displayName/)
    bad({ displayName: '  ', type: 'text' }, /displayName/)
    bad({ displayName: 'x', type: 'slider' }, /type/)
    bad({ displayName: 'x', type: 'dropDown' }, /valueList/)
    bad({ displayName: 'x', type: 'radio', valueList: [] }, /valueList/)
    bad({ displayName: 'x', type: 'dropDown', valueList: [1] }, /valueList/)
    bad({ displayName: 'x', type: 'text', groups: 'G' }, /groups/)
    bad({ displayName: 'x', type: 'text', groups: ['', 'G'] }, /groups/)
    bad(
      {
        displayName: 'x',
        type: 'text',
        validationType: 'number',
        minValue: 5,
        maxValue: 1,
      },
      /minValue/,
    )
    bad(
      { displayName: 'x', type: 'text', validationRegex: 3 },
      /validationRegex/,
    )
    bad(
      { displayName: 'x', type: 'text', validationType: 'weird' },
      /validationType/,
    )
  })

  it('in strict mode requires a typed default and forbids the host-filled types', () => {
    bad(
      { displayName: 'x', type: 'text', validationType: 'digits' },
      /defaultValue/,
      true,
    )
    bad(
      {
        displayName: 'x',
        type: 'text',
        validationType: 'digits',
        defaultValue: '10',
      },
      /defaultValue/,
      true,
    )
    bad(
      {
        displayName: 'x',
        type: 'text',
        validationType: 'number',
        defaultValue: 'ten',
      },
      /defaultValue/,
      true,
    )
    bad(
      { displayName: 'x', type: 'checkBox', defaultValue: 'true' },
      /defaultValue/,
      true,
    )
    bad(
      { displayName: 'x', type: 'text', defaultValue: 5 },
      /defaultValue/,
      true,
    )
    bad(
      {
        displayName: 'x',
        type: 'dropDown',
        valueList: ['a'],
        defaultValue: 'b',
      },
      /valueList/,
      true,
    )
    bad({ displayName: 'x', type: 'ndexUUID' }, /not available/, true)
    bad({ displayName: 'x', type: 'accessToken' }, /not available/, true)
    // the service path accepts the string defaults services send
    ok({ displayName: 'x', type: 'checkBox', defaultValue: 'true' })
    ok({
      displayName: 'x',
      type: 'text',
      validationType: 'digits',
      defaultValue: '10',
    })
  })
})
