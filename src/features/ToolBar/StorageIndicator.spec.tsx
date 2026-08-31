import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePersistenceStatusStore } from '@/data/hooks/stores/PersistenceStatusStore'
import { StorageIndicator } from './StorageIndicator'

const setOnline = (value: boolean): void => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => value,
  })
}

describe('StorageIndicator', () => {
  beforeEach(() => {
    usePersistenceStatusStore.getState().reset()
    setOnline(true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('reads "Saved in this browser" before anything has been written', () => {
    render(<StorageIndicator />)

    expect(
      screen.getByTestId('storage-indicator').getAttribute('data-status'),
    ).toBe('idle')
    expect(screen.getByText('Saved in this browser')).toBeTruthy()
  })

  it('reports a write in flight', () => {
    render(<StorageIndicator />)

    act(() => {
      usePersistenceStatusStore.getState().writeStarted()
    })

    expect(screen.getByText('Saving locally…')).toBeTruthy()
  })

  it('holds "Saving locally…" after a write that settles instantly', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<StorageIndicator />)

    act(() => {
      const store = usePersistenceStatusStore.getState()
      store.writeStarted()
      store.writeSettled()
    })

    // Start and settle landed in one React batch, so the component never
    // rendered between them — the store's own hold is what keeps the label
    // on screen.
    expect(usePersistenceStatusStore.getState().lastSavedAt).toBeTypeOf(
      'number',
    )
    expect(screen.getByText('Saving locally…')).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(800)
    })
    expect(screen.getByText('Saved in this browser')).toBeTruthy()
  })

  it('shows a failure immediately, without waiting out the hold', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    render(<StorageIndicator />)

    act(() => {
      const store = usePersistenceStatusStore.getState()
      store.writeStarted()
      store.writeSettled(new Error('quota exceeded'))
    })

    expect(screen.getByText('Unable to save locally')).toBeTruthy()
    expect(
      screen.getByTestId('storage-indicator').getAttribute('data-status'),
    ).toBe('failed')
  })

  it('reports connectivity separately from local persistence', () => {
    setOnline(false)
    render(<StorageIndicator />)

    // Offline, yet the workspace is still saved locally — the two indicators
    // must not contradict each other.
    expect(screen.getByText('Offline')).toBeTruthy()
    expect(screen.getByText('Saved in this browser')).toBeTruthy()
  })

  it('follows the browser online/offline events', () => {
    render(<StorageIndicator />)
    expect(screen.getByText('Online')).toBeTruthy()

    act(() => {
      setOnline(false)
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByText('Offline')).toBeTruthy()

    act(() => {
      setOnline(true)
      window.dispatchEvent(new Event('online'))
    })
    expect(screen.getByText('Online')).toBeTruthy()
  })
})
