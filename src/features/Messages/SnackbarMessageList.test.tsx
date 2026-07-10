import { act, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useMessageStore } from '../../data/hooks/stores/MessageStore'
import { MessageSeverity } from '../../models/MessageModel'
import { SnackbarMessageList } from './SnackbarMessageList'

describe('SnackbarMessageList persistent messages', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    act(() => {
      useMessageStore.setState((state) => {
        state.messages = []
      })
    })
  })

  afterEach(() => {
    // Clean up store state before unmounting to avoid act warnings
    act(() => {
      useMessageStore.setState((state) => {
        state.messages = []
      })
    })
    vi.useRealTimers()
  })

  it('stays visible until the user clicks to dismiss when marked persistent', async () => {
    const { unmount } = render(<SnackbarMessageList />)

    // Wait for initial render and effects to complete
    await act(async () => {
      vi.advanceTimersByTime(0)
      // Flush any pending updates
      await Promise.resolve()
    })

    await act(async () => {
      useMessageStore.getState().addMessage({
        message: 'Persistent message',
        severity: MessageSeverity.INFO,
        persistent: true,
      })
      // Advance timers to allow useEffect to run
      vi.advanceTimersByTime(0)
      await Promise.resolve()
    })

    expect(screen.getByText('Persistent message')).toBeTruthy()

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(screen.getByText('Persistent message')).toBeTruthy()

    await act(async () => {
      fireEvent.click(screen.getByRole('alert'))
      vi.advanceTimersByTime(1000)
      await Promise.resolve()
    })

    expect(screen.queryByText('Persistent message')).toBeNull()

    // Unmount before cleanup to avoid act warnings
    unmount()
  })
})
