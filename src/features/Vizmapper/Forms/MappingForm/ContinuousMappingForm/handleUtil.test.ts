import { describe, expect, it } from 'vitest'

import { addHandle, editHandle, Handle, removeHandle } from './handleUtil'

const handle = (id: number, value: number, vpValue = '#000000'): Handle => ({
  id,
  value,
  vpValue,
})

describe('addHandle', () => {
  it('inserts the new handle sorted by value', () => {
    const handles = [handle(0, 10), handle(1, 30)]

    const result = addHandle(handles, 20, '#ff0000')

    expect(result.map((h) => h.value)).toEqual([10, 20, 30])
    expect(result[1]).toMatchObject({ value: 20, vpValue: '#ff0000' })
  })

  it('allocates the lowest free id, filling gaps first', () => {
    const handles = [handle(0, 10), handle(2, 20)]

    const result = addHandle(handles, 30, '#ff0000')

    expect(result.find((h) => h.value === 30)?.id).toBe(1)
  })

  it('starts ids at 0 for an empty handle list', () => {
    const result = addHandle([], 5, '#ff0000')

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(0)
  })

  it('does not mutate the input array', () => {
    const handles = [handle(0, 10)]

    addHandle(handles, 5, '#ff0000')

    expect(handles).toHaveLength(1)
  })
})

describe('removeHandle', () => {
  it('removes the handle with the matching id', () => {
    const handles = [handle(0, 10), handle(1, 20)]

    const result = removeHandle(handles, 0)

    expect(result.map((h) => h.id)).toEqual([1])
  })

  it('returns the original array untouched for an unknown id', () => {
    const handles = [handle(0, 10)]

    expect(removeHandle(handles, 99)).toBe(handles)
  })
})

describe('editHandle', () => {
  it('updates value and vpValue, then re-sorts by value', () => {
    const handles = [handle(0, 10), handle(1, 20), handle(2, 30)]

    // Move the first handle past the last one
    const result = editHandle(handles, 0, 40, '#00ff00')

    expect(result.map((h) => h.id)).toEqual([1, 2, 0])
    expect(result[2]).toMatchObject({ value: 40, vpValue: '#00ff00' })
  })

  it('returns the original array untouched for an unknown id', () => {
    const handles = [handle(0, 10)]

    expect(editHandle(handles, 99, 5, '#00ff00')).toBe(handles)
  })
})
