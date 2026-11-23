import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { WorkspaceNamingDialog } from './WorkspaceNamingDialog'

vi.mock('../../../data/hooks/useWorkspaceData', () => ({
  useWorkspaceData: () => ({ currentWorkspaceName: 'Current workspace' }),
}))
vi.mock('../../../data/hooks/useSaveWorkspaceToNDEx', () => ({
  useSaveWorkspace: () => vi.fn(),
}))
vi.mock('../../../data/external-api/ndex', () => ({
  fetchMyNdexWorkspaces: vi.fn(),
}))

const EMPTY_NAME_MESSAGE = 'Please enter a workspace name.'

const renderDialog = (): void => {
  render(
    <WorkspaceNamingDialog
      openDialog
      onClose={() => undefined}
      ndexBaseUrl="https://ndex.example"
      getToken={async () => 'token'}
    />,
  )
}

const nameInput = (): HTMLInputElement =>
  screen
    .getByTestId('workspace-naming-name-input')
    .querySelector('input') as HTMLInputElement
const saveButton = (): HTMLButtonElement =>
  screen.getByTestId('workspace-naming-save-button')

describe('WorkspaceNamingDialog workspace name', () => {
  it('opens with Save disabled but without an error', () => {
    renderDialog()
    expect(saveButton().disabled).toBe(true)
    expect(screen.queryByText(EMPTY_NAME_MESSAGE)).toBeNull()
    expect(nameInput().getAttribute('aria-invalid')).toBe('false')
  })

  it('shows the error on the field once a typed name is cleared', () => {
    renderDialog()
    fireEvent.change(nameInput(), { target: { value: 'My workspace' } })
    fireEvent.change(nameInput(), { target: { value: '' } })
    const message = screen.getByText(EMPTY_NAME_MESSAGE)
    expect(message.tagName).toBe('P')
    expect(nameInput().getAttribute('aria-invalid')).toBe('true')
    expect(nameInput().getAttribute('aria-describedby')).toBe(message.id)
    expect(saveButton().disabled).toBe(true)
  })

  it('treats a name of only spaces as empty', () => {
    renderDialog()
    fireEvent.change(nameInput(), { target: { value: '   ' } })
    expect(screen.getByText(EMPTY_NAME_MESSAGE)).toBeTruthy()
    expect(saveButton().disabled).toBe(true)
  })

  it('enables Save and shows no error for a real name', () => {
    renderDialog()
    fireEvent.change(nameInput(), { target: { value: 'My workspace' } })
    expect(screen.queryByText(EMPTY_NAME_MESSAGE)).toBeNull()
    expect(nameInput().getAttribute('aria-invalid')).toBe('false')
    expect(saveButton().disabled).toBe(false)
  })
})
