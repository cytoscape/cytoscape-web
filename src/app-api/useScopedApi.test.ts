// src/app-api/useScopedApi.test.ts
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import * as scopedApi from './core/scopedApi'
import { useScopedApi } from './useScopedApi'

// forNetwork is spied but keeps its real implementation, so the delegation
// assertions and the shape assertions can share one module instance.
vi.mock('./core/scopedApi', async (importOriginal) => {
  const actual = await importOriginal<typeof scopedApi>()
  return { ...actual, forNetwork: vi.fn(actual.forNetwork) }
})

describe('useScopedApi', () => {
  it('returns exactly what forNetwork() returns, for the given networkId', () => {
    const sentinel = {} as scopedApi.ScopedCyWebApi
    vi.mocked(scopedApi.forNetwork).mockReturnValueOnce(sentinel)

    const { result } = renderHook(() => useScopedApi('net-1'))

    expect(scopedApi.forNetwork).toHaveBeenCalledWith('net-1')
    expect(result.current).toBe(sentinel)
  })

  it('passes undefined through so the current network resolves at call time', () => {
    renderHook(() => useScopedApi())
    expect(scopedApi.forNetwork).toHaveBeenCalledWith(undefined)
  })

  it('returns the scoped network domains', () => {
    const { result } = renderHook(() => useScopedApi('net-1'))
    expect(Object.keys(result.current).sort()).toEqual([
      'element',
      'export',
      'layout',
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
