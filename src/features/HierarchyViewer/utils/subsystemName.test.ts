// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { getSubsystemName } from './subsystemName'

describe('getSubsystemName', () => {
  it('uses the name column', () => {
    expect(getSubsystemName({ name: 'Subsystem 42' }, undefined, '42')).toBe(
      'Subsystem 42',
    )
  })

  it('prefers the node-label mapping attribute over the name column', () => {
    expect(
      getSubsystemName({ name: 'Subsystem 42', n: 'C42' }, 'n', '42'),
    ).toBe('C42')
  })

  it('falls back to the name column when the mapped attribute has no value', () => {
    expect(getSubsystemName({ name: 'Subsystem 42' }, 'n', '42')).toBe(
      'Subsystem 42',
    )
  })

  // The HCX fixtures name their nodes with an `n` column, not `name`
  it('falls back to the node id when neither has a value', () => {
    expect(getSubsystemName({ n: 'C42' }, undefined, '42')).toBe('42')
    expect(getSubsystemName({ n: 'C42' }, 'label', '42')).toBe('42')
  })

  // CX2 attribute values are untyped JSON, so null can reach the row
  it.each([null, '', '  '])('treats %j as no value', (empty) => {
    expect(
      getSubsystemName({ name: empty, label: empty } as any, 'label', '42'),
    ).toBe('42')
  })

  // A list column can hold an empty list, or only blank items
  it.each([[[]], [[null, '']]])('treats the list %j as no value', (empty) => {
    expect(
      getSubsystemName({ name: empty, label: empty } as any, 'label', '42'),
    ).toBe('42')
    expect(
      getSubsystemName(
        { name: 'Subsystem 42', label: empty } as any,
        'label',
        '42',
      ),
    ).toBe('Subsystem 42')
  })

  it('stringifies non-string values', () => {
    expect(getSubsystemName({ name: 7 }, undefined, '42')).toBe('7')
    expect(getSubsystemName({ name: false }, undefined, '42')).toBe('false')
    expect(getSubsystemName({ name: ['a', 'b'] }, undefined, '42')).toBe('a,b')
  })
})
