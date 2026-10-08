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

    act(() => {
      fireEvent.click(screen.getByRole('alert'))
    })
    // Separate act: the exit transition's timer starts only once the close
    // has rendered.
    await act(async () => {
      vi.advanceTimersByTime(1000)
      await Promise.resolve()
    })

    expect(screen.queryByText('Persistent message')).toBeNull()

    // Unmount before cleanup to avoid act warnings
    unmount()
  })

  it('anchors bottom-center so it never covers the tab strips at the top of the view', async () => {
    const { unmount } = render(<SnackbarMessageList />)

    await act(async () => {
      useMessageStore.getState().addMessage({
        message: 'Placement message',
        severity: MessageSeverity.WARNING,
      })
      vi.advanceTimersByTime(0)
      await Promise.resolve()
    })

    const snackbar = screen.getByTestId('snackbar-message-list')
    expect(
      snackbar.classList.contains('MuiSnackbar-anchorOriginBottomCenter'),
    ).toBe(true)
    // The old placement pinned the snackbar under the app bar, right on top
    // of the network view's tab strip (e.g. the Hierarchy Viewer's Cell View
    // tab). MUI pauses auto-hide while hovered, so it swallowed tab clicks.
    // jsdom resolves emotion's rules, so this read `64px` before the fix.
    expect(getComputedStyle(snackbar).top).toBe('auto')

    unmount()
  })

  it('renders a filled alert so bottom-anchored messages stand out in both themes', async () => {
    const { unmount } = render(<SnackbarMessageList />)

    await act(async () => {
      useMessageStore.getState().addMessage({
        message: 'Filled message',
        severity: MessageSeverity.ERROR,
      })
      vi.advanceTimersByTime(0)
      await Promise.resolve()
    })

    const alert = screen.getByRole('alert')
    expect(alert.classList.contains('MuiAlert-filled')).toBe(true)
    expect(alert.classList.contains('MuiAlert-filledError')).toBe(true)

    unmount()
  })
})

describe('SnackbarMessageList queue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    act(() => {
      useMessageStore.setState((state) => {
        state.messages = []
      })
    })
  })

  afterEach(() => {
    act(() => {
      useMessageStore.setState((state) => {
        state.messages = []
      })
    })
    vi.useRealTimers()
  })

  const addMessage = async (
    message: string,
    options: { persistent?: boolean } = {},
  ): Promise<void> => {
    await act(async () => {
      useMessageStore.getState().addMessage({
        message,
        severity: MessageSeverity.ERROR,
        duration: 3000,
        ...options,
      })
      vi.advanceTimersByTime(0)
      await Promise.resolve()
    })
  }

  const advance = async (ms: number): Promise<void> => {
    await act(async () => {
      vi.advanceTimersByTime(ms)
      await Promise.resolve()
    })
  }

  // The Alert's Close "X", not the side panel's "Close panel" buttons.
  const clickClose = (): void => {
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
  }

  it('shows the next message after one closed with its X while the pointer left it', async () => {
    const { unmount } = render(<SnackbarMessageList />)

    await addMessage('Invalid file #1')
    expect(screen.getByText('Invalid file #1')).toBeTruthy()

    // The user clicks the X and moves on. MUI resumes its auto-hide timer when
    // the pointer leaves the snackbar, which it still renders while it
    // animates out, and that timer later reports a 'timeout' close.
    const snackbar = screen.getByTestId('snackbar-message-list')
    act(() => {
      clickClose()
    })
    fireEvent.mouseLeave(snackbar)
    await advance(5000)
    expect(screen.queryByText('Invalid file #1')).toBeNull()

    await addMessage('Invalid file #2')
    expect(screen.getByText('Invalid file #2')).toBeTruthy()

    unmount()
  })

  it('does not skip the queued message when a persistent one is closed with its X', async () => {
    const { unmount } = render(<SnackbarMessageList />)

    await addMessage('Persistent message', { persistent: true })
    await addMessage('Queued message')
    expect(screen.getByText('Persistent message')).toBeTruthy()

    // The X's click also reaches the Alert's own click-to-dismiss handler.
    act(() => {
      clickClose()
    })
    await advance(1000)

    expect(screen.queryByText('Persistent message')).toBeNull()
    expect(screen.getByText('Queued message')).toBeTruthy()

    unmount()
  })

  it('keeps a persistent message up when a stale auto-hide timer fires', async () => {
    const { unmount } = render(<SnackbarMessageList />)

    await addMessage('Invalid file #1')
    const snackbar = screen.getByTestId('snackbar-message-list')
    act(() => {
      clickClose()
    })
    fireEvent.mouseLeave(snackbar)
    await advance(300)

    await addMessage('Persistent message', { persistent: true })
    await advance(10000)

    expect(screen.getByText('Persistent message')).toBeTruthy()

    unmount()
  })

  it('keeps the closing message on screen while it animates out', async () => {
    const { unmount } = render(<SnackbarMessageList />)

    await addMessage('Invalid file #1')
    act(() => {
      clickClose()
    })

    // Mid exit transition: still the same message, not an empty info alert.
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('Invalid file #1')
    expect(alert.classList.contains('MuiAlert-filledError')).toBe(true)

    await advance(1000)
    expect(screen.queryByRole('alert')).toBeNull()

    unmount()
  })
})
