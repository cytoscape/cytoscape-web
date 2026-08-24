// @vitest-environment node
import { describe, expect, it } from 'vitest'

import { getElementId, ID_COLUMN_ID, ID_COLUMN_TITLE } from './idColumn'

describe('getElementId (CW-537)', () => {
  it('returns the node id unchanged', () => {
    expect(getElementId({ id: '123' })).toBe('123')
  })

  it('keeps the edge id "e" prefix so it round-trips through the URL param', () => {
    expect(getElementId({ id: 'e42' })).toBe('e42')
  })

  it('coerces non-string ids to strings', () => {
    expect(getElementId({ id: 7 as unknown as string })).toBe('7')
  })

  it('returns an empty string when there is no id', () => {
    expect(getElementId(undefined)).toBe('')
    expect(getElementId(null)).toBe('')
    expect(getElementId({})).toBe('')
  })

  it('exposes a stable virtual column id and title', () => {
    expect(ID_COLUMN_ID).toBe('__elementId')
    expect(ID_COLUMN_TITLE).toBe('ID')
  })
})
