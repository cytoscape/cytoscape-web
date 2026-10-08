import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  hasSeenDesktopPermissionNotice,
  markDesktopPermissionNoticeSeen,
  useCytoscapeDesktopPermissionNotice,
} from './useCytoscapeDesktopPermissionNotice'

describe('useCytoscapeDesktopPermissionNotice (CW-Localhost)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('persists that the notice has been seen', () => {
    expect(hasSeenDesktopPermissionNotice()).toBe(false)
    markDesktopPermissionNoticeSeen()
    expect(hasSeenDesktopPermissionNotice()).toBe(true)
  })

  it('shows the dialog and defers the action on first use', () => {
    const action = vi.fn()
    const { result } = renderHook(() => useCytoscapeDesktopPermissionNotice())

    act(() => result.current.run(action))

    // Dialog is shown and the action is deferred until confirmed.
    expect(result.current.open).toBe(true)
    expect(action).not.toHaveBeenCalled()

    act(() => result.current.onConfirm())

    expect(action).toHaveBeenCalledTimes(1)
    expect(result.current.open).toBe(false)
    expect(hasSeenDesktopPermissionNotice()).toBe(true)
  })

  it('runs the action immediately once the notice has been seen', () => {
    markDesktopPermissionNoticeSeen()
    const action = vi.fn()
    const { result } = renderHook(() => useCytoscapeDesktopPermissionNotice())

    act(() => result.current.run(action))

    expect(action).toHaveBeenCalledTimes(1)
    expect(result.current.open).toBe(false)
  })

  it('does not run the action when cancelled', () => {
    const action = vi.fn()
    const { result } = renderHook(() => useCytoscapeDesktopPermissionNotice())

    act(() => result.current.run(action))
    act(() => result.current.onCancel())

    expect(action).not.toHaveBeenCalled()
    expect(result.current.open).toBe(false)
    // Cancelling does not mark the notice as seen, so it shows again next time.
    expect(hasSeenDesktopPermissionNotice()).toBe(false)
  })
})
