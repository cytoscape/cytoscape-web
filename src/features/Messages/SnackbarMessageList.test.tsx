import React from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SnackbarMessageList } from './SnackbarMessageList'
import { useMessageStore } from '../../hooks/stores/MessageStore'
import { MessageSeverity } from '../../models/MessageModel'

describe('SnackbarMessageList persistent messages', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    useMessageStore.setState((state) => {
      state.messages = []
    })
  })

  afterEach(() => {
    jest.useRealTimers()
    useMessageStore.setState((state) => {
      state.messages = []
    })
  })

  it('stays visible until the user clicks to dismiss when marked persistent', async () => {
    useMessageStore.getState().addMessage({
      message: 'Persistent message',
      severity: MessageSeverity.INFO,
      persistent: true,
    })

    render(<SnackbarMessageList />)

    expect(await screen.findByText('Persistent message')).toBeInTheDocument()

    act(() => {
      jest.advanceTimersByTime(10000)
    })

    expect(screen.getByText('Persistent message')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('alert'))

    await waitFor(() => {
      expect(screen.queryByText('Persistent message')).not.toBeInTheDocument()
    })
  })
})
