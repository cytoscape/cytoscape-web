import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import Keycloak from 'keycloak-js'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { KeycloakContext } from '@/boot/keycloak'
import { useSaveWorkspace } from '../../../data/hooks/useSaveWorkspaceToNDEx'
import { useWorkspaceData } from '../../../data/hooks/useWorkspaceData'
import { SaveWorkspaceToNDExOverwriteMenuItem } from './SaveWorkspaceToNDExOverwrite'

vi.mock('../../../data/hooks/useSaveWorkspaceToNDEx')
vi.mock('../../../data/hooks/useWorkspaceData')

type Mock = import('vitest').Mock

const saveWorkspace = vi.fn()
const onClick = vi.fn()
const onSaveAs = vi.fn()

const renderRow = (isRemoteWorkspace: boolean) => {
  ;(useWorkspaceData as unknown as Mock).mockReturnValue({
    allNetworkId: ['n1'],
    isRemoteWorkspace,
    currentWorkspaceName: 'My workspace',
    workspaceId: 'w1',
  })
  const client = { authenticated: true } as unknown as Keycloak
  render(
    <KeycloakContext.Provider value={client}>
      <SaveWorkspaceToNDExOverwriteMenuItem
        onClick={onClick}
        onSaveAs={onSaveAs}
      />
    </KeycloakContext.Provider>,
  )
}

// The row owns no dialog (#784): a workspace already on NDEx is saved in the
// background after the menu closes; a local one is handed to the Data menu,
// which owns the naming dialog.
describe('SaveWorkspaceToNDExOverwriteMenuItem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    saveWorkspace.mockResolvedValue(undefined)
    ;(useSaveWorkspace as unknown as Mock).mockReturnValue(saveWorkspace)
  })

  it('closes the menu, then overwrites a workspace already on NDEx', async () => {
    renderRow(true)

    fireEvent.click(screen.getByText('Save Workspace'))

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onSaveAs).not.toHaveBeenCalled()
    await waitFor(() => expect(saveWorkspace).toHaveBeenCalledTimes(1))
    expect(onClick.mock.invocationCallOrder[0]).toBeLessThan(
      saveWorkspace.mock.invocationCallOrder[0],
    )
  })

  it('asks the Data menu for a name when the workspace is local', () => {
    renderRow(false)

    fireEvent.click(screen.getByText('Save Workspace'))

    expect(onSaveAs).toHaveBeenCalledTimes(1)
    expect(saveWorkspace).not.toHaveBeenCalled()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
  })
})
