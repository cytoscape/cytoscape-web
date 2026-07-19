// src/app-api/useScopedApi.test.ts
import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useScopedApi } from './useScopedApi'

describe('useScopedApi', () => {
  it('returns the scoped network domains', () => {
    const { result } = renderHook(() => useScopedApi('net-1'))
    expect(Object.keys(result.current).sort()).toEqual([
      'element',
      'export',
      'selection',
      'table',
      'viewport',
      'visualStyle',
    ])
    expect(typeof result.current.element.createNode).toBe('function')
  })

  it('is stable across re-renders for the same networkId', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id?: string }) => useScopedApi(id),
      { initialProps: { id: 'net-1' } },
    )
    const first = result.current
    rerender({ id: 'net-1' })
    expect(result.current).toBe(first)
  })

  it('returns a new scoped view when networkId changes', () => {
    const { result, rerender } = renderHook(
      ({ id }: { id?: string }) => useScopedApi(id),
      { initialProps: { id: 'net-1' } },
    )
    const first = result.current
    rerender({ id: 'net-2' })
    expect(result.current).not.toBe(first)
  })
})
