import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useNetworkSummaryStore } from '../../data/hooks/stores/NetworkSummaryStore'
import { NetworkSummary } from '../../models/NetworkSummaryModel'
import NetworkPropertyEditor from './NetworkPropertyEditor'

const postEdit = vi.fn()
vi.mock('../../data/hooks/useUndoStack', () => ({
  useUndoStack: () => ({ postEdit }),
}))

const NETWORK_ID = 'net-1'
const EMPTY_NAME_MESSAGE = 'Please enter a name for the network.'

const seedSummary = (name: string): void => {
  act(() => {
    useNetworkSummaryStore.setState((state) => {
      state.summaries[NETWORK_ID] = {
        externalId: NETWORK_ID,
        name,
        description: '',
        version: '',
        visibility: 'PRIVATE',
        properties: [],
      } as unknown as NetworkSummary
    })
  })
}

const renderEditor = (onClose = vi.fn()): void => {
  render(
    <NetworkPropertyEditor
      anchorEl={document.body}
      onClose={onClose}
      networkId={NETWORK_ID}
    />,
  )
}

const nameInput = (): HTMLInputElement =>
  screen
    .getByTestId('network-property-editor-name-input')
    .querySelector('input') as HTMLInputElement
const confirmButton = (): HTMLButtonElement =>
  screen.getByTestId('network-property-editor-confirm-button')

describe('NetworkPropertyEditor network name', () => {
  beforeEach(() => {
    postEdit.mockClear()
    seedSummary('My network')
  })

  it('disables Confirm and asks for a name when the name is cleared', () => {
    renderEditor()
    fireEvent.change(nameInput(), { target: { value: '' } })
    expect(confirmButton().disabled).toBe(true)
    const message = screen.getByText(EMPTY_NAME_MESSAGE)
    expect(nameInput().getAttribute('aria-invalid')).toBe('true')
    expect(nameInput().getAttribute('aria-describedby')).toBe(message.id)
  })

  it('treats a name of only spaces as empty', () => {
    renderEditor()
    fireEvent.change(nameInput(), { target: { value: '   ' } })
    expect(confirmButton().disabled).toBe(true)
    expect(screen.getByText(EMPTY_NAME_MESSAGE)).toBeTruthy()
  })

  it('does not save a blank name', () => {
    renderEditor()
    fireEvent.change(nameInput(), { target: { value: '' } })
    fireEvent.click(confirmButton())
    expect(postEdit).not.toHaveBeenCalled()
    expect(useNetworkSummaryStore.getState().summaries[NETWORK_ID].name).toBe(
      'My network',
    )
  })

  it('shows no error and saves a real name', () => {
    const onClose = vi.fn()
    renderEditor(onClose)
    fireEvent.change(nameInput(), { target: { value: 'Renamed' } })
    expect(screen.queryByText(EMPTY_NAME_MESSAGE)).toBeNull()
    expect(nameInput().getAttribute('aria-invalid')).toBe('false')
    expect(confirmButton().disabled).toBe(false)
    fireEvent.click(confirmButton())
    expect(useNetworkSummaryStore.getState().summaries[NETWORK_ID].name).toBe(
      'Renamed',
    )
    expect(onClose).toHaveBeenCalled()
  })

  it('allows a name that another network already uses', () => {
    act(() => {
      useNetworkSummaryStore.setState((state) => {
        state.summaries['net-2'] = {
          ...state.summaries[NETWORK_ID],
          externalId: 'net-2',
          name: 'Shared name',
        }
      })
    })
    renderEditor()
    fireEvent.change(nameInput(), { target: { value: 'Shared name' } })
    expect(confirmButton().disabled).toBe(false)
    expect(nameInput().getAttribute('aria-invalid')).toBe('false')
  })
})
