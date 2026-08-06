// src/app-api/useCyWebEvent.test.ts
// Hook tests using renderHook from @testing-library/react.
import { act, renderHook } from '@testing-library/react'
import { useCallback } from 'react'
import { expect, it, vi } from 'vitest'

import { useCyWebEvent } from './useCyWebEvent'

// ── Helpers ───────────────────────────────────────────────────────────────────

function dispatchSelection(detail: {
  networkId: string
  selectedNodes: string[]
  selectedEdges: string[]
}): void {
  act(() => {
    window.dispatchEvent(new CustomEvent('selection:changed', { detail }))
  })
}

function dispatchNetworkCreated(networkId: string): void {
  act(() => {
    window.dispatchEvent(new CustomEvent('network:created', { detail: { networkId } }))
  })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

it('calls handler when a matching event is dispatched', () => {
  const handler = vi.fn()
  renderHook(() => useCyWebEvent('selection:changed', handler))

  dispatchSelection({ networkId: 'n1', selectedNodes: ['a'], selectedEdges: [] })

  expect(handler).toHaveBeenCalledTimes(1)
  expect(handler).toHaveBeenCalledWith({
    networkId: 'n1',
    selectedNodes: ['a'],
    selectedEdges: [],
  })
})

it('does not call handler for a different event type', () => {
  const handler = vi.fn()
  renderHook(() => useCyWebEvent('network:created', handler))

  dispatchSelection({ networkId: 'n1', selectedNodes: [], selectedEdges: [] })

  expect(handler).not.toHaveBeenCalled()
})

it('removes the listener on unmount (handler not called after)', () => {
  const handler = vi.fn()
  const { unmount } = renderHook(() => useCyWebEvent('network:created', handler))

  dispatchNetworkCreated('net1')
  expect(handler).toHaveBeenCalledTimes(1)

  unmount()

  dispatchNetworkCreated('net2')
  expect(handler).toHaveBeenCalledTimes(1) // not called again
})

it('calls the latest handler after the handler reference changes', () => {
  let handlerRef = vi.fn()

  const { rerender } = renderHook(
    ({ handler }: { handler: import('vitest').Mock }) => useCyWebEvent('network:created', handler),
    { initialProps: { handler: handlerRef } },
  )

  dispatchNetworkCreated('net1')
  expect(handlerRef).toHaveBeenCalledTimes(1)

  const newHandler = vi.fn()
  handlerRef = newHandler
  rerender({ handler: newHandler })

  dispatchNetworkCreated('net2')
  expect(newHandler).toHaveBeenCalledTimes(1)
})

it('does not re-subscribe when a fresh inline handler is passed each render', () => {
  const addListenerSpy = vi.spyOn(window, 'addEventListener')

  // No useCallback — a brand-new function identity every render. The ref
  // indirection must keep the window listener stable regardless.
  const { rerender } = renderHook(() =>
    useCyWebEvent('network:created', () => {}),
  )

  const initialCallCount = addListenerSpy.mock.calls.filter(
    ([type]) => type === 'network:created',
  ).length

  rerender()
  rerender()

  const finalCallCount = addListenerSpy.mock.calls.filter(
    ([type]) => type === 'network:created',
  ).length

  expect(finalCallCount).toBe(initialCallCount)

  addListenerSpy.mockRestore()
})

it('useCallback-wrapped handler does not re-subscribe on re-render', () => {
  const addListenerSpy = vi.spyOn(window, 'addEventListener')

  const { rerender } = renderHook(() => {
    const stableHandler = useCallback(() => {
      // stable reference — no side effects needed for this test
    }, [])
    useCyWebEvent('network:created', stableHandler)
  })

  const initialCallCount = addListenerSpy.mock.calls.filter(
    ([type]) => type === 'network:created',
  ).length

  rerender()
  rerender()

  const finalCallCount = addListenerSpy.mock.calls.filter(
    ([type]) => type === 'network:created',
  ).length

  // Stable handler → effect deps unchanged → addEventListener called same number of times
  expect(finalCallCount).toBe(initialCallCount)

  addListenerSpy.mockRestore()
})
