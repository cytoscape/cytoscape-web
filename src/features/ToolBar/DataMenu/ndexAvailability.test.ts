import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'

import { NDEX_OFFLINE_HINT, useNdexGate } from './ndexAvailability'

const setOnline = (value: boolean): void => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  })
}

describe('useNdexGate', () => {
  beforeEach(() => {
    setOnline(true)
  })

  it('passes the control through untouched while online', () => {
    const { result } = renderHook(() => useNdexGate(true, ''))

    expect(result.current.disabled).toBe(false)
    expect(result.current.tooltip).toBe('')
  })

  it('keeps the control disabled for its own reason while online', () => {
    const { result } = renderHook(() => useNdexGate(false, 'Login first'))

    expect(result.current.disabled).toBe(true)
    expect(result.current.tooltip).toBe('Login first')
  })

  it('disables an otherwise available control when offline', () => {
    setOnline(false)
    const { result } = renderHook(() => useNdexGate(true, ''))

    expect(result.current.disabled).toBe(true)
    expect(result.current.tooltip).toBe(NDEX_OFFLINE_HINT)
  })

  it("reports being offline ahead of the control's own reason", () => {
    // Offline is the one the user can act on, and it explains every NDEx
    // entry going grey at the same moment.
    setOnline(false)
    const { result } = renderHook(() => useNdexGate(false, 'Login first'))

    expect(result.current.tooltip).toBe(NDEX_OFFLINE_HINT)
  })

  it('re-enables the control when the connection comes back', () => {
    setOnline(false)
    const { result } = renderHook(() => useNdexGate(true, ''))
    expect(result.current.disabled).toBe(true)

    act(() => {
      setOnline(true)
      window.dispatchEvent(new Event('online'))
    })

    expect(result.current.disabled).toBe(false)
  })
})
