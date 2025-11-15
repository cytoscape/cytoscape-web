import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import React from 'react'

import { useMessageStore } from '../../hooks/stores/MessageStore'
import { MessageSeverity } from '../../models/MessageModel'
import { SnackbarMessageList } from './SnackbarMessageList'

describe('SnackbarMessageList persistent messages', () => {
  beforeEach(() => {
    jest.useFakeTimers()
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
    jest.useRealTimers()
  })

  it('stays visible until the user clicks to dismiss when marked persistent', async () => {
    const { unmount } = render(<SnackbarMessageList />)

    // Wait for initial render and effects to complete
    await act(async () => {
      jest.advanceTimersByTime(0)
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
      jest.advanceTimersByTime(0)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(screen.getByText('Persistent message')).toBeInTheDocument()
    })

    act(() => {
      jest.advanceTimersByTime(10000)
    })

    expect(screen.getByText('Persistent message')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByRole('alert'))
      jest.advanceTimersByTime(0)
      await Promise.resolve()
    })

    await waitFor(() => {
      expect(screen.queryByText('Persistent message')).not.toBeInTheDocument()
    })

    // Unmount before cleanup to avoid act warnings
    unmount()
  })
})
