// src/app-api/useCyWebEvent.test.ts
// Hook tests using renderHook from @testing-library/react.

import { act, renderHook } from '@testing-library/react'
import { useCallback } from 'react'

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
  const handler = jest.fn()
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
  const handler = jest.fn()
  renderHook(() => useCyWebEvent('network:created', handler))

  dispatchSelection({ networkId: 'n1', selectedNodes: [], selectedEdges: [] })

  expect(handler).not.toHaveBeenCalled()
})

it('removes the listener on unmount (handler not called after)', () => {
  const handler = jest.fn()
  const { unmount } = renderHook(() => useCyWebEvent('network:created', handler))

  dispatchNetworkCreated('net1')
  expect(handler).toHaveBeenCalledTimes(1)

  unmount()

  dispatchNetworkCreated('net2')
  expect(handler).toHaveBeenCalledTimes(1) // not called again
})

it('re-subscribes when handler reference changes', () => {
  let handlerRef = jest.fn()

  const { rerender } = renderHook(
    ({ handler }: { handler: jest.Mock }) => useCyWebEvent('network:created', handler),
    { initialProps: { handler: handlerRef } },
  )

  dispatchNetworkCreated('net1')
  expect(handlerRef).toHaveBeenCalledTimes(1)

  const newHandler = jest.fn()
  handlerRef = newHandler
  rerender({ handler: newHandler })

  dispatchNetworkCreated('net2')
  expect(newHandler).toHaveBeenCalledTimes(1)
})

it('useCallback-wrapped handler does not re-subscribe on re-render', () => {
  const addListenerSpy = jest.spyOn(window, 'addEventListener')

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
