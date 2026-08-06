import { describe, expect, it } from 'vitest'

import { copiedStyleName, isGenericStyleName } from './styleNaming'

describe('isGenericStyleName', () => {
  it('treats the default name and its de-duplicated variants as generic', () => {
    // uniqueStyleName produces "Default 2", "Default 3", … from "Default", so a
    // copied style is almost always one of these.
    expect(isGenericStyleName('Default')).toBe(true)
    expect(isGenericStyleName('Default 2')).toBe(true)
    expect(isGenericStyleName('Default 17')).toBe(true)
    expect(isGenericStyleName('  Default  ')).toBe(true)
  })

  it('treats a real name as meaningful', () => {
    expect(isGenericStyleName('Big Labels')).toBe(false)
    expect(isGenericStyleName('Default Publication')).toBe(false)
    expect(isGenericStyleName('My Default')).toBe(false)
    expect(isGenericStyleName('Default2')).toBe(false)
  })
})

describe('copiedStyleName', () => {
  it('keeps a meaningful name', () => {
    expect(copiedStyleName('Big Labels', 'galFiltered')).toBe('Big Labels')
  })

  it('substitutes the source when the name says nothing', () => {
    // Otherwise the copy lands as another anonymous "Default 2" and every trace
    // of where it came from is lost the moment it arrives.
    expect(copiedStyleName('Default', 'Zhang18_27559151')).toBe(
      'Zhang18_27559151',
    )
    expect(copiedStyleName('Default 2', 'Multi-Scale Integrated Cell')).toBe(
      'Multi-Scale Integrated Cell',
    )
  })

  it('falls back to the generic name when there is no source to borrow', () => {
    expect(copiedStyleName('Default', '')).toBe('Default')
    expect(copiedStyleName('Default', '   ')).toBe('Default')
  })

  it('trims the substituted source name', () => {
    expect(copiedStyleName('Default', '  galFiltered  ')).toBe('galFiltered')
  })
})
